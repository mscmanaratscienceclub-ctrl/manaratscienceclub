-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase architecture audit — 2026-09-13 · remediation DDL
--
-- NOT APPLIED YET. Run in the Supabase SQL Editor (Project → SQL Editor), or
-- apply statement by statement and re-run `node --env-file=.env
-- scripts/db-arch-audit.mjs` after each block to watch the plan change.
--
-- Findings and evidence: obsidian/backend/supabase-audit-2026-09-13.md
--
-- Every table here is currently ≤ 256 kB (largest: posts), so the plain
-- `create index` form is instant and does not need `concurrently`. If these
-- tables ever grow past a few hundred MB, switch to
-- `create index concurrently` and run it outside a transaction.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── F2 · The SMS reconciliation hot path does a sequential scan ──────────────
-- src/app/api/webhooks/sms/route.ts matches a forwarded payment against a
-- registration with:
--
--     sql`upper(${stemfestRegistrations.transactionId}) = ${parsedSms.transactionId}`
--
-- and `stem_fest_registrations` has no index on that expression. PLAN (before):
--     Seq Scan on stem_fest_registrations
--       Filter: (upper(transaction_id) = 'TEST123'::text)
--
-- The index has to be on `upper(transaction_id)`, not on `transaction_id` — a
-- plain btree cannot answer an `upper(col) = $1` predicate. Mirrors the
-- functional index that already exists on stem_fest_payment_sms.
create index if not exists stem_fest_registrations_trx_idx
  on public.stem_fest_registrations (upper(transaction_id));

comment on index public.stem_fest_registrations_trx_idx is
  'Serves the TrxID → registration lookup in the SMS forwarder webhook (audit F2).';


-- ── F3 · Admin SMS list sorts on a column with no index ──────────────────────
-- getSmsLogs orders by `received_at desc`, but the deployed index is on
-- `created_at desc`. PLAN (before):
--     Limit -> Sort (Sort Key: received_at DESC) -> Seq Scan on stem_fest_payment_sms
--
-- `received_at` is the timestamp the phone reported; `created_at` is when our
-- server inserted the row. They diverge whenever the forwarder is offline and
-- replays a backlog, so `received_at` can never be expressed as `created_at`.
create index if not exists stem_fest_payment_sms_received_at_idx
  on public.stem_fest_payment_sms (received_at desc);

-- The `created_at` index is kept: it still serves older data and the
-- newest-first "last N received" style reads. Drop it only if `idx_scan` is
-- still 0 after a few weeks:
--   drop index if exists public.stem_fest_payment_sms_created_at_idx;


-- ── F4 · The blog and CMS post listings scan and sort the whole table ───────
-- posts has only a primary key and a unique index on slug — no index on
-- anything either listing filters or orders by. PLAN (before), both queries:
--     Limit -> Sort (Sort Key: published_at DESC) -> Seq Scan on posts
--     Limit -> Sort (Sort Key: updated_at DESC)   -> Seq Scan on posts
--
-- The public listing filters on `status = 'published'` and sorts by
-- `published_at`, so a *partial* index on just the published rows is the right
-- shape: it is a fraction of the size, and every row in it is one the query
-- can actually return.
create index if not exists posts_published_at_idx
  on public.posts (published_at desc)
  where status = 'published';

comment on index public.posts_published_at_idx is
  'Serves getPublishedPosts / getRelatedPosts: status = published, newest first (audit F4).';

-- The CMS dashboard listing is not filtered by status, so it needs a plain
-- index on the sort column.
create index if not exists posts_updated_at_idx
  on public.posts (updated_at desc);


-- ── F5 · Four foreign keys have no supporting index ─────────────────────────
-- Postgres indexes a foreign key's *referenced* side (the unique constraint on
-- the parent) but never the *referencing* side. That costs on two paths:
--   1. every delete/update of a parent row must scan the whole child table to
--      enforce / cascade;
--   2. any query filtering on the FK column alone scans.
--
-- PLAN (before):
--     Seq Scan on posts       Filter: (author_id = 'x'::text)
--     Seq Scan on session     Filter: ("userId" = 'x'::text)

-- posts.author_id — ON DELETE CASCADE, and the CMS filters `author_id = $1`
-- for a writer's own post list.
create index if not exists posts_author_id_idx
  on public.posts (author_id);

-- account."userId" — better-auth looks up a user's credential rows on every
-- sign-in.
create index if not exists account_user_id_idx
  on public.account ("userId");

-- session."userId" — better-auth reads/revokes sessions per user. The hot path
-- is a lookup by token (already unique-indexed); this one costs nothing and
-- protects "sign out everywhere" and user deletion.
create index if not exists session_user_id_idx
  on public.session ("userId");

-- stem_fest_payment_sms.matched_registration_id — ON DELETE SET NULL.
create index if not exists stem_fest_payment_sms_matched_registration_id_idx
  on public.stem_fest_payment_sms (matched_registration_id);


-- ── F6 · Duplicate policies on stem_fest_registrations ──────────────────────
-- Four permissive INSERT/SELECT policies exist where two would do: `service
-- role insert`/`select` AND `stemfest service role insert`/`select`. The first
-- pair is a copy-paste of drizzle/campus_ambassador_migration.sql that landed
-- on the wrong table. Permissive policies are OR-ed, so this is harmless but
-- actively misleading — it reads as if two different things grant access.
--
-- Note `to service_role` is belt-and-braces anyway: Supabase's service_role
-- carries BYPASSRLS, so it never consults a policy. The policies are kept
-- because they document intent and survive a change of role.
drop policy if exists "service role insert" on public.stem_fest_registrations;
drop policy if exists "service role select" on public.stem_fest_registrations;


-- ── F8 · Put the storage limits on the bucket, not only in the request handler ─
-- The `avatars` bucket is `public = true` with `file_size_limit` and
-- `allowed_mime_types` both unset. src/app/api/upload/route.ts enforces 5 MB
-- and an image allowlist in application code, which is good — but it is the
-- *only* thing enforcing them. Any future server path, script
-- (scripts/optimize-bucket-images.mjs uploads too) or dashboard action can
-- write an arbitrarily large file into the bucket.
update storage.buckets
   set file_size_limit = 5242880,  -- 5 MiB, matching the route's maxSize
       allowed_mime_types = array[
         'image/png', 'image/jpeg', 'image/webp', 'image/gif'
       ]
 where id = 'avatars' and name = 'avatars';


-- ── F9 · Server-side timeouts for the failure modes the app cannot see ───────
-- The pooler currently reports:
--     statement_timeout = 120000   lock_timeout = 0   idle_in_transaction_session_timeout = 0
--
-- `idle_in_transaction_session_timeout = 0` is the dangerous one: a transaction
-- that is abandoned — exactly what happens when withDbTimeout()'s 12 s client
-- watchdog fires and drops the promise while the server is still working —
-- holds its backend forever. Supabase cannot reap it, and the connection is not
-- returned to the pool. This is the *other* half of the hang documented in
-- ADR-0026: the client stops waiting, but the server never stops running.
--
-- These are database-level settings, so they apply to every connection,
-- including psql and the SQL editor (which is how a stray editor transaction
-- pins a statement for two minutes). Set them in
-- Dashboard → Database → Settings, or uncomment here:
--
-- alter database postgres set idle_in_transaction_session_timeout = '30s';
-- alter database postgres set lock_timeout = '5s';
-- alter database postgres set statement_timeout = '30s';
--
-- `SET LOCAL statement_timeout = '8000ms'` in src/db/query.ts still wins inside
-- the app's own transaction — a per-transaction SET LOCAL overrides the
-- database default — so this changes nothing about the admin reads.


-- ── F11 · Optional: make the admin search boxes indexable ───────────────────
-- Every admin search builds `%term%` patterns against 5–6 columns
-- (searchAmbassadorRegistrations, getSmsLogs). A btree index cannot answer a
-- leading-wildcard ILIKE; a trigram GIN index can.
--
-- Not applied by default. With 83 ambassador rows a seq scan is free, and a GIN
-- index adds write cost plus a bigger table. Add it when the largest of these
-- tables passes ~50k rows.
--
-- create extension if not exists pg_trgm;
-- create index if not exists campus_ambassador_registrations_search_idx
--   on public.campus_ambassador_registrations
--   using gin ((name || ' ' || school || ' ' || class || ' ' || coalesce(phone, '') || ' ' || coalesce(email, '')) gin_trgm_ops);

