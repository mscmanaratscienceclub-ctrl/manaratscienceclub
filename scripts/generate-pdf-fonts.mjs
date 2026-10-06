/**
 * Generates `src/lib/admin/pdf/font-bytes.ts` — the two faces a report PDF is
 * set in, as base64.
 *
 * Run: pnpm fonts:pdf
 *
 * Base64 rather than a file read at run time, because the deployed function's
 * filesystem is not this directory. `next build` traces JavaScript; a
 * `readFileSync` of a font beside it resolves to nothing in the serverless
 * bundle, and a report that 500s for want of a glyph is the failure this whole
 * feature exists to end. Inlined bytes are the one form that survives every
 * runtime, at the cost of a large generated file — which is why `pdf:verify`
 * checks it still matches the sources.
 *
 * The two faces and why both are needed:
 *
 *   Geist       `src/app/fonts/GeistVF.woff` — the face `--font-sans` already
 *              renders the panel and the print sheet in, so the PDF matches the
 *              screen. Carries every Latin character the reports set, plus the
 *              em dash, the subtraction sign, the middot and the curly quotes
 *              the formatters emit. Has no `৳` and no Bengali.
 *   Noto Sans
 *   Bengali    `src/lib/admin/pdf/fonts/NotoSansBengali.ttf` — the taka sign on
 *              every amount cell, and the handful of Bengali names in the
 *              register. SIL OFL 1.1; the licence ships beside it and must
 *              travel with the font.
 *
 * Idempotent: re-running with unchanged fonts rewrites identical content.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const SOURCES = [
  {
    name: "GEIST_WOFF_BASE64",
    label: "Geist (variable woff)",
    file: join(root, "src", "app", "fonts", "GeistVF.woff"),
  },
  {
    name: "NOTO_SANS_BENGALI_TTF_BASE64",
    label: "Noto Sans Bengali (variable ttf)",
    file: join(root, "src", "lib", "admin", "pdf", "fonts", "NotoSansBengali.ttf"),
  },
];

const out = join(root, "src", "lib", "admin", "pdf", "font-bytes.ts");

const body = SOURCES.map(({ name, label, file }) => {
  const bytes = readFileSync(file);
  const kb = (bytes.length / 1024).toFixed(0);
  return [
    `/** ${label} — ${relative(root, file)} (${kb} KB). */`,
    `export const ${name}: string =`,
    `  "${bytes.toString("base64")}";`,
  ].join("\n");
}).join("\n\n");

const content = `/**
 * GENERATED — do not edit. Run \`pnpm fonts:pdf\` to rebuild.
 *
 * The two faces a report PDF is set in, as base64 strings, for the reason given
 * in <root>/scripts/generate-pdf-fonts.mjs: a deployed Next function cannot
 * read a font from disk, so the bytes have to be in the bundle that runs.
 */

${body}
`;

writeFileSync(out, content);
console.log(
  `wrote ${relative(root, out)} — ${(content.length / 1024).toFixed(0)} KB`,
);
