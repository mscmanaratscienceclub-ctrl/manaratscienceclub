-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest Volunteer Applications — separate table
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor).
--
-- Volunteers no longer share campus_ambassador_registrations: the questions are
-- completely different (school roll/shift/student code + six situational
-- answers), so they live in their own table. Ambassador rows with
-- type = 'volunteer' that were filed before this change stay where they are.
--
-- Mirrored in Drizzle at src/db/schema/volunteer-registrations.ts.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.volunteer_registrations (
  id            uuid primary key default gen_random_uuid(),

  -- Student identity
  full_name     text not null,
  class_section text not null,
  roll          text not null,
  shift         text not null,
  student_code  text not null,

  -- Contact
  address       text not null,
  personal_phone text not null,
  parents_phone  text not null,

  -- Availability & consent
  attendance_week    text not null,
  parents_comfort    text not null,
  campus_hesitation  text not null,

  -- Situational & motivation
  scenario_task_conflict text not null,
  scenario_peer_conduct  text not null,
  selection_reason       text not null,

  created_at    timestamptz not null default now()
);

-- Newest-first listing in the admin dashboard.
create index if not exists volunteer_registrations_created_at_idx
  on public.volunteer_registrations (created_at desc);

comment on table public.volunteer_registrations is
  'STEM Fest volunteer applications submitted from /register (Volunteer programme).';

-- ── Row-Level Security ───────────────────────────────────────────────────────
-- No anon/authenticated access: every read and write goes through a server
-- action that uses the service-role key.
alter table public.volunteer_registrations enable row level security;

drop policy if exists "volunteer service role insert" on public.volunteer_registrations;
create policy "volunteer service role insert"
  on public.volunteer_registrations
  for insert
  to service_role
  with check (true);

drop policy if exists "volunteer service role select" on public.volunteer_registrations;
create policy "volunteer service role select"
  on public.volunteer_registrations
  for select
  to service_role
  using (true);

-- ── Retire the shared-table discriminator (optional, run only once) ──────────
-- Ambassador rows are now the only tenants of campus_ambassador_registrations,
-- so the check constraint goes back to two values. Existing 'volunteer' rows
-- must be moved or deleted first; skip this block if you would rather keep them.
--
-- delete from public.campus_ambassador_registrations where type = 'volunteer';
--
-- alter table public.campus_ambassador_registrations
--   drop constraint if exists campus_ambassador_registrations_type_check;
-- alter table public.campus_ambassador_registrations
--   add constraint campus_ambassador_registrations_type_check
--   check (type in ('campus', 'batch'));