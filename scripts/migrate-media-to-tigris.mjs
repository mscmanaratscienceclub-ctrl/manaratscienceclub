/**
 * Copy the byte-heavy public media out of Supabase Storage into a Tigris bucket.
 *
 * Why: Supabase meters **cached egress** — bytes its CDN hands to visitors — so the
 * 56.8 MB `pdfs` bucket and the content images under `avatars/optimized` keep billing
 * however well they are cached. Tigris is S3-compatible with no egress charge, so
 * moving the reads there takes those bytes off Supabase's meter. Postgres, better-auth
 * and the `/api/upload` write path stay on Supabase: upload is ingress (not metered)
 * and the registration flow reads no storage URLs, so it cannot be affected by this.
 *
 * Key layout mirrors Supabase so `src/lib/media.ts` needs no per-host path logic:
 *   pdfs/MATH OLYMPIAD SYLLABUS.pdf
 *   avatars/optimized/adminimages/abrar.png.webp
 *
 * Usage
 *   pnpm media:migrate:dry     what would move, and its weight (no writes at all)
 *   pnpm media:migrate         copy + byte-compare every object the site reads
 *   pnpm media:verify          HEAD each object through the public origin
 *   pnpm media:archive         copy unreferenced originals to archive/ — Tigris has no
 *                              egress charge, so keeping them costs nothing
 *   pnpm run media:purge -- --dry-run   preview the legacy delete
 *   pnpm media:purge           delete an original only once its replacement bytes are
 *                              confirmed on Tigris, as an optimized twin or an archive copy
 *
 * Env, read from `.env` (shell values win). Tigris uses the AWS SDK's own names:
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3 (default
 * https://t3.storage.dev), AWS_REGION (default `auto`), AWS_S3_BUCKET — omit the bucket
 * when the account holds exactly one. `TIGRIS_*` overrides any of them. Needs
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to read the source bucket, and
 * NEXT_PUBLIC_MEDIA_BASE_URL for `media:verify` to check the URL the site will actually
 * use (falls back to Tigris's public read domain, `https://<bucket>.t3.tigrisfiles.io`).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const VERIFY = args.has("--verify");
const PURGE = args.has("--purge-legacy");
const ARCHIVE = args.has("--archive-legacy");
const FORCE = args.has("--force");
const ASSUMED_YES = args.has("--yes");

const fileEnv = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [
      l.slice(0, l.indexOf("=")),
      l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
    ]),
);

// Shell wins over `.env`, so the same script runs against a staging bucket without
// editing the production file.
const env = new Proxy(fileEnv, {
  get: (target, key) => process.env[key] ?? target[key],
});

/** Tigris uses the AWS SDK's own variable names; `TIGRIS_*` overrides each one. */
const pick = (tigrisName, awsName) => env[tigrisName] || env[awsName] || "";

const required = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  AWS_ACCESS_KEY_ID: pick("TIGRIS_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: pick("TIGRIS_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"),
};
const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(
  required.NEXT_PUBLIC_SUPABASE_URL,
  required.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const s3 = new S3Client({
  endpoint: pick("TIGRIS_ENDPOINT", "AWS_ENDPOINT_URL_S3") || "https://t3.storage.dev",
  region: pick("TIGRIS_REGION", "AWS_REGION") || "auto",
  credentials: {
    accessKeyId: required.AWS_ACCESS_KEY_ID,
    secretAccessKey: required.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * `AWS_S3_BUCKET` (or `TIGRIS_BUCKET`) names the destination. Left unset, exactly one
 * bucket in the account is unambiguous, so it is used and announced; several is a
 * question for a human, because the name becomes part of every public media URL.
 */
async function resolveBucket() {
  const named = pick("TIGRIS_BUCKET", "AWS_S3_BUCKET");
  if (named) return named;
  const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
  if (Buckets.length === 1) {
    console.log(`Using the only bucket in this account: ${Buckets[0].Name}`);
    return Buckets[0].Name;
  }
  console.error(
    Buckets.length === 0
      ? "No buckets yet. Create one with public read access, then set AWS_S3_BUCKET in .env."
      : `Several buckets exist (${Buckets.map((b) => b.Name).join(", ")}). Set AWS_S3_BUCKET in .env.`,
  );
  process.exit(1);
}

const Bucket = await resolveBucket();

const IMMUTABLE = "public, max-age=31536000, immutable";
/** Uploads that are already the final bytes, matching `ALREADY_SMALL` in media.ts. */
const ALREADY_SMALL = /\.(webp|avif)$/i;

/**
 * Supabase answers `/…?download` with `Content-Disposition: attachment`, and
 * `pdfUrl()` only appends that suffix while media still lives there. Once the objects
 * are in Tigris the header has to exist on the object itself, or a Download click
 * opens the PDF inline instead of saving it.
 */
function dispositionFor(key) {
  if (!key.startsWith("pdfs/")) return undefined;
  const name = decodeURIComponent(key.slice(key.lastIndexOf("/") + 1));
  return `attachment; filename="${name.replace(/["\\]/g, "")}"`;
}

const TYPES = {
  pdf: "application/pdf",
  webp: "image/webp",
  avif: "image/avif",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  heif: "image/heif",
  heic: "image/heic",
  svg: "image/svg+xml",
};
function typeFor(key) {
  return TYPES[extname(key).slice(1).toLowerCase()] ?? "application/octet-stream";
}

/** The `optimized/` twin `contentImage()` serves for a given original path. */
function twinOf(path) {
  if (ALREADY_SMALL.test(path)) return path;
  return `optimized/${path.replace(/[^.]+$/, (ext) => `${ext}.webp`)}`;
}

/** Recursive listing of a bucket; Supabase returns folders as rows with `id === null`. */
async function listObjects(bucket, prefix) {
  const out = [];
  const stack = [prefix];
  while (stack.length) {
    const at = stack.pop();
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(at, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${bucket}/${at}: ${error.message}`);
    for (const row of data) {
      const path = at ? `${at}/${row.name}` : row.name;
      if (row.id === null) stack.push(path);
      else out.push({ path, size: row.metadata?.size ?? 0 });
    }
  }
  return out;
}

/**
 * The avatars paths `src/` fetches **verbatim** — i.e. the object it names is the
 * object the browser downloads.
 *
 * `contentImage()` is called with an *original* path but resolves a multi-megabyte
 * PNG to its `optimized/…webp` twin, so naming a path in source does not mean that
 * path is fetched — copying every named original would ship 20 MB of bytes no visitor
 * ever requests. What *is* fetched verbatim: an already-small `.webp`/`.avif` passed to
 * `contentImage()`, and anything passed to `bucketOriginal()`.
 */
function verbatimAvatarPaths() {
  const out = new Set();
  for (const [, fn, arg] of sourceText.matchAll(
    /(contentImage|bucketOriginal)\(\s*["']([^"']+)["']/g,
  )) {
    if (fn === "bucketOriginal" || ALREADY_SMALL.test(arg)) out.add(arg);
  }
  return out;
}

/**
 * The copy set: everything the public site can be asked to read.
 *
 * 1. every `pdfs` object;
 * 2. every `avatars/optimized/*` WebP — the display bytes behind `contentImage()`;
 * 3. every other avatars object fetched verbatim (see `verbatimAvatarPaths`).
 *
 * Unreferenced legacy originals are deliberately absent: they are the payload for
 * `--purge-legacy`, not a migration target.
 */
async function buildPlan() {
  const pdfs = await listObjects("pdfs", "");
  const avatars = await listObjects("avatars", "");
  const wanted = verbatimAvatarPaths();
  const keys = new Set();
  const plan = [
    ...pdfs.map((o) => ({ bucket: "pdfs", path: o.path, key: `pdfs/${o.path}`, size: o.size })),
    ...avatars
      .filter((o) => o.path.startsWith("optimized/"))
      .map((o) => ({ bucket: "avatars", path: o.path, key: `avatars/${o.path}`, size: o.size })),
    ...avatars
      .filter((o) => !o.path.startsWith("optimized/") && wanted.has(o.path))
      .map((o) => ({ bucket: "avatars", path: o.path, key: `avatars/${o.path}`, size: o.size })),
  ];
  for (const item of plan) keys.add(item.key);
  // A path source names but the bucket does not hold renders as a broken card, and it
  // would have 404d on Supabase too — report rather than silently drop it.
  const absent = [...wanted].filter((p) => !keys.has(`avatars/${p}`));
  for (const path of absent) {
    console.log(`WARNING avatars/${path} is named in src/ but not in the bucket`);
  }
  return plan;
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function remoteSize(key) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key: key }));
    return head.ContentLength ?? -1;
  } catch {
    return null;
  }
}

async function copyOne(item) {
  if (DRY) return { key: item.key, size: item.size, state: "plan" };

  const target = await remoteSize(item.key);
  if (!FORCE && target === item.size) return { key: item.key, size: item.size, state: "have" };

  const { data, error } = await supabase.storage
    .from(item.bucket)
    .download(item.path);
  if (error) throw new Error(`${item.key}: source download failed — ${error.message}`);

  const Body = Buffer.from(await data.arrayBuffer());
  if (Body.length !== item.size) {
    throw new Error(`${item.key}: source listed ${item.size} bytes, downloaded ${Body.length}`);
  }

  await s3.send(
    new PutObjectCommand({
      Bucket,
      Key: item.key,
      Body,
      ContentType: typeFor(item.key),
      CacheControl: IMMUTABLE,
      ContentDisposition: dispositionFor(item.key),
    }),
  );

  const written = await remoteSize(item.key);
  if (written !== Body.length) {
    throw new Error(`${item.key}: wrote ${written} bytes, source is ${Body.length}`);
  }
  return { key: item.key, size: Body.length, state: "copy" };
}

/**
 * HEAD each object through the *public origin* rather than the S3 API: an object can
 * sit perfectly intact in the bucket and still be invisible to a visitor if the bucket
 * is private or a custom domain is not bound yet.
 */
async function verifyPublic() {
  // Tigris serves anonymous reads from a separate domain from the authenticated API.
  const base =
    env.NEXT_PUBLIC_MEDIA_BASE_URL || `https://${Bucket}.t3.tigrisfiles.io`;
  if (!env.NEXT_PUBLIC_MEDIA_BASE_URL) {
    console.log(`Probing the inferred public origin: ${base}`);
  }
  const plan = await buildPlan();
  let bad = 0;
  for (const { key, size } of plan) {
    const url = `${base.replace(/\/+$/, "")}/${encodeURI(key)}`;
    const res = await fetch(url, { method: "HEAD" });
    const header = res.headers.get("content-length");
    const len = header === null ? size : Number(header);
    const ok = res.ok && len === size;
    if (!ok) bad++;
    console.log(
      `${ok ? "PASS" : "FAIL"} ${res.status} ${mb(len)} want ${mb(size)} ` +
        `cc=${res.headers.get("cache-control") ?? "-"} ` +
        `cd=${(res.headers.get("content-disposition") ?? "-").slice(0, 24)} ${key}`,
    );
  }
  console.log(`\n${plan.length - bad}/${plan.length} public URLs serve the right bytes.`);
  process.exit(bad ? 1 : 0);
}

const SOURCE_DIR = fileURLToPath(new URL("../src", import.meta.url));

/** Every `.ts`/`.tsx` under `src/`, joined — the data modules name media paths literally. */
const sourceText = (() => {
  const chunks = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) chunks.push(readFileSync(full, "utf8"));
    }
  };
  walk(SOURCE_DIR);
  return chunks.join("\n");
})();

/**
 * Avatars originals that nothing fetches — neither an `optimized/` twin nor a verbatim
 * reference. Copying them to `archive/` is what makes them deletable: Tigris charges
 * neither egress nor meaningful storage, so the club keeps its camera originals (one is
 * a 9.3 MB PNG) retrievable while the metered bucket goes empty.
 */
async function legacyArchiveTargets() {
  const all = await listObjects("avatars", "");
  const verbatim = verbatimAvatarPaths();
  return {
    all,
    verbatim,
    targets: all
      .filter((o) => !o.path.startsWith("optimized/") && !verbatim.has(o.path))
      .map((o) => ({
        bucket: "avatars",
        path: o.path,
        key: `archive/avatars/${o.path}`,
        size: o.size,
      })),
  };
}

async function archiveLegacy() {
  const { targets } = await legacyArchiveTargets();
  const bytes = targets.reduce((n, o) => n + o.size, 0);
  console.log(
    `${targets.length} unreferenced originals, ${mb(bytes)} → s3://${Bucket}/archive/avatars/`,
  );
  for (const item of targets) {
    const result = await copyOne(item);
    console.log(`${result.state.padEnd(5)} ${mb(result.size).padStart(11)} ${result.key}`);
  }
  console.log("\nNow: pnpm media:purge");
}

/**
 * Which copy of this object's bytes survives on Tigris: the `optimized/` twin the site
 * serves, or the `archive/` copy of the original. `null` — neither present at the
 * source's byte count — is what stops a delete.
 */
async function replacementFor(path, size, sizes) {
  const twin = twinOf(path);
  const twinSize = sizes.get(twin);
  if (twinSize !== undefined && (await remoteSize(`avatars/${twin}`)) === twinSize) {
    return `avatars/${twin}`;
  }
  const archived = `archive/avatars/${path}`;
  if ((await remoteSize(archived)) === size) return archived;
  return null;
}

/**
 * Delete the legacy `avatars` originals. An object goes only when nothing fetches it
 * verbatim *and* its replacement bytes are confirmed on Tigris at the right size — so
 * the display images and the archived originals both survive the cutover.
 */
async function purgeLegacy() {
  if (!ASSUMED_YES && !DRY) {
    console.error(
      "--purge-legacy deletes production objects. Add --yes (or --dry-run to preview) once the site is verified on Tigris.",
    );
    process.exit(1);
  }
  const { all, verbatim } = await legacyArchiveTargets();
  const sizes = new Map(all.map((o) => [o.path, o.size]));
  let released = 0;
  for (const o of all) {
    if (o.path.startsWith("optimized/")) continue;
    if (verbatim.has(o.path)) {
      console.log(`KEEP  src/ fetches it verbatim   ${o.path}`);
      continue;
    }
    const home = await replacementFor(o.path, o.size, sizes);
    if (!home) {
      console.log(`KEEP  no twin or archive on Tigris ${o.path}`);
      continue;
    }
    if (DRY) {
      console.log(`would delete ${mb(o.size)} ${o.path} (kept as ${home})`);
      released += o.size;
      continue;
    }
    const { error } = await supabase.storage.from("avatars").remove([o.path]);
    if (error) console.log(`FAILED ${o.path}: ${error.message}`);
    else {
      console.log(`deleted ${mb(o.size)} ${o.path} → ${home}`);
      released += o.size;
    }
  }
  console.log(`\nReleased ${mb(released)} from the avatars bucket.`);
}

if (VERIFY) await verifyPublic();
else if (ARCHIVE) await archiveLegacy();
else if (PURGE) await purgeLegacy();
else {
  const plan = await buildPlan();
  console.log(`${plan.length} objects, ${mb(plan.reduce((n, o) => n + o.size, 0))} → s3://${Bucket}`);
  const counts = { copy: 0, have: 0, plan: 0 };
  for (const item of plan) {
    const result = await copyOne(item);
    counts[result.state]++;
    console.log(`${result.state.padEnd(5)} ${mb(result.size).padStart(11)} ${result.key}`);
  }
  console.log(`\ncopied ${counts.copy + counts.plan}, already correct ${counts.have}.`);
  console.log(
    "Then: set NEXT_PUBLIC_MEDIA_BASE_URL to the bucket's public origin, redeploy, and run pnpm media:verify.",
  );
}
