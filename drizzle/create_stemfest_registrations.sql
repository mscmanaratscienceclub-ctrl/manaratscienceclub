-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest Event Registrations — participants competing at the fest
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor).
--
-- This is NOT the ambassador or volunteer table: those record people staffing
-- the fest, this records people entering Olympiads, Robotics, Project Display
-- and E-sports, along with the bKash payment reference they report back.
--
-- `entries` holds one object per event the participant chose:
--   { "segmentId": "olympiads", "eventId": "physics",
--     "categoryId": "A", "teamSize": null, "teammates": [] }
-- Categories are derived from `class` server-side, never supplied by the
-- browser, and `total_fee` is recomputed on insert rather than trusted.
--
-- Mirrored in Drizzle at src/db/schema/stemfest-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.stemfest_registrations (
  id             uuid primary key default gen_random_uuid(),

  -- Participant
  name           text not null,
  class          text not null,
  phone          text not null,

  -- Payment reference
  bkash_number   text not null,
  bkash_trx_id   text not null,

  -- What they entered
  entries        jsonb not null default '[]'::jsonb,
  total_fee      integer not null check (total_fee >= 0),

  created_at     timestamptz not null default now()
);

-- Newest-first listing in the admin dashboard.
create index if not exists stemfest_registrations_created_at_idx
  on public.stemfest_registrations (created_at desc);

-- Per-event reporting ("everyone in Robosoccer") without a sequential scan.
create index if not exists stemfest_registrations_entries_idx
  on public.stemfest_registrations using gin (entries);

comment on table public.stemfest_registrations is
  'STEM Fest event registrations submitted from /stemfestreg.';
comment on column public.stemfest_registrations.total_fee is
  'Amount owed in whole BDT, recomputed server-side from entries.';

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- No anon/authenticated access: every read and write goes through a server
-- action that uses the service-role key.
alter table public.stemfest_registrations enable row level security;

drop policy if exists "stemfest service role insert" on public.stemfest_registrations;
create policy "stemfest service role insert"
  on public.stemfest_registrations
  for insert
  to service_role
  with check (true);

drop policy if exists "stemfest service role select" on public.stemfest_registrations;
create policy "stemfest service role select"
  on public.stemfest_registrations
  for select
  to service_role
  using (true);
