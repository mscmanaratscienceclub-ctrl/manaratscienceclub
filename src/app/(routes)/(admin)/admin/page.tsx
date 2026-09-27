import Link from "next/link";
import {
  AlertTriangle,
  BadgeCheck,
  Banknote,
  CalendarDays,
  FlaskConical,
  Users,
} from "lucide-react";

import { DonutChart, RankedBars, StackedBarChart } from "@/components/admin/charts";
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
  paymentMixSlices,
  stemfestTrendSeries,
  type ChartTone,
  type PaymentMixId,
} from "@/lib/admin/dashboard";
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
    return `${stats.verifiedCount} verified, but no matched bKash message reported an amount.`;
  }
  return "Totals reported by the matched bKash messages.";
}

export default async function AdminDashboardPage() {
  // Three independent sources — STEM Fest figures, their daily trend and the
  // secondary breakdown. The pool is sized for four, so this is inside its
  // budget (see `src/db/index.ts`). Each action groups in SQL and issues its own
  // statements sequentially, so nothing is pipelined onto a shared pooled
  // connection. `allSettled` + `unwrap` keeps one failing source from blanking a
  // dashboard whose others are healthy.
  const settled = await Promise.allSettled([
    getStemfestStats(),
    getRegistrationTrend(),
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
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <PageHeader
        eyebrow="Overview"
        title="Grand Admin"
        description="STEM Fest entries, payment progress and referrer activity across the science competition."
        icon={FlaskConical}
        action={
          <>
            <span className="rounded-lg border border-manara-teal/20 bg-manara-teal/[0.06] px-3 py-1.5 font-body text-xs font-medium text-manara-teal">
              Accepting responses
            </span>
            <Link
              href="/admin/reports/stemfest"
              className="rounded-lg border border-ink/10 px-3 py-1.5 font-body text-xs font-medium text-ink/60 transition-colors hover:border-manara-teal/40 hover:text-manara-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-manara-teal"
            >
              Print a report
            </Link>
          </>
        }
      />

      {degraded && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50 p-4 text-amber-900"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <p className="font-body text-sm">
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
          description="STEM Fest entries a day over the last 30 days."
        >
          {trend ? (
            <StackedBarChart
              points={trend}
              series={stemfestTrendSeries}
              ariaLabel="Bar chart of STEM Fest entries per day over the last 30 days."
            />
          ) : (
            <PanelEmpty message="Activity could not be loaded." />
          )}
        </Panel>

        <Panel
          title="Payment progress"
          description="STEM Fest registrations by payment status."
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
        action={
          <Link
            href="/admin/science-competition"
            className="font-body text-sm font-medium text-manara-teal transition-colors hover:text-manara-teal/75"
          >
            View all
          </Link>
        }
      >
        {!breakdown ? (
          <PanelEmpty message="Recent registrations could not be loaded." />
        ) : breakdown.recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-3 size-9 text-ink/20" />
            <p className="font-body text-sm text-ink/50">
              No STEM Fest registrations yet.
            </p>
            <p className="mt-1 font-body text-xs text-ink/40">
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
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-ink/10 px-6 py-10 text-center">
      <p className="font-body text-sm text-ink/45">{message}</p>
    </div>
  );
}
