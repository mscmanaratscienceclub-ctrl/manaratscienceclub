import type { ComponentType } from "react";

import { Sparkline } from "@/components/admin/charts";
import { chartToneVar, type ChartTone } from "@/lib/admin/dashboard";
import { cn } from "@/lib/utils";

/**
 * A single figure at the top of the dashboard.
 *
 * The optional sparkline is what turns a bare number into a trend — a count of 12
 * means something different when the week before it was 40. Where there is no
 * time series behind a figure (a payment tally, a total), the card simply says
 * what the number is a share of instead of inventing a line.
 */

type IconComponent = ComponentType<{ className?: string }>;

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone,
  spark,
}: {
  label: string;
  value: string;
  note: string;
  icon: IconComponent;
  tone: ChartTone;
  /** Daily values behind the figure, oldest first; omit for a card with no series. */
  spark?: number[] | null;
}) {
  const colour = chartToneVar[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-surface p-5 shadow-subtle transition-shadow duration-300 hover:shadow-academic">
      {/* A single hairline of the card's own colour, so four cards read as four
          categories at a glance rather than four identical boxes. */}
      <span
        className="absolute inset-x-0 top-0 h-0.5 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: colour }}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-body text-xs font-medium tracking-wide text-ink/50 uppercase">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl leading-none font-bold text-ink tabular-nums">
            {value}
          </p>
        </div>
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            color: colour,
            backgroundColor: `color-mix(in srgb, ${colour} 12%, transparent)`,
          }}
        >
          <Icon className="size-5" />
        </span>
      </div>

      <p className="mt-3 font-body text-xs leading-relaxed text-ink/45">{note}</p>

      {spark && spark.length > 1 && (
        <div className="mt-3">
          <Sparkline values={spark} tone={tone} />
        </div>
      )}
    </div>
  );
}

/**
 * The panel a chart or list sits in.
 *
 * Extracted so every section on the dashboard shares one heading treatment, one
 * padding scale and one description slot — the fastest way for a set of unrelated
 * figures to look like a single page.
 */
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-surface shadow-subtle", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/5 px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-1 font-body text-sm text-ink/50">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
