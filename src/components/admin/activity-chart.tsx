"use client";

import { useState } from "react";

import {
  chartToneVar,
  formatDayLabel,
  type RegistrationTrendPoint,
  type TrendSeries,
} from "@/lib/admin/dashboard";
import { cn } from "@/lib/utils";

/**
 * Registrations per day, stacked by series.
 *
 * A client leaf because the answer to "how was the 14th?" has to arrive when the
 * cursor asks it; a native `title` attribute makes the reader wait half a second
 * for a browser-chrome box. Hovering dims the rest of the plot, washes the day
 * under the cursor, and prints that day's total plus every series inside it.
 *
 * What a chart is *for* decides what it draws:
 *
 * - a value axis with gridlines and tick labels, so a bar means a number rather
 *   than a relative height;
 * - one colour per series and no more, because the question is volume over time,
 *   not colour variety;
 * - a sheen rather than a rainbow on each bar, which is what makes a column read
 *   as a solid quantity instead of a flat rectangle.
 *
 * Columns are flex children, not SVG rects, so a day with nothing in it keeps its
 * width. A chart that dropped empty days would quietly compress the month and show
 * a busier fortnight than there was.
 */

/**
 * The value axis: four even steps, rounded up so the tallest bar has air above it.
 * A bar touching the top of the plot reads as clipped rather than as the maximum.
 */
function axisScale(peak: number) {
  const step = Math.max(1, Math.ceil(peak / 4));
  return { ceiling: step * 4, ticks: [step * 4, step * 3, step * 2, step, 0] };
}

/** The narrowest the plot gets: the width the panel hands it (34rem). */
const PLOT_MIN_PX = 544;

/**
 * The narrowest a column may be.
 *
 * Below this a bar is thinner than the pointer that has to land on it, so a long
 * span widens the plot and lets the scroller take the overflow instead of packing
 * a quarter of a year into one pixel a day.
 */
const COLUMN_MIN_PX = 12;

export default function ActivityChart({
  points,
  series,
  ariaLabel,
  className,
}: {
  points: RegistrationTrendPoint[];
  series: TrendSeries[];
  /** What the plot shows, for the reader who cannot see it. */
  ariaLabel: string;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  const totals = points.map((point) =>
    point.counts.reduce((sum, count) => sum + count, 0),
  );
  const peak = Math.max(...totals, 1);
  const { ceiling, ticks } = axisScale(peak);
  // About five labels whatever the span, so the axis stays legible at 90 bars.
  const labelEvery = Math.max(1, Math.ceil(points.length / 5));

  const slot = 100 / points.length;
  const plotMinWidth = Math.max(PLOT_MIN_PX, points.length * COLUMN_MIN_PX);
  const focused = active === null ? null : (points[active] ?? null);
  const focusedTotal = active === null ? 0 : (totals[active] ?? 0);

  // The tooltip hangs centred over the hovered column, except near either end of
  // the range, where a centred box would be clipped by the horizontal scroller and
  // it lines up with the column's left or right edge instead.
  const tooltip =
    active === null
      ? null
      : active <= 2
        ? { left: `${(active / points.length) * 100}%`, shift: "" }
        : active >= points.length - 3
          ? { left: `${((active + 1) / points.length) * 100}%`, shift: "-translate-x-full" }
          : {
              left: `${(active + 0.5) * slot}%`,
              shift: "-translate-x-1/2",
            };

  /** Read the day beside the cursor, clamped so both ends of the range stay reachable. */
  function move(step: number) {
    setActive((current) => {
      const from = current ?? points.length - 1;
      return Math.min(Math.max(from + step, 0), points.length - 1);
    });
  }

  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-space-body text-xs text-admin-muted">Responses per day</span>
        <span className="font-space-body text-xs tabular-nums text-admin-muted">
          {focused
            ? `${formatDayLabel(focused.day)} · ${focusedTotal} registration${
                focusedTotal === 1 ? "" : "s"
              }`
            : peak === 1
              ? "1 on the busiest day"
              : `peak ${peak} in a day`}
        </span>
      </figcaption>

      <div className="flex gap-2">
        {/* The value axis sits outside the scroller: it carries the scale, and a
            scale that scrolled away under a chart would leave nothing to read
            against. */}
        <div className="relative h-44 w-9 shrink-0" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 font-space-body text-2xs tabular-nums text-admin-muted"
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div style={{ minWidth: plotMinWidth }}>
            <div
              role="group"
              tabIndex={0}
              aria-label={ariaLabel}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(points.length - 1)}
              onBlur={() => setActive(null)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") move(1);
                else if (event.key === "ArrowLeft") move(-1);
                else if (event.key === "Home") setActive(0);
                else if (event.key === "End") setActive(points.length - 1);
                else return;
                event.preventDefault();
              }}
              className={cn(
                "relative h-44 rounded-[4px] outline-none",
                "focus-visible:ring-2 focus-visible:ring-admin-accent/45",
              )}
            >
              {/* Gridlines sit behind the columns. The baseline is the axis and gets
                  the stronger rule; the guides above it are references, not data. */}
              <div aria-hidden="true" className="absolute inset-0">
                {ticks.map((tick, index) => (
                  <span
                    key={tick}
                    className={cn(
                      "absolute inset-x-0 border-t",
                      index === ticks.length - 1
                        ? "border-admin-line"
                        : "border-admin-line/80 border-dashed",
                    )}
                    style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
                  />
                ))}
              </div>

              {/* The crosshair: one column-wide wash, in the section's own hue. */}
              {active !== null && (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 rounded-[3px] bg-admin-accent-soft/80"
                  style={{ width: `${slot}%`, left: `${active * slot}%` }}
                />
              )}

              <div className="absolute inset-0 flex items-end gap-px">
                {points.map((point, index) => {
                  const dimmed = active !== null && active !== index;

                  return (
                    <div
                      key={point.day}
                      className="flex h-full flex-1 flex-col justify-end gap-px"
                      onMouseEnter={() => setActive(index)}
                    >
                      {series.map((entry, seriesIndex) => {
                        const value = point.counts[seriesIndex] ?? 0;
                        if (value === 0) return null;

                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              "admin-sheen w-full rounded-t-[3px] motion-safe:transition-opacity motion-safe:duration-200",
                              dimmed ? "opacity-45" : "opacity-100",
                            )}
                            style={{
                              // A floor keeps a single registration visible without
                              // distorting the rest of the scale.
                              height: `${Math.max((value / ceiling) * 100, 1.5)}%`,
                              backgroundColor: chartToneVar[entry.tone],
                            }}
                          />
                        );
                      })}
                      {/* An empty day still reads as a day, not as a gap in the data. */}
                      {point.counts.every((count) => count === 0) && (
                        <span className="mx-auto mb-px h-1 w-1 rounded-full bg-admin-line" />
                      )}
                    </div>
                  );
                })}
              </div>

              {focused && tooltip && (
                <div
                  className={cn(
                    "pointer-events-none absolute top-2 z-10 w-44 rounded-[8px] border border-admin-line bg-admin-surface p-3 shadow-admin-dialog",
                    tooltip.shift,
                  )}
                  style={{ left: tooltip.left }}
                >
                  <p className="font-space-body text-xs font-medium text-admin-ink">
                    {formatDayLabel(focused.day)}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {series.map((entry, seriesIndex) => (
                      <li key={entry.id} className="flex items-baseline justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-[2px]"
                            style={{ backgroundColor: chartToneVar[entry.tone] }}
                          />
                          <span className="truncate font-space-body text-xs text-admin-muted">
                            {entry.label}
                          </span>
                        </span>
                        <span className="font-space-body text-xs tabular-nums text-admin-ink-soft">
                          {focused.counts[seriesIndex] ?? 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {series.length > 1 && (
                    <p className="mt-2 flex items-baseline justify-between border-t border-admin-line pt-2 font-space-body text-xs font-medium text-admin-ink tabular-nums">
                      <span>Total</span>
                      <span>{focusedTotal}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-2 flex gap-px" aria-hidden="true">
              {points.map((point, index) => (
                <span
                  key={point.day}
                  className={cn(
                    "flex-1 whitespace-nowrap text-center font-space-body text-2xs motion-safe:transition-colors",
                    index === active
                      ? "font-medium text-admin-accent-ink"
                      : "text-admin-muted",
                  )}
                >
                  {index % labelEvery === 0 ? formatDayLabel(point.day) : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {series.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-2 font-space-body text-xs text-admin-muted"
          >
            <span
              className="admin-sheen size-2.5 rounded-[2px]"
              style={{ backgroundColor: chartToneVar[entry.tone] }}
              aria-hidden="true"
            />
            {entry.label}
          </li>
        ))}
      </ul>

      {/* The keyboard reader gets the answer the tooltip gives, in the same words,
          without needing to see the plot. */}
      <span className="sr-only" role="status" aria-live="polite">
        {focused ? `${formatDayLabel(focused.day)}: ${focusedTotal} registrations.` : ""}
      </span>
    </figure>
  );
}
