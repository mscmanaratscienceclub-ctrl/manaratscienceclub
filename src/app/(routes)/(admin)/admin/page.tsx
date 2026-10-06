import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarDays,
  Clock,
  FlaskConical,
  Inbox,
  PieChart,
  Printer,
  School,
  Share2,
  Trophy,
  Users,
} from "lucide-react";

import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";

import ActivityChart from "@/components/admin/activity-chart";
import DonutChart from "@/components/admin/donut-chart";
import RangeSegments, { TREND_RANGE_PARAM } from "@/components/admin/range-segments";
import { RankedBars } from "@/components/admin/charts";
import PageHeader from "@/components/admin/page-header";
import RecentRegistrationsTable from "@/components/admin/recent-registrations-table";
import { Panel, StatCard } from "@/components/admin/stat-card";
import {
  getDashboardBreakdown,
  getRegistrationTrend,
  getStemfestStats,
  type StemfestStats,
} from "@/lib/actions/registrations";
import {
  parseTrendRange,
  paymentMixSlices,
  stemfestTrendSeries,
  type ChartTone,
  type PaymentMixId,
} from "@/lib/admin/dashboard";
import type { RawSearchParams } from "@/lib/admin/filters";
import { UNAVAILABLE, formatCount, unwrap } from "@/lib/admin/source-status";
import {
  formatBdt,
  stemfestNoReferenceLabel,
} from "@/lib/data/stemfest-registration";

/** A total that is only real when every part of it is; otherwise it is missing. */
function sumOf(...values: (number | undefined)[]): number | null {
  let total = 0;
  for (const value of values) {
    if (typeof value !== "number") return null;
    total += value;
  }
  return total;
}

/**
 * What verified payments added up to.
 *
 * Three different situations, deliberately not collapsed into one figure:
 *
 * - the source failed → "—", because nobody knows;
 * - nothing is verified yet → a real ৳0;
 * - payments are verified but no matched SMS reported an amount (an admin accepted
 *   them by hand) → also "—", because ৳0 would read as money that was never
 *   collected rather than money whose amount the club has not recorded.
 *
 * That last case is the common one here, so it is not hypothetical.
 */
function collectedLabel(stats: StemfestStats | null): string {
  if (!stats) return UNAVAILABLE;
  if (stats.amountCollected === null) {
    return stats.verifiedCount === 0 ? formatBdt(0) : UNAVAILABLE;
  }
  const amount = Number(stats.amountCollected);
  return Number.isFinite(amount) ? formatBdt(amount) : UNAVAILABLE;
}

/** Why the collection figure reads the way it does — the number alone is not enough. */
function collectedNote(stats: StemfestStats | null): string {
  if (!stats) return "STEM Fest payments could not be loaded.";
  if (stats.amountCollected === null && stats.verifiedCount > 0) {
    return `${stats.verifiedCount} verified, but none of them carry a recorded fee.`;
  }
  return "Totals from the amounts each verified registration was asked to pay.";
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const days = parseTrendRange((await searchParams)[TREND_RANGE_PARAM]);

  // Three independent sources — STEM Fest figures, their daily trend and the
  // secondary breakdown. The pool is sized for four, so this is inside its
  // budget (see `src/db/index.ts`). Each action groups in SQL and issues its own
  // statements sequentially, so nothing is pipelined onto a shared pooled
  // connection. `allSettled` + `unwrap` keeps one failing source from blanking a
  // dashboard whose others are healthy.
  const settled = await Promise.allSettled([
    getStemfestStats(),
    getRegistrationTrend(days),
    getDashboardBreakdown(),
  ]);

  const stemfestStats = unwrap(settled[0], "stemfestStats");
  const trend = unwrap(settled[1], "registrationTrend");
  const breakdown = unwrap(settled[2], "dashboardBreakdown");

  const degraded = settled.some((result) => result.status === "rejected");

  /**
   * Daily STEM Fest entries — the sparkline behind the KPI cards.
   *
   * Reduced rather than indexed so the sparkline keeps working if a second STEM
   * Fest series is ever added to `stemfestTrendSeries`.
   */
  const dailyTotals = trend?.map((point) =>
    point.counts.reduce((sum, count) => sum + count, 0),
  );

  const paymentCounts: Record<PaymentMixId, number> = {
    verified: stemfestStats?.verifiedCount ?? 0,
    pending: stemfestStats?.pendingCount ?? 0,
    rejected: stemfestStats?.rejectedCount ?? 0,
  };
  const paymentTotal = sumOf(paymentCounts.verified, paymentCounts.pending, paymentCounts.rejected);

  const kpis: {
    label: string;
    value: string;
    note: string;
    icon: typeof Users;
    tone: ChartTone;
    spark: number[] | null;
  }[] = [
    {
      label: "STEM Fest registrations",
      value: formatCount(stemfestStats?.total),
      note: "Every entry from the STEM Fest event form, all time.",
      icon: Users,
      tone: "purple",
      spark: dailyTotals ?? null,
    },
    {
      label: "Verified payments",
      value: formatCount(stemfestStats?.verifiedCount),
      note:
        stemfestStats && paymentTotal !== null
          ? `of ${paymentTotal} STEM Fest registrations`
          : "STEM Fest bKash payments matched and accepted.",
      icon: BadgeCheck,
      tone: "green",
      spark: null,
    },
    {
      label: "Collected",
      value: collectedLabel(stemfestStats),
      note: collectedNote(stemfestStats),
      icon: Banknote,
      tone: "teal",
      spark: null,
    },
    {
      label: "Last 7 days",
      value: formatCount(stemfestStats?.thisWeek),
      note: "New STEM Fest entries since this time last week.",
      icon: CalendarDays,
      tone: "yellow",
      spark: dailyTotals?.slice(-7) ?? null,
    },
  ];

  const eventRows =
    breakdown?.events
      .filter((event) => event.count > 0)
      .sort((a, b) => b.count - a.count) ?? null;

  const schoolTotal = breakdown?.uniqueSchools ?? null;

  const referenceRows =
    breakdown?.referenceLeaderboard.map((row) => ({
      id: row.reference ?? "no-reference",
      label: row.reference ?? stemfestNoReferenceLabel,
      value: row.count,
    })) ?? null;

  return (
    <div
      style={adminAccentStyle(SECTION_ACCENT.dashboard)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <PageHeader
        eyebrow="Overview"
        title="Grand Admin"
        description="STEM Fest entries, payment progress and referrer activity across the science competition."
        icon={FlaskConical}
        action={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-admin-positive-bg px-2.5 py-1 font-space-body text-2xs font-medium tracking-[0.05em] text-admin-positive-ink uppercase">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-admin-positive-ink"
              />
              Accepting responses
            </span>
            <Link
              href="/admin/reports/brief"
              className="inline-flex items-center gap-2 rounded-[6px] border border-admin-line bg-admin-surface px-3 py-1.5 font-space-body text-xs font-medium text-admin-ink-soft transition-colors hover:border-admin-ink/35 hover:text-admin-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
            >
              <Printer className="size-3.5" aria-hidden="true" />
              Print a report
            </Link>
            <Link
              href="/admin/reports/stemfest"
              className="font-space-body text-xs text-admin-muted underline underline-offset-[3px] transition-colors hover:text-admin-ink"
            >
              Data table
            </Link>
          </>
        }
      />

      {degraded && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[10px] border border-admin-line bg-admin-warn-bg p-4 text-admin-warn-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="font-space-body text-sm">
            Some figures could not be loaded and show as &ldquo;{UNAVAILABLE}&rdquo;.
            The numbers below are incomplete — reload to retry.
          </p>
        </div>
      )}

      {/* ── Figures ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            note={kpi.note}
            icon={kpi.icon}
            tone={kpi.tone}
            spark={kpi.spark}
          />
        ))}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Registration activity"
          description={`STEM Fest entries a day over the last ${days} days.`}
          icon={BarChart3}
          action={<RangeSegments value={days} basePath="/admin" />}
        >
          {trend ? (
            <ActivityChart
              points={trend}
              series={stemfestTrendSeries}
              ariaLabel={`Bar chart of STEM Fest entries per day over the last ${days} days.`}
            />
          ) : (
            <PanelEmpty message="Activity could not be loaded." />
          )}
        </Panel>

        <Panel
          title="Payment progress"
          description="STEM Fest registrations by payment status."
          icon={PieChart}
        >
          {stemfestStats ? (
            <DonutChart
              slices={paymentMixSlices.map((slice) => ({
                ...slice,
                value: paymentCounts[slice.id],
              }))}
              centerValue={formatCount(paymentTotal ?? undefined)}
              centerCaption="entries"
              ariaLabel={`Donut chart of STEM Fest payment status: ${paymentCounts.verified} verified, ${paymentCounts.pending} pending, ${paymentCounts.rejected} rejected.`}
            />
          ) : (
            <PanelEmpty message="Payment figures could not be loaded." />
          )}
        </Panel>
      </div>

      {/* ── Lists ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel
          title="Most-entered events"
          description="STEM Fest events by number of registrations."
          icon={Trophy}
        >
          {eventRows && eventRows.length > 0 ? (
            <RankedBars
              tone="purple"
              ariaLabel="Bar list of STEM Fest events by registration count."
              items={eventRows.map((event) => ({
                id: event.eventId,
                label: event.name,
                value: event.count,
                sublabel: event.segmentName,
              }))}
            />
          ) : (
            <PanelEmpty
              message={
                eventRows === null
                  ? "Event popularity could not be loaded."
                  : "No STEM Fest events have been entered yet."
              }
            />
          )}
        </Panel>

        <Panel
          title="Schools represented"
          icon={School}
          description={
            schoolTotal === null
              ? "STEM Fest entries by school."
              : `${schoolTotal} distinct ${
                  schoolTotal === 1 ? "school" : "schools"
                } across STEM Fest entries; every Manarat spelling counts as one.`
          }
        >
          {breakdown && breakdown.topSchools.length > 0 ? (
            <RankedBars
              tone="teal"
              ariaLabel="Bar list of the schools with the most STEM Fest registrations."
              items={breakdown.topSchools.map((school) => ({
                id: school.school,
                label: school.school,
                value: school.count,
              }))}
            />
          ) : (
            <PanelEmpty
              message={
                breakdown === null
                  ? "School figures could not be loaded."
                  : "No school has more than one registration yet."
              }
            />
          )}
        </Panel>

        <Panel
          title="Reference leaderboard"
          icon={Share2}
          description={
            breakdown === null
              ? "Who referred the most STEM Fest entries."
              : `${breakdown.uniqueReferences} referrers, including entries nobody referred.`
          }
        >
          {referenceRows && referenceRows.length > 0 ? (
            <RankedBars
              tone="yellow"
              ariaLabel="Bar list of the people who referred the most STEM Fest entries."
              items={referenceRows}
            />
          ) : (
            <PanelEmpty
              message={
                breakdown === null
                  ? "Referrer figures could not be loaded."
                  : "No STEM Fest entry records a referrer yet."
              }
            />
          )}
        </Panel>
      </div>

      {/* ── Recent responses ────────────────────────────────────────────────── */}
      <Panel
        title="Recent registrations"
        description="The latest STEM Fest entries."
        icon={Clock}
        action={
          <Link
            href="/admin/science-competition"
            className="inline-flex items-center gap-1.5 font-space-body text-sm font-medium text-admin-ink-soft underline underline-offset-[3px] transition-colors hover:text-admin-ink"
          >
            View all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        }
      >
        {!breakdown ? (
          <PanelEmpty message="Recent registrations could not be loaded." />
        ) : breakdown.recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="size-6 text-admin-muted" aria-hidden="true" />
            <p className="mt-4 font-space-body text-sm text-admin-ink-soft">
              No STEM Fest registrations yet.
            </p>
            <p className="mt-1 font-space-body text-xs text-admin-muted">
              Entries appear here the moment the first one arrives.
            </p>
          </div>
        ) : (
          <RecentRegistrationsTable rows={breakdown.recent} />
        )}
      </Panel>
    </div>
  );
}

/** The "we asked and got nothing usable" state inside a panel body. */
function PanelEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-admin-line px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-[8px] bg-admin-accent-soft text-admin-accent-ink"
      >
        <Inbox className="size-4" />
      </span>
      <p className="font-space-body text-sm text-admin-muted">{message}</p>
    </div>
  );
}
