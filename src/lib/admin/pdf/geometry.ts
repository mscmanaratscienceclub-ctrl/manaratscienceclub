/**
 * Page geometry for a report PDF.
 *
 * Everything is declared in millimetres and converted to points, because the
 * print stylesheet this document is built to match works in mm — `18mm 14mm
 * 16mm` of padding and a `0.35mm` rule are its numbers, not ours to round.
 */

/** Points in a millimetre. */
const POINTS_PER_MM = 72 / 25.4;

/** A length in millimetres, as points. */
export function pt(mm: number): number {
  return mm * POINTS_PER_MM;
}

export interface PageSize {
  width: number;
  height: number;
}

/** A4 portrait — 210 × 297 mm. */
export const A4_PORTRAIT: PageSize = { width: pt(210), height: pt(297) };

/** A4 landscape — 297 × 210 mm, the same sheet turned. */
export const A4_LANDSCAPE: PageSize = { width: pt(297), height: pt(210) };

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * `[data-print="report"]`'s `padding: 18mm 14mm 16mm`.
 *
 * With `@page { margin: 0 }` that padding *is* the paper's margin, which is why
 * a hand-drawn page starts here rather than at the sheet edge.
 */
export const REPORT_MARGINS: Margins = {
  top: pt(18),
  right: pt(14),
  bottom: pt(16),
  left: pt(14),
};

/**
 * The rectangle content may be drawn in.
 *
 * pdf-lib's origin is the page's bottom-left corner and `y` grows upward, so
 * `top` is the largest `y` and `bottom` the smallest one still on the sheet —
 * a cursor walks from `top` down toward `bottom`.
 */
export interface ContentBox {
  /** x of the left edge. */
  x: number;
  /** Width available to every line. */
  width: number;
  /** y of the top edge, where the first line sits. */
  top: number;
  /** y a line's baseline may not go below. */
  bottom: number;
  /** Height between `top` and `bottom`. */
  height: number;
}

export function contentBox(size: PageSize, margins: Margins): ContentBox {
  const width = size.width - margins.left - margins.right;
  const height = size.height - margins.top - margins.bottom;
  return {
    x: margins.left,
    width,
    top: size.height - margins.top,
    bottom: margins.bottom,
    height,
  };
}

/**
 * Cell padding, as the stylesheet gives it: `th`'s `2mm 2.2mm` and `td`'s
 * `1.7mm 2.2mm`. The heading band is taller than a data row by design.
 */
export const CELL_PADDING = {
  head: { vertical: pt(2), horizontal: pt(2.2) },
  row: { vertical: pt(1.7), horizontal: pt(2.2) },
} as const;

/** A table's right-hand choice of sheet, mirroring the spreadsheet's. */
export function pageWidthFor(columnCount: number): PageSize {
  // The `.xlsx` goes landscape from six columns (`LANDSCAPE_FROM_COLUMNS` in
  // `src/lib/admin/exports.ts`); a PDF of the same rows should not be the one
  // document that makes an admin turn the page sideways themselves.
  return columnCount >= 6 ? A4_LANDSCAPE : A4_PORTRAIT;
}
