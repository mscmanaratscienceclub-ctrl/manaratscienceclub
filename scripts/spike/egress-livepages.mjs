// Read-only probe of the LIVE site: what bytes does one visitor load per page?
const BASE = "https://manaratscience.club";
const PAGES = [
  "/", "/legacy", "/robotics", "/events", "/achievements", "/opportunities",
  "/syllabus", "/resources", "/rules", "/volunteer", "/blogs", "/join",
];

const sizeCache = new Map();
async function head(url) {
  if (sizeCache.has(url)) return sizeCache.get(url);
  try {
    let r = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!r.ok || r.headers.get("content-length") == null) {
      r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, redirect: "follow" });
    }
    const out = {
      status: r.status,
      bytes: Number(r.headers.get("content-length") ?? 0),
      cc: r.headers.get("cache-control"),
      cf: r.headers.get("x-storage-cf-id") || r.headers.get("cf-cache-status") || r.headers.get("x-vercel-cache"),
      type: r.headers.get("content-type"),
    };
    sizeCache.set(url, out);
    return out;
  } catch (e) {
    const out = { status: 0, bytes: 0, cc: String(e.message) };
    sizeCache.set(url, out);
    return out;
  }
}

const kb = (n) => (n / 1024).toFixed(0) + " KB";

let grandImages = 0;
for (const p of PAGES) {
  const html = await (await fetch(BASE + p, { redirect: "follow" })).text();
  const urls = [
    ...new Set(
      (html.match(/https:\/\/[^"'\\\s]+supabase\.co[^"'\\\s]*/g) ?? []).map((u) =>
        u.replace(/&amp;/g, "&").replace(/[)]$/, "")
      )
    ),
  ];
  const pdfs = [
    ...new Set(
      (html.match(/https:\/\/[^"'\\\s]+\/storage\/v1\/object\/public\/pdfs\/[^"'\\\s]+/g) ?? []).map(
        (u) => u.replace(/&amp;/g, "&")
      )
    ),
  ];
  const nextImgs = [
    ...new Set(
      (html.match(/\/_next\/image\?[^"'\s]+/g) ?? []).map((u) => BASE + u.replace(/&amp;/g, "&"))
    ),
  ];
  const supa = [...new Set([...urls.filter((u) => u.includes("/storage/v1/")), ...pdfs])];
  const results = await Promise.all([...supa, ...nextImgs].map(async (u) => ({ u, ...(await head(u)) })));
  const tot = results.reduce((s, r) => s + r.bytes, 0);
  grandImages += tot;
  const pageKb = (html.length / 1024).toFixed(0);
  console.log(
    `\n${p}  html=${pageKb} KB  storage/img refs=${results.length}  delivered=${kb(tot)}`
  );
  for (const r of results.sort((a, b) => b.bytes - a.bytes).slice(0, 6)) {
    console.log(
      `   ${kb(r.bytes).padStart(9)} ${String(r.status).padEnd(4)} cc=${String(r.cc).padEnd(22)} ${r.u.replace(/^https:\/\/[^/]+/, "").slice(0, 96)}`
    );
  }
  const bad = results.filter((r) => r.status >= 400);
  if (bad.length) console.log(`   !! ${bad.length} erroring refs: ${bad.map((b) => b.status + " " + b.u.slice(-60)).join(" | ")}`);
}
console.log(`\nTOTAL image/storage bytes across ${PAGES.length} pages: ${kb(grandImages)}`);
