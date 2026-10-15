"use client";

import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Clock,
  School,
  Trophy,
  XCircle,
} from "lucide-react";

import type { StemfestStats } from "@/lib/actions/registrations";
import { ADMIN_TIME_ZONE } from "@/lib/admin/filters";
import { formatBdt } from "@/lib/data/stemfest-registration";
import { useStemfestList } from "./stemfest-list";

/** A figure the panel could not obtain, drawn as an em dash rather than as zero. */
const UNAVAILABLE = "—";

/**
 * What the club asked every registration to send, added up.
 *
 * `null` is not zero and must not be shown as one: it means no row carries a
 * figure, because all of them were filed before `total_fee` existed. `৳0` there
 * would read as a fest that asked for no money at all.
 */
function toCollectLabel(stats: StemfestStats): string {
  if (stats.amountToCollect === null) {
    return stats.total === 0 ? formatBdt(0) : UNAVAILABLE;
  }
  const amount = Number(stats.amountToCollect);
  return Number.isFinite(amount) ? formatBdt(amount) : UNAVAILABLE;
}

const HOUR_MINUTE = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ADMIN_TIME_ZONE,
});

/**
 * The board of figures under the registrations table's heading.
 *
 * These eight have no WHERE clause — they are whole-table aggregates — so a cached
 * panel can and must recompute them: marking a payment Verified moves that row between
 * Pending and Verified, changes what the club has collected, and a card still printing
 * the figure from before the click would contradict the pill the admin just set. The
 * provider hands them down the same recomputed object the table is reading.
 *
 * `This Week` is a rolling seven days measured from the moment the rows were taken, not
 * from this clock, so the number does not move while an admin stares at a list that has
 * not. Its tooltip says which moment it is as of.
 */
export default function StemfestStatCards() {
  const { stats, cache } = useStemfestList();

  const asOf = cache.generatedAt
    ? `As of ${HOUR_MINUTE.format(new Date(cache.generatedAt))}, the moment this browser’s copy was taken.`
    : "Fresh from the server.";

  const cards = [
    { label: "Registrations", value: String(stats.total), icon: Trophy, title: asOf },
    {
      label: "Verified Payments",
      value: String(stats.verifiedCount),
      icon: BadgeCheck,
      title: `${asOf} Counted by the same definition the status pill and the Payment filter use.`,
    },
    // Pending and Rejected are printed beside Verified because they are what an
    // admin works through: all three count the same effective status the pill and
    // the `payment` filter use, so a card can never contradict the table below it.
    // What the club asked for, summed over every row — the number `Collected` on the
    // dashboard answers, and the one a payment can be reconciled against.
    {
      label: "Amount to Collect",
      value: toCollectLabel(stats),
      icon: Banknote,
      title: asOf,
    },
    {
      label: "Pending Payments",
      value: String(stats.pendingCount),
      icon: Clock,
      title: `${asOf} Counted by the same definition the status pill and the Payment filter use.`,
    },
    {
      label: "Rejected Payments",
      value: String(stats.rejectedCount),
      icon: XCircle,
      title: `${asOf} Counted by the same definition the status pill and the Payment filter use.`,
    },
    {
      label: "This Week",
      value: String(stats.thisWeek),
      icon: CalendarDays,
      title: `Registrations from the seven days before ${cache.generatedAt ? HOUR_MINUTE.format(new Date(cache.generatedAt)) : "now"}.`,
    },
    {
      label: "Unique Schools",
      value: String(stats.uniqueSchools),
      icon: School,
      title: `${asOf} Every spelling of the host school counts as one.`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-admin-line border-t-2 border-t-admin-accent bg-admin-line sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((card) => (
        <div key={card.label} className="bg-admin-surface p-5" title={card.title}>
          <dt className="flex items-center gap-2 font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-accent-ink uppercase">
            <card.icon className="size-3.5 shrink-0" aria-hidden="true" />
            {card.label}
          </dt>
          <dd className="mt-2.5 font-space-body text-2xl leading-none font-medium text-admin-ink tabular-nums">
            {card.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
