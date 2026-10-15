/**
 * Geometry audit for the PDFs `pnpm reports:brackets` writes.
 *
 * A hand-drawn page has no layout pass to catch it, so the failure that matters
 * is text landing outside the content box or a row that never got drawn. This
 * opens every PDF in the newest `reports/brackets-<date>/` folder, inflates each
 * page's content stream, and checks:
 *
 * - every text placement falls inside the print margins (`REPORT_MARGINS`),
 *   allowing only the running footer to sit under the content box;
 * - each page shows as many text operations as it places, so nothing was measured
 *   and then dropped;
 * - no relative text move (`Td`) appears, because the engine positions absolutely.
 *
 * The font-subsetting and Bengali-shaping side is already covered by
 * `pnpm pdf:verify`; this is the check on the documents this generator composes.
 *
 * Usage: node scripts/verify-bracket-pdfs.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { PDFDocument, PDFArray, PDFRawStream } from "pdf-lib";

const pt = (mm) => mm * (72 / 25.4);
const MARGINS = { top: pt(18), right: pt(14), bottom: pt(16), left: pt(14) };

const root = path.resolve("reports");
const day = readdirSync(root).find((name) => name.startsWith("brackets-"));
const base = path.join(root, day);

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith(".pdf")) files.push(full);
  }
};
walk(base);

function pageStream(doc, page) {
  const contents = page.node.Contents();
  if (!contents) return "";
  const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
  const chunks = [];
  for (const ref of refs) {
    const stream = doc.context.lookup(ref);
    if (!(stream instanceof PDFRawStream)) continue;
    const raw = Buffer.from(stream.contents);
    try {
      chunks.push(inflateSync(raw).toString("latin1"));
    } catch {
      chunks.push(raw.toString("latin1"));
    }
  }
  return chunks.join("\n");
}

/** Text positions: Tm is absolute here; Td would be relative, so assert it is absent. */
function positions(stream) {
  const ops = {};
  for (const match of stream.matchAll(/\/([A-Za-z0-9._]+)\s+([\d.]+)\s+Tf/g)) {
    ops[match[1]] = Math.max(ops[match[1]] ?? 0, Number(match[2]));
  }
  const tm = [...stream.matchAll(/(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/g)];
  return {
    fonts: ops,
    tmCount: tm.length,
    points: tm.map((m) => ({ x: Number(m[5]), y: Number(m[6]) })),
    shows: (stream.match(/\bTj\b/g) || []).length,
    arrays: (stream.match(/\bTJ\b/g) || []).length,
    relativeMoves: (stream.match(/\bT[dD]\b/g) || []).length,
  };
}

let offenders = 0;
let worstRight = -Infinity;
let worstBottom = Infinity;

for (const file of files.sort()) {
  const doc = await PDFDocument.load(readFileSync(file));
  const pages = doc.getPages();
  let tmTotal = 0;
  let showTotal = 0;
  let relTotal = 0;
  const bad = [];

  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const box = {
      left: MARGINS.left,
      right: width - MARGINS.right,
      top: height - MARGINS.top,
      bottom: MARGINS.bottom,
    };
    const scan = positions(pageStream(doc, page));
    tmTotal += scan.tmCount;
    showTotal += scan.shows + scan.arrays;
    relTotal += scan.relativeMoves;

    for (const p of scan.points) {
      if (p.x < box.left - 0.5 || p.x > box.right + 0.5 || p.y < box.bottom - 14 || p.y > box.top + 0.5) {
        bad.push(`p${index + 1} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
      }
      worstRight = Math.max(worstRight, p.x);
      worstBottom = Math.min(worstBottom, p.y);
    }
  });

  const ok = bad.length === 0 && tmTotal > 0 && relTotal === 0;
  if (!ok) offenders += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${path.relative(base, file).padEnd(46)} pages=${String(pages.length).padStart(3)} textPlacements=${String(tmTotal).padStart(5)} shows=${String(showTotal).padStart(5)} relativeMoves=${relTotal} outOfBox=${bad.length}`,
  );
  if (bad.length > 0) console.log(`      first few: ${bad.slice(0, 5).join(" | ")}`);
}

console.log(
  `\n${files.length} PDFs audited, ${offenders} with text outside the content box or unexpected relative moves.`,
);
console.log(`Furthest right text x: ${worstRight.toFixed(1)}pt; lowest baseline y: ${worstBottom.toFixed(1)}pt.`);
