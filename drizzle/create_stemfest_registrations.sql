-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest Event Registrations — participants competing at the fest
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor).
--
-- This is NOT the ambassador or volunteer table: those record people staffing
-- the fest, this records people entering Olympiads, Project Display and
-- E-sports, along with the bKash payment reference they report back.
--
-- `school` is stored as the resolved *name*: the catalogue's name for a school
-- picked from the dropdown, or the participant's own words when they chose the
-- "not listed" option (see `resolveSchoolName` in the form's validate.ts).
--
-- `entries` holds one object per event the participant chose:
--   { "segmentId": "olympiads", "eventId": "physics",
--     "categoryId": "A", "teamSize": null, "teammates": [] }
-- Categories are derived from `class` server-side, never supplied by the
-- browser, and `total_fee` is recomputed on insert rather than trusted.
--
-- Mirrored in Drizzle at src/db/schema/stemfest-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.stem_fest_registrations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  class          text not null,
  school         text not null,
  segments       text not null,
  transaction_id text not null,
  payment_number text not null,
  created_at     timestamptz not null default now()
);

-- Newest-first listing in the admin dashboard.
create index if not exists stem_fest_registrations_created_at_idx
  on public.stem_fest_registrations (created_at desc);

comment on table public.stem_fest_registrations is
  'STEM Fest event registrations.';

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- No anon/authenticated access: every read and write goes through a server
-- action that uses the service-role key.
alter table public.stem_fest_registrations enable row level security;

drop policy if exists "stemfest service role insert" on public.stem_fest_registrations;
create policy "stemfest service role insert"
  on public.stem_fest_registrations
  for insert
  to service_role
  with check (true);

drop policy if exists "stemfest service role select" on public.stem_fest_registrations;
create policy "stemfest service role select"
  on public.stem_fest_registrations
  for select
  to service_role
  using (true);
