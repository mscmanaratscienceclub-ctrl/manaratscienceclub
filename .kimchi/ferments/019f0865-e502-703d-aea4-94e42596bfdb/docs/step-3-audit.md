# Step 3 audit — db:migrate

## What was applied
- Command: `drizzle-kit push --force`
- Connection: Supabase pooler (session mode, port 5432)
  - Used because `db.ipmdyrxfptdsulfhxjkb.supabase.co` (the direct host
    behind `DIRECT_URL`) does not resolve under WSL2's NAT DNS
    (`getaddrinfo ENOTFOUND`). Pooler resolves via Windows DNS and supports
    DDL when used in session mode on port 5432.
- The transaction-mode pooler (port 6543) was reachable but is restricted
  for DDL, so session mode (5432) is the working substitute.

## Live DB state — `applications` table
Tables in `public`: `account, applications, posts, session, user, verification`

Columns (from `information_schema.columns`):
| column      | type      | nullable |
|-------------|-----------|----------|
| id          | text      | NO       |
| user_id     | text      | NO       |
| depts       | ARRAY     | NO       |
| responses   | jsonb     | NO       |
| created_at  | timestamp | NO       |
| updated_at  | timestamp | NO       |

Constraints (from `pg_constraint`):
- `applications_pkey` — primary key
- `applications_user_id_unique` — **UNIQUE(user_id)** ✓
- `applications_user_id_user_id_fk` — foreign key

Row-level security (from `pg_class`):
- `relrowsecurity = true` — RLS enabled ✓

Policies (from `pg_policy`):
- `users manage own applications` — `*` (ALL), `RESTRICTIVE`, `TO authenticated`,
  USING `(auth.uid())::text = user_id`, WITH CHECK `(auth.uid())::text = user_id`
  (cast required because `auth.uid()` returns `uuid` while `user_id` is `text`)

## Manual appends
drizzle-kit `push` only emits schema diffs (tables, columns, indexes, FKs,
`ENABLE ROW LEVEL SECURITY`). It does **not** apply `CREATE POLICY` lines from
the local SQL file. After the push completed with RLS enabled but 0 policies,
the policy was applied via a one-off script that ran
`CREATE POLICY ... USING ((select auth.uid())::text = user_id) WITH CHECK (...)`.
The local `drizzle/0003_cooing_sentinels.sql` was also updated to use the
`::text` cast so future replays of the migration match the live state.

## Notes on the `posts` ALTER
drizzle-kit also emitted
`ALTER TABLE "posts" ALTER COLUMN "tags" SET DEFAULT '{}';` — this is a
snapshot drift between `src/db/schema/posts.ts` and the prior migration;
unrelated to the applications work and applied as part of the same push.
Safe: defaults only.

## tsc
`pnpm tsc --noEmit` — `TypeScript: No errors found`

## Environment workarounds (project-level)
These apply to this dev machine only — the `pnpm db:migrate` script
remains the canonical command. Future maintainers running into the WSL2
DNS / esbuild path issues should:
1. Run drizzle-kit commands from `cmd.exe` rather than WSL bash (because
   `node.exe` reports `process.platform = win32` and path-translates 9p
   paths incorrectly under WSL2).
2. If `db.<ref>.supabase.co` does not resolve, swap `DIRECT_URL` to the
   pooler session-mode endpoint `aws-<n>-<region>.pooler.supabase.com:5432`.
3. If `pnpm install --offline` reports missing esbuild, run
   `pnpm install --offline` once (already done in this dev environment).
