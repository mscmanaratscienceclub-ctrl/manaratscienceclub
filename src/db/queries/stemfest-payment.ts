import { sql, type SQL } from "drizzle-orm";
import { stemfestPaymentSms } from "@/db/schema/stemfest-payment-sms";
import { stemfestRegistrations } from "@/db/schema/stemfest-registrations";
import type { StemfestPaymentStatus } from "@/lib/admin/statuses";

/**
 * The SQL fragments that decide what a STEM Fest payment's status *is*.
 *
 * They live here, outside `src/lib/actions/registrations.ts`, for one reason: a
 * `"use server"` module may only export async functions, so a fragment declared
 * there could not be imported by the module that writes a payment decision and
 * emails the participant. Two copies of "what counts as verified" is exactly the
 * drift that makes a status pill disagree with the filter beside it.
 *
 * Shared by: the paged table, the `payment` filter, the stat cards, the printed
 * report and the verify/resend actions.
 */

/**
 * `true` when a forwarded, matched payment SMS carries this registration's TrxID.
 *
 * Expressed as a correlated `EXISTS` so it can be both selected (the status of a
 * row) and filtered on. Matching is on `upper(transaction_id)` to line up with
 * `stem_fest_payment_sms_trx_idx`.
 */
export function stemfestPaymentMatch(): SQL<boolean> {
  const s = stemfestPaymentSms;
  const r = stemfestRegistrations;

  return sql<boolean>`exists (
    select 1
    from ${s}
    where ${s.status} = 'matched'
      and upper(${s.transactionId}) = upper(${r.transactionId})
  )`;
}

/**
 * The status an admin sees: `pending` | `verified` | `rejected`.
 *
 * An admin's stored decision always wins, including a deliberate `pending` — a
 * payment the club decided not to accept must not be flipped back to verified by
 * a late SMS. A row no admin has touched (`payment_decision` is `null`) falls
 * back to the forwarded-SMS match, which is what the panel showed before the
 * decision column existed.
 *
 * The result is typed as the union rather than `string` because Postgres enforces
 * it: `stem_fest_registrations_payment_decision_check` admits only those three
 * values or `null`. See `drizzle/add_stemfest_payment_decision.sql`.
 */
export function stemfestEffectivePaymentStatus(): SQL<StemfestPaymentStatus> {
  const t = stemfestRegistrations;

  return sql<StemfestPaymentStatus>`coalesce(
    ${t.paymentDecision},
    case when ${stemfestPaymentMatch()} then 'verified' else 'pending' end
  )`;
}

/** The `payment` filter — a comparison on the effective status above. */
export function stemfestPaymentFilter(value: string): SQL {
  return sql`${stemfestEffectivePaymentStatus()} = ${value}`;
}

/**
 * The amount a forwarded SMS reported for this registration's TrxID, as text, or
 * `null` when no message carried it. Typed as text because `numeric` arrives from
 * postgres.js as a string, and the confirmation email only ever formats it.
 */
export function stemfestPaymentAmount(): SQL<string | null> {
  const s = stemfestPaymentSms;
  const r = stemfestRegistrations;

  return sql<string | null>`(
    select ${s.amount}::text
    from ${s}
    where ${s.status} = 'matched'
      and upper(${s.transactionId}) = upper(${r.transactionId})
    limit 1
  )`;
}
