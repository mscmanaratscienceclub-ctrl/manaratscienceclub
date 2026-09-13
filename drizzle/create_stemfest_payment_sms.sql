-- ─────────────────────────────────────────────────────────────────────────────
-- STEM Fest Payment Verification SMS Log
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor).
--
-- Records all incoming SMS forwarded from the Android forwarder app.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.stem_fest_payment_sms (
  id                      uuid primary key default gen_random_uuid(),
  client_message_id       text unique,
  sender                  text not null,
  raw_message             text not null,
  transaction_id          text,
  amount                  numeric(10, 2),
  sender_number           text,
  status                  text not null default 'unmatched', -- 'matched', 'unmatched', 'ignored'
  matched_registration_id uuid references public.stem_fest_registrations(id) on delete set null,
  received_at             timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

-- Index for rapid TrxID lookup and status filtering
create index if not exists stem_fest_payment_sms_trx_idx
  on public.stem_fest_payment_sms (upper(transaction_id));

create index if not exists stem_fest_payment_sms_status_idx
  on public.stem_fest_payment_sms (status);

create index if not exists stem_fest_payment_sms_created_at_idx
  on public.stem_fest_payment_sms (created_at desc);

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table public.stem_fest_payment_sms enable row level security;

drop policy if exists stemfest sms service role all on public.stem_fest_payment_sms;
create policy stemfest sms service role all
  on public.stem_fest_payment_sms
  for all
  to service_role
  using (true)
  with check (true);
