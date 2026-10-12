"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Eye, Send } from "lucide-react";
import type { AdminQueryState } from "@/lib/admin/filters";
import {
  BULK_EMAIL_MAX_RECIPIENTS,
  type BulkEmailAudience,
  type BulkEmailPreview,
} from "@/lib/admin/bulk-email";
import { previewBulkEmail } from "@/lib/actions/registrations";
import { useBulkEmailSend } from "@/lib/hooks/use-bulk-email-send";
import { cn } from "@/lib/utils";
import {
  adminButton,
  adminButtonPrimary,
  adminChipSoft,
  adminPanel,
  adminTextButton,
} from "@/components/admin/styles";
import AudienceEmailList from "./audience-email-list";
import SendProgress from "./send-progress";
import EmailPreviewModal from "./preview-email";

/**
 * Sends the payment receipt (`getPaymentVerifiedEmailHtml`) to every verified
 * registration the filters match that does not already hold one.
 *
 * This is the one-click answer to "send all verified payment mails at once". It
 * sends the *same* receipt the per-row button sends — the audience query is the
 * only new part — so a participant cannot receive a different document depending
 * on which button an admin happened to press. There is deliberately no body to
 * write: the receipt is built from each row's own data.
 *
 * A registration whose receipt has already been delivered is left out of the
 * audience and counted as left alone, so pressing this twice is safe and a blast
 * that stopped halfway can be simply run again.
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
  const [preview, setPreview] = useState<BulkEmailPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { progress, send, reset } = useBulkEmailSend();

  /** Every recipient here is one this send will write to. */
  const count = audience.recipients.length;
  const leftAlone = audience.leftAlone;
  const ready = count > 0 && !audience.truncated && !progress.running;
  const canPreview = ready;

  async function handlePreview() {
    if (!canPreview || previewing) return;
    setPreviewing(true);
    try {
      const result = await previewBulkEmail({ state, kind: "confirmation" });
      setPreview(result);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSend() {
    setConfirming(false);
    await send({ state, kind: "confirmation", recipients: audience.recipients });
    // The rows' sent timestamps have moved; re-read the audience so the
    // "already had one" count is current.
    router.refresh();
  }

  return (
    <section className={cn(adminPanel, "p-5 sm:p-6")}>
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className={cn(adminChipSoft, "size-9")}>
          <BadgeCheck className="size-4" />
        </span>
        <div>
          <h2 className="font-space-display text-2xl leading-tight font-medium tracking-tight text-admin-ink">
            Payment confirmations
          </h2>
          <p className="mt-1.5 font-space-body text-sm leading-relaxed text-admin-muted">
            The receipt each verified participant is entitled to — their
            registration ID, payment details and confirmed events. Built per
            registration, so there is nothing to write. Anyone whose receipt has
            already gone out is left alone, so running this again is safe.
          </p>
        </div>
      </header>

      {audience.truncated ? (
        <p className="mt-4 rounded-[6px] bg-admin-warn-bg px-3 py-2 font-space-body text-sm text-admin-warn-ink">
          More than {BULK_EMAIL_MAX_RECIPIENTS} verified registrations are waiting
          for a receipt under these filters. Narrow them above — nothing will be
          sent until you do.
        </p>
      ) : count === 0 ? (
        <p
          className={cn(
            "mt-4 rounded-[6px] px-3 py-2 font-space-body text-sm",
            leftAlone > 0
              ? "bg-admin-positive-bg text-admin-positive-ink"
              : "bg-admin-sunken text-admin-muted",
          )}
        >
          {leftAlone > 0
            ? `All ${leftAlone} ${leftAlone === 1 ? "registration has" : "registrations have"} already had a receipt — there is nothing left to send. To post one to a named participant again, use Send confirmation on that row.`
            : "No verified registration in this audience has an email address on file. Verify payments on the Science Competition table, or clear the filters above."}
        </p>
      ) : (
        <p className="mt-4 font-space-body text-sm text-admin-muted">
          <span className="font-medium text-admin-ink">{count}</span>{" "}
          {count === 1 ? "receipt" : "receipts"} will go out
          {leftAlone > 0 && (
            <>
              {" "}
              — {leftAlone}{" "}
              {leftAlone === 1 ? "registration has" : "registrations have"} already
              had one and {leftAlone === 1 ? "is" : "are"} left alone
            </>
          )}
          .
        </p>
      )}

      {!audience.truncated && count > 0 && (
        <AudienceEmailList recipients={audience.recipients} />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleSend}
              className={adminButtonPrimary}
            >
              <Send className="size-4" aria-hidden="true" />
              Yes, send {count} {count === 1 ? "receipt" : "receipts"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={adminTextButton}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canPreview || previewing}
              className={cn(
                adminButton,
                (!canPreview || previewing) && "cursor-not-allowed opacity-50",
              )}
            >
              <Eye className="size-4" aria-hidden="true" />
              {previewing ? "Rendering…" : "Preview"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={!ready}
              title={
                ready
                  ? "Only registrations that have not received a receipt yet are written to."
                  : audience.truncated
                    ? `More than ${BULK_EMAIL_MAX_RECIPIENTS} receipts are waiting — narrow the filters first.`
                    : "Nobody in this audience is waiting on a receipt — narrow the filters, or verify some payments first."
              }
              className={cn(adminButtonPrimary, !ready && "cursor-not-allowed opacity-50")}
            >
              <Send className="size-4" aria-hidden="true" />
              Send confirmations
            </button>
          </>
        )}

        {progress.finished && (
          <button type="button" onClick={reset} className={adminTextButton}>
            Clear
          </button>
        )}
      </div>

      <SendProgress progress={progress} />

      {preview?.ok && <EmailPreviewModal preview={preview} onClose={() => setPreview(null)} />}
    </section>
  );
}
