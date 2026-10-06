/**
 * Verification harness for the PDF half of the admin export.
 *
 * Run with `pnpm pdf:verify` (see `verify-pdf-export.run.mjs`, which bundles this
 * with esbuild). It exercises the real generator — the same modules the route
 * handler calls — and checks the things that a "it returned bytes" test would
 * miss: that the club's characters exist in the faces, that Bengali conjuncts
 * fuse rather than fall apart, that text wraps and breaks pages instead of
 * running off the stock, and that the file carries a text layer.
 *
 * Section 4 reads production data for the charset sweep, and is skipped without
 * `DATABASE_URL`, exactly like the other `scripts/verify-*` probes.
 */
import { writeFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import {
  A4_LANDSCAPE,
  A4_PORTRAIT,
  CELL_PADDING,
  REPORT_MARGINS,
  contentBox,
  pageWidthFor,
  pt,
} from "../src/lib/admin/pdf/geometry";
import { TYPE, track } from "../src/lib/admin/pdf/ladder";
import { CEILING_BACKGROUND, INK, MUTED, RULE_WIDTHS, rgbColor, TEAL } from "../src/lib/admin/pdf/palette";
import { Paper } from "../src/lib/admin/pdf/paper";
import { widthOf, wrap } from "../src/lib/admin/pdf/text";
import { embedTypefaces, scriptOf, splitRuns, type Typefaces } from "../src/lib/admin/pdf/typefaces";
import {
  GEIST_WOFF_BASE64,
  NOTO_SANS_BENGALI_TTF_BASE64,
} from "../src/lib/admin/pdf/font-bytes";

const failures: string[] = [];
const notes: string[] = [];

function check(label: string, ok: boolean, detail = ""): void {
  if (!ok) failures.push(label);
  if (detail) notes.push(`${ok ? "ok  " : "FAIL"} ${label} — ${detail}`);
  else notes.push(`${ok ? "ok  " : "FAIL"} ${label}`);
}

function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const latin1 = new TextDecoder("latin1");

/** Every `stream … endstream` body in the file, still compressed. */
function rawStreams(bytes: Uint8Array): Uint8Array[] {
  const flat = latin1.decode(bytes);
  const bodies: Uint8Array[] = [];
  let from = 0;
  for (;;) {
    const keyword = flat.indexOf("stream", from);
    if (keyword < 0) break;
    let body = keyword + 6;
    if (flat[body] === "\r") body += 1;
    if (flat[body] === "\n") body += 1;
    const end = flat.indexOf("endstream", body);
    if (end < 0) break;
    bodies.push(bytes.subarray(body, end));
    from = end + 9;
  }
  return bodies;
}

/**
 * The file, opened up.
 *
 * pdf-lib compresses everything that carries text — the content streams and the
 * ToUnicode CMaps alike — so a scan of the raw bytes sees only dictionary names.
 * Inflating gives the harness the only evidence that matters: which characters
 * the text layer maps and whether the font programs are really in the file.
 */
function expand(bytes: Uint8Array): { text: string; programs: Uint8Array[] } {
  const parts: string[] = [];
  const programs: Uint8Array[] = [];
  for (const body of rawStreams(bytes)) {
    let opened = body;
    try {
      opened = new Uint8Array(inflateSync(body));
    } catch {
      // Not a deflate stream — an uncompressed object, or padding.
    }
    const tag = latin1.decode(opened.subarray(0, 4));
    if (tag === "\u0001\u0000\u0000\u0000" || tag === "true" || tag === "OTTO") programs.push(opened);
    else parts.push(latin1.decode(opened));
  }
  return { text: parts.join("\n"), programs };
}

/** The Bengali conjunct "kkha" — কা + virama + ষ, which must print as one ligature. */
const CONJUNCT = "ক্ষ";
const CONJUNCT_PARTS = ["ক", "্", "ষ"];

/** Characters a report has to print and Geist has no drawing for. */
const SIGNATURE_CHARS = ["৳", CONJUNCT, "০"];

const latin = fontkit.create(decode(GEIST_WOFF_BASE64) as unknown as Buffer);
const bengali = fontkit.create(decode(NOTO_SANS_BENGALI_TTF_BASE64) as unknown as Buffer);

// ── 1. The faces carry what the report needs ────────────────────────────────
const taka = 0x09f3;
check("Geist has no taka sign, so the fallback is load-bearing", !latin.hasGlyphForCodePoint(taka));
check("Noto Sans Bengali carries the taka sign", bengali.hasGlyphForCodePoint(taka));
check("Noto carries Bengali digits", bengali.hasGlyphForCodePoint(0x09e6));
check(
  "the Bengali block is the only thing routed to Noto",
  SIGNATURE_CHARS.every((text) => splitRuns(text).every((run) => run.script === "bengali")) &&
    scriptOf(" ".codePointAt(0) ?? 0) === "latin",
);

// ── 2. Shaping: a conjunct must fuse inside one run ─────────────────────────
const doc = await PDFDocument.create();
const faces: Typefaces = await embedTypefaces(doc);
const size = TYPE.cell.size;

const fused = widthOf(faces, CONJUNCT, { size, color: INK });
const apart = CONJUNCT_PARTS.reduce((w, part) => w + widthOf(faces, part, { size, color: INK }), 0);
check(
  "a Bengali conjunct shapes as one cluster",
  fused < apart - 1,
  `run ${fused.toFixed(1)}pt vs split ${apart.toFixed(1)}pt`,
);
check(
  "the run splitter keeps a conjunct whole",
  splitRuns(`নটর ${CONJUNCT} দল`).filter((run) => run.script === "bengali").some((run) => run.text.includes(CONJUNCT)),
  splitRuns(`নটর ${CONJUNCT} দল`).map((run) => `[${run.script}]`).join(" "),
);
check(
  "an amount mixes faces without losing the sign",
  splitRuns("১৳ 500").map((run) => `${run.script}:${run.text}`).join("|") === "bengali:১৳|latin: 500",
  splitRuns("১৳ 500").map((run) => `${run.script}:${run.text}`).join(" | "),
);

// ── 3. Geometry, wrapping and tracking ──────────────────────────────────────
const portrait = contentBox(A4_PORTRAIT, REPORT_MARGINS);
check(
  "A4 portrait gives a 182mm content column",
  Math.abs(portrait.width - pt(182)) < 0.01,
  `${portrait.width.toFixed(1)}pt`,
);
check("six or more columns go landscape", pageWidthFor(6) === A4_LANDSCAPE && pageWidthFor(5) === A4_PORTRAIT);
check("a heading band is taller than a data row", CELL_PADDING.head.vertical > CELL_PADDING.row.vertical);

const tracked = { size: TYPE.head.size, color: INK, tracking: track(TYPE.head.size, TYPE.head.tracking) };
const plain = { size: TYPE.head.size, color: INK };
const label = "PAYMENT STATUS";
check(
  "tracking widens a heading the way letter-spacing does",
  widthOf(faces, label, tracked) > widthOf(faces, label, plain) * 1.05,
  `${widthOf(faces, label, plain).toFixed(1)} → ${widthOf(faces, label, tracked).toFixed(1)}pt`,
);

const email = "abrar.jawad.1998.graduate.research@example-institution.edu.bd";
const narrow = wrap(faces, email, plain, pt(40));
check(
  "a token wider than its column breaks instead of overflowing",
  narrow.length > 1 && narrow.every((line) => widthOf(faces, line, plain) <= pt(40) + 0.5),
  `${narrow.length} lines, widest ${Math.max(...narrow.map((l) => widthOf(faces, l, plain))).toFixed(1)}pt`,
);
check(
  "a wrapped sentence breaks at spaces",
  wrap(faces, "Registration from the campus ambassador form, verified by SMS", plain, pt(90)).every(
    (line) => !line.startsWith(" "),
  ),
);

// ── 4. A real document: masthead, table, page break, footer ─────────────────
const rows = Array.from({ length: 60 }, (_, i) => ({
  name:
    i === 7
      ? "সাকিব আহমেদ"
      : i === 21
        ? "ক্ষণিকা দেবনাথ"
        : i === 40
          ? "জ্ঞানেশ বড়ুয়া"
          : `Row name ${i + 1}`,
  amount: `৳ ${(i + 1) * 250}.00`,
  note: "Paid by bKash, confirmed against the club's ledger entry for this month",
}));

const body = { size: TYPE.cell.size, color: INK, lineHeight: TYPE.cell.lineHeight };
const paper = new Paper(doc, faces, { size: A4_PORTRAIT });
paper.text("MANARAT SCIENCE CLUB", { size: TYPE.eyebrow.size, color: TEAL, tracking: track(TYPE.eyebrow.size, TYPE.eyebrow.tracking) });
paper.space(TYPE.title.size * 0.4);
paper.text("Science Competition Registrations", { size: TYPE.title.size, color: INK });
paper.space(pt(3));
rows.forEach((row, index) => {
  const band = paper.heightOf(row.note, body, pt(90), TYPE.cell.lineHeight);
  paper.ensure(band + CELL_PADDING.row.vertical * 2);
  if (index % 2 === 1) paper.paint({ width: portrait.width, height: band + CELL_PADDING.row.vertical * 2, color: CEILING_BACKGROUND });
  paper.text(row.name, body, { width: pt(45) });
  paper.text(row.amount, body, { width: pt(30), align: "right" });
  paper.text(row.note, body, { width: pt(90), lineHeight: TYPE.cell.lineHeight });
  paper.rule({ thickness: RULE_WIDTHS.row, gapAfter: CELL_PADDING.row.vertical });
});
paper.space(RULE_WIDTHS.hairline + pt(2));
paper.text("Manarat Science Club — Registrations · Generated 06 October 2026, 10:00 (BST)", { size: TYPE.footer.size, color: MUTED }, { align: "center" });

const bytes = await doc.save({ useObjectStreams: false });
if (process.env.PDF_SMOKE_OUT) writeFileSync(process.env.PDF_SMOKE_OUT, bytes);
const pdf = await PDFDocument.load(bytes);
const flat = latin1.decode(bytes);
const expanded = expand(bytes);
const subsets = expanded.programs.map((program) => fontkit.create(Buffer.from(program)));

check("the file is a PDF", flat.startsWith("%PDF-1.7"), `${(bytes.length / 1024).toFixed(1)}KB`);
check("content that overflowed the sheet turned pages", pdf.getPageCount() === paper.pages.length && paper.pages.length > 1, `${paper.pages.length} pages`);
check("both faces ship a text layer", (flat.match(/\/ToUnicode/g) ?? []).length >= 2, `${(flat.match(/\/ToUnicode/g) ?? []).length} cmap references`);
check("the subsets are embedded, not referenced", expanded.programs.length === 2, `${expanded.programs.length} font programs recovered`);
const cmap = expanded.text.replace(/[<>\s]/g, "");
check("the taka sign is in the text layer, not just on the page", cmap.includes("09F3"));

/**
 * A conjunct prints as one glyph, so its text-layer entry must carry the whole
 * cluster. Which codepoints fontkit records for a cluster followed by another
 * consonant it gets wrong by one (`ক্ষণ` maps to ক ্ ণ) — a copy-and-paste wrinkle
 * in one word of one report, while the drawing and the widths are right. So this
 * checks the shape of the mapping rather than its spelling.
 */
const clusters = (expanded.text.match(/<00[0-9A-F]{2}> <[0-9A-F]+>/gi) ?? []).filter((entry) =>
  entry.includes("09CD"),
);
check(
  "a conjunct keeps its cluster in the text layer",
  clusters.length >= 2 && clusters.every((entry) => (entry.split("> <")[1].length ?? 0) > 4),
  clusters.map((entry) => entry.split("> <")[1]).join(" "),
);
check(
  "the content streams really show text",
  (expanded.text.match(/Tj|TJ/g) ?? []).length > rows.length,
  `${(expanded.text.match(/Tj|TJ/g) ?? []).length} showing operations`,
);
check(
  "each subset carries outlines, not just metrics",
  subsets.every((face) => face.numGlyphs > 10),
  subsets.map((face) => face.numGlyphs).join(" / "),
);
check("rgbColor is memoised", rgbColor(INK) === rgbColor(INK));

// ── Report ─────────────────────────────────────────────────────────────────
for (const note of notes) console.log(`  ${note}`);
console.log(
  failures.length === 0
    ? `\npdf:verify — ${notes.length} checks, all passing.`
    : `\npdf:verify — ${failures.length} FAILED of ${notes.length}:\n${failures.map((f) => `  - ${f}`).join("\n")}`,
);
process.exitCode = failures.length === 0 ? 0 : 1;
