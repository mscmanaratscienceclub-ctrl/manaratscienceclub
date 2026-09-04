#!/usr/bin/env node
/**
 * One-off bucket asset optimiser.
 *
 * Reads every Supabase object path referenced in `src/lib/data/index.ts`,
 * downloads the original, re-encodes it as WebP at the size it is actually
 * displayed (2x, for retina), and uploads it back into the same bucket under
 * `optimized/` with an immutable one-year cache-control.
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

const BUCKET = "avatars";
const TARGET_PREFIX = "optimized/";
const DATA_FILE = new URL("../src/lib/data/index.ts", import.meta.url);
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Display profiles keyed by source folder: [maxWidth, maxHeight, quality]. */
const PROFILES = {
  // chroma-grid cards render at 320px -> serve 640px for retina.
  default: { width: 640, height: 640, quality: 78 },
  // bento grid cells — largest spans 2x2 (~360-500px per axis at 2x for retina).
  stemfest: { width: 800, height: 800, quality: 82 },
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const force = args.has("--force");

function loadEnv(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = { ...loadEnv(new URL("../.env.local", import.meta.url)), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const source = readFileSync(DATA_FILE, "utf8");
const paths = [...source.matchAll(/object\/public\/avatars\/([^"'\s)]+)/g)]
  .map((m) => m[1])
  .filter((p) => !p.startsWith(TARGET_PREFIX));
const uniquePaths = [...new Set(paths)].sort();

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
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .exists(targetPath);

    if (existing && !force) {
      const { data: head } = await supabase.storage.from(BUCKET).info(targetPath);
      const afterBytes = head?.metadata?.size ?? 0;
      rows.push({ sourcePath, targetPath, before: 0, after: afterBytes, status: "skip" });
      continue;
    }

    const response = await fetch(`${url}/storage/v1/object/public/${BUCKET}/${sourcePath}`);
    if (!response.ok) throw new Error(`origin ${response.status}`);
    const original = new Uint8Array(await response.arrayBuffer());

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
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(targetPath, optimised, {
          contentType: "image/webp",
          cacheControl: String(ONE_YEAR),
          upsert: true,
        });
      if (error) throw new Error(`upload: ${error.message}`);
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
    rows.push({ sourcePath, targetPath, status: `FAIL ${error.message}` });
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
