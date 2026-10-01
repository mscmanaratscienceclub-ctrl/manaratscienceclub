import { NextResponse, type NextRequest } from "next/server";
import writeXlsxFile, { type Sheet } from "write-excel-file/node";

import { getServerSession } from "@/lib/auth/get-session";
import {
  ADMIN_TIME_ZONE,
  REPORT_ROW_LIMIT,
  adminSortLabel,
  adminSourceById,
  describeFilters,
  parseAdminQuery,
  type RawSearchParams,
} from "@/lib/admin/filters";
import {
  EXPORT_COLUMNS_PARAM,
  exportColumnWidth,
  exportFileName,
  exportSheetName,
  resolveReportColumns,
} from "@/lib/admin/exports";
import { getAdminReportRows } from "@/lib/actions/registrations";

/**
 * The spreadsheet half of the admin export feature.
 *
 * A `GET` with the same filter query string as the table page, answered with a
 * `.xlsx` attachment. The workbook is built in memory and sent in this one
 * response — it is never written to a file, a bucket or a cache, so an export
 * leaves nothing behind on the server. `Cache-Control: no-store` keeps an
 * intermediary from making a copy either.
 *
 * The rows come from `getAdminReportRows`, the same action the printed report
 * reads, so a spreadsheet and a PDF of the same filters cannot disagree about a
 * row. That action applies `REPORT_ROW_LIMIT`; if it bites, this refuses rather
 * than handing back a spreadsheet that is quietly missing rows — a file someone
 * has already sorted and formatted is the worst place to discover a truncation.
 *
 * `runtime = "nodejs"` is pinned: the writer zips the workbook with Node's own
 * stream and zlib, which the edge runtime does not have.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A spreadsheet wide enough to be worth reading sideways gets the sheet. */
const LANDSCAPE_FROM_COLUMNS = 6;

function refuse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const session = await getServerSession();
  if (!session) return refuse("Sign in again to export.", 401);

  // The same "an admin, and only an admin" check `requireAdmin` makes in the
  // action layer. Both are kept: this one so the browser gets a status it can
  // show, that one so the query itself can never run for anyone else.
  const role = (session.user as { role?: string }).role ?? "member";
  if (role !== "admin") return refuse("This export is for admins.", 403);

  const { kind } = await params;
  const source = adminSourceById(kind);
  if (!source) return refuse("That is not an export this panel knows.", 404);

  const searchParams: RawSearchParams = Object.fromEntries(
    request.nextUrl.searchParams,
  );
  const state = parseAdminQuery(source, searchParams);
  const columns = resolveReportColumns(source, searchParams[EXPORT_COLUMNS_PARAM]);

  const report = await getAdminReportRows(source.id, state);

  if (report.truncated) {
    return refuse(
      `That is more than ${REPORT_ROW_LIMIT} rows, which is this export's ceiling. ` +
        "Narrow the filters and export again for the rest.",
      413,
    );
  }

  const header = columns.map((column) => ({
    value: column.label,
    type: String,
    fontWeight: "bold" as const,
    align: column.align ?? ("left" as const),
    height: 22,
  }));

  const body = report.rows.map((row) =>
    columns.map((column) => ({
      value: row[column.id] ?? "",
      // Every cell is text, deliberately: the values are the report's own
      // formatted strings (a fee reads "৳1,450.00", a day reads "18 Sep 2026"),
      // and one row builder feeding both formats is what keeps the sheet and the
      // paper agreeing. Typing a column as a number here would mean a second
      // formatter for it, and a second answer to "what was asked for".
      type: String,
      align: column.align ?? ("left" as const),
    })),
  );

  const filters = describeFilters(source, state);
  const generated = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
    timeZoneName: "short",
  }).format(new Date());

  // The scope sheet: the printed report states its filters in a strip under the
  // masthead, and a spreadsheet someone opens next month has to be able to say
  // the same thing about itself.
  const scope = [
    ["Export", source.reportTitle],
    ["Generated", generated],
    ["Rows", String(report.rows.length)],
    ["Sort", adminSortLabel(source, state.sort)],
    [
      "Active filters",
      filters.length === 0
        ? "None — every row"
        : filters.map((filter) => `${filter.label}: ${filter.display}`).join(" · "),
    ],
    ["Columns", columns.map((column) => column.label).join(", ")],
    ["Exported by", session.user.email],
  ];

  const sheets: Sheet<Buffer>[] = [
    {
      data: [header, ...body],
      sheet: exportSheetName(source),
      columns: columns.map((column) => ({ width: exportColumnWidth(column) })),
      // Freezes the header, so the labels stay put while an admin scrolls a
      // thousand rows.
      stickyRowsCount: 1,
      // Only "landscape" is set by hand — the writer treats portrait as its own
      // default, and it does not accept being told so.
      ...(columns.length >= LANDSCAPE_FROM_COLUMNS
        ? { orientation: "landscape" as const }
        : {}),
    },
    {
      data: scope.map(([label, value]) => [
        { value: label, type: String, fontWeight: "bold" as const },
        { value, type: String },
      ]),
      sheet: "Scope",
      columns: [{ width: 18 }, { width: 80 }],
    },
  ];

  const buffer = await writeXlsxFile(sheets).toBuffer();
  const fileName = exportFileName(source, "xlsx", new Date(), ADMIN_TIME_ZONE);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
