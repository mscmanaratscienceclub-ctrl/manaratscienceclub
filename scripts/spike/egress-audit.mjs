// Read-only storage audit: bucket bytes + CDN cache headers. No writes.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [
      l.slice(0, l.indexOf("=")),
      l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, ""),
    ]),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function listAll(bucket) {
  const out = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list("", {
      limit: step,
      offset: from,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    const folders = data.filter((d) => d.id === null);
    out.push(...data.filter((d) => d.id !== null).map((d) => ({ path: d.name, ...d })));
    for (const f of folders) out.push(...(await listFolder(bucket, f.name)));
    if (data.length < step) break;
    from += step;
  }
  return out;
}

async function listFolder(bucket, prefix) {
  const out = [];
  let from = 0;
  const step = 1000;
  for (;;) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: step,
      offset: from,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) break;
    const folders = data.filter((d) => d.id === null);
    out.push(
      ...data
        .filter((d) => d.id !== null)
        .map((d) => ({ path: `${prefix}/${d.name}`, id: d.id, name: d.name, updated_at: d.updated_at, metadata: d.metadata })),
    );
    for (const f of folders) out.push(...(await listFolder(bucket, `${prefix}/${f.name}`)));
    if (data.length < step) break;
    from += step;
  }
  return out;
}

const kb = (n) => (n / 1024).toFixed(1);
const mb = (n) => (n / 1048576).toFixed(2);

for (const bucket of ["avatars", "pdfs"]) {
  const objs = await listAll(bucket);
  const bytesOf = (o) => Number(o.metadata?.size ?? 0);
  const total = objs.reduce((s, o) => s + bytesOf(o), 0);
  const groups = {};
  for (const o of objs) {
    const top = o.path.startsWith("optimized/") ? "optimized/*" : o.path.split("/")[0];
    groups[top] ??= { n: 0, b: 0 };
    groups[top].n += 1;
    groups[top].b += bytesOf(o);
  }
  console.log(`\n===== ${bucket} — ${objs.length} objects, ${mb(total)} MB =====`);
  for (const [g, v] of Object.entries(groups).sort((a, b) => b[1].b - a[1].b))
    console.log(`  ${g.padEnd(22)} ${String(v.n).padStart(4)} objs  ${mb(v.b).padStart(8)} MB`);
  const big = objs.filter((o) => bytesOf(o) > 300_000).sort((a, b) => bytesOf(b) - bytesOf(a));
  console.log(`  -- objects >300 KB: ${big.length}`);
  for (const o of big.slice(0, 25)) console.log(`     ${kb(bytesOf(o)).padStart(9)} KB  ${o.path}`);
}

// CDN cache headers on the things a visitor actually pulls
const urls = [
  "https://ipmdyrxfptdsulfhxjkb.supabase.co/storage/v1/object/public/pdfs",
];
const { data: pdfList } = await supabase.storage.from("pdfs").list("", { limit: 100 });
for (const f of pdfList?.filter((x) => x.id) ?? []) urls.push(`${urls[0]}/${encodeURIComponent(f.name)}`);

console.log("\n===== cache-control on pdfs objects =====");
for (const u of urls.slice(1, 12)) {
  try {
    const r = await fetch(u, { method: "GET", headers: { Range: "bytes=0-0" } });
    console.log(
      `  ${r.status} ${String(r.headers.get("cache-control")).padEnd(34)} ${r.headers.get("content-length") ?? "?"}B  ${decodeURIComponent(u.split("/public/")[1])}`
    );
  } catch (e) {
    console.log(`  ERR ${e.message} ${u}`);
  }
}
