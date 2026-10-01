import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { getAdminReportRows } from "@/lib/actions/registrations";
import { siteConfig } from "@/lib/data";
import {
  ADMIN_TIME_ZONE,
  REPORT_ROW_LIMIT,
  adminSortLabel,
  adminSourceById,
  describeFilters,
  parseAdminQuery,
  type AdminReportColumn,
  type RawSearchParams,
} from "@/lib/admin/filters";
import {
  EXPORT_COLUMNS_PARAM,
  EXPORT_PRINT_PARAM,
  resolveReportColumns,
} from "@/lib/admin/exports";
import AutoPrint from "@/components/admin/auto-print";
import ReportPrintButton from "@/components/admin/report-print-button";

/** Fixed timezone so the stamp matches the day filters above it. */
const generatedFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ADMIN_TIME_ZONE,
  timeZoneName: "short",
});

/** `1`, however the query string happened to spell it. */
function wantsPrint(raw: string | string[] | undefined): boolean {
  return (Array.isArray(raw) ? raw[0] : raw) === "1";
}

/**
 * The tab title is also the filename the browser proposes in "Save as PDF"
 * (Chrome's default header shows it too, and it reads in history entries), so
 * it is the report's own name through the root template rather than a generic
 * one. Unknown kinds still 404 in the page, not here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}): Promise<Metadata> {
  const { kind } = await params;
  const source = adminSourceById(kind);
  return { title: source?.reportTitle ?? "Report" };
}

/**
 * The printable report for one admin source, honouring the filters and the
 * column selection it was opened with.
 *
 * The markup is structured as a *document* (masthead, scope block, table,
 * footer) rather than as the admin page it came from. The `@media print` block in
 * `globals.css` styles that structure into a clean A4 PDF; on screen it reads as a
 * readable preview of the same report.
 *
 * This page is the PDF half of the export feature, and it is the whole of it: no
 * PDF is generated or kept anywhere. The browser's own "Save as PDF" writes the
 * file, which is also the only way the `৳` sign, the Bengali SMS bodies and the
 * club's typefaces come out right without a font file to carry them.
 *
 * Opened from the export dialog it arrives with `print=1`, so the print dialog
 * is already up and "Save as PDF" is one click. Opened any other way — a
 * bookmark, a link from a chat — it is the same readable report it always was.
 */
export default async function AdminReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { kind } = await params;
  const source = adminSourceById(kind);
  if (!source) notFound();

  const raw = await searchParams;
  const state = parseAdminQuery(source, raw);
  const columns = resolveReportColumns(source, raw[EXPORT_COLUMNS_PARAM]);
  const report = await getAdminReportRows(source.id, state);
  const filters = describeFilters(source, state);
  const generated = generatedFormatter.format(new Date());
  const subset = columns.length < source.reportColumns.length;

  /** One place decides a cell's alignment, for `th` and `td` alike. */
  const alignClass = (column: AdminReportColumn) =>
    column.align === "right" ? "text-right" : "";

  const cellClass = (column: AdminReportColumn) =>
    column.align === "right"
      ? "px-2 py-2 text-right font-body text-sm text-ink/70"
      : "px-2 py-2 font-body text-sm break-words text-ink/70";

  return (
    <div
      data-print="report"
      className="mx-auto w-full max-w-[880px] px-4 py-6 md:px-8"
    >
      <div
        data-print="chrome"
        className="mb-6 flex items-center justify-between gap-4"
      >
        <Link
          href={source.path}
          className="inline-flex items-center gap-2 font-body text-sm text-ink/60 transition-colors hover:text-manara-teal"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {source.label}
        </Link>
        <ReportPrintButton />
      </div>

      {/* ── Masthead ─────────────────────────────────────────────────────────────── */}
      <header className="border-b-4 border-manara-teal pb-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-body text-xs font-semibold tracking-[0.18em] text-manara-teal uppercase">
              {siteConfig.name} · Admin export
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-ink">
              {source.reportTitle}
            </h1>
            <p className="mt-1 max-w-xl font-body text-sm text-ink/60">
              {source.reportNote}
            </p>
          </div>
          <div className="shrink-0 border-l border-ink/10 pl-5 text-right">
            <p className="font-body text-[11px] font-semibold tracking-wider text-ink/40 uppercase">
              Generated
            </p>
            <p className="mt-0.5 font-body text-sm font-medium text-ink">
              {generated}
            </p>
          </div>
        </div>
      </header>

      {/* ── Scope block ─────────────────────────────────────────────────────────── */}
      <section aria-label="Report scope" className="my-5">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-body text-[11px] font-semibold tracking-wider text-ink/40 uppercase">
              Rows
            </dt>
            <dd className="font-body text-sm font-medium text-ink">
              {report.rows.length} of {report.total}
            </dd>
          </div>
          <div>
            <dt className="font-body text-[11px] font-semibold tracking-wider text-ink/40 uppercase">
              Sort
            </dt>
            <dd className="font-body text-sm font-medium text-ink">
              {adminSortLabel(source, state.sort)}
            </dd>
          </div>
          <div>
            <dt className="font-body text-[11px] font-semibold tracking-wider text-ink/40 uppercase">
              Active filters
            </dt>
            <dd className="font-body text-sm font-medium text-ink">
              {filters.length === 0
                ? "None — every row"
                : filters
                    .map((filter) => `${filter.label}: ${filter.display}`)
                    .join(" · ")}
            </dd>
          </div>
          {/* Only stated when it is not everything: a report of all columns needs
              no line telling the reader so. */}
          {subset && (
            <div>
              <dt className="font-body text-[11px] font-semibold tracking-wider text-ink/40 uppercase">
                Columns
              </dt>
              <dd className="font-body text-sm font-medium text-ink">
                {columns.length} of {source.reportColumns.length} —{" "}
                {columns.map((column) => column.label).join(", ")}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {report.truncated && (
        <p
          role="status"
          className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 font-body text-sm text-amber-900"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          This export hit its {REPORT_ROW_LIMIT}-row ceiling, so it is not the
          whole result. Narrow the filters and export again for the rest.
        </p>
      )}

      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          {source.reportTitle} matching the filters listed above.
        </caption>
        <thead>
          <tr className="border-b border-ink/20">
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className={`px-2 py-2 font-body text-xs font-semibold tracking-wider text-ink/50 uppercase ${alignClass(column)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, index) => (
            <tr key={index} className="border-b border-ink/5 align-top">
              {columns.map((column) => (
                <td key={column.id} className={cellClass(column)}>
                  {row[column.id] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {report.rows.length === 0 && (
        <p className="py-10 text-center font-body text-ink/50">
          {source.empty.filtered}
        </p>
      )}

      <p
        data-print="footer"
        className="mt-6 border-t border-ink/10 pt-3 text-center font-body text-xs text-ink/45"
      >
        {siteConfig.name} — {source.reportTitle} · Generated {generated}
      </p>

      {wantsPrint(raw[EXPORT_PRINT_PARAM]) && <AutoPrint />}
    </div>
  );
}
