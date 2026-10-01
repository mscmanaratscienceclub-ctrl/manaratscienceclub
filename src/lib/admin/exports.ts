/**
 * Export contract for the admin panel — which columns an export carries, what
 * the finished file is called, and where each of the two formats is fetched
 * from.
 *
 * It lives beside `src/lib/admin/filters.ts` and follows the same rule: it is
 * plain data and pure functions, imported by Server Components, client leaves
 * and a route handler alike, so it may never read `env`, the database or
 * `next/headers`.
 *
 * ## Nothing is stored
 *
 * Neither format is generated and kept anywhere — not a bucket, not a temp
 * file, not a cache entry:
 *
 * | Format | How the file comes to exist |
 * |--------|-----------------------------|
 * | `pdf`  | A print-ready page is opened; the browser's own "Save as PDF" writes the file to the admin's machine, and the bytes never leave it. |
 * | `xlsx` | The route handler builds the workbook in memory, streams it in one response and forgets it. `Cache-Control: no-store`. |
 *
 * The PDF half is also the reason there is no PDF library: the printed report
 * has to carry `৳`, Bengali SMS bodies and the club's own typefaces, and a
 * server-side generator would have to be taught every one of them with an
 * embedded font file. The browser already has all three.
 */

import {
  buildAdminHref,
  buildReportHref,
  type AdminQueryState,
  type AdminReportColumn,
  type AdminSourceConfig,
  type AdminSourceId,
} from "@/lib/admin/filters";

// ── Formats ──────────────────────────────────────────────────────────────────

export type AdminExportFormat = "pdf" | "xlsx";

export interface AdminExportFormatOption {
  id: AdminExportFormat;
  label: string;
  /** The line under the label in the export dialog. */
  note: string;
}

export const adminExportFormats: AdminExportFormatOption[] = [
  {
    id: "pdf",
    label: "PDF",
    note: "Opens the report as a print-ready page — your browser's “Save as PDF” makes the file, so nothing is generated on the server.",
  },
  {
    id: "xlsx",
    label: "Excel",
    note: "A real .xlsx with a frozen header row, built in memory and sent straight to your machine.",
  },
];

// ── The URL contract ─────────────────────────────────────────────────────────

/** Comma-separated report-column ids; absent means every column. */
export const EXPORT_COLUMNS_PARAM = "cols";

/** `1` on the report route — open the print dialog as soon as the page settles. */
export const EXPORT_PRINT_PARAM = "print";

/** Excel's own ceiling on a worksheet name, and the characters it refuses in one. */
const SHEET_NAME_LIMIT = 31;
const SHEET_NAME_INVALID = /[\\/?*[\]:]/g;

/**
 * The `cols` value for a selection: the ids in catalogue order, or `""` when
 * every column is in — the same "omit what is default" rule `buildAdminHref`
 * follows, so a selection has one spelling and one href.
 */
export function columnSelectionParam(
  source: AdminSourceConfig,
  selected: ReadonlySet<string>,
): string {
  if (source.reportColumns.every((column) => selected.has(column.id))) return "";
  return source.reportColumns
    .filter((column) => selected.has(column.id))
    .map((column) => column.id)
    .join(",");
}

/**
 * The columns an export asked for, in the source's own order.
 *
 * Unknown ids are ignored and an unrecognised or missing selection resolves to
 * every column: a hand-edited URL should land on the full report, never on an
 * empty table. An *empty* selection does the same of necessity — the dialog
 * refuses to submit one, and an export of nothing is not a thing an admin can
 * have meant.
 */
export function resolveReportColumns(
  source: AdminSourceConfig,
  raw: string | string[] | undefined,
): AdminReportColumn[] {
  const requested = (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (requested.length === 0) return source.reportColumns;

  const wanted = new Set(requested);
  const chosen = source.reportColumns.filter((column) => wanted.has(column.id));
  return chosen.length > 0 ? chosen : source.reportColumns;
}

/** Adds params to an href this module's builders produced, in canonical order. */
function appendParams(href: string, extra: Record<string, string>): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  params.sort();
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Where a source's spreadsheet is fetched from. Mirrors the route handler. */
export function adminExportApiPath(sourceId: AdminSourceId): string {
  return `/api/admin/export/${sourceId}`;
}

/**
 * The print-ready report for a filter state and a column selection.
 *
 * `print=1` is what makes choosing "PDF" in the dialog a one-click PDF rather
 * than a preview the admin then has to find the print button on. Opening the
 * report without it — a bookmark, a shared link — behaves exactly as before.
 */
export function buildPrintHref(
  sourceId: AdminSourceId,
  state: AdminQueryState,
  columns: string,
): string {
  return appendParams(buildReportHref(sourceId, state), {
    [EXPORT_COLUMNS_PARAM]: columns,
    [EXPORT_PRINT_PARAM]: "1",
  });
}

/** The spreadsheet download for a filter state and a column selection. */
export function buildExcelHref(
  sourceId: AdminSourceId,
  state: AdminQueryState,
  columns: string,
): string {
  const base = buildAdminHref(adminExportApiPath(sourceId), { ...state, page: 1 }, 1);
  return appendParams(base, { [EXPORT_COLUMNS_PARAM]: columns });
}

// ── Naming ───────────────────────────────────────────────────────────────────

/** `YYYY-MM-DD`, pinned to the timezone the report's dates are read in. */
function dayStamp(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(at);
}

/**
 * What the downloaded workbook is called — `msc-science-competition-2026-09-30.xlsx`.
 *
 * Named from the source's path rather than its id so the file says what it holds
 * (`amazon`-style ids would not), and stamped with the admin's day so two
 * exports of the same table a month apart do not arrive as `report (1).xlsx`.
 */
export function exportFileName(
  source: AdminSourceConfig,
  format: AdminExportFormat,
  at: Date,
  timeZone: string,
): string {
  const slug = source.path.split("/").filter(Boolean).pop() ?? source.id;
  return `msc-${slug}-${dayStamp(at, timeZone)}.${format}`;
}

/** The worksheet's name — the report's title, trimmed to what Excel accepts. */
export function exportSheetName(source: AdminSourceConfig): string {
  const cleaned = source.reportTitle
    .replace(SHEET_NAME_INVALID, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SHEET_NAME_LIMIT)
    .trim();
  return cleaned || source.id;
}

/** Column width in characters: the widest label wins, clamped to something sane. */
export function exportColumnWidth(column: AdminReportColumn): number {
  const guess = column.width ?? column.label.length + 6;
  return Math.min(60, Math.max(10, guess));
}
