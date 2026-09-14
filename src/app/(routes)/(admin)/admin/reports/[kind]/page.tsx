import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { getAdminReportRows } from "@/lib/actions/registrations";
import {
  ADMIN_TIME_ZONE,
  REPORT_ROW_LIMIT,
  adminSortLabel,
  adminSourceById,
  describeFilters,
  parseAdminQuery,
  type RawSearchParams,
} from "@/lib/admin/filters";
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

/**
 * The printable report for one admin source, honouring the filters it was opened
 * with.
 *
 * It parses the query string with the same `parseAdminQuery` the table pages use,
 * and runs the same WHERE builders through `getAdminReportRows` — an export is the
 * list on screen with the paging removed, never a second, separately written
 * query that could disagree with it. Everything here is server-rendered and plain
 * HTML, so the print stylesheet has no client state to fight with.
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

  const state = parseAdminQuery(source, await searchParams);
  const report = await getAdminReportRows(source.id, state);
  const filters = describeFilters(source, state);

  return (
    <div
      data-print="report"
      className="mx-auto w-full max-w-[210mm] p-6 md:p-10"
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

      <header className="mb-6 border-b border-ink/10 pb-4">
        <h1 className="font-display text-3xl font-bold text-ink">
          {source.reportTitle}
        </h1>
        <p className="mt-1 font-body text-ink/60">{source.reportNote}</p>
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-body text-sm">
          <div>
            <dt className="text-ink/40">Rows</dt>
            <dd className="font-medium text-ink">
              {report.rows.length} of {report.total}
            </dd>
          </div>
          <div>
            <dt className="text-ink/40">Sort</dt>
            <dd className="font-medium text-ink">
              {adminSortLabel(source, state.sort)}
            </dd>
          </div>
          <div>
            <dt className="text-ink/40">Generated</dt>
            <dd className="font-medium text-ink">
              {generatedFormatter.format(new Date())}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
            Filters
          </p>
          {filters.length === 0 ? (
            <p className="mt-1 font-body text-sm text-ink/60">
              None — this report covers every row.
            </p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1 font-body text-sm text-ink/70">
              {filters.map((filter) => (
                <li key={filter.label}>
                  <span className="text-ink/40">{filter.label}: </span>
                  {filter.display}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

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
            {source.reportColumns.map((column) => (
              <th
                key={column.id}
                scope="col"
                className="px-2 py-2 font-body text-xs font-semibold tracking-wider text-ink/50 uppercase"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.rows.map((row, index) => (
            <tr key={index} className="border-b border-ink/5 align-top">
              {source.reportColumns.map((column) => (
                <td
                  key={column.id}
                  className={
                    column.align === "right"
                      ? "px-2 py-2 text-right font-body text-sm text-ink/70"
                      : "px-2 py-2 font-body text-sm break-words text-ink/70"
                  }
                >
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
    </div>
  );
}
