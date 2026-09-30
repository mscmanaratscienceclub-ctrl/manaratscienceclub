import Link from "next/link";
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
 * The markup is structured as a *document* (masthead, scope block, table,
 * footer) rather than as the admin page it came from. The `@media print` block in
 * `globals.css` styles that structure into a clean A4 PDF; on screen it reads as a
 * readable preview of the same report.
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
  const generated = generatedFormatter.format(new Date());

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
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-3">
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

      <p
        data-print="footer"
        className="mt-6 border-t border-ink/10 pt-3 text-center font-body text-xs text-ink/45"
      >
        {siteConfig.name} — {source.reportTitle} · Generated {generated}
      </p>
    </div>
  );
}
