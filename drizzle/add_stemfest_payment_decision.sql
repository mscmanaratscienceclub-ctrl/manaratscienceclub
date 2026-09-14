-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest registrations — contact email + the admin's payment decision
--
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor) **before** the
-- code that reads it is deployed. `src/db/queries/stemfest-payment.ts` selects
-- `payment_decision` on every STEM Fest admin query, so an un-migrated database
-- makes /admin/science-competition, its printed report and the dashboard stat
-- cards fail. Idempotent — safe to re-run.
--
-- NO BACKFILL IS NEEDED, and that is by design. `payment_decision` is NULL for
-- every existing row, and NULL means "no admin has decided": the effective status
-- is then derived from the forwarded-SMS match, which is exactly what the panel
-- showed before this column existed.
--
-- Mirrored in Drizzle at src/db/schema/stemfest-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.stem_fest_registrations
  add column if not exists email                 text,
  add column if not exists payment_decision      text,
  add column if not exists payment_decided_at    timestamptz,
  add column if not exists payment_decided_by    text,
  add column if not exists payment_email_sent_at timestamptz;

-- 'pending' | 'verified' | 'rejected', or NULL for "derive it from the SMS log".
alter table public.stem_fest_registrations
  drop constraint if exists stem_fest_registrations_payment_decision_check;
alter table public.stem_fest_registrations
  add constraint stem_fest_registrations_payment_decision_check
  check (
    payment_decision is null
    or payment_decision in ('pending', 'verified', 'rejected')
  );

comment on column public.stem_fest_registrations.email is
  'Where the payment confirmation email is sent. Null for rows collected before the form asked.';
comment on column public.stem_fest_registrations.payment_decision is
  'Admin decision on the bKash payment. NULL = derive from a matched forwarded SMS.';
comment on column public.stem_fest_registrations.payment_decided_by is
  'Admin email that set the decision.';
comment on column public.stem_fest_registrations.payment_email_sent_at is
  'When the payment-confirmation email was last accepted by Resend.';

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- The panel writes decisions through Drizzle as the table owner, which is exempt
-- from RLS; this policy exists so a service-role Supabase client can do the same
-- without the table appearing read-only. The public form still only inserts.
drop policy if exists "stemfest service role update" on public.stem_fest_registrations;
create policy "stemfest service role update"
  on public.stem_fest_registrations
  for update
  to service_role
  using (true)
  with check (true);
