import { CHART_TONE_ACCENT } from "./accents";
import { ADMIN_TIME_ZONE } from "@/lib/admin/filters";

/**
 * The dashboard's presentation contract.
 *
 * Everything here is data and pure helpers — never a React component and never a
 * Server Action. It lives outside `src/lib/actions/registrations.ts` because a
 * `"use server"` module may only export async functions, and BOTH the actions (to
 * shape their results) and the chart components (to render them) need the same
 * vocabulary.
 */

// ── Chart palette ────────────────────────────────────────────────────────────

/**
 * The colour names a chart may ask for.
 *
 * Deliberately a small, named set rather than free-form colour strings: a chart
 * picks a *role* ("this is the teal series") and the token is resolved in one
 * place, so the palette stays in `globals.css` and no component carries a raw hex.
 */
export type ChartTone =
  | "teal"
  | "purple"
  | "yellow"
  | "pink"
  | "blue"
  | "green"
  | "red";

/**
 * Tone name → the design token it renders as.
 *
 * Two families, and the split is the point:
 *
 * - `teal`, `blue`, `purple`, `pink` are *identity*. They resolve through
 *   `CHART_TONE_ACCENT` to the section accents, so a series is drawn in the
 *   colour of the section that owns it and the chart belongs to its page.
 * - `green`, `yellow`, `red` are *status* — verified, pending, rejected. They
 *   resolve to the status inks, the same ones the pills in the tables wear, so
 *   the ring and the pills can never disagree about what "pending" looks like.
 *
 * Every value stays a token reference: no component carries a raw hex.
 */
export const chartToneVar: Record<ChartTone, string> = {
  teal: `var(--admin-accent-${CHART_TONE_ACCENT.teal})`,
  blue: `var(--admin-accent-${CHART_TONE_ACCENT.blue})`,
  purple: `var(--admin-accent-${CHART_TONE_ACCENT.purple})`,
  pink: `var(--admin-accent-${CHART_TONE_ACCENT.pink})`,
  green: "var(--admin-positive-ink)",
  yellow: "var(--admin-warn-ink)",
  red: "var(--admin-danger-ink)",
};

// ── Registration activity ────────────────────────────────────────────────────

export interface TrendSeries {
  id: string;
  label: string;
  tone: ChartTone;
}

/**
 * The series the activity chart plots, **in stacking order**. The action returns
 * each day's counts in this same order, so a series and its numbers can never
 * drift apart.
 *
 * STEM Fest only. The campus/batch ambassador and volunteer forms are separate
 * sign-up flows with their own admin sections; folding their volume into this
 * chart buried the science competition's own activity under forms the club does
 * not run the fest with. The panel reads as one thing now — the fest's entries.
 */
export const stemfestTrendSeries: TrendSeries[] = [
  { id: "stemfest", label: "STEM Fest events", tone: "purple" },
];

export interface RegistrationTrendPoint {
  /** `YYYY-MM-DD`, a calendar day in the admin's timezone. */
  day: string;
  /** One count per entry in `stemfestTrendSeries`, same order. */
  counts: number[];
}

/**
 * How many days the activity chart spans.
 *
 * Declared here rather than beside `getRegistrationTrend` because
 * `src/lib/actions/registrations.ts` is a `"use server"` module and such a module
 * may only export async functions — the same reason `REPORT_ROW_LIMIT` lives in
 * `src/lib/admin/filters.ts`.
 */
export const DASHBOARD_TREND_DAYS = 30;

/**
 * The spans the activity chart offers.
 *
 * A week answers "is this week louder than the last?"; a quarter answers "is the
 * fest growing at all?" The middle one is the default because it is the only span
 * that fits the panel's plot without scrolling.
 */
export const TREND_RANGES = [7, DASHBOARD_TREND_DAYS, 90] as const;

export type TrendRange = (typeof TREND_RANGES)[number];

/**
 * Reads a `?days=` value into one of the offered spans.
 *
 * Anything else — absent, duplicated, `days=abc`, `days=999` — resolves to the
 * default, so a hand-edited URL degrades to the chart the page would have shown
 * rather than to an empty one.
 */
export function parseTrendRange(raw: string | string[] | undefined): TrendRange {
  const days = Number(Array.isArray(raw) ? raw[0] : raw);
  return (TREND_RANGES as readonly number[]).includes(days)
    ? (days as TrendRange)
    : DASHBOARD_TREND_DAYS;
}

// ── Breakdown rows ───────────────────────────────────────────────────────────

export interface EventPopularityRow {
  eventId: string;
  name: string;
  segmentName: string;
  count: number;
}

export interface SchoolCountRow {
  school: string;
  count: number;
}

/**
 * One row of the reference leaderboard.
 *
 * `reference` is `null` for STEM Fest entries nobody referred — the column stores
 * "not referred by anyone" as NULL rather than a sentinel name, so the club's own
 * lists of members stay free of a name that is not a name.
 */
export interface ReferenceCountRow {
  reference: string | null;
  count: number;
}

/**
 * A payment status as a donut slice, in display order. Mirrors the option table
 * in `src/lib/admin/statuses.ts` — a slice and the pill beside it name the same
 * three states.
 */
export interface PaymentMixSlice {
  id: PaymentMixId;
  label: string;
  tone: ChartTone;
}

export type PaymentMixId = "verified" | "pending" | "rejected";

/**
 * The ring's three slices, in display order, with the palette they read to.
 *
 * Green for money in, amber for money the club has not reconciled yet, red for a
 * payment it refused — the same reading as the status pills in the table, which
 * is the point: the ring and the pills must not disagree about what "pending"
 * looks like.
 */
export const paymentMixSlices: PaymentMixSlice[] = [
  { id: "verified", label: "Verified", tone: "green" },
  { id: "pending", label: "Pending", tone: "yellow" },
  { id: "rejected", label: "Rejected", tone: "red" },
];

// ── Day helpers ──────────────────────────────────────────────────────────────

/**
 * `YYYY-MM-DD` for a moment, read in the admin's timezone — the same zone every
 * day range in the query layer converts through, so a chart bucket and a
 * "from"/"to" filter mean the same day.
 *
 * `en-CA` is the locale that formats as ISO (`2026-09-20`) without rebuilding the
 * string by hand.
 */
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ADMIN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dayKeyInAdminZone(date: Date): string {
  return dayKeyFormatter.format(date);
}

/**
 * The last `span` day keys, oldest first, ending today in the admin's timezone.
 *
 * Fills the gaps the database cannot: a day with no registrations produces no row
 * from a `group by`, and a bar chart with a missing day would silently slide every
 * later bar one position left.
 *
 * Stepping back in fixed 24h blocks is exact here — Bangladesh has no daylight
 * saving, so no local day is ever 23 or 25 hours long.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function recentDayKeys(span: number): string[] {
  const keys: string[] = [];
  const now = Date.now();

  for (let offset = span - 1; offset >= 0; offset -= 1) {
    keys.push(dayKeyInAdminZone(new Date(now - offset * MS_PER_DAY)));
  }

  return keys;
}

/** Short axis label for a day key: `2026-09-20` → `20 Sep`. */
const dayLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatDayLabel(day: string): string {
  return dayLabelFormatter.format(new Date(`${day}T00:00:00Z`));
}
