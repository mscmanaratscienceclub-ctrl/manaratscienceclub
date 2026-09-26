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
 *   payment the filters match.
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
 */
export const BULK_EMAIL_MAX_RECIPIENTS = 400;

/**
 * Recipients per Server Action call.
 *
 * The page sends in slices rather than one long request: a single call for a
 * 300-recipient blast would hold a serverless invocation open for minutes and
 * lose the lot when it timed out. Ten per call keeps each request well inside a
 * function's budget and lets the composer show progress as it goes.
 */
export const BULK_EMAIL_BATCH_SIZE = 10;

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

/** One participant a batch will write to. */
export interface BulkEmailRecipient {
  id: string;
  name: string;
  /** Trimmed and non-empty — a row without an address is never a recipient. */
  email: string;
  /**
   * Whether a confirmation has already been accepted for this row. Only read by
   * the confirmation section, which says so before re-sending.
   */
  alreadySent: boolean;
}

/** The set of people one send would reach. */
export interface BulkEmailAudience {
  recipients: BulkEmailRecipient[];
  /**
   * More rows matched than `BULK_EMAIL_MAX_RECIPIENTS`. The send is refused until
   * the filters are narrowed, so a truncated list is never silently mailed.
   */
  truncated: boolean;
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
  /** Sentence for a refused batch — a stale audience or an over-wide one. */
  message?: string;
  /** Recipients across the whole audience: the progress bar's denominator. */
  total: number;
  sent: number;
  failed: number;
  failures: BulkEmailFailure[];
  /** Offset for the next call, or `null` once the audience is exhausted. */
  nextOffset: number | null;
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
  offset: number;
  /** Required for `custom`, ignored for `confirmation`. */
  subject?: string;
  body?: string;
}

export const bulkEmailSendSchema = z
  .object({
    kind: z.enum(["custom", "confirmation"]),
    offset: z.number().int().min(0),
    subject: z.string().trim().max(BULK_EMAIL_SUBJECT_MAX).optional(),
    body: z.string().trim().max(BULK_EMAIL_BODY_MAX).optional(),
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
