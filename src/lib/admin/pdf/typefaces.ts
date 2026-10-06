import "regenerator-runtime";
import { PDFDocument, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import {
  GEIST_WOFF_BASE64,
  NOTO_SANS_BENGALI_TTF_BASE64,
} from "./font-bytes";

/**
 * The two faces a report is set in, and the one rule that decides which of them
 * draws any given character.
 *
 * Geist is the face `--font-sans` already renders the panel and the print sheet
 * in, so the PDF matches the screen. It has no `৳` and no Bengali, so Noto Sans
 * Bengali covers exactly those. Neither face is used for the other's characters,
 * which is why text is drawn in runs rather than in one call.
 *
 * `import "regenerator-runtime"` is load-bearing and belongs here rather than at
 * each call site: `@pdf-lib/fontkit` bundles a fontkit whose Indic shaping path
 * calls `regeneratorRuntime.mark` without ever defining it, so in Node 24 the
 * first Bengali word laid out throws `ReferenceError` and takes the whole
 * request with it. The package's only effect is to put that global back, and its
 * `sideEffects: true` keeps a bare import like this from being shaken out of the
 * production bundle.
 *
 * One weight, for both faces. They are variable fonts, but the fontkit bundled in
 * `@pdf-lib/fontkit` cannot bake an instance along the `wght` axis — its
 * `getVariation()` returns a face whose tables are missing — so a PDF gets the
 * default master, Regular. The ladder's 600 and 700 steps arrive as size,
 * tracking, capitalisation, colour and rules instead, which is how `ladder.ts`
 * and `palette.ts` define emphasis on paper.
 */

/** Which of the two faces draws a run. */
export type TypefaceScript = "latin" | "bengali";

export interface Typefaces {
  latin: PDFFont;
  bengali: PDFFont;
}

export interface TextRun {
  script: TypefaceScript;
  text: string;
}

/**
 * Base64 to bytes without `Buffer`.
 *
 * `atob` is in Node, the edge runtime and the browser alike; `Buffer` is only in
 * Node, and this module is imported by a builder that could run anywhere. The
 * cost is a per-byte loop over ~1.2 MB once per process — paid at first render,
 * never per page.
 */
function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const GEIST_WOFF_BYTES = decode(GEIST_WOFF_BASE64);
const BENGALI_TTF_BYTES = decode(NOTO_SANS_BENGALI_TTF_BASE64);

/**
 * The subset of a font face each script needs, in the form pdf-lib wants.
 *
 * Subsetting is on: a report draws a few hundred distinct characters out of
 * Geist and Noto, and shipping both full programs in every file would make a
 * four-row report heavier than the four rows it is about.
 */
export async function embedTypefaces(
  doc: PDFDocument,
): Promise<Typefaces> {
  doc.registerFontkit(fontkit);
  const [latin, bengali] = await Promise.all([
    doc.embedFont(GEIST_WOFF_BYTES, { subset: true }),
    doc.embedFont(BENGALI_TTF_BYTES, { subset: true }),
  ]);
  return { latin, bengali };
}

/**
 * The script a codepoint belongs to.
 *
 * `U+0980–U+09FF` is the Bengali block, which also holds the taka sign at
 * `U+09F3` — the one character in every amount cell that Geist cannot draw.
 * Anything else goes to the Latin face, including characters neither face
 * carries; those print as the missing-glyph box, and `pnpm pdf:verify` asserts
 * that no printed value needs one.
 */
export function scriptOf(codePoint: number): TypefaceScript {
  return codePoint >= 0x980 && codePoint <= 0x9ff ? "bengali" : "latin";
}

/**
 * Split `text` into maximal same-script runs.
 *
 * Grouping matters more than choosing. Shaping happens per `drawText` call, so a
 * base consonant and its virama must be in the *same* call or the conjunct never
 * forms and "ক্ষ" prints as three pieces instead of one ligature. Runs therefore
 * break between scripts, never inside a word: a space is Latin-script, which is
 * the one place a Bengali phrase may be cut, and a word still shapes whole.
 */
export function splitRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const char of text) {
    const script = scriptOf(char.codePointAt(0) ?? 0);
    const last = runs[runs.length - 1];
    if (last && last.script === script) {
      last.text += char;
    } else {
      runs.push({ script, text: char });
    }
  }
  return runs;
}

/** The face a run is drawn with. */
export function faceFor(typefaces: Typefaces, script: TypefaceScript): PDFFont {
  return script === "bengali" ? typefaces.bengali : typefaces.latin;
}

/**
 * How wide `text` is at `size`, summed over its runs.
 *
 * Measurement and drawing must agree exactly or columns drift, so both go
 * through `splitRuns` and the same face.
 */
export function measureWidth(
  typefaces: Typefaces,
  text: string,
  size: number,
): number {
  return splitRuns(text).reduce(
    (width, run) => width + faceFor(typefaces, run.script).widthOfTextAtSize(run.text, size),
    0,
  );
}
