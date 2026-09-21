-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest registrations — the amount each participant was told to send
--
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor) **before** the
-- code that writes it is deployed. `src/app/(routes)/(site)/stemfestreg/actions.ts`
-- writes `total_fee` on every submission, so an un-migrated database refuses the
-- insert and the registration form fails outright; the admin table and its printed
-- report also select it. Idempotent — safe to re-run.
--
-- ## Why the column exists
--
-- The form already tells a participant exactly what to send, and that number was
-- previously nowhere on the row: the admin panel showed `segments` (what they
-- picked) and, separately, whatever a forwarded bKash SMS reported. Neither says
-- what was *asked* for, so an admin reconciling a payment had to re-derive it by
-- hand from the event list — and from the tier rules, which are not in the row
-- either. The value is recomputed server-side from the catalogue on insert and
-- never taken from the browser, exactly like the category ids in `entries`.
--
-- Derived is what makes this safe to store rather than read from a running total:
-- `computeTotalFee` is the same function the form's sticky summary uses, so the
-- number on the row and the number the participant saw cannot disagree.
--
-- ## No backfill
--
-- Rows filed before this column existed have NULL, and are left that way. The
-- amount cannot be recovered from the row: `segments` is human-readable text for
-- the admin and the participant, not a data structure — which is why the column
-- was added instead of the text being parsed. The panel renders NULL as an em
-- dash, and only new registrations carry a figure.
--
-- Mirrored in Drizzle at src/db/schema/stemfest-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.stem_fest_registrations
  add column if not exists total_fee integer;

-- Non-negative, because a negative amount owed is a bug rather than a refund —
-- and NULL stays allowed, for the rows above.
alter table public.stem_fest_registrations
  drop constraint if exists stem_fest_registrations_total_fee_check;
alter table public.stem_fest_registrations
  add constraint stem_fest_registrations_total_fee_check
  check (total_fee is null or total_fee >= 0);

comment on column public.stem_fest_registrations.total_fee is
  'Amount the participant was told to send, in BDT. Recomputed server-side on insert; NULL for rows filed before the column existed.';
