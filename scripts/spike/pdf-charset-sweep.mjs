/**
 * THROWAWAY SPIKE — every glyph the PDF would have to print, and whether the
 * one candidate face carries it.
 *
 * Run: node --env-file=.env scripts/spike/pdf-charset-sweep.mjs
 *
 * Two sources, because a report is made of both:
 *   code  — non-ASCII characters in the admin prose and formatters
 *   data  — non-ASCII characters in the values the four sources print
 *
 * Anything missing from the face is a glyph that would print as tofu, so this
 * is the go/no-go on shipping exactly one TTF instead of a Latin face plus a
 * Bengali fallback.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import pdfLibFontkit from "@pdf-lib/fontkit";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const font = pdfLibFontkit.create(
  new Uint8Array(readFileSync(join(here, "..", "..", "src", "lib", "admin", "pdf", "fonts", "NotoSansBengali.ttf"))),
);

const sql = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

const codeChars = new Map();
const dataChars = new Map();

function note(map, ch, where) {
  const cp = ch.codePointAt(0);
  const list = map.get(cp) ?? { ch, places: [] };
  list.places.push(where);
  map.set(cp, list);
}

// ── 1. Non-ASCII in the code that renders the report ─────────────────────────
const SCAN_DIRS = [
  join(root, "src/lib/admin"),
  join(root, "src/components/admin"),
  join(root, "src/app/(routes)/(admin)/admin/reports"),
];

const files = [];
for (const dir of SCAN_DIRS) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    files.push(join(dir, entry.name));
  }
}

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const ch of text) {
    if (ch.codePointAt(0) > 0x7f) note(codeChars, ch, relative(root, file));
  }
}

// ── 2. Non-ASCII in the printed data ────────────────────────────────────────
const TABLES = [
  "stem_fest_registrations",
  "campus_ambassador_registrations",
  "volunteer_registrations",
  "stem_fest_payment_sms",
];

for (const table of TABLES) {
  const cols = await sql`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = ${table} and data_type = 'text'
  `;
  for (const col of cols) {
    const rows = await sql`
      select ${sql(col.column_name)} as v from ${sql(table)}
      where ${sql(col.column_name)} ~ '[^ -~]'
    `;
    for (const row of rows) {
      for (const ch of String(row.v ?? "")) {
        if (ch.codePointAt(0) > 0x7f) note(dataChars, ch, `${table}.${col.column_name}`);
      }
    }
  }
}
await sql.end();

// ── 3. Coverage ─────────────────────────────────────────────────────────────
const all = new Map([...codeChars, ...dataChars]);
const missing = [];

console.log(`\nNon-ASCII characters in the report's code: ${codeChars.size}`);
console.log(`Non-ASCII characters in the printed data:  ${dataChars.size}`);
console.log(`Union to cover:                            ${all.size}\n`);

for (const [cp, info] of [...all].sort((a, b) => a[0] - b[0])) {
  const has = font.hasGlyphForCodePoint(cp);
  if (!has) missing.push(cp);
  else continue;
}

if (missing.length === 0) {
  console.log("  All covered by Noto Sans Bengali.");
} else {
  console.log("  MISSING from the face:");
  for (const cp of missing) {
    const from = [
      codeChars.has(cp) ? `code(${codeChars.get(cp).places[0]})` : null,
      dataChars.has(cp) ? `data(${dataChars.get(cp).places[0]})` : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.log(
      `    U+${cp.toString(16).toUpperCase().padStart(4, "0")} "${String.fromCodePoint(cp)}" — ${from}`,
    );
  }
}

// How big is the printed Bengali problem, row-wise?
const bn = [...dataChars].filter(([cp]) => cp >= 0x0980 && cp <= 0x09ff);
console.log(
  `\n  Bengali codepoints in printed data: ${bn.length} → ${bn.map(([cp]) => `U+${cp.toString(16)}`).join(" ") || "none"}`,
);
