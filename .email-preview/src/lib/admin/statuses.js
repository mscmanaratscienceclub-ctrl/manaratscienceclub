"use strict";
/**
 * The statuses an admin can set by hand, and the copy that describes them.
 *
 * Two records in the panel carry an editable status, and they mean different
 * things:
 *
 * - **STEM Fest payment** (`stem_fest_registrations.payment_decision`) — the
 *   admin's decision about a bKash payment. It is *stored*, so it outranks the
 *   automatic signal and an admin can always override it. The effective status is
 *   `coalesce(payment_decision, matched forwarded SMS ? 'verified' : 'pending')`,
 *   built in SQL by `src/db/queries/stemfest-payment.ts` and shared by the table,
 *   the filter, the stat cards and the printed report — so the pill, the filter
 *   and the export can never disagree.
 * - **Forwarded SMS** (`stem_fest_payment_sms.status`) — which registration a
 *   message was reconciled against, which the admin corrects when the matcher got
 *   it wrong (or right before the registration existed).
 *
 * Plain data and pure functions: imported by Server Actions *and* by client
 * leaves, so it must never read `env`, the database or `next/headers`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactEmailSchema = exports.adminRowIdSchema = exports.smsLogStatusOptions = exports.stemfestPaymentStatusOptions = exports.STEMFEST_VERIFICATION_SOURCES = exports.SMS_LOG_STATUSES = exports.STEMFEST_PAYMENT_STATUSES = void 0;
exports.isStemfestPaymentStatus = isStemfestPaymentStatus;
exports.isSmsLogStatus = isSmsLogStatus;
exports.statusOption = statusOption;
exports.statusValue = statusValue;
const zod_1 = require("zod");
/** Values only — the single source of truth the option tables below describe. */
exports.STEMFEST_PAYMENT_STATUSES = [
    "pending",
    "verified",
    "rejected",
];
exports.SMS_LOG_STATUSES = ["matched", "unmatched", "ignored"];
/** How an effective `verified` was arrived at. */
exports.STEMFEST_VERIFICATION_SOURCES = ["sms", "manual"];
exports.stemfestPaymentStatusOptions = [
    {
        value: "pending",
        label: "Pending",
        description: "No admin decision yet, and no forwarded SMS carrying this TrxID.",
        tone: "bg-amber-50 text-amber-700",
    },
    {
        value: "verified",
        label: "Verified",
        description: "Payment confirmed. Verifying emails the participant their confirmation.",
        tone: "bg-emerald-50 text-emerald-700",
    },
    {
        value: "rejected",
        label: "Rejected",
        description: "The payment was not accepted — for example a reused or unreadable TrxID.",
        tone: "bg-rose-50 text-rose-700",
    },
];
exports.smsLogStatusOptions = [
    {
        value: "matched",
        label: "Matched",
        description: "The TrxID on this message belongs to a registration.",
        tone: "bg-emerald-50 text-emerald-700",
    },
    {
        value: "unmatched",
        label: "Unmatched",
        description: "No registration carries this TrxID yet.",
        tone: "bg-amber-50 text-amber-700",
    },
    {
        value: "ignored",
        label: "Ignored",
        description: "Not a payment notification — a promotion, OTP or balance message.",
        tone: "bg-slate-100 text-slate-600",
    },
];
function isStemfestPaymentStatus(value) {
    return exports.STEMFEST_PAYMENT_STATUSES.includes(value);
}
function isSmsLogStatus(value) {
    return exports.SMS_LOG_STATUSES.includes(value);
}
/** The option behind a stored value, or `null` for one this build does not know. */
function statusOption(options, value) {
    return options.find((option) => option.value === value) ?? null;
}
/**
 * The typed value behind a stored status, or `fallback` for one this build does not
 * know — the narrowing a caller needs before handing a value to a `<select>`, whose
 * value must be one of its options or the browser renders a blank control.
 *
 * `stem_fest_registrations.payment_decision` is constrained by Postgres, but
 * `stem_fest_payment_sms.status` is a free `text` column, so a value written by an
 * older build (or by hand in the SQL editor) can reach the panel.
 */
function statusValue(options, value, fallback) {
    return options.find((option) => option.value === value)?.value ?? fallback;
}
/**
 * A uuid, as Postgres hands one out. Every admin status action takes a row id
 * straight from the browser, so a malformed one is rejected before it reaches the
 * database rather than coming back as a driver-level cast error.
 */
exports.adminRowIdSchema = zod_1.z.uuid("Unknown row");
/**
 * A contact email, or an empty string to clear the one on file. Trimmed by the
 * caller first, so a field emptied with stray spaces reads as a clear.
 */
exports.contactEmailSchema = zod_1.z.union([
    zod_1.z.literal(""),
    zod_1.z
        .string()
        .trim()
        .max(254, "Email looks too long")
        .pipe(zod_1.z.email("Enter a valid email address")),
]);
