import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

import { Sparkline } from "@/components/admin/charts";
import { accentForTone, adminAccentStyle } from "@/lib/admin/accents";
import type { ChartTone } from "@/lib/admin/dashboard";
import { cn } from "@/lib/utils";
import { adminChipSoft, adminChipSolid, adminPanel, adminPanelHead } from "./styles";

/**
 * A single figure at the top of the dashboard.
 *
 * The optional sparkline is what turns a bare number into a trend — a count of 12
 * means something different when the week before it was 40. Where there is no
 * time series behind a figure (a payment tally, a total), the card simply says
 * what the number is a share of instead of inventing a line.
 *
 * The card is a white rectangle with one hairline and no shadow until it is
 * pointed at. Its category is carried by colour: a gradient accent edge along its
 * top, a filled icon square on the same hue's ink ramp, and a sparkline drawn in
 * that hue. The edge fades out toward the right, so a row of four cards reads as
 * one band of colour rather than four separate flags. The hue comes from
 * the card's `tone` (a chart tone), so the figure, its line and the chart below it
 * are visibly the same series.
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
  return (
    <div
      style={adminAccentStyle(accentForTone(tone))}
      className="admin-edge-top rounded-[10px] border border-admin-line bg-admin-surface p-6 transition-[box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-admin-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-muted uppercase">
            {label}
          </p>
          <p className="mt-3 font-space-body text-[2rem] leading-none font-medium text-admin-ink tabular-nums">
            {value}
          </p>
        </div>
        <span aria-hidden="true" className={cn(adminChipSolid, "size-9")}>
          <Icon className="size-4" />
        </span>
      </div>

      <p className="mt-4 font-space-body text-xs leading-relaxed text-admin-muted">{note}</p>

      {spark && spark.length > 1 && (
        <div className="mt-4 border-t border-admin-line pt-3">
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
 *
 * `min-w-0` is load-bearing: a panel is usually a grid item, and a grid item's
 * default `min-width: auto` refuses to shrink below its content's min-content
 * width. Without this, a panel holding anything with a minimum width — the
 * activity chart's scroller, say — widens the whole grid instead of scrolling
 * inside itself, which is exactly how a chart overflows a phone.
 */
export function Panel({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  /** The panel's mark, on the section's wash, beside its title. */
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(adminPanel, "min-w-0", className)}>
      <header className={adminPanelHead}>
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span aria-hidden="true" className={cn(adminChipSoft, "size-9")}>
              <Icon className="size-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-space-display text-xl leading-tight font-medium tracking-tight text-admin-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-1 font-space-body text-sm leading-relaxed text-admin-muted">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
