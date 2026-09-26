-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest registrations — who referred the participant
--
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor) **before** the
-- code that writes it is deployed. `src/app/(routes)/(site)/stemfestreg/actions.ts`
-- writes `reference` on every submission, so an un-migrated database refuses the
-- insert and the registration form fails outright; the admin table also selects
-- it. Idempotent — safe to re-run.
--
-- ## Why the column exists
--
-- The form now asks each participant who referred them, from a list that depends
-- on their school: the club's own members for a host-school student, the visiting
-- schools' contacts for everyone else (`referencesForSchool` in
-- `src/lib/data/stemfest-registration.ts`). The answer decides who the club
-- credits, so it has to be on the row rather than only in the browser.
--
-- The *name* is stored, not an id. Neither list is stable enough to key on —
-- people are added and removed between editions — and a name that no longer
-- appears in the catalogue would still read correctly on an old row, whereas an
-- orphaned id would not.
--
-- ## Why it is nullable, and why "nobody" is NULL
--
-- Two absences mean the same thing to an admin: a row filed before the question
-- existed, and a participant no one referred. The form offers "Not referred by
-- anyone" as an escape hatch (without it, a participant nobody referred could not
-- submit at all) and that choice is written as NULL, so the club's lists never
-- carry a name that isn't a name and both absences render as an em dash.
--
-- Deriving nothing here: the value is the participant's own selection, validated
-- server-side against the list for their resolved school, so unlike
-- `total_fee` there is nothing to recompute — only to check on the way in.
--
-- No backfill: existing rows have NULL, which reads as "not answered".
--
-- Mirrored in Drizzle at src/db/schema/stemfest-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.stem_fest_registrations
  add column if not exists reference text;

comment on column public.stem_fest_registrations.reference is
  'Who referred the participant, chosen from the list for their school. NULL for rows filed before the question existed and for "not referred by anyone".';
