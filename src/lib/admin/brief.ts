import {
  dayKeyInAdminZone,
  type RegistrationTrendPoint,
} from "@/lib/admin/dashboard";

/**
 * The registration brief's vocabulary.
 *
 * The brief is the printable answer to four questions the club asks every week —
 * is registration picking up, which segments are moving, which schools are
 * turning up, who is referring — plus a projection for tomorrow. All of it is
 * data and pure helpers: no React component and no Server Action lives here,
 * because `src/lib/actions/registrations.ts` is a `"use server"` module and such
 * a module may only export async functions, while BOTH the action (to shape its
 * result) and the page (to render it) need the same names.
 */

// ── Windows ──────────────────────────────────────────────────────────────────

/**
 * Days the brief's trend spans: three weeks, so a direction is not one good day
 * and the weekday weighting below has at least two samples of every weekday.
 */
export const BRIEF_TREND_DAYS = 21;

/**
 * The "now" window the brief reads, and — by symmetry — the equally long window
 * immediately before it that every "up or down" comparison is made against.
 */
export const BRIEF_WINDOW_DAYS = 7;

/**
 * A change smaller than this is reported as flat.
 *
 * Both halves are needed. One extra entry is noise at any size, while a 4 % move
 * on a busy week is noise at a larger one — so a movement reads as flat if it is
 * small in *either* measure rather than only when it is small in both.
 */
const FLAT_BAND_ENTRIES = 1;
const FLAT_BAND_PERCENT = 5;

// ── Direction ────────────────────────────────────────────────────────────────

export type MovementDirection = "rising" | "falling" | "flat";

export interface WindowCounts {
  /** Entries in the current window (the last `BRIEF_WINDOW_DAYS` days). */
  current: number;
  /** Entries in the window of the same length immediately before it. */
  previous: number;
}

/**
 * Change against the previous window as a whole percentage.
 *
 * `null` means "no meaningful percentage" rather than zero: from a previous
 * window of nothing, any number of entries is an infinite rise, and printing
 * `∞%` or `+100%` would both be a lie about a rate. The caller shows the entry
 * difference instead, which is always true.
 */
export function relativePercent(counts: WindowCounts): number | null {
  if (counts.previous === 0) return counts.current === 0 ? 0 : null;
  return Math.round(((counts.current - counts.previous) / counts.previous) * 100);
}

/** Whether a window moved, in which direction, and by how much. */
export interface Movement extends WindowCounts {
  delta: number;
  percent: number | null;
  direction: MovementDirection;
}

export function movementOf(counts: WindowCounts): Movement {
  const delta = counts.current - counts.previous;
  const percent = relativePercent(counts);
  const withinFlatBand =
    Math.abs(delta) <= FLAT_BAND_ENTRIES ||
    (percent !== null && Math.abs(percent) < FLAT_BAND_PERCENT);

  return {
    ...counts,
    delta,
    percent,
    direction: withinFlatBand || delta === 0 ? "flat" : delta > 0 ? "rising" : "falling",
  };
}

/** A labelled movement — one row of the brief's segment or event table. */
export interface MovementRow extends Movement {
  id: string;
  label: string;
  sublabel?: string;
}

export interface MovementInput {
  id: string;
  label: string;
  sublabel?: string;
  current: number;
  previous: number;
}

/**
 * The movement table, in the order the brief prints it.
 *
 * Biggest riser first, biggest faller last, so the two ends of the page answer
 * the two halves of the question ("what is booming, what is down") without the
 * reader having to scan for the sign. Ties break on the current window, then on
 * the label, so two runs of the brief print identically.
 */
export function toMovementRows(inputs: MovementInput[]): MovementRow[] {
  return inputs
    .map((input) => ({
      ...input,
      ...movementOf({ current: input.current, previous: input.previous }),
    }))
    .sort(
      (a, b) =>
        b.delta - a.delta ||
        b.current - a.current ||
        a.label.localeCompare(b.label, "en", { sensitivity: "base" }),
    );
}

/** The single strongest move in one direction, or `null` when nothing moved. */
export function leadingMovement(
  rows: MovementRow[],
  direction: Exclude<MovementDirection, "flat">,
): MovementRow | null {
  return rows.find((row) => row.direction === direction) ?? null;
}

export interface MovementDirectionOption {
  value: MovementDirection;
  /** The word the brief prints. */
  label: string;
  /**
   * Pill classes: a muted wash and its ink, straight from the admin palette.
   * Literal utilities, exactly as `src/lib/admin/statuses.ts` does it — the value
   * here is a class *name* in a data module, and a `var(--token)` cannot be
   * composed into a `bg-*`/`text-*` pair at build time.
   *
   * Rising is green and falling is red because the brief is read as money and
   * seats, not as weather: the same reading the payment pills already teach.
   */
  tone: string;
}

export const movementDirectionOptions: MovementDirectionOption[] = [
  {
    value: "rising",
    label: "Rising",
    tone: "bg-admin-positive-bg text-admin-positive-ink",
  },
  {
    value: "flat",
    label: "Level",
    tone: "bg-admin-neutral-bg text-admin-neutral-ink",
  },
  {
    value: "falling",
    label: "Falling",
    tone: "bg-admin-danger-bg text-admin-danger-ink",
  },
];

export function movementDirectionOption(
  value: MovementDirection,
): MovementDirectionOption {
  return (
    movementDirectionOptions.find((option) => option.value === value) ??
    movementDirectionOptions[1]
  );
}

/**
 * A movement's change as one printed string: `+9 (+45 %)`, `−3`, or `no change`.
 *
 * The entry difference always prints, because it is always true; the percentage
 * only prints when there was something to divide by — a rise from nothing has no
 * percentage, and `+100 %` would report a rate the data does not contain.
 */
export function formatChange(movement: Movement): string {
  if (movement.delta === 0) {
    return movement.current === 0 && movement.previous === 0
      ? "no entries in either"
      : "no change";
  }

  const sign = movement.delta > 0 ? "+" : "−";
  const entries = `${sign}${Math.abs(movement.delta)}`;
  if (movement.percent === null) return entries;

  return `${entries} (${sign}${Math.abs(movement.percent)} %)`;
}

// ── Trend ────────────────────────────────────────────────────────────────────

export interface TrendDay {
  day: string;
  count: number;
}

export interface TrendSummary extends Movement {
  /** Every entry across the whole span, not only the two compared windows. */
  spanTotal: number;
  /** `spanTotal` spread over the days the brief covers. */
  averagePerDay: number;
  busiest: TrendDay | null;
  /** Daily counts across the whole span, oldest first — the sparkline's data. */
  days: TrendDay[];
}

/** One point's counts added up; the trend carries a single series today, but the shape is the database's. */
function pointTotal(point: RegistrationTrendPoint): number {
  return point.counts.reduce((sum, count) => sum + count, 0);
}

/**
 * The brief's first figure: the last window against the one before it.
 *
 * `recentDayKeys` gap-fills, so a day with no registrations is a real zero here
 * rather than a missing row — which is what makes the average honest.
 */
export function summarizeTrend(
  points: RegistrationTrendPoint[],
): TrendSummary {
  const days: TrendDay[] = points.map((point) => ({
    day: point.day,
    count: pointTotal(point),
  }));

  const windowSize = Math.min(BRIEF_WINDOW_DAYS, days.length);
  const current = days.slice(-windowSize);
  const previousWindow = days.slice(-2 * windowSize, -windowSize);

  const sum = (rows: TrendDay[]) =>
    rows.reduce((total, row) => total + row.count, 0);

  const movement = movementOf({
    current: sum(current),
    previous: sum(previousWindow),
  });

  const spanTotal = sum(days);
  const busiest = days.reduce<TrendDay | null>(
    (best, day) => (best === null || day.count > best.count ? day : best),
    null,
  );

  return {
    ...movement,
    spanTotal,
    averagePerDay: days.length === 0 ? 0 : round1(spanTotal / days.length),
    busiest: busiest && busiest.count > 0 ? busiest : null,
    days,
  };
}

// ── Referrers ────────────────────────────────────────────────────────────────

/**
 * How a referrer's name relates to the ambassador register.
 *
 * The STEM Fest form stores the referrer's *name*, chosen from the shared roster;
 * only the ambassador form records whether that person signed up as a campus
 * ambassador or a batch one. So the brief can name the kind only when the register
 * has a row for the name — and says so plainly when it has not, rather than
 * guessing from the roster the name came from.
 */
export type ReferrerKind = "campus" | "batch" | "both" | "unmatched";

export interface ReferrerRow {
  id: string;
  name: string;
  /** All-time referrals on the register. */
  total: number;
  /** Referrals inside the current window. */
  recent: number;
  kind: ReferrerKind;
}

export interface ReferrerKindTally {
  kind: ReferrerKind;
  /** Referrals, not referrers: the question is who is bringing the most in. */
  referrals: number;
}

export const referrerKindLabels: Record<ReferrerKind, string> = {
  campus: "Campus ambassador",
  batch: "Batch ambassador",
  both: "Both registers",
  unmatched: "Not on the register",
};

/** The kind a name resolves to, from the two flags the ambassador register answers with. */
export function referrerKindOf(flags: {
  isCampus: boolean;
  isBatch: boolean;
}): ReferrerKind {
  if (flags.isCampus && flags.isBatch) return "both";
  if (flags.isCampus) return "campus";
  if (flags.isBatch) return "batch";
  return "unmatched";
}

// ── The brief as a whole ─────────────────────────────────────────────────────

/** One school's share of the register, all-time and inside the current window. */
export interface BriefSchoolRow {
  id: string;
  school: string;
  total: number;
  recent: number;
}

/**
 * Everything the printable brief states, as one read.
 *
 * One action rather than five, because the brief's five sections have to agree
 * about which window they describe: read together, `trend.current` and the
 * segment rows' `current` count the same seven days, and a brief assembled from
 * separately-timed queries could print a total that its own tables contradict.
 */
export interface RegistrationBrief {
  spanDays: number;
  windowDays: number;
  totals: {
    allTime: number;
    verified: number;
    pending: number;
    rejected: number;
  };
  trend: TrendSummary;
  /** The four segments, ranked by momentum — the "booming vs down" table. */
  segments: MovementRow[];
  /** Events within those segments, only where the two windows show anything. */
  events: MovementRow[];
  schools: BriefSchoolRow[];
  /** Distinct schools on the register, the league table's ceiling. */
  uniqueSchools: number;
  referrers: ReferrerRow[];
  /** Referrals per ambassador kind, so "campus vs batch" is answered as a total. */
  referrerTallies: ReferrerKindTally[];
  /** Entries that name a referrer at all — the denominator for the tallies. */
  referredTotal: number;
  estimate: NextDayEstimate;
}

// ── Tomorrow ─────────────────────────────────────────────────────────────────

export type EstimateConfidence = "moderate" | "low";

export interface NextDayEstimate {
  /** `YYYY-MM-DD` for the day being estimated. */
  day: string;
  /** That day as the club reads it: `Thursday 9 October`. */
  label: string;
  expected: number;
  low: number;
  high: number;
  /** The method in one printed sentence — an estimate without its method is a guess. */
  basis: string;
  confidence: EstimateConfidence;
  /** Why the confidence reads the way it does, and what would change the figure. */
  notes: string[];
}

/**
 * The day after `day`.
 *
 * Parsed as UTC and stepped in whole days, so no timezone or daylight-saving
 * boundary is ever crossed: Bangladesh has neither, and these keys name calendar
 * days rather than instants.
 */
function dayAfter(day: string): string {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function utcDayKey(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

const dayLabelFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * A least-squares line through daily counts plotted at x = 0, 1, 2 …
 *
 * Returned as a reader plus its slope, because the printed method has to name the
 * rate it is extrapolating — "up 11.5 a day" is the part an admin checks first.
 */
function leastSquares(values: number[]): { slope: number; at: (x: number) => number } {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = mean(values);
  let covariance = 0;
  let spreadX = 0;
  for (let index = 0; index < n; index += 1) {
    covariance += (index - meanX) * (values[index] - meanY);
    spreadX += (index - meanX) ** 2;
  }
  const slope = spreadX === 0 ? 0 : covariance / spreadX;
  return { slope, at: (x: number) => meanY + slope * (x - meanX) };
}

/**
 * Sample standard deviation, or `null` when there is nothing to spread.
 *
 * `null` rather than `0` for a single value: one day of data has no measurable
 * day-to-day variation, and calling that zero would claim a certainty the data
 * cannot support.
 */
function stddevSample(values: number[]): number | null {
  if (values.length < 2) return null;
  const average = mean(values);
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * A whole number of registrations for tomorrow.
 *
 * Deliberately arithmetic a club member can check by hand, not a model: a straight
 * least-squares line through the last seven days, extended one day, with the week's
 * scatter around *that line* as the range. Nothing is learned, the method prints
 * beside the figure, and when the club disagrees with the number it can argue with
 * the arithmetic rather than with a black box.
 *
 * A line rather than a flat average because this register is a ramp. Averaging answers
 * "what has a day been lately"; on a week that doubled against the one before it, that
 * pulls tomorrow's figure back towards the quiet start of the week. A line answers
 * "what is a day right now", and the same growth makes its scatter smaller, not bigger —
 * which is why the band comes from the residuals and not from the raw spread.
 */
export function estimateNextDay(
  points: RegistrationTrendPoint[],
  today = new Date(),
): NextDayEstimate {
  const days: TrendDay[] = points.map((point) => ({
    day: point.day,
    count: pointTotal(point),
  }));

  const anchor = days.length > 0 ? days[days.length - 1].day : dayKeyInAdminZone(today);
  const target = dayAfter(anchor);
  const label = dayLabelFormatter.format(utcDayKey(target));

  const windowSize = Math.min(BRIEF_WINDOW_DAYS, days.length);
  const recent = days.slice(-windowSize).map((day) => day.count);
  const previousWindow = days
    .slice(-2 * windowSize, -windowSize)
    .map((day) => day.count);

  const baseline = mean(recent);
  const recentTotal = recent.reduce((total, value) => total + value, 0);
  const priorTotal = previousWindow.reduce((total, value) => total + value, 0);
  const movement = movementOf({ current: recentTotal, previous: priorTotal });

  // Extrapolating a line from seven points is where the nonsense lives, so the
  // step is bounded twice over: the figure may not exceed twice the week's busiest
  // day, and the band may not shrink below a fifth of the figure.
  const busiest = recent.reduce((max, value) => Math.max(max, value), 0);
  const ceiling = busiest * 2;
  const fit = windowSize >= 2 ? leastSquares(recent) : null;
  const raw = fit ? fit.at(windowSize) : baseline;
  const projected = clamp(raw, 0, ceiling);
  const capped = fit !== null && raw > ceiling;
  const expected = Math.round(projected);

  const residuals = fit
    ? recent.map((value, index) => value - fit.at(index))
    : recent.map((value) => value - baseline);
  const scatter = stddevSample(residuals) ?? stddevSample(recent) ?? Math.max(1, Math.round(baseline));
  const band = Math.max(1, Math.round(scatter), Math.round(expected * 0.2));
  const low = Math.max(0, expected - band);
  const high = expected + band;

  const notes: string[] = [];

  if (recentTotal === 0) {
    notes.push(
      "Nothing arrived in the last 7 days, so this is the quiet baseline rather than a growth rate: an announcement or a deadline would move it on its own.",
    );
  }

  if (windowSize < BRIEF_WINDOW_DAYS) {
    notes.push(
      `The register only holds ${windowSize} day${windowSize === 1 ? "" : "s"} of history, so the line is drawn through what exists — expect the figure to firm up as the week fills.`,
    );
  }

  if (capped) {
    notes.push(
      `The line alone pointed at ${Math.round(raw)}, which the figure does not follow: it is held at twice the week's busiest day, so one loud day cannot project a flood.`,
    );
  }

  if (expected > 0 && band / expected > 0.6) {
    notes.push(
      "The week's days scatter widely around the line, so read the range as a planning band rather than a likely figure.",
    );
  }

  if (movement.direction !== "flat") {
    const change =
      movement.percent === null
        ? `${movement.delta > 0 ? "+" : ""}${movement.delta} entries`
        : `${movement.delta > 0 ? "+" : ""}${movement.percent}%`;
    notes.push(
      `Built from the last ${windowSize} days, which are ${change} against the week before — the line follows that direction instead of averaging it away.`,
    );
  }

  const confidence: EstimateConfidence =
    recentTotal < 5 || baseline === 0 || (expected > 0 && band / expected > 0.8)
      ? "low"
      : "moderate";

  const basis = fit
    ? `Least-squares line through the last ${windowSize} days (${
        fit.slope >= 0 ? "+" : "−"
      }${round1(Math.abs(fit.slope))} a day), read one day past the end (${round1(
        projected,
      )}) and rounded; ± ${band} ${band === 1 ? "entry" : "entries"}, the larger of the week's scatter around that line and a fifth of the figure.`
    : `The single day the register holds (${round1(baseline)}), ± ${band} ${
        band === 1 ? "entry" : "entries"
      }.`;

  return {
    day: target,
    label,
    expected,
    low,
    high,
    basis,
    confidence,
    notes,
  };
}
