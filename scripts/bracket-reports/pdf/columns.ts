import { CELL_PADDING, pt } from "./geometry";
import { TYPE } from "./ladder";
import { INK } from "./palette";
import { widthOf, wrap, caps } from "./text";
import type { Typefaces } from "./typefaces";

/**
 * What a column of a bracket report declares: the key its values are read from,
 * the label printed in the heading band, and how the two are aligned.
 *
 * Deliberately local rather than imported from `src/lib/admin/filters.ts` — this
 * generator builds its own columns from the registration rows and must not drag
 * the admin panel's filter catalogue into a script.
 */
export interface ReportColumn {
  id: string;
  label: string;
  align?: "left" | "right";
}

/**
 * How wide each column of a report table is.
 *
 * The printed report is a `w-full` table: the browser sizes its columns from the
 * text inside them and stretches the result across the measure. A hand-drawn
 * page has no layout pass to borrow, so this module does that one job — read the
 * values, give every column a width, and make the widths add up to the sheet.
 *
 * It is pure (typefaces, columns, rows, a width in and nothing else) because it
 * is the part worth asserting on: `pnpm pdf:verify` can prove a plan never
 * overflows its measure without rendering a page.
 */

/** Narrowest text a column may be given — below this a phone number breaks mid-digit. */
const MIN_TEXT = pt(12);

/**
 * The comfort floor: a column squeezed below this has lost its point, so the
 * planner only goes here when the table genuinely has too many columns for the
 * sheet.
 */
const MIN_COMFORT = pt(18);

/** Widest text a column may claim, however long its values are — the rest wraps. */
const MAX_TEXT = pt(90);

/** Cells measured per column, however many rows the report carries. */
const SAMPLE_ROWS = 90;

/** The style widths are measured in: the report's own cell step. */
const MEASURE = { size: TYPE.cell.size, color: INK } as const;

export interface ColumnPlan {
  id: string;
  label: string;
  align: "left" | "right";
  /** Full column width, side padding included. */
  width: number;
  /** The room left for text inside it. */
  textWidth: number;
}

/** A cell's value as one line, capped to the first characters that could matter. */
function clip(value: string): string {
  return value.length > 160 ? value.slice(0, 160) : value;
}

/**
 * The 90th-percentile single-line width of a column's values.
 *
 * Sampled evenly rather than exhaustively: two thousand rows of every column is
 * fourteen thousand measurements to size a table that will be read for its first
 * screen, and a percentile already ignores the one SMS body that would have
 * dominated a max. The rows it does skip wrap — which is what the table does
 * with anything wider than its column.
 */
function sampleWidth(
  typefaces: Typefaces,
  column: ReportColumn,
  rows: Record<string, string>[],
): number {
  const step = Math.max(1, Math.ceil(rows.length / SAMPLE_ROWS));
  const widths: number[] = [];
  for (let index = 0; index < rows.length; index += step) {
    const value = rows[index]?.[column.id];
    if (value) widths.push(widthOf(typefaces, clip(value), MEASURE));
  }
  // The header is a floor of its own: a column labelled "SENDER NUMBER" may not
  // be narrower than the words that name it, however short the values are.
  widths.push(widthOf(typefaces, caps(column.label), { ...MEASURE, size: TYPE.head.size }));
  if (widths.length === 0) return MIN_TEXT;
  widths.sort((a, b) => a - b);
  return widths[Math.floor((widths.length - 1) * 0.9)];
}

/** The width a column would like, before the sheet is consulted. */
function desiredWidth(
  typefaces: Typefaces,
  column: ReportColumn,
  rows: Record<string, string>[],
): number {
  const padding = CELL_PADDING.head.horizontal * 2;
  // Headroom of a couple of characters: a value that measures *exactly* the
  // column's width takes a third of a point to overflow on a rounding, and an
  // email split at the ninety-eighth character is the failure this avoids.
  const wanted = sampleWidth(typefaces, column, rows) + widthOf(typefaces, "n", MEASURE) * 2;
  return Math.min(MAX_TEXT, Math.max(MIN_COMFORT, wanted)) + padding;
}

/**
 * Every column's width, summing to exactly `available`.
 *
 * Two cases, the same two the browser resolves: the table is too wide, so the
 * generous columns give ground first and none goes below `MIN_TEXT`; or it is
 * too narrow, so every column grows in proportion to what it asked for and the
 * table fills the measure rather than floating in it.
 */
export function planColumns(
  typefaces: Typefaces,
  columns: ReportColumn[],
  rows: Record<string, string>[],
  available: number,
): ColumnPlan[] {
  const padding = CELL_PADDING.head.horizontal * 2;
  const wanted = columns.map((column) => desiredWidth(typefaces, column, rows));
  let widths = [...wanted];
  const total = () => widths.reduce((sum, width) => sum + width, 0);

  if (total() > available) {
    // Give ground from the generous columns first, down to the comfort floor;
    // only if that is not enough does anything go near the hard floor. A date
    // column has nothing to give and keeps its width.
    const comfortFloor = widths.map((width) =>
      Math.max(Math.min(width, padding + MIN_COMFORT), padding + MIN_TEXT),
    );
    const hardFloor = widths.map(() => padding + MIN_TEXT);
    let deficit = total() - available;

    for (const floor of [comfortFloor, hardFloor]) {
      if (deficit <= 0.01) break;
      const room = widths.map((width, index) => Math.max(0, width - floor[index]));
      const freeable = room.reduce((sum, size) => sum + size, 0);
      if (freeable <= 0.01) break;
      const cut = Math.min(deficit, freeable);
      widths = widths.map((width, index) => width - (room[index] / freeable) * cut);
      deficit = total() - available;
    }

    // More columns than the sheet can hold at any usable width: equalise rather
    // than let the sum lie.
    if (total() > available) {
      widths = widths.map(() => available / columns.length);
    }
  } else if (total() < available) {
    const slack = available - total();
    const sum = total();
    widths = widths.map((width) => width + (width / sum) * slack);
  }

  return columns.map((column, index) => ({
    id: column.id,
    label: column.label,
    align: column.align ?? "left",
    width: widths[index],
    textWidth: Math.max(0, widths[index] - padding),
  }));
}

/** The lines a cell prints as, at its column's width. */
export function cellLines(
  typefaces: Typefaces,
  value: string,
  width: number,
  size: number = TYPE.cell.size,
): string[] {
  return wrap(typefaces, value, { size, color: INK }, width);
}
