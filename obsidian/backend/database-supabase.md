---
tags: [backend, database, wip]
updated: 2026-10-13
---

# Database — Supabase

Postgres for projects built from this starter, normally as the database behind
[[cms-payload|Payload]]. **Not installed in the starter itself** — added per
project by the `supabase-db` skill (`/db`). ADR: [[decisions-log]] ADR-0020.

## Connection strings — the thing that breaks first

Supabase issues several, and they are not interchangeable.

| Job | Connection | Port |
|-----|-----------|------|
| App runtime (serverless / Fluid Compute) | Supavisor **transaction** | 6543 |
| Migrations, `payload migrate`, `psql`, dumps | **Direct** | 5432 |
| Long-lived Node server on IPv4 | Supavisor **session** | 5432 |

- **Transaction mode does not support prepared statements** — symptoms are
  `prepared statement "s0" already exists` and intermittent failures under load.
  Disable them for that URL.
- **Direct connections are IPv6 by default**; on IPv4-only networks (many CI
  runners) they simply fail to resolve.

Keep both as server-only zod-validated vars: `DATABASE_URL` (6543) and
`DATABASE_URL_DIRECT` (5432). See [[environment-variables]].

## Keys

Use the current **publishable** (`sb_publishable_…`) and **secret**
(`sb_secret_…`) keys; the legacy `anon`/`service_role` JWTs are being retired.

The publishable key is browser-safe **only because RLS is enforced** — it is not
protection in itself. The secret key **bypasses RLS entirely** and is server-only
via `getServerEnv()`, never `NEXT_PUBLIC_`, never logged ([[api-architecture]]).

> [!warning] A service-role key was committed to this repository
> `drizzle/setup-ambassador-table.mjs` hard-coded the live service-role JWT until
> 2026-09-13. The literal was removed and the script reads `process.env` now, but
> a leaked secret is only revoked by **rotating it** in Supabase — editing the
> file does not un-leak it. See [[supabase-audit-2026-09-13]], finding F1.

## RLS

Every table holding user or tenant data gets RLS enabled plus at least one named
policy. Wrap `auth.uid()` in `(select …)` so it is cached per statement rather
than per row, and index every column a policy filters on.

**Payload's own tables are excluded** — Payload connects as owner and enforces its
own access control; adding RLS there breaks the admin panel in confusing ways.

## Ownership of migrations

If Payload owns the schema, **Payload owns migrations**
(`payload generate:migrations` / `payload migrate`), and the Supabase CLI is used
only for what sits outside Payload's tables: extensions, functions, RLS on your
own tables, storage policies. Never let both tools generate migrations for the
same tables.

## Auth

Optional, and usually unnecessary — a marketing site with Payload already has
admin auth. If the project genuinely needs user accounts, the `supabase-auth`
skill covers `@supabase/ssr` in Next 16, where the key traps are: `getClaims()`
not `getSession()` on the server, no code between `createServerClient` and
`getClaims()`, and returning the response object unmodified. Note Next 16 renamed
`middleware.ts` to `proxy.ts` — see [[routing]].

## Migrating a Supabase project

A project-to-project port is `pnpm db:port:*`, and it does **not** build the new schema
from `drizzle/`. The files and the deployed database disagree — `0004` drops a table that
is live, `0005` disables RLS on tables measured as enabled, `audit-2026-09-13-remediation.sql`
was half-applied, and four tables exist in no file at all. `db:port:capture` asks the source
catalog what it actually holds (`pg_get_constraintdef`, `pg_get_indexdef`, `pg_policy`,
`pg_get_functiondef`, `pg_get_triggerdef`, `aclexplode`) and writes ordered DDL;
`db:port:schema --check` rehearses the whole replay inside a transaction that is rolled
back. ADR: [[decisions-log|ADR-0042]].

Credentials live in gitignored `.env.port` under `PORT_*` names **only** — never
`--env-file=.env`, because that file holds the production DSN, and never in argv, which is
readable in `ps` and in build logs. Every script resolves the project ref from both ends and
refuses a target that equals the live ref or the retired one.

Three things that are not obvious and cost real debugging time:

- **`postgres.js` re-serializes parameters by the type the *server* infers.** For
  `insert into t values ($1)` that is the column's type, so date strings are re-parsed in
  the machine's timezone (and truncated to milliseconds) and the string `'t'` becomes
  `false`. `openPool()` in `scripts/db-port-lib.mjs` pins OIDs 16/114/1082/1114/1700/20 to
  pass-through text. A SQL cast does not help — the bytes are already rewritten.
- **`SET session_replication_role` is superuser-only**, and Supabase's `postgres` is not.
  There is no way to suspend triggers during a load, so don't try: the registration trigger
  no-ops when the code column is already populated, and leaving it on exercises the live
  path.
- **`stem_fest_registration_counters.last_number` must not land behind the highest number
  already issued**, or the trigger mints a duplicate, the unique index rejects it, and every
  later registration 500s. `db:port:verify` G3 checks it on both sides.

`session` and `verification` rows are deliberately not copied: better-auth signs the session
cookie with `BETTER_AUTH_SECRET`, which rotates at cutover, so the rows would buy nothing and
carry live bearer tokens with them. `account.password` is a self-describing hash and keeps
working.

The cutover's last step is a **no-op**: run `pnpm db:port:data` again 24–72 h after the
switch and it must change nothing. If it moves rows, something is still writing to the old
project. Only then rotate the old service-role key (which also closes audit F1) and delete it.

## Related

[[cms-payload]] · [[api-architecture]] · [[environment-variables]] · [[backend/README]] · [[supabase-audit-2026-09-13]]
