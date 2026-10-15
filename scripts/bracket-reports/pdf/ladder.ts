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

/**
 * A dashed rule's beat, in points. CSS leaves `border-style: dashed` to the
 * browser; paper has to pick a pattern, and this one reads as a dash at the
 * 0.15mm weight the event list uses rather than as a dotted line.
 */
export const DASH = { on: pt(1.4), off: pt(0.9) } as const;

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

  // The registration brief restates the panel's ladder on its own root in the
  // print block (`--text-2xs` … `--text-5xl`), so its rungs are those tokens.

  /** `.brief-index` — the `01` beside a section title. */
  briefIndex: { size: 6.5, lineHeight: 1.3, tracking: 0.08 },
  /** `.brief-section-head h2` — `--text-2xl`. */
  briefSection: { size: 12.5 },
  /** `.brief-question`, `.brief-body` — `--text-sm`. */
  briefBody: { size: 8.7, lineHeight: 1.45 },
  /** `.brief-note` — `--text-xs`. */
  briefNote: { size: 7.5, lineHeight: 1.4 },
  /** `.brief-caption` — `--text-2xs`, tracked `0.04em`. */
  briefCaption: { size: 6.5, lineHeight: 1.3, tracking: 0.04 },
  /** `.brief-eyebrow` — `adminLabel`: `--text-2xs`, tracked `0.08em`, uppercase. */
  briefEyebrow: { size: 6.5, lineHeight: 1.3, tracking: 0.08 },
  /** `adminTag` on paper — `--text-2xs`, tracked `0.05em`, uppercase. */
  briefTag: { size: 6.5, lineHeight: 1.3, tracking: 0.05 },
  /** `.brief-figure` — `--text-5xl`. */
  briefFigure: { size: 21 },
  /** `.brief-range`, `.brief-section-head h2` — `--text-2xl`. */
  briefRange: { size: 12.5 },
  /** A tally's value — `--text-xl`. */
  briefTally: { size: 10.5 },
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
  /** The brief's `dl { gap: 3mm 10mm }` — the row gap, used when a line wraps. */
  scopeRowGap: pt(3),
  /** `... dd { margin: 0.6mm 0 0 }`. */
  labelValueGap: pt(0.6),
  /** `table { margin-bottom: 3mm }`. */
  tableGap: pt(3),
  /** The empty-table line's own breathing room — `py-10`, with no paper rule. */
  emptyPad: pt(8),
  /** `[role="status"] { margin: 3mm 0; padding: 2.5mm 3mm }`. */
  warningGap: pt(3),
  warningPadY: pt(2.5),
  warningPadX: pt(3),
  /** `[data-print="footer"] { margin-top: 6mm; padding-top: 2mm }`. */
  footerGap: pt(6),
  footerPad: pt(2),
} as const;

/**
 * The registration brief's own vertical rhythm, in points.
 *
 * Each value names the print rule it comes from. Where a brief section's spacing
 * is a screen utility with no paper rule beside it, that is said — a PDF has to
 * pick a number, and picking the brief's own rhythm beats inventing one.
 */
export const BRIEF_RHYTHM = {
  /** `.brief-section { margin-top: 6mm; padding-top: 3mm }`. */
  sectionGap: pt(6),
  sectionPad: pt(3),
  /** `.brief-section-head { gap: 2.5mm }`, between the index and the title. */
  headGap: pt(2.5),
  /** The question sits 1mm under the title (`mt-1`). */
  headToQuestion: pt(1),
  /** `mt-4` on screen, with no paper rule to restate it. */
  questionToBody: pt(4),
  /** `.brief-question, .brief-body, .brief-note { max-width: 150mm }`. */
  measure: pt(150),
  /** `.brief-note { padding-left: 2.5mm; border-left: 0.3mm }`. */
  notePad: pt(2.5),
  noteRule: pt(0.3),
  /** `.brief-bars { height: 32mm; gap: 0.6mm; border-bottom: 0.25mm }`. */
  barsHeight: pt(32),
  barsGap: pt(0.6),
  barsRule: pt(0.25),
  /** `.brief-caption { margin-top: 1mm }`. */
  captionGap: pt(1),
  /** `.brief-meter { height: 1.4mm }`, and the 1.5mm the screen puts above it. */
  meterHeight: pt(1.4),
  meterGap: pt(1.5),
  /** `.brief-tally { gap: 8mm; margin-top: 3mm; padding-top: 2.5mm; border-top: 0.2mm }`. */
  tallyGapX: pt(8),
  tallyGapBefore: pt(3),
  tallyPad: pt(2.5),
  tallyRule: pt(0.2),
  /** `.brief-forecast { padding: 4mm 5mm; border: 0.25mm }`. */
  forecastPadY: pt(4),
  forecastPadX: pt(5),
  forecastRule: pt(0.25),
  /** A figure sits 1mm under its label (`mt-1`). */
  figureGap: pt(1),
  /** Ranked rows: the screen's `space-y-3`, at the brief's own rhythm. */
  rankGap: pt(3),
  /** List rows: the screen's `space-y-1.5`. */
  listGap: pt(1.5),
  /** A tag's padding — the screen's `px-2.5 py-1` at paper scale. */
  tagPadX: pt(2),
  tagPadY: pt(1),
} as const;
