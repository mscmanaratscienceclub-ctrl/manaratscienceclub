/**
 * The one read this generator performs.
 *
 * Every registration is fetched in a single statement and the bracket work is done
 * in memory. That is deliberate: the stored categories live inside the `segments`
 * prose, so a query per bracket would be twenty-four scans of the same 800 rows
 * over a Supavisor pool that `src/db/index.ts` documents as fragile under
 * concurrency. One `max: 1` connection, one table, then no more database work.
 *
 * The payment status is the panel's own definition — an admin's stored decision
 * wins, and a row no admin has touched falls back to a matched forwarded SMS —
 * restated here as SQL rather than imported from `src/db/queries/stemfest-payment.ts`,
 * because that module speaks Drizzle's query builder and this script runs on a
 * bare `postgres` connection.
 */

import postgres from "postgres";

export type PaymentStatus = "pending" | "verified" | "rejected";

/** How an effective `verified` was arrived at: a matched SMS, or an admin. */
export type VerificationSource = "sms" | "manual";

export interface RegistrationRow {
  id: string;
  registrationCode: string;
  name: string;
  /** The catalogue's class id, as the form stored it — `class-8`, `a2`. */
  classId: string;
  school: string;
  segments: string;
  totalFee: number | null;
  gender: string | null;
  email: string | null;
  reference: string | null;
  transactionId: string;
  paymentNumber: string;
  status: PaymentStatus;
  verificationSource: VerificationSource | null;
  decidedBy: string | null;
  /** The row's own instant; the report renders it in the panel's timezone. */
  submittedAt: Date;
}

const EFFECTIVE_STATUS = `
  coalesce(
    r.payment_decision,
    case when exists (
      select 1 from stem_fest_payment_sms s
      where s.status = 'matched'
        and upper(s.transaction_id) = upper(r.transaction_id)
    ) then 'verified' else 'pending' end
  )`;

const SELECT = `
  select
    r.id::text as id,
    r.registration_code as "registrationCode",
    r.name,
    r.class as "classId",
    r.school,
    r.segments,
    r.total_fee as "totalFee",
    r.gender,
    r.email,
    r.reference,
    r.transaction_id as "transactionId",
    r.payment_number as "paymentNumber",
    ${EFFECTIVE_STATUS} as status,
    case
      when r.payment_decision is not null then 'manual'
      when exists (
        select 1 from stem_fest_payment_sms s
        where s.status = 'matched'
          and upper(s.transaction_id) = upper(r.transaction_id)
      ) then 'sms'
      else null
    end as "verificationSource",
    r.payment_decided_by as "decidedBy",
    r.created_at as "submittedAt"
  from stem_fest_registrations r
  order by r.registration_code asc`;

/** Every STEM Fest registration, oldest bracket work aside — ordered by ID. */
export async function readRegistrations(): Promise<RegistrationRow[]> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required.");

  const db = postgres(url, { max: 1, connect_timeout: 20, idle_timeout: 20 });
  try {
    return (await db.unsafe(SELECT)) as RegistrationRow[];
  } finally {
    await db.end();
  }
}
