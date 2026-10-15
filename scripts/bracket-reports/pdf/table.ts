import type { ColumnPlan } from "./columns";
import { cellLines } from "./columns";
import { CELL_PADDING } from "./geometry";
import { TYPE, track } from "./ladder";
import { CELL_INK, HEAD_BACKGROUND, INK, ROW_TINT, RULE, RULE_WIDTHS } from "./palette";
import type { Paper } from "./paper";
import { drawLine, widthOf, caps } from "./text";
import type { Typefaces } from "./typefaces";

/**
 * The report table: a tinted heading band that repeats on every sheet, rows that
 * wrap but never split, and zebra striping down the page.
 *
 * `Paper` lays one block under another with a cursor; a table is the other kind
 * of thing — several columns sharing one row box, whose height is the tallest
 * cell in it. So this module places its text absolutely, from the row's top edge,
 * and uses the cursor only to advance.
 *
 * Two behaviours are the reason a hand-drawn table earns trust a printed web page
 * did not, and both live here:
 *
 * - **A row never breaks across pages.** `tbody tr { break-inside: avoid }` is a
 *   suggestion a browser may ignore when a row is taller than the room left; here
 *   a row's height is measured before it is drawn, and the sheet turns first.
 * - **The heading band repeats.** `display: table-header-group` asks the printer
 *   to redraw it; this draws it itself, once per page.
 */

export interface TableSpec {
  columns: ColumnPlan[];
  rows: Record<string, string>[];
  /**
   * Width the table is laid out to. Defaults to the full content box; a summary
   * table of three columns asks for less so its heading band ends where its
   * text does, instead of stretching a short table across the whole sheet.
   */
  width?: number;
}

export interface TableResult {
  /** Sheets the table drew a heading band on — one per page it touched. */
  headerBands: number;
  rowsDrawn: number;
  /** One heading band's height, so a caller can reserve for it. */
  headHeight: number;
}

const HEAD = {
  size: TYPE.head.size,
  color: INK,
  tracking: track(TYPE.head.size, TYPE.head.tracking),
} as const;

const CELL = { size: TYPE.cell.size, color: CELL_INK } as const;

export function drawTable(paper: Paper, typefaces: Typefaces, spec: TableSpec): TableResult {
  const side = CELL_PADDING.head.horizontal;
  const rowPad = CELL_PADDING.row.vertical;
  const width = spec.width ?? paper.box.width;
  const lineWidth = paper.lineBox(CELL, TYPE.cell.lineHeight);
  const origin = paper.box.x;

  /** Absolute left edge of each column, from the planner's widths. */
  const lefts: number[] = [];
  let cursor = origin;
  for (const column of spec.columns) {
    lefts.push(cursor);
    cursor += column.width;
  }

  const headLines = spec.columns.map((column) =>
    cellLines(typefaces, caps(column.label), column.textWidth, TYPE.head.size),
  );
  const headRows = Math.max(1, ...headLines.map((lines) => lines.length));
  const headBox = paper.lineBox(HEAD);
  const headHeight = headRows * headBox + CELL_PADDING.head.vertical * 2;

  /** The band across the top of a page: tint, labels, then its dark rule. */
  const drawHead = (): void => {
    const top = paper.y;
    paper.paint({ width, height: headHeight, color: HEAD_BACKGROUND });
    headLines.forEach((lines, index) => {
      const column = spec.columns[index];
      lines.forEach((line, lineIndex) => {
        drawLine(paper.page, typefaces, line, HEAD, {
          x:
            column.align === "right"
              ? lefts[index] + column.width - side - widthOf(typefaces, line, HEAD)
              : lefts[index] + side,
          baseline: paper.baseline(top + CELL_PADDING.head.vertical, HEAD) - lineIndex * headBox,
        });
      });
    });
    paper.space(headHeight);
    paper.rule({ thickness: RULE_WIDTHS.head, color: INK, width });
  };

  // Keep the band with the row under it — the stylesheet's `thead { break-after:
  // avoid }`, honoured here by turning the page before drawing either.
  const oneRow = lineWidth + rowPad * 2 + RULE_WIDTHS.row;
  if (spec.rows.length > 0) paper.ensure(headHeight + RULE_WIDTHS.head + oneRow);
  drawHead();

  let bands = 1;
  const lastIndex = spec.rows.length - 1;

  spec.rows.forEach((row, index) => {
    const cells = spec.columns.map((column) =>
      cellLines(typefaces, row[column.id] ?? "", column.textWidth),
    );
    const lines = Math.max(1, ...cells.map((cell) => cell.length));
    // The last row carries no rule: `tbody tr:last-child td { border-bottom:
    // none }`, so the footer's own hairline is the only line above it.
    const rule = index === lastIndex ? 0 : RULE_WIDTHS.row;
    const height = lines * lineWidth + rowPad * 2 + rule;

    if (!paper.fits(height)) {
      paper.newPage();
      drawHead();
      bands += 1;
    }

    const top = paper.y;
    // Zebra striping is `tbody tr:nth-child(even)` — the tint lands on odd rows.
    if (index % 2 === 1) {
      paper.paint({ width, height, color: ROW_TINT });
    }

    cells.forEach((cell, columnIndex) => {
      const column = spec.columns[columnIndex];
      cell.forEach((line, lineIndex) => {
        drawLine(paper.page, typefaces, line, CELL, {
          x:
            column.align === "right"
              ? lefts[columnIndex] + column.width - side - widthOf(typefaces, line, CELL)
              : lefts[columnIndex] + side,
          baseline:
            paper.baseline(top - rowPad, CELL, TYPE.cell.lineHeight) - lineIndex * lineWidth,
        });
      });
    });

    paper.space(height - rule);
    if (rule > 0) paper.rule({ thickness: rule, color: RULE, width });
  });

  return { headerBands: bands, rowsDrawn: spec.rows.length, headHeight };
}
