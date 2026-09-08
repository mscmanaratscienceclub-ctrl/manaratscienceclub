"use client";

import { motion } from "motion/react";
import { CheckCircle2, Clock, RefreshCw, Ticket } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import {
  describeEntry,
  formatBdt,
  getStemfestClassLabel,
  stemfestFormCopy,
  type StemfestEntry,
} from "@/lib/data/stemfest-registration";
import { formatDate } from "../register/form-primitives";

/** What gets persisted to localStorage so a reload still shows the receipt. */
export interface SavedStemfestSubmission {
  id: string;
  submittedAt: string;
  totalFee: number;
  entries: StemfestEntry[];
  participant: {
    name: string;
    classId: string;
    phone: string;
    bkashNumber: string;
    bkashTrxId: string;
  };
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
      <dt className="font-mono text-[0.62rem] tracking-[0.2em] text-space-muted uppercase">
        {label}
      </dt>
      <dd className="font-space-body text-sm leading-relaxed break-words text-space-ivory">
        {value}
      </dd>
    </div>
  );
}

export function SubmissionReceipt({
  submission,
  onResubmit,
}: {
  submission: SavedStemfestSubmission;
  onResubmit: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const { participant } = submission;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="overflow-hidden rounded-3xl border border-space-line-soft bg-space-black/30"
    >
      <div className="flex flex-col items-center gap-5 px-8 py-14 text-center">
        <motion.div
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 22 }}
          className="flex size-16 items-center justify-center rounded-full border border-ion-line bg-ion/10"
        >
          <CheckCircle2 className="size-7 text-ion" aria-hidden="true" />
        </motion.div>
        <div>
          <p className="font-mono text-[0.62rem] font-semibold tracking-[0.28em] text-ion uppercase">
            {stemfestFormCopy.eyebrow}
          </p>
          <h2 className="mt-3 font-space-display text-3xl leading-tight font-medium text-balance text-space-ivory sm:text-4xl">
            Registration received
          </h2>
          <p className="mt-3 max-w-[46ch] font-space-body text-sm text-space-muted">
            {stemfestFormCopy.confirmation}
          </p>
        </div>
      </div>

      <div className="px-6 pb-10 sm:px-8">
        <div className="flex items-center gap-2.5 border-t border-space-line-soft py-5 font-mono text-[0.62rem] tracking-[0.2em] text-space-muted uppercase">
          <Clock className="size-3.5 shrink-0 text-ion" aria-hidden="true" />
          Submitted on {formatDate(submission.submittedAt)}
        </div>

        <dl className="divide-y divide-space-line-soft border-y border-space-line-soft">
          <ReceiptRow label="Name" value={participant.name} />
          <ReceiptRow label="Class" value={getStemfestClassLabel(participant.classId)} />
          <ReceiptRow label="Phone" value={participant.phone} />
          <ReceiptRow label="bKash number" value={participant.bkashNumber} />
          <ReceiptRow label="Transaction ID" value={participant.bkashTrxId} />
        </dl>

        <div className="mt-8 rounded-2xl border border-space-line-soft bg-space-black/40 p-5">
          <h3 className="flex items-center gap-2 font-mono text-[0.62rem] font-semibold tracking-[0.24em] text-ion uppercase">
            <Ticket className="size-3.5" aria-hidden="true" />
            Your events
          </h3>
          <ul className="mt-4 space-y-2.5">
            {submission.entries.map((entry) => (
              <li
                key={`${entry.eventId}-${entry.teamSize ?? "solo"}`}
                className="font-space-body text-sm text-space-ivory"
              >
                {describeEntry(entry)}
                {entry.teammates.length > 0 ? (
                  <span className="mt-0.5 block text-xs text-space-muted">
                    With {entry.teammates.join(", ")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-baseline justify-between gap-4 border-t border-space-line-soft pt-4">
            <span className="font-mono text-[0.62rem] tracking-[0.2em] text-space-muted uppercase">
              Total recorded
            </span>
            <span className="font-space-display text-2xl font-medium text-space-ivory tabular-nums">
              {formatBdt(submission.totalFee)}
            </span>
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[38ch] font-space-body text-sm leading-relaxed text-space-muted">
            {stemfestFormCopy.resubmitNote}
          </p>
          <button
            type="button"
            onClick={onResubmit}
            className="msc-btn-pill-ghost shrink-0"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {stemfestFormCopy.resubmitLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
