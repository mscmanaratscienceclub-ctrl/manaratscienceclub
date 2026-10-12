/**
 * The contract for the admin panel's bulk email sender (`/admin/emails`).
 *
 * Two kinds of mail go out from that page, both over the same audience — the
 * STEM Fest filter set from `src/lib/admin/filters.ts`:
 *
 * - `custom` — one subject and body an admin writes, with `{{name}}` replaced per
 *   recipient. A participant who shares an address with a sibling receives it
 *   once.
 * - `confirmation` — the existing payment receipt (`sendPaymentVerifiedEmail`),
 *   built per registration from the row's own data, sent to every *verified*
 *   payment the filters match that does not already hold one.
 *
 * Everything here is plain data and pure schemas: the Server Actions in
 * `src/lib/actions/registrations.ts` are a `"use server"` module and may only
 * export async functions, so the limits and shapes they share with the client
 * composer have to live outside it.
 */

import { z } from "zod";
import type { AdminQueryState } from "@/lib/admin/filters";

/** Which mail a batch is sending. */
export type BulkEmailKind = "custom" | "confirmation";

/**
 * Ceiling on one send.
 *
 * A blast is unbounded by nature, so it needs a bound the paged table does not:
 * past this the audience query stops and the panel refuses the send and asks the
 * admin to narrow the filters. Resend's rate limit and the club's own reputation
 * both want a blast to be a deliberate, watched act rather than a reflex.
 *
 * It counts **recipients the send would write to**, never rows the filters happen
 * to match. The distinction is what the panel is for: a club whose verified
 * registrations have passed this number still has receipts to send, and rows the
 * blast leaves alone must not consume the ceiling and refuse the send on their
 * account.
 */
export const BULK_EMAIL_MAX_RECIPIENTS = 400;

/**
 * Recipients per Server Action call.
 *
 * The page sends in slices rather than one long request: a single call for a
 * 300-recipient blast would hold a serverless invocation open for minutes and
 * lose the lot when it timed out. Each call carries the ids of one slice, so the
 * slice size is also the largest id list the action will accept.
 *
 * The ceiling is the function's clock, not Resend's: the loop is sequential, so a
 * batch runs `size x (BULK_EMAIL_DELAY_MS + provider latency)` inside one
 * invocation. At 20 that is roughly 22s against the platform's 60s default — no
 * `maxDuration` is set anywhere in `src/`. Raising this further needs an explicit
 * `maxDuration` on the emails route first, not just a bigger number here.
 */
export const BULK_EMAIL_BATCH_SIZE = 20;

/**
 * Pause between two sends inside a batch.
 *
 * Resend accepts two requests a second on its default plan, so 600ms keeps a
 * blast inside the limit without the admin having to think about it.
 */
export const BULK_EMAIL_DELAY_MS = 600;

export const BULK_EMAIL_SUBJECT_MAX = 160;
export const BULK_EMAIL_BODY_MAX = 5000;

/**
 * The one merge tag a custom message supports.
 *
 * A tag rather than any templating engine: the body is prose, and the only thing
 * worth varying per recipient is what to call them.
 */
export const BULK_EMAIL_NAME_TOKEN = "{{name}}";

/**
 * One participant a batch will write to.
 *
 * Every recipient here is a row the send *is* going to touch: a confirmation's
 * already-receipted registrations and a custom message's extra rows sharing an
 * inbox are excluded by the query, not carried along with a flag for the send loop
 * to discount. That is what lets the ceiling above count real work — and it is why
 * a batch is addressed by id rather than by a position in a list that the blast
 * itself keeps shrinking.
 */
export interface BulkEmailRecipient {
  id: string;
  name: string;
  /** Trimmed and non-empty — a row without an address is never a recipient. */
  email: string;
}

/** The set of people one send would reach. */
export interface BulkEmailAudience {
  recipients: BulkEmailRecipient[];
  /**
   * More recipients than `BULK_EMAIL_MAX_RECIPIENTS`. The send is refused until
   * the filters are narrowed, so a truncated list is never silently mailed.
   */
  truncated: boolean;
  /**
   * Rows the filters matched that this send will not write to, and why: a
   * confirmation leaves behind the registrations already holding an accepted
   * receipt, a custom message the extra rows that share an address with one
   * already on the list.
   *
   * Reported rather than kept quiet, because "420 of your 479 verified
   * registrations are already receipted" is the sentence that tells an admin the
   * send is small on purpose and not broken. A receipt the panel leaves behind is
   * still reachable: the per-row button on the Science Competition table re-sends
   * to one named participant, which is what a bounce report calls for.
   */
  leftAlone: number;
}

/** A recipient the provider refused, named so an admin can follow it up. */
export interface BulkEmailFailure {
  name: string;
  email: string;
  /** The provider's reason, in a sentence. */
  message: string;
}

/** What one batch call answers. */
export interface BulkEmailBatchResult {
  ok: boolean;
  /** Sentence for a refused batch — an audience narrowed since the page loaded. */
  message?: string;
  sent: number;
  failed: number;
  /**
   * Ids the batch was given that the fresh audience no longer holds — a receipt
   * that went out from the row's own button since the page rendered, a payment
   * marked back to pending. Counted rather than silently dropped, so a blast that
   * reaches fewer people than the list says why.
   */
  skipped: number;
  failures: BulkEmailFailure[];
}

/** The audience a send is drawn from, as the panel parses it from the URL. */
export const bulkEmailStateSchema = z.object({
  query: z.string().max(200),
  values: z.record(z.string(), z.string().max(200)),
  sort: z.enum([
    "newest",
    "oldest",
    "name-asc",
    "name-desc",
    "amount-asc",
    "amount-desc",
  ]),
  page: z.number().int().min(1).max(1_000_000),
});

/** What the composer hands to a batch call. */
export interface BulkEmailSendInput {
  state: AdminQueryState;
  kind: BulkEmailKind;
  /**
   * One slice of the audience the page showed, by row id.
   *
   * An id, never an address: the action resolves every one against an audience it
   * rebuilds for itself, so a client can name a row it was already able to see and
   * nothing more. Ids rather than an offset, because the sendable audience *moves*
   * while a blast runs — every accepted receipt stamps its row and takes it out of
   * the list — so a position in that list would point somewhere else by batch two.
   */
  ids: string[];
  /** Required for `custom`, ignored for `confirmation`. */
  subject?: string;
  body?: string;
  /** Whether the `custom` body is sanitised HTML rather than escaped prose. */
  allowHtml?: boolean;
}

export const bulkEmailSendSchema = z
  .object({
    kind: z.enum(["custom", "confirmation"]),
    ids: z
      .array(z.uuid("Unknown row"))
      .min(1, "Nothing to send.")
      .max(BULK_EMAIL_BATCH_SIZE),
    subject: z.string().trim().max(BULK_EMAIL_SUBJECT_MAX).optional(),
    body: z.string().trim().max(BULK_EMAIL_BODY_MAX).optional(),
    allowHtml: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind !== "custom") return;
    if (!value.subject) {
      ctx.addIssue({
        code: "custom",
        path: ["subject"],
        message: "Give the message a subject line.",
      });
    }
    if (!value.body) {
      ctx.addIssue({
        code: "custom",
        path: ["body"],
        message: "Write something for the message to say.",
      });
    }
  });

/** What the preview needs from a client: the same shape as a send, minus the cursor. */
export interface BulkEmailPreviewInput {
  state: AdminQueryState;
  kind: BulkEmailKind;
  subject?: string;
  body?: string;
  /** Whether the `custom` body is sanitised HTML rather than escaped prose. */
  allowHtml?: boolean;
}

/**
 * What a preview answers — the email rendered for one sample recipient, with no
 * message actually sent.
 *
 * A preview must never send mail. It exists so an admin can see the email exactly
 * as a recipient would before committing to a blast. It renders the *first* person
 * in the real audience — via the same `bulkEmailRecipients` query a send uses — so
 * merge tags resolve to a real name and a confirmation previews with that row's
 * own data, not invented copy.
 */
export interface BulkEmailPreview {
  /** The resolved subject line (confirmation subjects are built per row). */
  subject: string;
  /** The fully rendered, inline-styled email markup for `<iframe srcDoc>`. */
  html: string;
  /** The recipient the preview was built for, so the admin knows whose mail they see. */
  sample: {
    name: string;
    email: string;
  };
  /**
   * Every address this blast will write to, so the preview shows exactly who the
   * send would reach. This is the audience as the panel holds it: a confirmation
   * already excludes the registrations carrying a receipt, and a custom message is
   * already one message per address.
   */
  recipients: {
    name: string;
    email: string;
  }[];
  /** `true` when a custom message is ready to preview; `false` and no HTML otherwise. */
  ok: boolean;
}

/**
 * The filter fields the audience bar exposes.
 *
 * A subset of `stemfestSource.filters` on purpose: sort order and an export do
 * not describe *who* is in an audience, so they are left to the table this list
 * is drawn from.
 */
export const BULK_EMAIL_FILTER_IDS = [
  "class",
  "payment",
  "school",
  "segment",
  "from",
  "to",
] as const;
