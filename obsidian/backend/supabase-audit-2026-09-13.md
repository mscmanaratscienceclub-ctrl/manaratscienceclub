---
tags: [backend, database, security, audit]
updated: 2026-09-13
---

# Supabase Architecture Audit — 2026-09-13

A full pass over the database, RLS, indexes, connection pooling, storage and
auth. Everything below was **measured against the live project**, not inferred
from the repo — Postgres 17.6, project `ipmdyrxfptdsulfhxjkb`.

Reproduce with:

```bash
node --env-file=.env scripts/db-arch-audit.mjs
```

That script is read-only (catalog queries plus `EXPLAIN` without `ANALYZE`; no
DDL and no writes). It is the source of every number and plan quoted here.

Remediation DDL, **not yet applied**: `drizzle/audit-2026-09-13-remediation.sql`.

## Severity summary

| # | Finding | Severity | State |
|---|---------|----------|-------|
| F1 | Live service-role JWT committed to git and pushed to GitHub | **Critical** | Removed from tree; **key still needs rotating** |
| F2 | SMS reconciliation does a seq scan (no index for `upper(transaction_id)`) | High | Fixed in schema + DDL |
| F3 | Admin SMS list sorts on `received_at`; index is on `created_at` | Medium | Fixed in schema + DDL |
| F4 | Blog + CMS post listings seq-scan and sort (only PK + slug are indexed) | Medium | Fixed in schema + DDL |
| F5 | Four foreign keys with no supporting index | Medium | Fixed in schema + DDL |
| F6 | Duplicate policies on `stem_fest_registrations` (4 where 2 belong) | Low | DDL ready |
| F7 | `drizzle-kit push` would have **destroyed** the SMS functional index | High | Fixed in schema |
| F8 | `avatars` bucket has no size/mime limits (app-only enforcement) | Low | DDL ready |
| F9 | `idle_in_transaction_session_timeout = 0` lets abandoned transactions pin a backend | Medium | DDL ready (commented) |
| F10 | Four orphan tables in `public` that no migration or schema knows about | Medium | Needs a decision |
| F11 | Admin `%ILIKE%` searches cannot use any btree index | Low (deferred) | Deferred by design |

## What is actually correct

Worth stating plainly, because the interesting failures are all in the details
rather than the shape:

- **RLS holds.** All 13 `public` tables have RLS enabled. `public` *is* exposed
  through the Data API and `anon` genuinely holds `SELECT` on every table — and
  every one of them returns `HTTP 200` with `[]` under the publishable key. The
  grants look alarming and are neutralised by RLS exactly as intended.
- **`prepare: false`** on the pooler connection is right — Supavisor transaction
  mode does not support prepared statements ([[decisions-log|ADR-0026]]).
- **Pool sized above app concurrency.** `max: 5` is correct for this app.
- **`SET LOCAL` (not `SET`)** for `statement_timeout` is right: the transaction
  pooler may hand each transaction to a different backend, so a session-level
  setting would leak onto whatever client uses that backend next.
- **No `storage.objects` policies.** Uploads go through the service-role route
  handler, so `anon`/`authenticated` cannot touch objects directly. Correct.
- No `pg_graphql`; the extension list is minimal (`pg_stat_statements`,
  `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`).

## F1 — Live service-role JWT in version control · **Critical**

`drizzle/setup-ambassador-table.mjs` hard-coded the project URL **and** the
service-role JWT in the source file. That string was **byte-identical to the
live `SUPABASE_SERVICE_ROLE_KEY`** in `.env`, the file is tracked by git, and it
was committed in `93c7605 ("forms system")` and pushed to
`github.com/mscmanaratscienceclub-ctrl/manaratscienceclub`.

A service-role key carries `BYPASSRLS`. Every control described in this document
— all 13 tables' RLS policies, the storage policies, the Data API posture — is
worth precisely nothing to anyone holding it. It also permits `INSERT`/`UPDATE`
on the `user` table, which is privilege escalation to full CMS admin.

The JWT payload decodes to `"role":"service_role"`, `iat 1781928654`,
`exp 2097504654` — a ten-year legacy key, so it does not expire on its own.

**Done:** the literal is gone from the working tree; the script now reads
`process.env` and exits with a message when the vars are missing.

**Still required — rotating the key is the only real fix:**

1. Supabase Dashboard → Project Settings → API → **roll / revoke** the
   service-role key. Then update `SUPABASE_SERVICE_ROLE_KEY` in `.env` and in
   Vercel (all environments).
2. Consider switching to the new key format
   (`sb_publishable_…` / `sb_secret_…`) that [[database-supabase]] recommends.
   The project is currently **mixed**: the publishable key is already
   `sb_publishable_`, but the service key is still a legacy `eyJ…` JWT.
3. Deleting the file does not remove it from git history. Rewriting history is
   optional *once the key is rotated* — rotation makes the leaked value inert,
   which is what actually matters. Note the repository appears to be **public**;
   check that too.
4. Set `SUPABASE_SERVICE_ROLE_KEY` to come from `getServerEnv()` only, per
   [[database-supabase]], so a future leak is a type error rather than a
   code-review miss.

> The audit script also greps for residual key material. Only prose mentions of
> `sb_publishable_…` / `sb_secret_…` remain in `.claude/` and the vault.

## F2 — The SMS reconciliation path sequential-scans · High

`src/app/api/webhooks/sms/route.ts` matches a forwarded payment to a
registration with:

```ts
sql`upper(${stemfestRegistrations.transactionId}) = ${parsedSms.transactionId}`
```

`stem_fest_registrations` had no index on that expression. Measured plan:

```
Seq Scan on stem_fest_registrations
  Filter: (upper(transaction_id) = 'TEST123'::text)
```

This is the one query in the codebase that runs on a **public, unauthenticated
webhook** and whose cost grows with the number of registrations — exactly the
table expected to grow fastest during a STEM Fest registration push. The sibling
table already did this correctly (`stem_fest_payment_sms_trx_idx` is a
functional index on `upper(transaction_id)`), so this was an oversight rather
than a design choice.

Fixed by `stem_fest_registrations_trx_idx on (upper(transaction_id))`. The index
must be on the *expression* — a plain btree on `transaction_id` cannot answer an
`upper(col) = $1` predicate.

## F3 — Admin SMS list sorts on an unindexed column · Medium

`getSmsLogs` orders by `received_at desc`, but the only timestamp index on the
table is `stem_fest_payment_sms_created_at_idx`. Measured plan:

```
Limit
  ->  Sort  (Sort Key: received_at DESC)
        ->  Seq Scan on stem_fest_payment_sms
```

`received_at` is what the phone reported; `created_at` is when our server
inserted the row. They diverge whenever the forwarder is offline and replays a
backlog — which is precisely when an admin is most likely to be staring at this
page. One cannot be substituted for the other.

Fixed by adding `stem_fest_payment_sms_received_at_idx`. The `created_at` index
is retained; drop it later only if `idx_scan` is still 0.

## F4 — Blog and CMS post listings scan and sort the whole table · Medium

`posts` carried only its primary key and the unique index on `slug`. Both
listings therefore scanned and sorted:

```
getPublishedPosts  ->  Limit -> Sort (published_at DESC) -> Seq Scan on posts
getAllPostsCms     ->  Limit -> Sort (updated_at   DESC) -> Seq Scan on posts
  ...Filter: (status = 'published'::text)
```

The public listing filters on `status = 'published'` and sorts by
`published_at`, so the right shape is a **partial** index on the published rows
only — smaller than a full index, and every row in it is returnable.

Note `posts` currently has **0 rows** while `posts_slug_unique` has 3 483
scans, so the table is being exercised heavily by lookups (`getPostBySlug`,
`ensureUniqueSlug`) with a listing path that has never been plan-tested. Adding
these indexes now, while the table is empty, is free. This is the
`query-partial-indexes` pattern from the Supabase Postgres guidance.

## F5 — Foreign keys with no supporting index · Medium

Postgres indexes a foreign key's *referenced* side but never the *referencing*
side, so these cost on every parent delete and on any filter by the FK column:

| Table | Column | Measured plan |
|-------|--------|---------------|
| `posts` | `author_id` (ON DELETE CASCADE) | `Seq Scan … Filter: (author_id = 'x')` |
| `account` | `"userId"` | — |
| `session` | `"userId"` | `Seq Scan … Filter: ("userId" = 'x')` |
| `stem_fest_payment_sms` | `matched_registration_id` (SET NULL) | — |

`posts.author_id` and `session."userId"` are the ones that matter: the former is
hit by the CMS's writer-scoped list and by user deletion, the latter by
better-auth's "revoke this user's sessions" path. All four are added.

## F7 — `drizzle-kit push` would have destroyed the SMS functional index · High

The most dangerous finding, and it was invisible from the database side.

`src/db/schema/stemfest-payment-sms.ts` declared:

```ts
index("stem_fest_payment_sms_trx_idx").on(table.transactionId)   // plain column
```

while the deployed index of the same name was on `upper(transaction_id)`.
`drizzle-kit` compares by name and definition, so running **`pnpm db:migrate`**
(which is `drizzle-kit push`) would have dropped the live functional index and
created a plain one — silently converting F2's sibling lookup from an index scan
to a sequential scan, with no error to notice.

Now declared as `index("…").on(sql\`upper(${table.transactionId})\`)`. Verified
by generating the schema DDL into a throwaway directory; it emits:

```sql
CREATE INDEX "stem_fest_payment_sms_trx_idx" ON "stem_fest_payment_sms" USING btree (upper("transaction_id"));
```

— byte-for-byte the deployed definition. Drift closed.

The general lesson: a hand-written index and its Drizzle declaration are two
descriptions of one thing, and only the Drizzle one is what `db:migrate` will
enforce.


## F6 — Duplicate policies on `stem_fest_registrations` · Low

Four permissive policies exist where two belong:

```
stem_fest_registrations :: "service role insert"          [INSERT -> service_role]
stem_fest_registrations :: "service role select"          [SELECT -> service_role]
stem_fest_registrations :: "stemfest service role insert" [INSERT -> service_role]
stem_fest_registrations :: "stemfest service role select" [SELECT -> service_role]
```

The first pair is a copy of `drizzle/campus_ambassador_migration.sql` that was
applied to the wrong table. Permissive policies are OR-ed, so this is harmless
at runtime — but it reads as though two different mechanisms grant access, which
is exactly the kind of thing that gets mis-edited later.

Worth knowing: `to service_role` is belt-and-braces in every one of these
policies, because Supabase's `service_role` carries `BYPASSRLS` and never
consults a policy at all. They are kept for documentation value and so the
intent survives a change of connecting role.

Related: the `applications` table's only policy is
`users manage own applications [ALL/RESTRICTIVE] to authenticated`. A
**restrictive** policy cannot grant access on its own — it is AND-ed onto
permissive ones — so a table whose only policy is restrictive is default-deny.
It is safe, but it reads like a grant. (F10 covers the table itself.)

## F8 — The `avatars` bucket has no limits of its own · Low

```
avatars (id=avatars)  public=true  size_limit=unset  mime=unset
storage.objects policies: (none)
```

`src/app/api/upload/route.ts` enforces a 5 MB cap and an image allowlist in
application code, which is correct and should stay. But it is the *only* thing
enforcing them: any future server path — or a rerun of
`scripts/optimize-bucket-images.mjs`, which uploads too — can write an
arbitrarily large object, and the bucket happily accepts any content type.

Fixed by setting `file_size_limit = 5242880` and `allowed_mime_types` on the
bucket, so the limit is a property of the storage layer rather than a rule in
one handler. `public = true` is deliberate and fine: these are marketing
avatars, and the helper functions in `src/lib/media.ts` depend on public URLs.

## F9 — Abandoned transactions can pin a backend forever · Medium

```
statement_timeout = 120000   lock_timeout = 0   idle_in_transaction_session_timeout = 0
```

`statement_timeout` at 120 s is Supabase's default and is overridden per
transaction by `src/db/query.ts`, so it is not the problem.

`idle_in_transaction_session_timeout = 0` is. When `withDbTimeout`'s 12 s
client watchdog fires, the promise is rejected but **the server statement keeps
running** and its transaction stays open. Nothing reaps it. That is the other
half of the hang documented in [[decisions-log|ADR-0026]]: the client stops
waiting, the server never stops working, and the connection is not returned to
the pool. It also explains why a stray SQL-editor transaction can pin a
statement for the full two minutes.

`lock_timeout = 0` means a query queued behind a lock waits until
`statement_timeout` rather than failing fast with a diagnosable error.

Both are database-level settings, so the remediation file leaves them
**commented out** for you to apply deliberately:

```sql
alter database postgres set idle_in_transaction_session_timeout = '30s';
alter database postgres set lock_timeout = '5s';
alter database postgres set statement_timeout = '30s';
```

A per-transaction `SET LOCAL` in `query.ts` still wins, so the admin reads
behave exactly as they do today. This is the `conn-idle-timeout` guidance from
the Supabase Postgres skill, which the project was not following.


## F10 — Four orphan tables nothing knows about · Medium

Live in `public`, absent from `src/db/schema`, absent from the Drizzle
snapshots, absent from every file in `drizzle/`:

| Table | Rows | RLS | Policies | `anon` SELECT |
|-------|------|-----|----------|---------------|
| `applications` | 0 | on | 1 (restrictive only) | yes |
| `form_fields` | 12 | on | **0** | yes |
| `form_settings` | 2 | on | **0** | yes |
| `form_submissions` | 0 | on | **0** | yes |

They are reachable in the sense that `anon` holds `SELECT` on them, but with
zero permissive policies they return `[]` — verified: all four answered
`HTTP 200` with an empty body under the publishable key, so nothing is leaking.
The security posture is accidental but adequate.

The real problem is that they are **undocumented and unowned**. They came from
the `93c7605 ("forms system")` commit — the same commit that leaked F1's key.
`form_fields` and `form_settings` still hold 12 and 2 rows of real data, so this
is not a decide-and-drop in one line.

Pick one, and record it here or in a new ADR:

- **Adopt** — mirror them in `src/db/schema`, give them migrations and honest
  policies, if the forms feature is coming back.
- **Archive and drop** — `pg_dump` those two tables to a file, store it
  somewhere durable, then `drop table`. An unowned table with rows and no owner
  is a liability that grows quietly.

Either way, the `applications` restrictive-only policy should go with the table;
a policy that reads like a grant but behaves as a denial is a trap for the next
reader.

## F11 — Admin `%ILIKE%` searches are unindexable · Low, deferred by design

`searchAmbassadorRegistrations` and `getSmsLogs` build `%term%` patterns across
five or six columns. No btree index can answer a leading wildcard; a trigram GIN
index can. Not applied — `campus_ambassador_registrations` has 83 rows and a
sequential scan is free, while a GIN index adds write cost and size. The exact
DDL is left commented in the remediation file to add when the largest such table
passes ~50k rows. Deferring this is the right call, not an oversight.

## Scale context

Every table is currently tiny, which is why none of these findings is causing a
visible problem today — and why now is the cheap moment to fix them. Largest
first: `posts` 256 kB, `campus_ambassador_registrations` 120 kB, everything else
under 100 kB. Storage objects: 100, 47.2 MB.

Live row counts: `campus_ambassador_registrations` 83 · `volunteer_registrations`
14 · `session` 13 · `user` 4 · `account` 4 · `stem_fest_registrations` 1 ·
`posts` 0 · `stem_fest_payment_sms` 0 · `verification` 0.

No table has ever been auto-analyzed (`last_autovacuum` is `never` throughout,
with 19–30 dead tuples on the busier tables). Harmless at this size; worth
knowing that planner statistics are absent rather than merely stale.

## Connection pooling

Verified current: role `postgres`, `max_connections = 60`, ~15–17 sessions,
`search_path = "$user", public, extensions`.

The `DATABASE_URL` / `DIRECT_URL` split is correct in shape, with one caveat:
**`DIRECT_URL` is not a direct connection.** It points at
`aws-1-ap-northeast-2.pooler.supabase.com:5432` — Supavisor *session* mode, not
the `db.<ref>.supabase.co:5432` direct endpoint that [[database-supabase]]
specifies for migrations. Session mode does work for `drizzle-kit push`, but it
is not the connection the doc describes, and it is not immune to the pooler
behaviour ADR-0026 was written about. Either rename the variable to say what it
is, or point it at the real direct endpoint.

## Auth

better-auth owns the `user` / `session` / `account` / `verification` tables in
`public`. All four have RLS enabled with **zero policies**, which is correct and
deliberate — the app connects as the table owner and RLS does not apply to an
owner unless `FORCE ROW LEVEL SECURITY` is set (it is not, on any table). This
is the arrangement [[decisions-log|ADR-0024]] settled on after removing the
policies that were reading as protection without providing any.

The cost of that choice is that RLS is *not* a safety net for these tables: if
the connection ever moved to a limited role, every read would silently return
`[]` rather than error. Worth re-reading ADR-0024 before changing the
connecting role. Also confirmed: `session` returns `[]` to `anon` over the Data
API, so session tokens are not exposed.

## Related

[[database-supabase]] · [[decisions-log]] · [[changelog]] · [[backend/README]]

