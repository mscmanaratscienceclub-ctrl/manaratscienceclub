import type { PDFPage } from "pdf-lib";

import { rgbColor } from "./palette";
import { faceFor, scriptOf, splitRuns, type Typefaces } from "./typefaces";

/** One setting from the print ladder: a size, a colour, and optional tracking. */
export interface TypeStyle {
  /** Points. */
  size: number;
  /** `#rrggbb` from `palette.ts`. */
  color: string;
  /** Extra advance per character, in points — see `track()` in `ladder.ts`. */
  tracking?: number;
}

/**
 * How wide `text` is, tracking included.
 *
 * Tracked text is drawn one character at a time (see `drawLine`), so the
 * measurement adds the tracking between characters. CSS also puts a
 * `letter-spacing` after the last character; at these sizes it is a fifth of a
 * point, and dropping it is what keeps a right-aligned heading flush with the
 * figures under it.
 */
export function widthOf(typefaces: Typefaces, text: string, style: TypeStyle): number {
  if (!style.tracking) {
    return splitRuns(text).reduce(
      (width, run) => width + faceFor(typefaces, run.script).widthOfTextAtSize(run.text, style.size),
      0,
    );
  }
  let width = 0;
  for (const char of text) {
    const face = faceFor(typefaces, scriptOf(char.codePointAt(0) ?? 0));
    width += face.widthOfTextAtSize(char, style.size) + style.tracking;
  }
  return Math.max(0, width - (text.length > 0 ? style.tracking : 0));
}

/**
 * `text` broken to fit `maxWidth`, the way the browser would break a cell.
 *
 * Breaks happen at spaces. A single word wider than the column — an email
 * address, a long institution name — is cut at the last character that still
 * fits: the browser would widen the column instead, but a PDF page cannot grow,
 * and text running off the stock is the failure this generator exists to avoid.
 */
export function wrap(
  typefaces: Typefaces,
  text: string,
  style: TypeStyle,
  maxWidth: number,
): string[] {
  if (text === "") return [""];

  const lines: string[] = [];
  let line = "";
  const flush = () => {
    if (line !== "") lines.push(line);
    line = "";
  };

  for (const word of text.split(" ")) {
    if (word === "") continue;
    const joined = line === "" ? word : `${line} ${word}`;
    if (widthOf(typefaces, joined, style) <= maxWidth) {
      line = joined;
      continue;
    }
    flush();
    if (widthOf(typefaces, word, style) <= maxWidth) {
      line = word;
      continue;
    }
    let chunk = "";
    for (const char of word) {
      if (chunk !== "" && widthOf(typefaces, chunk + char, style) > maxWidth) {
        lines.push(chunk);
        chunk = "";
      }
      chunk += char;
    }
    line = chunk;
  }
  flush();

  return lines.length > 0 ? lines : [""];
}

/** Where a line starts: its left edge and its baseline. */
export interface LineAt {
  x: number;
  baseline: number;
}

/**
 * Draw one line, each run in the face that carries its characters.
 *
 * A tracked run is drawn a character at a time because pdf-lib has no
 * `letter-spacing`. Only Latin runs are tracked and only Latin runs are cut up,
 * so Bengali keeps its shaping — see the note on `splitRuns`.
 */
export function drawLine(
  page: PDFPage,
  typefaces: Typefaces,
  text: string,
  style: TypeStyle,
  at: LineAt,
): void {
  const color = rgbColor(style.color);
  let x = at.x;

  for (const run of splitRuns(text)) {
    const face = faceFor(typefaces, run.script);
    const tracking = run.script === "latin" ? (style.tracking ?? 0) : 0;

    if (tracking === 0) {
      page.drawText(run.text, {
        x,
        y: at.baseline,
        font: face,
        size: style.size,
        color,
      });
      x += face.widthOfTextAtSize(run.text, style.size);
      continue;
    }

    for (const char of run.text) {
      page.drawText(char, { x, y: at.baseline, font: face, size: style.size, color });
      x += face.widthOfTextAtSize(char, style.size) + tracking;
    }
  }
}
