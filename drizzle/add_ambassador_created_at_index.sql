-- ─────────────────────────────────────────────────────────────────────────────
-- Ambassador registrations: created_at index
-- Every admin read orders by created_at DESC (the dashboard recent feed and the
-- Campus/Batch Ambassador table). Without this index Postgres full-scans and
-- sorts the whole table on each load, which gets slower as applications pile up.
-- Mirrors volunteer_registrations_created_at_idx.
-- Run this SQL in the Supabase SQL Editor (Project → SQL Editor).
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists campus_ambassador_registrations_created_at_idx
  on public.campus_ambassador_registrations (created_at desc);
