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

import { z } from "zod";

/** Values only — the single source of truth the option tables below describe. */
export const STEMFEST_PAYMENT_STATUSES = [
  "pending",
  "verified",
  "rejected",
] as const;

export type StemfestPaymentStatus = (typeof STEMFEST_PAYMENT_STATUSES)[number];

export const SMS_LOG_STATUSES = ["matched", "unmatched", "ignored"] as const;

export type SmsLogStatus = (typeof SMS_LOG_STATUSES)[number];

/** How an effective `verified` was arrived at. */
export const STEMFEST_VERIFICATION_SOURCES = ["sms", "manual"] as const;

export type StemfestVerificationSource =
  (typeof STEMFEST_VERIFICATION_SOURCES)[number];

export interface AdminStatusOption<TValue extends string> {
  value: TValue;
  /** Pill label, and the text of the `<option>`. */
  label: string;
  /** Sentence for the expanded row, the tooltip and the toast. */
  description: string;
  /**
   * Pill classes for this value. Literal Tailwind utilities rather than a token:
   * the value is a class *name* in a data module, exactly as `src/lib/tag-styles.ts`
   * passes colours as strings, and a `var(--token)` cannot be composed into a
   * `bg-*`/`text-*` pair at build time.
   */
  tone: string;
}

export const stemfestPaymentStatusOptions: AdminStatusOption<StemfestPaymentStatus>[] =
  [
    {
      value: "pending",
      label: "Pending",
      description:
        "No admin decision yet, and no forwarded SMS carrying this TrxID.",
      tone: "bg-amber-50 text-amber-700",
    },
    {
      value: "verified",
      label: "Verified",
      description:
        "Payment confirmed. Verifying emails the participant their confirmation.",
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      value: "rejected",
      label: "Rejected",
      description:
        "The payment was not accepted — for example a reused or unreadable TrxID.",
      tone: "bg-rose-50 text-rose-700",
    },
  ];

export const smsLogStatusOptions: AdminStatusOption<SmsLogStatus>[] = [
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
    description:
      "Not a payment notification — a promotion, OTP or balance message.",
    tone: "bg-slate-100 text-slate-600",
  },
];

/**
 * What every status-editing Server Action answers with.
 *
 * A result object rather than a throw, because React redacts an error thrown out
 * of a Server Action in production — an admin told "an error occurred" when the
 * real answer is \"that email address is needed first\" has been told nothing.
 */
export interface AdminStatusActionResult {
  ok: boolean;
  /** Sentence shown to the admin, in a toast. */
  message: string;
}

export function isStemfestPaymentStatus(
  value: string,
): value is StemfestPaymentStatus {
  return (STEMFEST_PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function isSmsLogStatus(value: string): value is SmsLogStatus {
  return (SMS_LOG_STATUSES as readonly string[]).includes(value);
}

/** The option behind a stored value, or `null` for one this build does not know. */
export function statusOption<TValue extends string>(
  options: AdminStatusOption<TValue>[],
  value: string,
): AdminStatusOption<TValue> | null {
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
export function statusValue<TValue extends string>(
  options: AdminStatusOption<TValue>[],
  value: string,
  fallback: TValue,
): TValue {
  return options.find((option) => option.value === value)?.value ?? fallback;
}

/**
 * A uuid, as Postgres hands one out. Every admin status action takes a row id
 * straight from the browser, so a malformed one is rejected before it reaches the
 * database rather than coming back as a driver-level cast error.
 */
export const adminRowIdSchema = z.uuid("Unknown row");

/**
 * A contact email, or an empty string to clear the one on file. Trimmed by the
 * caller first, so a field emptied with stray spaces reads as a clear.
 */
export const contactEmailSchema = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .max(254, "Email looks too long")
    .pipe(z.email("Enter a valid email address")),
]);
