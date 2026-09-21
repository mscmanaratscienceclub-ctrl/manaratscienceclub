import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  FlaskConical,
  GraduationCap,
  HandHeart,
  Users,
} from "lucide-react";

import { DonutChart, RankedBars, StackedBarChart } from "@/components/admin/charts";
import { Panel, StatCard } from "@/components/admin/stat-card";
import {
  getAmbassadorStats,
  getDashboardBreakdown,
  getRegistrationTrend,
  getStemfestStats,
  type StemfestStats,
} from "@/lib/actions/registrations";
import {
  chartToneVar,
  paymentMixSlices,
  registrationTrendSeries,
  type ChartTone,
  type PaymentMixId,
} from "@/lib/admin/dashboard";
import { UNAVAILABLE, formatCount, unwrap } from "@/lib/admin/source-status";
import { formatBdt } from "@/lib/data/stemfest-registration";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

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
  // Four independent sources — the widest fan-out the panel has, which is exactly
  // what the connection pool is sized for (see `src/db/index.ts`). Each action
  // groups in SQL and issues its own statements sequentially, so nothing is
  // pipelined onto a shared pooled connection. `allSettled` + `unwrap` keeps one
  // failing source from blanking a dashboard whose other three are healthy.
  const settled = await Promise.allSettled([
    getAmbassadorStats(),
    getStemfestStats(),
    getRegistrationTrend(),
    getDashboardBreakdown(),
  ]);

  const ambassadorStats = unwrap(settled[0], "ambassadorStats");
  const stemfestStats = unwrap(settled[1], "stemfestStats");
  const trend = unwrap(settled[2], "registrationTrend");
  const breakdown = unwrap(settled[3], "dashboardBreakdown");

  const degraded = settled.some((result) => result.status === "rejected");

  const totalRegistrations = sumOf(
    ambassadorStats?.total,
    stemfestStats?.total,
    breakdown?.volunteerCount,
  );
  const newThisWeek = sumOf(
    ambassadorStats?.thisWeek,
    stemfestStats?.thisWeek,
    breakdown?.volunteerThisWeek,
  );

  /** Daily totals across all three forms — the sparkline behind the KPI cards. */
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
      label: "All registrations",
      value:
        totalRegistrations === null ? UNAVAILABLE : String(totalRegistrations),
      note: "Every form on this site, all time.",
      icon: Users,
      tone: "teal",
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
      tone: "purple",
      spark: null,
    },
    {
      label: "Last 7 days",
      value: newThisWeek === null ? UNAVAILABLE : String(newThisWeek),
      note: "New responses since this time last week.",
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

  const formCards = [
    {
      href: "/admin/campus-ambassador",
      label: "Campus Ambassador",
      icon: GraduationCap,
      tone: "teal" as const,
      total: ambassadorStats?.total,
      detail:
        ambassadorStats && typeof ambassadorStats.thisMonth === "number"
          ? `${ambassadorStats.thisMonth} this month · ${formatCount(ambassadorStats.uniqueSchools)} schools`
          : "Registrations from the campus and batch forms.",
    },
    {
      href: "/admin/volunteer",
      label: "STEM Fest Volunteer",
      icon: HandHeart,
      tone: "yellow" as const,
      total: breakdown?.volunteerCount,
      detail: "Applications from students volunteering across the fest.",
    },
    {
      href: "/admin/science-competition",
      label: "STEM Fest Events",
      icon: FlaskConical,
      tone: "purple" as const,
      total: stemfestStats?.total,
      detail:
        stemfestStats && paymentTotal !== null
          ? `${paymentCounts.verified} verified · ${paymentCounts.pending} pending`
          : "Event entries, payments and confirmations.",
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-body text-xs font-semibold tracking-[0.18em] text-manara-teal uppercase">
            Overview
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">Grand Admin</h1>
          <p className="mt-1 max-w-2xl font-body text-ink/60">
            Registration volume, payment progress and response quality across
            every Manarat form.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-manara-teal/20 bg-manara-teal/[0.06] px-3 py-1.5 font-body text-xs font-medium text-manara-teal">
            Accepting responses
          </span>
          <Link
            href="/admin/reports/ambassador"
            className="rounded-lg border border-ink/10 px-3 py-1.5 font-body text-xs font-medium text-ink/60 transition-colors hover:border-manara-teal/40 hover:text-manara-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-manara-teal"
          >
            Print a report
          </Link>
        </div>
      </header>

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
          description="Responses a day over the last 30 days, by form."
        >
          {trend ? (
            <StackedBarChart
              points={trend}
              series={registrationTrendSeries}
              ariaLabel="Stacked bar chart of daily registrations over the last 30 days, split by campus ambassador, STEM Fest events and volunteers."
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
      <div className="grid gap-5 xl:grid-cols-2">
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
              ? "Campus ambassador and STEM Fest responses combined."
              : `${schoolTotal} distinct school ${schoolTotal === 1 ? "name" : "names"} across both forms, as typed.`
          }
        >
          {breakdown && breakdown.topSchools.length > 0 ? (
            <RankedBars
              tone="teal"
              ariaLabel="Bar list of the schools with the most registrations."
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
      </div>

      {/* ── Form entry points ───────────────────────────────────────────────── */}
      <div className="grid gap-5 md:grid-cols-3">
        {formCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-subtle transition-all duration-300 hover:-translate-y-0.5 hover:shadow-academic focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-manara-teal"
          >
            <div className="flex items-center justify-between">
              {/* Lucide icons draw in `currentColor`, so tinting the wrapper
                  colours the glyph without a second prop. */}
              <span
                className="flex size-11 items-center justify-center rounded-xl"
                style={{
                  color: chartToneVar[card.tone],
                  backgroundColor: `color-mix(in srgb, ${chartToneVar[card.tone]} 12%, transparent)`,
                }}
              >
                <card.icon className="size-5" />
              </span>
              <span className="flex items-center gap-1.5 font-body text-xs font-medium text-ink/45">
                {formatCount(card.total)} total
                <ArrowUpRight className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-manara-teal">
                {card.label}
              </h2>
              <p className="mt-1 font-body text-sm leading-relaxed text-ink/55">
                {card.detail}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Recent responses ────────────────────────────────────────────────── */}
      <Panel
        title="Recent registrations"
        description="The latest campus ambassador responses."
        action={
          <Link
            href="/admin/campus-ambassador"
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
            <GraduationCap className="mb-3 size-9 text-ink/20" />
            <p className="font-body text-sm text-ink/50">
              No ambassador registrations yet.
            </p>
            <p className="mt-1 font-body text-xs text-ink/40">
              Responses appear here the moment the first one arrives.
            </p>
          </div>
        ) : (
          <div className="-mx-6 -mb-5 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/5 text-left">
                  <th className="px-6 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Class
                  </th>
                  <th className="px-6 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    School
                  </th>
                  <th className="px-6 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {breakdown.recent.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-cream/50"
                  >
                    <td className="px-6 py-4 font-body font-medium text-ink">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-ink/60">
                      {row.class}
                    </td>
                    <td className="max-w-xs truncate px-6 py-4 font-body text-sm text-ink/60">
                      {row.school}
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-ink/60 tabular-nums">
                      {dateFormatter.format(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
