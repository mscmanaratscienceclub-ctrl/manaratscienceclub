"use client";

import { BadgeCheck, Clock, MessageSquareText, Trash2 } from "lucide-react";

import { formatCount } from "@/lib/admin/source-status";
import { useSmsList } from "./sms-list";

/**
 * The three reconciliation counts above the SMS log.
 *
 * They are whole-log tallies, not figures narrowed by whatever the table is showing —
 * which is why a message corrected here changes one immediately. A `truncated` copy
 * holds only the newest slice and the provider then hands down the tallies that came
 * with it, so the board never claims a slice is the whole log; the chip beside the
 * heading says how many rows this browser actually has.
 */
export default function SmsStatCards() {
  const { tallies } = useSmsList();

  const cards = [
    {
      label: "Matched",
      value: formatCount(tallies.matched),
      icon: BadgeCheck,
      note: "A message whose TrxID was found on a registration.",
    },
    {
      label: "Unmatched",
      value: formatCount(tallies.unmatched),
      icon: Clock,
      note: "Nothing in the registrations table carries this TrxID yet.",
    },
    {
      label: "Ignored",
      value: formatCount(tallies.ignored),
      icon: Trash2,
      note: "Set aside by an admin — a duplicate, or not a registration fee.",
    },
    {
      label: "Total messages",
      value: formatCount(tallies.matched + tallies.unmatched + tallies.ignored),
      icon: MessageSquareText,
      note: "The three counts above. A status this build does not recognise is counted by none of them.",
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-admin-line border-t-2 border-t-admin-accent bg-admin-line lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-admin-surface p-4 sm:p-5" title={card.note}>
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
