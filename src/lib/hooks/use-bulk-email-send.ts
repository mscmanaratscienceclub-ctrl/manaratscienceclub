"use client";

import { useCallback, useState } from "react";
import { sendBulkEmailBatch } from "@/lib/actions/registrations";
import {
  BULK_EMAIL_BATCH_SIZE,
  type BulkEmailFailure,
  type BulkEmailKind,
  type BulkEmailRecipient,
  type BulkEmailSendInput,
} from "@/lib/admin/bulk-email";

/** Live state of one blast, as the composer shows it. */
export interface BulkSendProgress {
  running: boolean;
  /** Recipients the admin confirmed the send against — the bar's denominator. */
  total: number;
  sent: number;
  failed: number;
  /** Ids the server's fresh audience no longer held: receipted since the page loaded. */
  skipped: number;
  failures: BulkEmailFailure[];
  /** A refusal, or the closing sentence once a send has finished. */
  message: string | null;
  finished: boolean;
}

const INITIAL: BulkSendProgress = {
  running: false,
  total: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  failures: [],
  message: null,
  finished: false,
};

export interface BulkSendRequest {
  state: BulkEmailSendInput["state"];
  kind: BulkEmailKind;
  subject?: string;
  body?: string;
  /** Whether the `custom` body is sanitised HTML rather than escaped prose. */
  allowHtml?: boolean;
  /**
   * The audience the page showed, in the order it showed it — the list the admin
   * confirmed against, so it is also the bar's denominator.
   */
  recipients: BulkEmailRecipient[];
}

/**
 * Runs a bulk blast as a series of short Server Action calls.
 *
 * The audience is sent in slices rather than in one request: a long blast would
 * hold a single serverless invocation open past its budget and lose everything it
 * had already sent. Each call carries the ids of one slice and the counts
 * accumulate locally, so a blast that stops halfway leaves the admin knowing
 * exactly how far it got.
 *
 * Ids rather than a position, because the sendable audience shrinks as it is
 * mailed — every accepted receipt takes its row out of the list the server rebuilds
 * per batch — so an offset would point further and further past the recipients that
 * are still waiting.
 *
 * A refused batch ends the run with its own sentence rather than a generic error,
 * because the useful answer ("narrow the filters", "the audience changed") is one
 * the admin can act on. A batch that throws keeps the same rule: the counts from
 * the batches before it are reported, not discarded with the crash.
 */
export function useBulkEmailSend() {
  const [progress, setProgress] = useState<BulkSendProgress>(INITIAL);

  const send = useCallback(
    async ({
      state,
      kind,
      subject,
      body,
      allowHtml,
      recipients,
    }: BulkSendRequest) => {
      const total = recipients.length;
      let sent = 0;
      let failed = 0;
      let skipped = 0;
      const failures: BulkEmailFailure[] = [];

      /** One place to write the accumulated counts, so no path reports a partial view. */
      const report = (running: boolean, message: string | null): void =>
        setProgress({
          running,
          total,
          sent,
          failed,
          skipped,
          failures: [...failures],
          message,
          finished: !running,
        });

      report(true, null);

      for (let start = 0; start < total; start += BULK_EMAIL_BATCH_SIZE) {
        const slice = recipients.slice(start, start + BULK_EMAIL_BATCH_SIZE);
        const more = start + BULK_EMAIL_BATCH_SIZE < total;

        try {
          const result = await sendBulkEmailBatch({
            state,
            kind,
            ids: slice.map((recipient) => recipient.id),
            subject,
            body,
            allowHtml,
          });

          sent += result.sent;
          failed += result.failed;
          skipped += result.skipped;
          failures.push(...result.failures);

          if (!result.ok) {
            report(false, result.message ?? "The send was refused.");
            return;
          }
        } catch {
          report(
            false,
            `The send stopped after ${sent + failed + skipped} of ${total}. Anything already mailed is listed below — run it again for the rest, and those receipts will be left alone.`,
          );
          return;
        }

        report(more, null);
      }

      const leftAlone = skipped ? ` · ${skipped} left alone` : "";

      report(
        false,
        failed === 0
          ? `All ${sent} message${sent === 1 ? "" : "s"} sent${leftAlone}.`
          : `${sent} sent · ${failed} could not be sent${leftAlone} — see the list below.`,
      );
    },
    [],
  );

  const reset = useCallback(() => setProgress(INITIAL), []);

  return { progress, send, reset };
}
