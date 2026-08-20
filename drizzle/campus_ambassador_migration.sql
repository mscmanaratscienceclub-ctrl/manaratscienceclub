-- ─────────────────────────────────────────────────────────────────────────────
-- Campus Ambassador Registrations Table
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.campus_ambassador_registrations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  class         text not null,
  school        text not null,
  experience    text not null,
  first_time_ca boolean not null default false,
  created_at    timestamptz not null default now()
);

-- If the table already exists without the column (added 2026-08-20):
alter table public.campus_ambassador_registrations
  add column if not exists first_time_ca boolean not null default false;

-- Enable Row-Level Security
alter table public.campus_ambassador_registrations enable row level security;

-- Allow the service-role key (used by server actions) to insert
-- Public users have NO direct read/write access – everything goes through the server action
create policy "service role insert"
  on public.campus_ambassador_registrations
  for insert
  to service_role
  with check (true);

create policy "service role select"
  on public.campus_ambassador_registrations
  for select
  to service_role
  using (true);
