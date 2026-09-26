"use client";

import { useCallback, useState } from "react";
import { sendBulkEmailBatch } from "@/lib/actions/registrations";
import type {
  BulkEmailFailure,
  BulkEmailKind,
  BulkEmailSendInput,
} from "@/lib/admin/bulk-email";

/** Live state of one blast, as the composer shows it. */
export interface BulkSendProgress {
  running: boolean;
  /** Recipients in the audience being sent to — the bar's denominator. */
  total: number;
  sent: number;
  failed: number;
  /** Left alone because the row already carries an accepted receipt. */
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
  /** The audience size the page already showed, so the bar has a ratio at once. */
  expected: number;
}

/**
 * Runs a bulk blast as a series of short Server Action calls.
 *
 * The audience is sent in slices rather than in one request: a long blast would
 * hold a single serverless invocation open past its budget and lose everything it
 * had already sent. Here each call reports its own slice, the counts accumulate
 * locally, and `nextOffset` is what says whether there is more — so a blast that
 * stops halfway leaves the admin knowing exactly how far it got.
 *
 * A refused batch ends the run with its own sentence rather than a generic error,
 * because the useful answer ("narrow the filters", "the audience changed") is one
 * the admin can act on.
 */
export function useBulkEmailSend() {
  const [progress, setProgress] = useState<BulkSendProgress>(INITIAL);

  const send = useCallback(
    async ({ state, kind, subject, body, expected }: BulkSendRequest) => {
      setProgress({ ...INITIAL, running: true, total: expected });

      let offset = 0;
      let sent = 0;
      let failed = 0;
      let skipped = 0;
      let total = expected;
      const failures: BulkEmailFailure[] = [];

      try {
        for (;;) {
          const result = await sendBulkEmailBatch({
            state,
            kind,
            offset,
            subject,
            body,
          });

          if (!result.ok) {
            setProgress({
              running: false,
              total: result.total || expected,
              sent,
              failed,
              skipped,
              failures,
              message: result.message ?? "The send was refused.",
              finished: true,
            });
            return;
          }

          total = result.total;
          sent += result.sent;
          failed += result.failed;
          skipped += result.skipped;
          failures.push(...result.failures);

          const more = result.nextOffset !== null;
          if (more) offset = result.nextOffset as number;

          setProgress({
            running: more,
            total,
            sent,
            failed,
            skipped,
            failures: [...failures],
            message: null,
            finished: !more,
          });

          if (!more) break;
        }

        const leftAlone = skipped
          ? ` · ${skipped} left alone (already receipted)`
          : "";

        setProgress({
          running: false,
          total,
          sent,
          failed,
          skipped,
          failures: [...failures],
          finished: true,
          message:
            failed === 0
              ? `All ${sent} message${sent === 1 ? "" : "s"} sent${leftAlone}.`
              : `${sent} sent · ${failed} could not be sent${leftAlone} — see the list below.`,
        });
      } catch {
        setProgress((current) => ({
          ...current,
          running: false,
          finished: true,
          message:
            "The send stopped unexpectedly. Check the audience above, then try the rest again — anything already sent is listed below.",
        }));
      }
    },
    [],
  );

  const reset = useCallback(() => setProgress(INITIAL), []);

  return { progress, send, reset };
}
