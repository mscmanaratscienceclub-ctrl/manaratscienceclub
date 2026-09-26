"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Send } from "lucide-react";
import type { AdminQueryState } from "@/lib/admin/filters";
import {
  BULK_EMAIL_MAX_RECIPIENTS,
  type BulkEmailAudience,
} from "@/lib/admin/bulk-email";
import { useBulkEmailSend } from "@/lib/hooks/use-bulk-email-send";
import { cn } from "@/lib/utils";
import SendProgress from "./send-progress";

/**
 * Sends the payment receipt (`getPaymentVerifiedEmailHtml`) to every verified
 * registration the filters match.
 *
 * This is the one-click answer to "send all verified payment mails at once". It
 * sends the *same* receipt the per-row button sends — the audience query is the
 * only new part — so a participant cannot receive a different document depending
 * on which button an admin happened to press. There is deliberately no body to
 * write: the receipt is built from each row's own data.
 *
 * Re-sends are allowed and counted, because a bounce is the common reason an admin
 * is here at all. The note above the button says how many have already received
 * one so the second send is a choice rather than an accident.
 */
export default function PaymentConfirmationSection({
  state,
  audience,
}: {
  state: AdminQueryState;
  audience: BulkEmailAudience;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { progress, send, reset } = useBulkEmailSend();

  const count = audience.recipients.length;
  const alreadySent = audience.recipients.filter(
    (recipient) => recipient.alreadySent,
  ).length;
  const ready = count > 0 && !audience.truncated && !progress.running;

  async function handleSend() {
    setConfirming(false);
    await send({ state, kind: "confirmation", expected: count });
    // The rows' sent timestamps have moved; re-read the audience so the
    // "already received one" count is current.
    router.refresh();
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-subtle sm:p-6">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-2.5">
          <BadgeCheck
            className="h-5 w-5 text-emerald-600"
            aria-hidden="true"
          />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Payment confirmations
          </h2>
          <p className="mt-1 font-body text-sm text-ink/60">
            The receipt each verified participant is entitled to — their
            registration ID, payment details and confirmed events. Built per
            registration, so there is nothing to write.
          </p>
        </div>
      </header>

      {audience.truncated ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 font-body text-sm text-amber-700">
          More than {BULK_EMAIL_MAX_RECIPIENTS} verified registrations match these
          filters. Narrow them above — nothing will be sent until you do.
        </p>
      ) : count === 0 ? (
        <p className="mt-4 rounded-xl bg-cream/60 px-3 py-2 font-body text-sm text-ink/60">
          No verified registration in this audience has an email address on file.
          Verify payments on the Science Competition table, or clear the filters
          above.
        </p>
      ) : (
        <p className="mt-4 font-body text-sm text-ink/60">
          <span className="font-semibold text-ink">{count}</span>{" "}
          {count === 1 ? "receipt" : "receipts"} will go out
          {alreadySent > 0 && (
            <>
              {" "}
              — {alreadySent} of them{" "}
              {alreadySent === 1 ? "has" : "have"} already received one and will
              get it again
            </>
          )}
          .
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-xl bg-manara-teal px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-manara-teal/90 focus-visible:ring-2 focus-visible:ring-manara-teal/40 focus-visible:outline-none"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Yes, send {count} {count === 1 ? "receipt" : "receipts"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="font-body text-sm text-ink/50 underline underline-offset-2 transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!ready}
            title={
              ready
                ? undefined
                : "Narrow the audience above, or verify some payments first."
            }
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-manara-teal px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-manara-teal/90 focus-visible:ring-2 focus-visible:ring-manara-teal/40 focus-visible:outline-none",
              !ready && "cursor-not-allowed opacity-50",
            )}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send confirmations
          </button>
        )}

        {progress.finished && (
          <button
            type="button"
            onClick={reset}
            className="font-body text-sm text-ink/50 underline underline-offset-2 transition-colors hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      <SendProgress progress={progress} />
    </section>
  );
}
