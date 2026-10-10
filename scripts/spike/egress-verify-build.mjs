// Verify the built pages emit exactly one URL per PDF and that each one resolves.
import { readFileSync, existsSync } from "node:fs";

const targets = {
  "/syllabus": ".next/server/app/syllabus.html",
  "/resources": ".next/server/app/resources.html",
};

const PDF_RE =
  /https:\/\/[^"'\\\s]+\/storage\/v1\/object\/public\/pdfs\/[^"'\\\s]+/g;

const all = new Map();

for (const [route, file] of Object.entries(targets)) {
  if (!existsSync(file)) {
    console.log(`MISSING BUILD OUTPUT: ${file}`);
    continue;
  }
  const html = readFileSync(file, "utf8");
  const found = (html.match(PDF_RE) ?? []).map((u) => u.replace(/&amp;/g, "&"));
  const uniq = [...new Set(found)];
  const objects = new Map();
  for (const u of uniq) {
    const key = decodeURIComponent(u.split("/pdfs/")[1].split("?")[0]);
    objects.set(key, [...(objects.get(key) ?? []), u]);
  }
  console.log(
    `\n${route}: ${found.length} link occurrences, ${uniq.length} distinct URLs, ${objects.size} documents`
  );
  for (const [key, urls] of objects) {
    const variants = urls.filter((u) => !u.endsWith("?download"));
    console.log(
      `   ${urls.length} URL(s) ${variants.length ? "<-- BARE TWIN: " + variants.join(" ") : ""}[${key}]`
    );
    for (const u of urls) all.set(u, key);
  }
}

console.log(`\n-- resolving the ${all.size} emitted URLs against Supabase --`);
for (const [u, key] of all) {
  const r = await fetch(u, { method: "GET", headers: { Range: "bytes=0-0" } });
  const cd = r.headers.get("content-disposition") ?? "";
  const total = (r.headers.get("content-range") ?? "").split("/")[1] ?? "?";
  console.log(
    `   ${String(r.status).padEnd(4)} ${String(Math.round(Number(total) / 1024)).padStart(6)} KB  disposition=${cd.slice(0, 14).padEnd(14)} ${key}`
  );
}
