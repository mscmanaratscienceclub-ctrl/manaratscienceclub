"use client";

import { ReceiptText, Wallet } from "lucide-react";
import {
  formatBdt,
  type FeeSummary as FeeSummaryData,
} from "@/lib/data/stemfest-registration";

/**
 * Sticky running total. Participants pay by bKash *before* submitting, so the
 * amount owed has to be visible while they are still picking events — not
 * revealed at the end.
 */
export function FeeSummary({
  fee,
  entryCount,
}: {
  fee: FeeSummaryData;
  entryCount: number;
}) {
  return (
    <div className="rounded-3xl border border-space-line-soft bg-space-black/30 p-6">
      <p className="flex items-center gap-2 font-mono text-[0.6rem] font-semibold tracking-[0.24em] text-space-muted uppercase">
        <Wallet className="size-3.5 text-ion" aria-hidden="true" />
        Amount to send
      </p>

      <p className="mt-3 font-space-display text-5xl leading-none font-medium text-space-ivory tabular-nums">
        {formatBdt(fee.total)}
      </p>

      <p className="mt-2 font-space-body text-xs text-space-muted">
        {entryCount === 0
          ? "No events selected yet."
          : `${entryCount} ${entryCount === 1 ? "event" : "events"} selected.`}
      </p>

      {fee.lines.length > 0 ? (
        <ul className="mt-6 space-y-3 border-t border-space-line-soft pt-5">
          {fee.lines.map((line) => (
            <li key={`${line.segmentId}-${line.title}`}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-space-body text-sm text-space-ivory">
                  {line.title}
                </span>
                <span className="shrink-0 font-space-body text-sm font-medium text-space-ivory tabular-nums">
                  {formatBdt(line.amount)}
                </span>
              </span>
              <span className="mt-0.5 block font-space-body text-xs text-space-muted">
                {line.detail}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 flex items-start gap-2 border-t border-space-line-soft pt-5 font-space-body text-xs leading-relaxed text-space-muted">
        <ReceiptText className="mt-0.5 size-3.5 shrink-0 text-ion" aria-hidden="true" />
        Send this exact amount, then enter the Transaction ID below so we can
        match it to your registration.
      </p>
    </div>
  );
}
