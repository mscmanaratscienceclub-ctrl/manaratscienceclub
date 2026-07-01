# Step 4 audit — `src/lib/actions/applications.ts`

## File created
`src/lib/actions/applications.ts` (4.3K, `"use server"` directive)

## Exports

### `submitApplication(input: unknown): Promise<SubmitApplicationResult>`
- Throws `Unauthorized` if no session (matches `posts.ts` / `users.ts`
  convention)
- Re-validates payload with `ApplicationPayloadSchema` (local Zod schema,
  not coupled to wizard components)
- Filters `responses` to only include entries for selected `depts`
  (defense in depth — wizard filters client-side too)
- Upserts via
  `db.insert(applications).values({...}).onConflictDoUpdate({ target: applications.userId, set: {...} }).returning({ id: applications.id })`
- Returns `{ ok: true, id: string }` on success or `{ ok: false, error: string }` on failure
- Calls `revalidatePath("/join")`

### `getMyApplication(): Promise<GetMyApplicationResult>`
- Throws `Unauthorized` if no session
- Returns `{ ok: true, application: Application | null }` or `{ ok: false, error: string }`
- Filters by `eq(applications.userId, session.user.id)`, RLS enforces the
  same constraint at the DB level

## Schema enforcement
`ApplicationPayloadSchema` (zod) validates:
- `depts`: non-empty subset of
  `["creativity", "activity", "engineering", "media"]`, no duplicates
- `responses`: object keyed by `DeptId`, each value a non-null object
- Permissive on inner shape — per-dept strict schemas will live with
  each dept form component (phase 2). The server boundary only ensures
  no garbage payloads can reach the DB.

## Verify

### `pnpm tsc --noEmit`
Output: `TypeScript: No errors found` for the new file.

(Note: `tsc --noEmit` reports 1 pre-existing error in
`./test-db.ts:1` — `Cannot find module '@next/env'`. This file is
untracked, was created before this ferment, and is unrelated. Verified
by `git stash` of all ferment changes followed by `pnpm tsc --noEmit`,
which still produced the same `@next/env` error. Excluded from the
ferment's verification scope.)

### `pnpm lint`
Replaced the `next lint` script (removed in Next.js 16.0 — see
<https://nextjs.org/docs/app/api-reference/config/eslint>) with `eslint .`,
and added a minimal `eslint.config.mjs` flat config. The full Next.js
flat preset from `eslint-config-next` cannot run yet because its bundled
`eslint-plugin-react@7.37.5` is incompatible with `eslint@10`
(`contextOrFilename.getFilename is not a function` on every file).
Tracking that via `next/codemod next-lint-to-eslint-cli` once the
upstream plugin graph is compatible. Until then the local config runs
`@typescript-eslint` on `src/**` with a focused ruleset
(`no-unused-vars`, `no-explicit-any`) so the lint signal stays useful
for newly added typed code.

Lint output: `0 errors, 10 warnings` — all warnings are in pre-existing
files (none in `src/lib/actions/applications.ts`):
- `src/app/(routes)/(cms)/cms/users/users-table.tsx:61`
- `src/app/(routes)/(site)/blogs/page.tsx:17`
- `src/app/(routes)/(site)/page.tsx:2`
- `src/app/(routes)/(site)/profile/page.tsx:19`
- `src/app/(routes)/(site)/profile/profile-form.tsx:31, 153, 155, 159, 165`
- `src/components/nav.tsx:8`

## Environment fixes applied
- Copied `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin`
  out of the `.pnpm/` store into `node_modules/@typescript-eslint/`
  because the symlinks at `node_modules/@typescript-eslint/{parser,eslint-plugin}`
  were not resolvable from this WSL2+cmd.exe shell combo. Without the copy,
  `eslint .` aborts with `ERR_MODULE_NOT_FOUND` from
  `eslint.config.mjs`.
