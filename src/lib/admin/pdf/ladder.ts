import { pt } from "./geometry";

/**
 * The print type ladder and its rhythm, as numbers.
 *
 * Every value here is a declaration from the `@media print` block in
 * `src/app/globals.css`, named by the selector it comes from. A PDF has no
 * cascade, so the ladder is restated once, here, rather than sprinkled through
 * the document builders — the same reason `palette.ts` exists.
 *
 * `size` is in points (a PDF's own unit, which is why `7pt` needs no `pt()`);
 * gaps are millimetres from the stylesheet, converted on the way through.
 */

/** CSS `letter-spacing`, given in `em`, applied at a size. */
export function track(size: number, em: number): number {
  return size * em;
}

/** Steps used by a table report. `tracking` is in em, as the stylesheet spells it. */
export const TYPE = {
  /** `header p:first-child` — the eyebrow above the title. */
  eyebrow: { size: 7, tracking: 0.12 },
  /** `header h1`, `--print-title-size`. */
  title: { size: 16 },
  /** `header h1 ~ p` — the sentence under the title. */
  note: { size: 8.5, lineHeight: 1.4 },
  /** `header div > div:last-child p:first-child` and the scope `dt`. */
  label: { size: 6.5, tracking: 0.1 },
  /** `header div > div:last-child p` — the generated timestamp. */
  meta: { size: 7 },
  /** Scope `dd`. */
  body: { size: 8 },
  /** `thead th`. */
  head: { size: 7, tracking: 0.06 },
  /** `tbody td`. */
  cell: { size: 8, lineHeight: 1.35 },
  /** `[data-print="footer"]`. */
  footer: { size: 7 },
} as const;

/** Vertical rhythm, in points. */
export const RHYTHM = {
  /** `header { padding-bottom: 4mm }`, above its teal rule. */
  mastheadPad: pt(4),
  /** `header h1 { margin-top: 1.5mm }`. */
  titleGap: pt(1.5),
  /** `header h1 ~ p { margin-top: 1mm }`. */
  noteGap: pt(1),
  /** `header h1 ~ p { max-width: 120mm }`. */
  noteWidth: pt(120),
  /** `header div > div:last-child { padding-left: 4mm }`, right of its rule. */
  generatedPad: pt(4),
  /** `section[aria-label="Report scope"] { margin: 4mm 0 5mm }`. */
  scopeGapBefore: pt(4),
  scopeGapAfter: pt(5),
  /** `section[aria-label="Report scope"] { padding: 2.5mm 0 }`. */
  scopePad: pt(2.5),
  /** `... dl { gap: 10mm }`. */
  scopeColumnGap: pt(10),
  /** `... dd { margin: 0.6mm 0 0 }`. */
  labelValueGap: pt(0.6),
  /** `table { margin-bottom: 3mm }`. */
  tableGap: pt(3),
  /** `[role="status"] { margin: 3mm 0; padding: 2.5mm 3mm }`. */
  warningGap: pt(3),
  warningPadY: pt(2.5),
  warningPadX: pt(3),
  /** `[data-print="footer"] { margin-top: 6mm; padding-top: 2mm }`. */
  footerGap: pt(6),
  footerPad: pt(2),
} as const;
