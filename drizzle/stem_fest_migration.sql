-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest Registrations Table
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor)
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

-- Enable Row-Level Security
alter table public.stem_fest_registrations enable row level security;

-- Allow the service-role key (used by server actions) to insert/read
-- Public users have NO direct read/write access – everything goes through server actions
create policy "service role insert"
  on public.stem_fest_registrations
  for insert
  to service_role
  with check (true);

create policy "service role select"
  on public.stem_fest_registrations
  for select
  to service_role
  using (true);
