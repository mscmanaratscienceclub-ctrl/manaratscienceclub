/**
 * The summary blocks a bracket report is made of: a section head, a row of
 * figures, share meters, a note list, and the running footer.
 *
 * `document.ts` draws the parts every report shares — masthead, scope strip,
 * warning band. The bodies of these reports are counts and proportions rather
 * than filter sentences, so they live here, drawn with the same ladder and
 * palette and nothing else.
 *
 * Each block reserves its own height and turns the page when it will not fit,
 * which is what keeps a figure row or a meter from being cut in half between two
 * sheets.
 */

import { pt } from "./geometry";
import { BRIEF_RHYTHM, TYPE, track } from "./ladder";
import {
  ACCENT_TEAL,
  HEAD_BACKGROUND,
  INK,
  MUTED,
  NEGATIVE,
  POSITIVE,
  RULE,
  RULE_WIDTHS,
  SOFT_INK,
  TEAL,
  WARNING_INK,
} from "./palette";
import type { Paper } from "./paper";
import { drawLine, widthOf, caps } from "./text";
import type { Typefaces } from "./typefaces";

const SECTION = { size: TYPE.briefSection.size, color: INK } as const;
const SECTION_LABEL = {
  size: TYPE.briefEyebrow.size,
  color: TEAL,
  tracking: track(TYPE.briefEyebrow.size, TYPE.briefEyebrow.tracking ?? 0),
} as const;
const SECTION_NOTE = { size: TYPE.briefNote.size, color: SOFT_INK } as const;
const FIGURE = { size: TYPE.briefFigure.size, color: INK } as const;
const FIGURE_LABEL = {
  size: TYPE.briefCaption.size,
  color: MUTED,
  tracking: track(TYPE.briefCaption.size, TYPE.briefCaption.tracking ?? 0),
} as const;
const BODY = { size: TYPE.briefBody.size, color: INK } as const;
const FOOT = { size: TYPE.footer.size, color: MUTED } as const;

/** The gap a block keeps above itself. */
const BLOCK_GAP = pt(4);
const FIGURE_GAP = pt(1);
const METER_HEIGHT = pt(1.4);
const LABEL_WIDTH = pt(52);
const VALUE_WIDTH = pt(34);
const METER_GAP = pt(3);

export interface FigureItem {
  label: string;
  value: string;
}

export interface MeterItem {
  label: string;
  /** The bar's filled fraction, 0–1. */
  fraction: number;
  right: string;
  color?: string;
}

/** Section title with its caption above and one ruled line below. */
export function sectionHead(
  paper: Paper,
  typefaces: Typefaces,
  input: { label: string; title: string; note?: string },
): void {
  const noteLines = input.note ? paper.lines(input.note, SECTION_NOTE, paper.box.width) : [];
  const height =
    paper.lineBox(SECTION_LABEL) +
    BRIEF_RHYTHM.headToQuestion +
    paper.lineBox(SECTION) +
    (noteLines.length > 0
      ? BRIEF_RHYTHM.figureGap + noteLines.length * paper.lineBox(SECTION_NOTE)
      : 0) +
    BRIEF_RULE_GAP +
    RULE_WIDTHS.hairline;

  paper.space(BLOCK_GAP);
  paper.ensure(height);

  paper.text(caps(input.label), SECTION_LABEL);
  paper.space(BRIEF_RHYTHM.headToQuestion);
  paper.text(input.title, SECTION);
  if (noteLines.length > 0) {
    paper.space(BRIEF_RHYTHM.figureGap);
    paper.draw(noteLines, SECTION_NOTE);
  }
  paper.space(BRIEF_RULE_GAP);
  paper.rule({ thickness: RULE_WIDTHS.hairline, color: RULE });
}

/** The distance a section's rule sits under its last line. */
const BRIEF_RULE_GAP = pt(2);

/**
 * Big numbers in a ruled row — the figure a reader came for, printed once per
 * sheet rather than buried in a table.
 */
export function figureRow(paper: Paper, typefaces: Typefaces, items: FigureItem[]): void {
  const column = paper.box.width / items.length;
  const labelLines = items.map((item) =>
    paper.lines(caps(item.label), FIGURE_LABEL, column - pt(3)),
  );
  const tallest = Math.max(...labelLines.map((lines) => lines.length));
  const height =
    paper.lineBox(FIGURE) + FIGURE_GAP + tallest * paper.lineBox(FIGURE_LABEL);

  paper.space(BLOCK_GAP);
  paper.ensure(height);
  const top = paper.y;

  items.forEach((item, index) => {
    const x = paper.box.x + index * column;
    paper.cursorTo(top);
    paper.text(item.value, FIGURE, { x, width: column - pt(3) });
    paper.space(FIGURE_GAP);
    paper.draw(labelLines[index], FIGURE_LABEL, { x, width: column - pt(3) });

    if (index > 0) {
      paper.ruleVertical({ x, top, bottom: top - height, color: RULE });
    }
  });

  paper.cursorTo(top - height);
}

/**
 * Share meters: a label, a bar against the largest value, and the figure.
 *
 * The bar is the only way these reports show proportion at all, and it is drawn
 * flat — `wash()` on paper would be a colour the panel does not use.
 */
export function meters(paper: Paper, typefaces: Typefaces, rows: MeterItem[]): void {
  const rowHeight = Math.max(paper.lineBox(BODY), METER_HEIGHT);
  const blockHeight = rows.length * (rowHeight + BRIEF_RHYTHM.meterGap) - BRIEF_RHYTHM.meterGap;

  paper.space(BLOCK_GAP);
  paper.ensure(blockHeight);

  const barWidth = paper.box.width - LABEL_WIDTH - VALUE_WIDTH - METER_GAP * 2;

  for (const row of rows) {
    const top = paper.y;
    paper.text(row.label, BODY, { width: LABEL_WIDTH });
    paper.cursorTo(top);

    const barTop = top + paper.leading(BODY) + (paper.lineBox(BODY) - METER_HEIGHT) / 2;
    paper.cursorTo(barTop);
    paper.paint({
      dx: LABEL_WIDTH + METER_GAP,
      width: barWidth,
      height: METER_HEIGHT,
      color: HEAD_BACKGROUND,
    });
    paper.cursorTo(barTop);
    paper.paint({
      dx: LABEL_WIDTH + METER_GAP,
      width: Math.max(0, Math.min(1, row.fraction)) * barWidth,
      height: METER_HEIGHT,
      color: row.color ?? ACCENT_TEAL,
    });

    paper.atRight(row.right, BODY, paper.box.x + paper.box.width, paper.baseline(top, BODY));
    paper.cursorTo(top - rowHeight - BRIEF_RHYTHM.meterGap);
  }

  paper.cursorTo(paper.y + BRIEF_RHYTHM.meterGap);
}

/** A short run of sentences — the reading of a bracket, not its data. */
export function notes(paper: Paper, lines: string[]): void {
  paper.space(BLOCK_GAP);
  const width = paper.box.width - pt(6);

  for (const line of lines) {
    const wrapped = paper.lines(line, BODY, width);
    const box = paper.lineBox(BODY, TYPE.briefBody.lineHeight);
    const height = wrapped.length * box;

    // A note that breaks across sheets would leave its rule behind, so the whole
    // note is turned to the next page together.
    paper.ensure(height);
    paper.paint({ width: pt(0.8), height, color: TEAL });
    paper.draw(wrapped, BODY, { x: paper.box.x + pt(3), width, lineHeight: TYPE.briefBody.lineHeight });
    paper.space(pt(2));
  }
}

/**
 * The line that closes every sheet, not only the last.
 *
 * A printed bracket is one of twenty-four and goes to a room on its own; the
 * footer states which bracket it is and how far into it the reader is, which is
 * the one thing a stack of loose pages cannot recover by itself.
 */
export function stampFooters(paper: Paper, typefaces: Typefaces, left: string): void {
  const total = paper.pages.length;
  const top = paper.box.bottom - pt(2);

  paper.pages.forEach((page, index) => {
    const baseline = paper.baseline(top, FOOT);
    drawLine(page, typefaces, left, FOOT, { x: paper.box.x, baseline });
    drawLine(
      page,
      typefaces,
      `${index + 1} / ${total}`,
      FOOT,
      { x: paper.box.x + paper.box.width - widthOf(typefaces, `${index + 1} / ${total}`, FOOT), baseline },
    );
  });
}

/** The colours a status earns, kept in one place so the PDF matches the panel. */
export function statusColor(status: string): string {
  if (status === "verified") return POSITIVE;
  if (status === "rejected") return NEGATIVE;
  return WARNING_INK;
}
