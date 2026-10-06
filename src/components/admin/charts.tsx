import { cn } from "@/lib/utils";
import { chartToneVar, type ChartTone } from "@/lib/admin/dashboard";

/**
 * The admin panel's static charts.
 *
 * Hand-built from SVG and CSS rather than pulled from a charting library: there is
 * no chart dependency in this project, the shapes the panel needs are small, and
 * every one of them can read the design tokens directly instead of carrying a
 * second, parallel palette.
 *
 * These two stay **server** components — pure markup, no state. The charts that do
 * answer a cursor live beside them: `activity-chart.tsx` (volume over time, with a
 * value axis and a hover readout) and `donut-chart.tsx` (share of total, with a
 * slice readout).
 */

// ── Sparkline ────────────────────────────────────────────────────────────────

/**
 * A trend line for a stat card. Decorative by design — the figure it belongs to is
 * always printed beside it, so it is hidden from assistive technology rather than
 * given a label of its own.
 *
 * The area under the line is a clip-path painted with a vertical fade from the
 * tone, which is what makes it read as a body of water rather than a shadow of a
 * line. The stroke stays a real SVG polyline with `vector-effect` so it keeps its
 * 1.5px weight when the card stretches it horizontally.
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
  const area = `polygon(0% 100%, ${points
    .map(([x, y]) => `${x.toFixed(2)}% ${((y / 26) * 100).toFixed(2)}%`)
    .join(", ")}, 100% 100%)`;
  const colour = chartToneVar[tone];
  const [lastX, lastY] = points[points.length - 1];

  return (
    <div
      aria-hidden="true"
      className={cn("relative h-8 w-full", className)}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: area,
          backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${colour} 32%, transparent) 0%, color-mix(in srgb, ${colour} 5%, transparent) 100%)`,
        }}
      />
      <svg
        viewBox="0 0 100 26"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        focusable="false"
      >
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
      {/* The current day, held: a sparkline without an end point reads as a
          waveform rather than as a series that has a *today*. */}
      <span
        className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-admin-surface"
        style={{
          left: `${lastX}%`,
          top: `${(lastY / 26) * 100}%`,
          backgroundColor: colour,
        }}
      />
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
 * list of labelled figures rather than a picture of one. Hovering a row lifts both
 * the label and its bar, which is what tells an admin the two belong together.
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
    <ul className={cn("space-y-4", className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <li key={item.id} className="group">
          <div className="flex items-baseline justify-between gap-4">
            <p className="truncate font-space-body text-sm text-admin-ink-soft motion-safe:transition-colors group-hover:text-admin-ink">
              {item.label}
            </p>
            <p className="shrink-0 font-space-display text-sm font-medium text-admin-ink tabular-nums">
              {item.value}
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-[2px] bg-admin-neutral-bg">
            <div
              className="admin-sheen h-full rounded-[2px] motion-safe:transition-[filter] motion-safe:duration-200 group-hover:brightness-110"
              style={{
                width: `${Math.max((item.value / peak) * 100, item.value > 0 ? 3 : 0)}%`,
                backgroundColor: chartToneVar[item.tone ?? tone],
              }}
            />
          </div>
          {item.sublabel && (
            <p className="mt-1 font-space-body text-xs text-admin-muted">{item.sublabel}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
