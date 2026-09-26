"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BULK_EMAIL_FILTER_IDS = exports.bulkEmailSendSchema = exports.bulkEmailStateSchema = exports.BULK_EMAIL_NAME_TOKEN = exports.BULK_EMAIL_BODY_MAX = exports.BULK_EMAIL_SUBJECT_MAX = exports.BULK_EMAIL_DELAY_MS = exports.BULK_EMAIL_BATCH_SIZE = exports.BULK_EMAIL_MAX_RECIPIENTS = void 0;
const zod_1 = require("zod");
/**
 * Ceiling on one send.
 *
 * A blast is unbounded by nature, so it needs a bound the paged table does not:
 * past this the audience query stops and the panel refuses the send and asks the
 * admin to narrow the filters. Resend's rate limit and the club's own reputation
 * both want a blast to be a deliberate, watched act rather than a reflex.
 */
exports.BULK_EMAIL_MAX_RECIPIENTS = 400;
/**
 * Recipients per Server Action call.
 *
 * The page sends in slices rather than one long request: a single call for a
 * 300-recipient blast would hold a serverless invocation open for minutes and
 * lose the lot when it timed out. Ten per call keeps each request well inside a
 * function's budget and lets the composer show progress as it goes.
 */
exports.BULK_EMAIL_BATCH_SIZE = 10;
/**
 * Pause between two sends inside a batch.
 *
 * Resend accepts two requests a second on its default plan, so 600ms keeps a
 * blast inside the limit without the admin having to think about it.
 */
exports.BULK_EMAIL_DELAY_MS = 600;
exports.BULK_EMAIL_SUBJECT_MAX = 160;
exports.BULK_EMAIL_BODY_MAX = 5000;
/**
 * The one merge tag a custom message supports.
 *
 * A tag rather than any templating engine: the body is prose, and the only thing
 * worth varying per recipient is what to call them.
 */
exports.BULK_EMAIL_NAME_TOKEN = "{{name}}";
/** The audience a send is drawn from, as the panel parses it from the URL. */
exports.bulkEmailStateSchema = zod_1.z.object({
    query: zod_1.z.string().max(200),
    values: zod_1.z.record(zod_1.z.string(), zod_1.z.string().max(200)),
    sort: zod_1.z.enum([
        "newest",
        "oldest",
        "name-asc",
        "name-desc",
        "amount-asc",
        "amount-desc",
    ]),
    page: zod_1.z.number().int().min(1).max(1_000_000),
});
exports.bulkEmailSendSchema = zod_1.z
    .object({
    kind: zod_1.z.enum(["custom", "confirmation"]),
    offset: zod_1.z.number().int().min(0),
    subject: zod_1.z.string().trim().max(exports.BULK_EMAIL_SUBJECT_MAX).optional(),
    body: zod_1.z.string().trim().max(exports.BULK_EMAIL_BODY_MAX).optional(),
})
    .superRefine((value, ctx) => {
    if (value.kind !== "custom")
        return;
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
exports.BULK_EMAIL_FILTER_IDS = [
    "class",
    "payment",
    "school",
    "segment",
    "from",
    "to",
];
