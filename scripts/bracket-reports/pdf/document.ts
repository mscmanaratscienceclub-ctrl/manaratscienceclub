import { pt } from "./geometry";
import { RHYTHM, TYPE, track } from "./ladder";
import {
  CEILING_BACKGROUND,
  CEILING_BORDER,
  CEILING_INK,
  INK,
  MUTED,
  RULE_WIDTHS,
  SOFT_INK,
  TEAL,
} from "./palette";
import type { Paper } from "./paper";
import { widthOf, caps } from "./text";
import type { Typefaces } from "./typefaces";

/**
 * The parts every report document is made of: a masthead, a scope strip, the
 * row-limit warning and an in-document footer.
 *
 * These are the pieces the row report and the registration brief share, which is
 * also how the stylesheet treats them — both live under one `data-print="report"`
 * contract and only their bodies differ, so a masthead that changes on paper
 * changes here once.
 *
 * Every size, colour and distance is a name from `ladder.ts`, `palette.ts` or
 * `geometry.ts`. Nothing is written out in this file.
 */

const EYEBROW = {
  size: TYPE.eyebrow.size,
  color: TEAL,
  tracking: track(TYPE.eyebrow.size, TYPE.eyebrow.tracking),
} as const;

const TITLE = { size: TYPE.title.size, color: INK } as const;

const NOTE = { size: TYPE.note.size, color: SOFT_INK } as const;

const LABEL = {
  size: TYPE.label.size,
  color: MUTED,
  tracking: track(TYPE.label.size, TYPE.label.tracking),
} as const;

const META = { size: TYPE.meta.size, color: SOFT_INK } as const;

const BODY = { size: TYPE.body.size, color: INK } as const;

const CEILING = { size: TYPE.body.size, color: CEILING_INK } as const;

const FOOTER = { size: TYPE.footer.size, color: MUTED } as const;

/** Widest a single scope entry may claim — past it a filter sentence is a paragraph. */
const SCOPE_ENTRY_WIDTH = pt(78);

export interface MastheadInput {
  /** The club's name and the artefact's kind, as the panel states them. */
  eyebrow: string;
  title: string;
  note: string;
  /** The label above the timestamp. */
  metaLabel: string;
  /** The timestamp, already formatted in the report's own timezone. */
  meta: string;
}

/**
 * Title block on the left, timestamp on the right, teal rule under both.
 *
 * The right-hand column is as wide as its own longest line plus the padding the
 * stylesheet puts right of its rule — measured, not guessed, because a timestamp
 * changes width with the month's name.
 */
export function drawMasthead(paper: Paper, typefaces: Typefaces, input: MastheadInput): void {
  const box = paper.box;
  const right = Math.min(
    box.width * 0.4,
    Math.max(
      widthOf(typefaces, caps(input.metaLabel), LABEL),
      widthOf(typefaces, input.meta, META),
    ) + RHYTHM.generatedPad,
  );
  const left = box.width - right;

  const titleLines = paper.lines(input.title, TITLE, left);
  const noteWidth = Math.min(RHYTHM.noteWidth, left);
  const noteLines = paper.lines(input.note, NOTE, noteWidth);

  const leftHeight =
    paper.lineBox(EYEBROW) +
    RHYTHM.titleGap +
    titleLines.length * paper.lineBox(TITLE) +
    RHYTHM.noteGap +
    noteLines.length * paper.lineBox(NOTE, TYPE.note.lineHeight);
  const rightHeight =
    paper.lineBox(LABEL) + RHYTHM.labelValueGap + paper.lineBox(META);
  const height = Math.max(leftHeight, rightHeight);

  paper.ensure(height + RHYTHM.mastheadPad + RULE_WIDTHS.masthead);
  const top = paper.y;

  paper.text(caps(input.eyebrow), EYEBROW, { width: left });
  paper.space(RHYTHM.titleGap);
  paper.draw(titleLines, TITLE, { width: left });
  paper.space(RHYTHM.noteGap);
  paper.draw(noteLines, NOTE, {
    width: noteWidth,
    lineHeight: TYPE.note.lineHeight,
  });

  paper.atRight(caps(input.metaLabel), LABEL, box.x + box.width, paper.baseline(top, LABEL));
  paper.atRight(
    input.meta,
    META,
    box.x + box.width,
    paper.baseline(top - paper.lineBox(LABEL) - RHYTHM.labelValueGap, META),
  );
  paper.ruleVertical({ x: box.x + left, top, bottom: top - height });

  paper.cursorTo(top - height);
  paper.space(RHYTHM.mastheadPad);
  paper.rule({ thickness: RULE_WIDTHS.masthead, color: TEAL });
}

export interface ScopeEntry {
  label: string;
  value: string;
}

interface ScopeBlock {
  x: number;
  label: string;
  lines: string[];
  width: number;
  height: number;
}

/**
 * The ruled strip that states what the report is: rows, sort, filters, columns.
 *
 * On paper this is a flex row with a 10mm gap, and an "Active filters" sentence
 * can be longer than the gap math expects. So entries flow — laid out left to
 * right and wrapped onto a ruled second line when the measure runs out. Each
 * entry keeps its label glued to its value, and a value only breaks when it has
 * to, at the width its own line has left for it.
 */
export function drawScopeStrip(paper: Paper, typefaces: Typefaces, entries: ScopeEntry[]): void {
  const box = paper.box;
  const labelBox = paper.lineBox(LABEL);
  const valueBox = paper.lineBox(BODY);

  /** An entry placed `at` points from its line's left edge. */
  const place = (entry: ScopeEntry, at: number): ScopeBlock => {
    const lines = paper.lines(entry.value, BODY, Math.min(SCOPE_ENTRY_WIDTH, box.width - at));
    return {
      x: at,
      label: entry.label,
      lines,
      width: Math.max(
        widthOf(typefaces, caps(entry.label), LABEL),
        ...lines.map((line) => widthOf(typefaces, line, BODY)),
      ),
      height: labelBox + RHYTHM.labelValueGap + lines.length * valueBox,
    };
  };

  const rows: ScopeBlock[][] = [];
  let row: ScopeBlock[] = [];
  let at = 0;
  for (const entry of entries) {
    let block = place(entry, at);
    if (at > 0 && at + block.width > box.width) {
      rows.push(row);
      row = [];
      block = place(entry, 0);
    }
    row.push(block);
    at = block.x + block.width + RHYTHM.scopeColumnGap;
  }
  if (row.length > 0) rows.push(row);

  const height =
    rows.reduce((sum, line) => sum + Math.max(...line.map((block) => block.height)), 0) +
    Math.max(0, rows.length - 1) * RHYTHM.scopeRowGap +
    RHYTHM.scopePad * 2 +
    RULE_WIDTHS.hairline * 2;

  paper.ensure(height);
  paper.rule({ gapAfter: RHYTHM.scopePad });

  rows.forEach((line, lineIndex) => {
    const lineHeight = Math.max(...line.map((block) => block.height));
    const top = paper.y;
    for (const block of line) {
      const x = box.x + block.x;
      // Back to the line's own top for every entry: `text` and `draw` both leave
      // the cursor under what they wrote, and a row whose second entry starts
      // where the first one ended is a staircase, not a ruled line.
      paper.cursorTo(top);
      paper.text(caps(block.label), LABEL, { x, width: block.width });
      paper.space(RHYTHM.labelValueGap);
      paper.draw(block.lines, BODY, { x, width: block.width });
    }
    // The line is as tall as its tallest entry, whether or not the others filled it.
    paper.cursorTo(top - lineHeight);
    if (lineIndex < rows.length - 1) paper.space(RHYTHM.scopeRowGap);
  });

  paper.rule({ gapBefore: RHYTHM.scopePad });
}

/** The amber band stating that the export hit `REPORT_ROW_LIMIT`. */
export function drawCeilingWarning(paper: Paper, typefaces: Typefaces, message: string): void {
  const box = paper.box;
  const width = box.width - RHYTHM.warningPadX * 2;
  const lines = paper.lines(message, CEILING, width);
  const height =
    lines.length * paper.lineBox(CEILING) +
    RHYTHM.warningPadY * 2 +
    RULE_WIDTHS.hairline * 2;

  paper.ensure(height);
  const top = paper.y;
  paper.paint({ width: box.width, height, color: CEILING_BACKGROUND });
  paper.frame({ width: box.width, height, color: CEILING_BORDER, thickness: RULE_WIDTHS.hairline });
  paper.space(RHYTHM.warningPadY);
  paper.draw(lines, CEILING, { x: box.x + RHYTHM.warningPadX, width });
  paper.cursorTo(top - height);
}

/** The line that closes the last sheet. */
export function drawFooter(paper: Paper, line: string): void {
  const height =
    RHYTHM.footerGap + RULE_WIDTHS.hairline + RHYTHM.footerPad + paper.lineBox(FOOTER);
  paper.ensure(height);
  paper.space(RHYTHM.footerGap);
  paper.rule({ gapAfter: RHYTHM.footerPad });
  paper.text(line, FOOTER, { align: "center" });
}
