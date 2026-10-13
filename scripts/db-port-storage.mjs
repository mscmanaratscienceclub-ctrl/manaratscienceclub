/**
 * Recreate the two Storage buckets on the target.
 *
 * There is nothing to copy: ADR-0041 records `pnpm media:retire` leaving `pdfs` and
 * `avatars` at 0 objects after every byte was verified on Tigris. The buckets
 * themselves must still exist, because `/api/upload` writes avatars into Supabase
 * (upload is ingress, which Supabase does not meter) and `src/lib/media.ts` builds
 * URLs against those two names.
 *
 * Buckets are created through the Storage REST API, never with
 * `insert into storage.buckets`: the API also applies the platform side of bucket
 * creation, and writing Supabase-owned rows by hand is how half-created buckets and
 * orphaned `storage.objects` policies appear.
 *
 * Usage
 *   pnpm db:port:storage:dry    print what would be created
 *   pnpm db:port:storage        create them, using the limits captured from the source
 *
 * Needs PORT_TARGET_SERVICE_ROLE_KEY — only the service role may create buckets.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  loadPortEnv,
  openPool,
  assertEndpoints,
  endpointEnv,
  projectRef,
  heading,
  fail,
  has,
  pinSession,
} from "./db-port-lib.mjs";

const env = loadPortEnv();
const DRY = has("dry-run");

const { sourceUrl, sourceRef, targetRef, liveRef } = endpointEnv(env);
const base = env.PORT_TARGET_PROJECT_URL || fail("PORT_TARGET_PROJECT_URL must be set");
const key = env.PORT_TARGET_SERVICE_ROLE_KEY || fail("PORT_TARGET_SERVICE_ROLE_KEY must be set");

assertEndpoints({ sourceRef, targetRef, liveRef });

const source = openPool(sourceUrl);
await pinSession(source, sourceUrl);

heading("bucket definitions measured on the source");
const buckets = await source`
  select id, name, public, file_size_limit, allowed_mime_types::text as mime_types
  from storage.buckets order by id`;

if (!buckets.length) fail("the source has no buckets — nothing to recreate");
for (const b of buckets)
  console.log(
    `  ${b.id.padEnd(10)} public=${b.public} limit=${b.file_size_limit ?? "(none)"} ` +
      `mime=${b.mime_types}`,
  );

// `media:retire` deleted the objects; the rows are the only thing that travels.
const objects = await source`
  select bucket_id, count(*)::int as n from storage.objects group by 1 order by 1`;
for (const o of objects)
  if (o.n > 0)
    console.log(`  ! ${o.bucket_id} still holds ${o.n} object(s) — this script does not move bytes`);

await source.end();

const wanted = buckets.map((b) => ({
  id: b.id,
  name: b.name,
  public: b.public,
  // file_size_limit is stored in bytes by the API but surfaced as a human string by
  // the dashboard; pass whatever the source actually holds.
  file_size_limit: b.file_size_limit ?? undefined,
  allowed_mime_types: b.mime_types ? JSON.parse(b.mime_types) : undefined,
}));

heading(DRY ? "dry run — nothing created" : "creating buckets on the target");
for (const bucket of wanted) {
  const existing = await fetch(`${base}/storage/v1/bucket/${bucket.id}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (existing.status === 200) {
    const found = await existing.json().catch(() => ({}));
    console.log(
      `  = ${bucket.id} already exists (public=${found.public}, limit=${found.file_size_limit}) — left alone`,
    );
    continue;
  }
  if (DRY) {
    console.log(`  + would create ${bucket.id}: ${JSON.stringify(bucket)}`);
    continue;
  }
  const res = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(bucket),
  });
  const body = await res.text();
  console.log(
    `  ${res.status === 200 || res.status === 201 ? "+ created" : "✗ failed"} ${bucket.id} → HTTP ${res.status} ${body.slice(0, 120)}`,
  );
  if (res.status !== 200 && res.status !== 201) process.exitCode = 1;
}

const runDir = join("db-port", readFileSync(join("db-port", "latest"), "utf8").trim());
if (existsSync(runDir))
  console.log(
    `\n  bucket definitions were captured into ${join(runDir, "90-buckets.json")} by db:port:capture.`,
  );
console.log("  next: pnpm db:port:probe — it uploads to avatars, reads it back, and deletes it.");
