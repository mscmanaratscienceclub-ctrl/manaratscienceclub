#!/usr/bin/env node
/**
 * One-off bucket asset optimiser.
 *
 * Reads every content-image path referenced in `src/lib/data/index.ts`, downloads the
 * original, re-encodes it as WebP at the size it is actually displayed (2x, for retina),
 * and uploads it under `avatars/optimized/` in the **Tigris** media bucket with an
 * immutable one-year cache-control — since the 2026-10-12 offload that is the host the
 * site reads, so writing a twin anywhere else produces an image nobody serves.
 *
 * Sources are tried in that order: the media bucket, its `archive/` copy of pre-cutover
 * uploads, then Supabase (where an original may still be staged before `media:migrate`).
 *
 * Why: the originals are 0.5-9 MB PNGs of photographs. Rendering them through
 * the Next.js optimizer makes Vercel re-transform each one on cache expiry
 * (metered as "image transformations"), and rendering them raw ships ~23 MB
 * per page. Pre-optimising at write time removes both problems — the assets
 * are already the right bytes, so nothing ever needs transforming.
 *
 * Non-destructive: originals are left in place. Re-run any time; existing
 * optimised objects are skipped unless --force is passed.
 *
 *   node scripts/optimize-bucket-images.mjs --dry-run   # report only
 *   node scripts/optimize-bucket-images.mjs             # upload
 *   node scripts/optimize-bucket-images.mjs --force     # re-encode + overwrite
 */

import { readFileSync } from "node:fs";
import process from "node:process";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const BUCKET = "avatars";
const TARGET_PREFIX = "optimized/";
const DATA_FILE = new URL("../src/lib/data/index.ts", import.meta.url);
/** What the CDN needs to see, so a twin is fetched once and never revalidated. */
const IMMUTABLE = "public, max-age=31536000, immutable";

/** Display profiles keyed by source folder: [maxWidth, maxHeight, quality]. */
const PROFILES = {
  // chroma-grid cards render at 320px -> serve 640px for retina.
  default: { width: 640, height: 640, quality: 78 },
  // bento grid cells — largest spans 2x2 (~360-500px per axis at 2x for retina).
  stemfest: { width: 800, height: 800, quality: 82 },
};

const argv = process.argv.slice(2);
const args = new Set(argv.filter((a) => !a.startsWith("--only")));
const dryRun = args.has("--dry-run");
const force = args.has("--force");
/** `--only <path>` limits the run to one source object, to test a single re-encode. */
const only =
  argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) ??
  (argv.includes("--only") ? argv[argv.indexOf("--only") + 1] : undefined);

function loadEnv(file) {
  const env = {};
  let raw;
  try {
    raw = readFileSync(new URL(file, import.meta.url), "utf8");
  } catch {
    return env; // file absent — this project keeps its secrets in `.env`.
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = {
  ...loadEnv("../.env"),
  ...loadEnv("../.env.local"),
  ...process.env,
};
const mediaBucket = env.AWS_S3_BUCKET || env.TIGRIS_BUCKET;
if (!mediaBucket || !env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
  console.error(
    "Missing AWS_S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in .env — " +
      "twins are written to the Tigris media bucket, because that is the host the site reads.",
  );
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: env.AWS_ENDPOINT_URL_S3 || "https://t3.storage.dev",
  region: env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// Supabase is a fallback *source* only — an original staged there by the club's old
// upload habit is still readable. It is no longer a destination: nothing renders from it.
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabase =
  url && supabaseKey
    ? createClient(url, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

/** Bytes already stored for a twin, or `null` when it does not exist yet. */
async function twinSize(key) {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: mediaBucket, Key: key }));
    return head.ContentLength ?? 0;
  } catch {
    return null;
  }
}

/**
 * Read an original from whichever home still holds it: the media bucket itself, the
 * `archive/` copy of a pre-cutover upload, or Supabase.
 *
 * The archive is checked because `media:retire` emptied Supabase and archived the camera
 * originals rather than destroying them — without this the script could no longer
 * re-encode a single existing image.
 */
async function readOriginal(sourcePath) {
  for (const key of [
    `${BUCKET}/${sourcePath}`,
    `archive/${BUCKET}/${sourcePath}`,
  ]) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: mediaBucket, Key: key }));
      return new Uint8Array(await res.Body.transformToByteArray());
    } catch {
      // absent here — try the next home
    }
  }
  if (supabase) {
    const response = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${sourcePath}`);
    if (response.ok) return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error(`original absent from ${mediaBucket} (avatars/ and archive/avatars/) and Supabase`);
}

const source = readFileSync(DATA_FILE, "utf8");
// `src/lib/data` names images through `contentImage("…")`; the absolute-URL pattern is
// kept so any legacy call site is still picked up.
const paths = [
  ...source.matchAll(/contentImage\("([^"]+)"\)/g),
  ...source.matchAll(/object\/public\/avatars\/([^"'\s)]+)/g),
]
  .map((m) => decodeURIComponent(m[1]))
  .filter((p) => !p.startsWith(TARGET_PREFIX))
  // Already-small uploads are served verbatim by contentImage — encoding a
  // `x.webp.webp` copy would only add unused objects to the bucket.
  .filter((p) => !/\.(webp|avif)$/i.test(p));
const allPaths = [...new Set(paths)].sort();
const uniquePaths = only
  ? allPaths.filter((p) => p === only || p.endsWith(only))
  : allPaths;
if (only && uniquePaths.length === 0) {
  console.error(`--only "${only}" matches none of the ${allPaths.length} referenced paths`);
  process.exit(1);
}

console.log(`\n${uniquePaths.length} source objects referenced in src/lib/data/index.ts\n`);

const rows = [];
let totalBefore = 0;
let totalAfter = 0;
let failures = 0;

for (const sourcePath of uniquePaths) {
  const folder = sourcePath.includes("/") ? sourcePath.split("/")[0] : "default";
  const profile = PROFILES[folder] ?? PROFILES.default;
  // Keep the original extension in the name: `ajmain.png` and `ajmain.jpg` are
  // two different people's photos and must not collide on one target.
  const targetPath = TARGET_PREFIX + sourcePath.replace(/\.([^.]+)$/, ".$1.webp");

  try {
    const existing = await twinSize(`${BUCKET}/${targetPath}`);

    if (existing !== null && !force) {
      rows.push({ sourcePath, targetPath, before: 0, after: existing, status: "skip" });
      continue;
    }

    const original = await readOriginal(sourcePath);

    const { data: optimised, info } = await sharp(original, { failOn: "none" })
      .rotate()
      .resize({
        width: profile.width,
        height: profile.height,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: profile.quality, effort: 6, metadata: "none" })
      .toBuffer({ resolveWithObject: true });

    if (!dryRun) {
      await s3.send(
        new PutObjectCommand({
          Bucket: mediaBucket,
          Key: `${BUCKET}/${targetPath}`,
          Body: Buffer.from(optimised),
          ContentType: "image/webp",
          CacheControl: IMMUTABLE,
        }),
      );
    }

    totalBefore += original.byteLength;
    totalAfter += optimised.byteLength;
    rows.push({
      sourcePath,
      targetPath,
      before: original.byteLength,
      after: optimised.byteLength,
      dims: `${info.width}x${info.height}`,
      status: dryRun ? "dry-run" : "ok",
    });
  } catch (error) {
    failures += 1;
    // sharp's bundled libheif has no HEVC decoder here, so a phone HEIC cannot be
    // re-encoded by this script at all. Without the hint the failure reads as a bug.
    const hint = /\.heic?$/i.test(sourcePath)
      ? " — HEIC: decode once with `ffmpeg -i in.heif -frames:v 1 out.png`, then write " +
        "out.png up as the optimized/ twin on Tigris"
      : "";
    rows.push({ sourcePath, targetPath, status: `FAIL ${error.message}${hint}` });
  }
}

const kb = (bytes) => (bytes / 1024).toFixed(0).padStart(7);
for (const row of rows) {
  if (row.status === "skip") {
    console.log(`  skip    ${kb(row.after)} KB  ${row.targetPath}`);
  } else if (row.before) {
    const pct = (100 - (row.after / row.before) * 100).toFixed(1);
    console.log(
      `  ${row.status.padEnd(7)} ${kb(row.before)} -> ${kb(row.after)} KB  (-${pct}%, ${row.dims})  ${row.targetPath}`,
    );
  } else {
    console.log(`  ${row.status.padEnd(7)} ${row.sourcePath}`);
  }
}

if (totalBefore) {
  console.log(
    `\nProcessed: ${(totalBefore / 1048576).toFixed(1)} MB -> ${(totalAfter / 1048576).toFixed(2)} MB ` +
      `(${(100 - (totalAfter / totalBefore) * 100).toFixed(1)}% smaller)`,
  );
}
if (dryRun) console.log("\nDry run — nothing uploaded.");
if (failures) {
  console.error(`\n${failures} object(s) failed.`);
  process.exit(1);
}
