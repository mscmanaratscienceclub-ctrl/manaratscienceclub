import { cn } from "@/lib/utils";
import {
  chartToneVar,
  formatDayLabel,
  type ChartTone,
  type RegistrationTrendPoint,
  type TrendSeries,
} from "@/lib/admin/dashboard";

/**
 * The admin panel's charts.
 *
 * Hand-built from SVG and CSS grid rather than pulled from a charting library:
 * there is no chart dependency in this project, the three shapes the panel needs
 * are small, and every one of them can read the design tokens directly instead of
 * carrying a second, parallel palette.
 *
 * All of them are **server** components — they are pure markup with no state — and
 * all of them are `role="img"` with a summary `aria-label`, because a bar chart is
 * one image to a screen reader and needs to say what it shows rather than exposing
 * two dozen meaningless rectangles.
 */

// ── Sparkline ────────────────────────────────────────────────────────────────

/**
 * A trend line for a stat card. Decorative by design — the figure it belongs to is
 * always printed beside it, so it is hidden from assistive technology rather than
 * given a label of its own.
 */
export function Sparkline({
  values,
  tone,
  className,
}: {
  values: number[];
  tone: ChartTone;
  className?: string;
}) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const step = 100 / (values.length - 1);
  const points = values.map((value, index) => [
    index * step,
    24 - (value / max) * 20,
  ]);
  const line = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const colour = chartToneVar[tone];

  return (
    <svg
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={`0,26 ${line} 100,26`} fill={colour} opacity="0.1" />
      <polyline
        points={line}
        fill="none"
        stroke={colour}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        // Without this the horizontal stretch from `preserveAspectRatio="none"`
        // would smear the stroke width too.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Stacked bars ─────────────────────────────────────────────────────────────

/**
 * Registrations per day, one bar a day, split by form.
 *
 * Columns are flex children rather than SVG rects so the day's own tooltip can be
 * a plain `title` attribute and the empty days keep their width — a chart that
 * dropped zero days would quietly compress the month.
 */
export function StackedBarChart({
  points,
  series,
  ariaLabel,
  className,
}: {
  points: RegistrationTrendPoint[];
  series: TrendSeries[];
  ariaLabel: string;
  className?: string;
}) {
  const totals = points.map((point) =>
    point.counts.reduce((sum, count) => sum + count, 0),
  );
  const peak = Math.max(...totals, 1);
  // Every bar is scaled against a ceiling a little above the busiest day, so the
  // tallest one has air above it — a bar that touches the top of the plot reads as
  // clipped rather than as the maximum.
  const ceiling = peak * 1.12;
  // Roughly one label a week, so the axis stays legible at 30 bars.
  const labelEvery = Math.max(1, Math.ceil(points.length / 5));

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="font-body text-xs text-ink/40">Responses per day</p>
        <p className="font-body text-xs text-ink/40 tabular-nums">
          {peak === 1 ? "1 on the busiest day" : `peak ${peak} in a day`}
        </p>
      </div>

      <div
        className="flex h-44 items-end gap-[3px] border-b border-ink/10"
        role="img"
        aria-label={ariaLabel}
      >
        {points.map((point, index) => {
          const total = totals[index] ?? 0;

          return (
            <div
              key={point.day}
              className="group flex h-full flex-1 flex-col justify-end gap-px"
              title={`${formatDayLabel(point.day)} — ${total} registration${total === 1 ? "" : "s"}`}
            >
              {series.map((entry, seriesIndex) => {
                const value = point.counts[seriesIndex] ?? 0;
                if (value === 0) return null;

                return (
                  <div
                    key={entry.id}
                    className="w-full rounded-[2px] transition-opacity duration-200 group-hover:opacity-70"
                    style={{
                      // A bar shorter than a pixel would vanish; the floor keeps a
                      // single registration visible without distorting the rest.
                      height: `${Math.max((value / ceiling) * 100, 1.5)}%`,
                      backgroundColor: chartToneVar[entry.tone],
                    }}
                  />
                );
              })}
              {/* A day with nothing in it gets a hairline so the column still
                  reads as a day rather than as a gap in the data. */}
              {total === 0 && <div className="h-px w-full bg-ink/15" />}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-[3px]" aria-hidden="true">
        {points.map((point, index) => (
          <span
            key={point.day}
            className="flex-1 text-center font-body text-[0.6rem] text-ink/35"
          >
            {index % labelEvery === 0 ? formatDayLabel(point.day) : ""}
          </span>
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {series.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-2 font-body text-xs text-ink/60"
          >
            <span
              className="size-2.5 rounded-[2px]"
              style={{ backgroundColor: chartToneVar[entry.tone] }}
              aria-hidden="true"
            />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Donut ────────────────────────────────────────────────────────────────────

export interface DonutSlice {
  id: string;
  label: string;
  value: number;
  tone: ChartTone;
}

/**
 * A share-of-total ring, drawn with `stroke-dasharray` on concentric circles.
 *
 * Slices are laid out cumulatively with a negative offset so each arc starts where
 * the previous one ended; a small gap is subtracted from every dash when the ring
 * is split, which is what stops two adjacent slices of similar colour from reading
 * as one.
 */
export function DonutChart({
  slices,
  ariaLabel,
  centerValue,
  centerCaption,
  className,
}: {
  slices: DonutSlice[];
  ariaLabel: string;
  centerValue: string;
  centerCaption: string;
  className?: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const drawn = slices.filter((slice) => slice.value > 0);
  const gap = drawn.length > 1 ? 2 : 0;

  let offset = 0;

  return (
    <div className={cn("flex items-center gap-6", className)}>
      <svg
        viewBox="0 0 100 100"
        className="size-36 shrink-0"
        role="img"
        aria-label={ariaLabel}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-ink)"
          strokeOpacity="0.07"
          strokeWidth="12"
        />

        {drawn.map((slice) => {
          const share = total > 0 ? slice.value / total : 0;
          const length = share * circumference;
          const arc = (
            <circle
              key={slice.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={chartToneVar[slice.tone]}
              strokeWidth="12"
              strokeDasharray={`${Math.max(length - gap, 0.5)} ${circumference - Math.max(length - gap, 0.5)}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 50 50)"
            >
              <title>{`${slice.label}: ${slice.value}`}</title>
            </circle>
          );

          offset += length;
          return arc;
        })}

        <text
          x="50"
          y="49"
          textAnchor="middle"
          fontSize="19"
          fontWeight="700"
          fill="var(--color-ink)"
        >
          {centerValue}
        </text>
        <text
          x="50"
          y="61"
          textAnchor="middle"
          fontSize="6"
          fill="var(--color-ink)"
          fillOpacity="0.5"
        >
          {centerCaption}
        </text>
      </svg>

      <ul className="min-w-0 space-y-3">
        {slices.map((slice) => (
          <li key={slice.id} className="flex items-baseline gap-2.5">
            <span
              className="size-2.5 shrink-0 translate-y-px rounded-[2px]"
              style={{ backgroundColor: chartToneVar[slice.tone] }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-body text-sm text-ink/80">{slice.label}</p>
              <p className="font-body text-xs text-ink/45 tabular-nums">
                {slice.value}
                {total > 0 && (
                  <span className="ml-1.5 text-ink/35">
                    {Math.round((slice.value / total) * 100)}%
                  </span>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Ranked bars ──────────────────────────────────────────────────────────────

export interface RankedBarItem {
  id: string;
  label: string;
  value: number;
  sublabel?: string;
  tone?: ChartTone;
}

/**
 * A ranked list where each row is its own bar — for figures with long labels
 * ("LFR (Line Following Robot)") that a column chart would have to abbreviate.
 *
 * The bar is decorative: each row prints its own number, so the markup stays a
 * list of labelled figures rather than a picture of one.
 */
export function RankedBars({
  items,
  tone = "teal",
  ariaLabel,
  className,
}: {
  items: RankedBarItem[];
  tone?: ChartTone;
  ariaLabel?: string;
  className?: string;
}) {
  if (items.length === 0) return null;
  const peak = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className={className} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.id} className="group">
          <div className="flex items-baseline justify-between gap-4">
            <p className="truncate font-body text-sm text-ink/80">{item.label}</p>
            <p className="shrink-0 font-display text-sm font-semibold text-ink tabular-nums">
              {item.value}
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${Math.max((item.value / peak) * 100, item.value > 0 ? 3 : 0)}%`,
                backgroundColor: chartToneVar[item.tone ?? tone],
              }}
            />
          </div>
          {item.sublabel && (
            <p className="mt-1 font-body text-xs text-ink/40">{item.sublabel}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
