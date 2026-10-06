/**
 * THROWAWAY SPIKE — what the two-face PDF actually looks like.
 *
 * Run: node scripts/spike/pdf-face-spike.mjs
 *
 * Embeds the repo's own `GeistVF.woff` for Latin and a Noto Sans Bengali TTF
 * for the `৳` sign and Bengali names, then writes a page that mimics a report
 * row so the result can be opened in a browser and looked at.
 *
 * The point is not bytes — it is whether Geist survives subsetting intact and
 * whether the Bengali name reads correctly without HarfBuzz.
 */
import "regenerator-runtime";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

const geistBytes = new Uint8Array(
  readFileSync(join(root, "src", "app", "fonts", "GeistVF.woff")),
);
const bengaliBytes = new Uint8Array(
  readFileSync(join(here, "..", "..", "src", "lib", "admin", "pdf", "fonts", "NotoSansBengali.ttf")),
);

const BANGLA = /[\u0980-\u09ff\u09f3]/;

const doc = await PDFDocument.create();
doc.registerFontkit(fontkit);
const geist = await doc.embedFont(geistBytes, { subset: true });
const bengali = await doc.embedFont(bengaliBytes, { subset: true });

const page = doc.addPage([595.28, 841.89]);
const ink = rgb(0.08, 0.1, 0.11);

/** Draws `text`, switching face per run so `৳` and Bengali come from Noto. */
function draw(text, x, y, size) {
  let cursor = x;
  for (const run of text.split(/(?=[\u0980-\u09ff\u09f3])|(?<=[\u0980-\u09ff\u09f3])/)) {
    if (!run) continue;
    const font = BANGLA.test(run) ? bengali : geist;
    page.drawText(run, { x: cursor, y, size, font, color: ink });
    cursor += font.widthOfTextAtSize(run, size);
  }
  return cursor - x;
}

const L = [
  ["STEM Fest Registrations — Manarat Science Club", 14],
  ["Generated 06 Oct 2026 · 431 registrations · filtered by Event is LFR (Line Following Robot)", 8],
  ["ID          Student            Class   School / college                 Amount      TrxID", 8],
  ["MSC-F093    Ayesha Rahman      9       Adamjee Cantonment College       ৳1,450.00   DIL9QJMSOF", 9],
  ["MSC-F094    সাকিব আহমেদ        10      Notre Dame College               ৳1,500.00   8KJ2M9PLQ1", 9],
  ["MSC-F095    Rafiul Karim       —       Notre Dame College               ৳0.00       —", 9],
  ["Tomorrow's forecast: 6 entries, ± 2 — the larger of the week's scatter and a fifth of the figure.", 9],
  ["ম্যাথমেটিকস · সাধারণ বিজ্ঞান · লেজুড় রোবট ·ইএফসি ২৬", 10],
];

let y = 790;
for (const [text, size] of L) {
  draw(text, 40, y, size);
  y -= size * 2.1;
}

// Rules and a bar, to check the vector primitives the brief needs.
page.drawRectangle({ x: 40, y: y + 10, width: 515, height: 0.6, color: rgb(0.55, 0.6, 0.59) });
for (const [i, v] of [3, 7, 5, 11, 9, 2].entries()) {
  page.drawRectangle({
    x: 50 + i * 60,
    y: 300,
    width: 34,
    height: v * 12,
    color: rgb(0.13, 0.42, 0.36),
  });
}
draw("7-day trend, daily entries (Mon–Sun)", 50, 285, 8);

const bytes = await doc.save({ useObjectStreams: false });
const out = join(root, "public", "pdf-spike-sample.pdf");
writeFileSync(out, bytes);
console.log(
  `wrote ${out} — ${(bytes.length / 1024).toFixed(1)} KB, fonts: ${geist.name} + ${bengali.name}`,
);
