"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import type { AdminQueryState } from "@/lib/admin/filters";
import {
  BULK_EMAIL_BODY_MAX,
  BULK_EMAIL_MAX_RECIPIENTS,
  BULK_EMAIL_NAME_TOKEN,
  BULK_EMAIL_SUBJECT_MAX,
  type BulkEmailAudience,
} from "@/lib/admin/bulk-email";
import { useBulkEmailSend } from "@/lib/hooks/use-bulk-email-send";
import { cn } from "@/lib/utils";
import SendProgress from "./send-progress";

/** One line saying how many people this will reach, or why it cannot go out. */
function AudienceNote({ audience }: { audience: BulkEmailAudience }) {
  const count = audience.recipients.length;

  if (audience.truncated) {
    return (
      <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 font-body text-sm text-amber-700">
        More than {BULK_EMAIL_MAX_RECIPIENTS} registrations match these filters.
        Narrow them above — nothing will be sent until you do.
      </p>
    );
  }

  if (count === 0) {
    return (
      <p className="mt-4 rounded-xl bg-cream/60 px-3 py-2 font-body text-sm text-ink/60">
        No registration in this audience has an email address on file. Widen the
        filters above, or add addresses from the Science Competition table.
      </p>
    );
  }

  return (
    <p className="mt-4 font-body text-sm text-ink/60">
      This will go to <span className="font-semibold text-ink">{count}</span>{" "}
      {count === 1 ? "address" : "addresses"} — one message each, so siblings who
      share an inbox are not written to twice.
    </p>
  );
}

/**
 * The free-form half of the bulk sender.
 *
 * Two steps before anything leaves: the button only sends once it has been
 * confirmed. A blast cannot be un-sent, and a filter can be left over from a
 * previous visit, so pressing twice is the cheapest protection there is.
 */
export default function CustomMessageSection({
  state,
  audience,
}: {
  state: AdminQueryState;
  audience: BulkEmailAudience;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);
  const { progress, send, reset } = useBulkEmailSend();

  const count = audience.recipients.length;
  const filled = subject.trim().length > 0 && body.trim().length > 0;
  const ready = filled && count > 0 && !audience.truncated && !progress.running;

  async function handleSend() {
    setConfirming(false);
    await send({
      state,
      kind: "custom",
      subject: subject.trim(),
      body: body.trim(),
      expected: count,
    });
  }

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-subtle sm:p-6">
      <header className="flex items-start gap-3">
        <div className="rounded-xl bg-manara-teal/10 p-2.5">
          <Mail className="h-5 w-5 text-manara-teal" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Custom message
          </h2>
          <p className="mt-1 font-body text-sm text-ink/60">
            One subject and body, written to every registration in the audience
            above. Put {BULK_EMAIL_NAME_TOKEN} anywhere to greet each recipient by
            name.
          </p>
        </div>
      </header>

      <div className="mt-5 grid gap-4">
        <div>
          <label
            htmlFor="bulk-email-subject"
            className="mb-1 block font-body text-xs font-semibold tracking-wider text-ink/40 uppercase"
          >
            Subject
          </label>
          <input
            id="bulk-email-subject"
            type="text"
            value={subject}
            maxLength={BULK_EMAIL_SUBJECT_MAX}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="e.g. STEM Fest — your event schedule is up"
            className="w-full rounded-xl border border-ink/10 bg-cream/40 px-3 py-2 font-body text-sm text-ink outline-none placeholder:text-ink/35 focus:border-manara-teal"
          />
        </div>

        <div>
          <label
            htmlFor="bulk-email-body"
            className="mb-1 block font-body text-xs font-semibold tracking-wider text-ink/40 uppercase"
          >
            Message
          </label>
          <textarea
            id="bulk-email-body"
            rows={8}
            value={body}
            maxLength={BULK_EMAIL_BODY_MAX}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`Hello ${BULK_EMAIL_NAME_TOKEN},\n\n`}
            className="w-full resize-y rounded-xl border border-ink/10 bg-cream/40 px-3 py-2 font-body text-sm leading-relaxed text-ink outline-none placeholder:text-ink/35 focus:border-manara-teal"
          />
          <p className="mt-1 font-body text-xs text-ink/45">
            A blank line starts a new paragraph. {BULK_EMAIL_NAME_TOKEN} becomes
            each recipient’s name.
          </p>
        </div>
      </div>

      <AudienceNote audience={audience} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleSend}
              className="inline-flex items-center gap-2 rounded-xl bg-manara-teal px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-manara-teal/90 focus-visible:ring-2 focus-visible:ring-manara-teal/40 focus-visible:outline-none"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              Yes, send to {count}
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
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-manara-teal px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-manara-teal/90 focus-visible:ring-2 focus-visible:ring-manara-teal/40 focus-visible:outline-none",
              !ready && "cursor-not-allowed opacity-50",
            )}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Send message
          </button>
        )}

        {!filled && !progress.running && (
          <span className="font-body text-sm text-ink/45">
            Write a subject and a message to send.
          </span>
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
