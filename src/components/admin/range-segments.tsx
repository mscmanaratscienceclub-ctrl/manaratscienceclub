import Link from "next/link";

import {
  DASHBOARD_TREND_DAYS,
  TREND_RANGES,
  type TrendRange,
} from "@/lib/admin/dashboard";
import { cn } from "@/lib/utils";

/** The query-string key the dashboard reads its span from. */
export const TREND_RANGE_PARAM = "days";

/**
 * The activity chart's span, as three links rather than three buttons.
 *
 * A range is page state, not component state: it has to survive a reload, a
 * paste into a colleague's chat and the back button, and a Server Component
 * cannot hold React state anyway. So the page reads `?days=` and this control
 * only points at the next value — which keeps the whole interaction free of
 * client JavaScript.
 *
 * The selected segment lifts onto the panel's own surface with the shadow the KPI
 * cards use, so it reads as the raised choice inside a recessed track instead of
 * as a coloured button.
 *
 * The track never wraps and never shrinks: half a control on one line and half on
 * the next is not a segmented control. When the panel head runs out of room beside
 * the title, its own `flex-wrap` moves the whole track to a line of full width.
 *
 * Each segment is at least 32px tall, so the track measures 36 with its hairline —
 * the height the shell's own mobile controls present, and enough for a thumb to hit
 * the range it means to hit.
 */
export default function RangeSegments({
  value,
  basePath,
}: {
  value: TrendRange;
  basePath: string;
}) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className="inline-flex shrink-0 items-center gap-px rounded-[6px] border border-admin-line bg-admin-sunken p-px"
    >
      {TREND_RANGES.map((days) => {
        const selected = days === value;

        return (
          <Link
            key={days}
            href={
              days === DASHBOARD_TREND_DAYS
                ? basePath
                : `${basePath}?${TREND_RANGE_PARAM}=${days}`
            }
            aria-current={selected ? "true" : undefined}
            aria-label={`${days} days of registrations`}
            className={cn(
              "inline-flex min-h-8 items-center rounded-[5px] px-2.5 py-1 font-space-body text-2xs font-medium tabular-nums transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-admin-accent",
              selected
                ? "bg-admin-surface text-admin-accent-ink shadow-admin-hover"
                : "text-admin-muted hover:text-admin-ink",
            )}
          >
            {days} days
          </Link>
        );
      })}
    </div>
  );
}
