# Plan — Migrate `/join` from custom forms to Google Forms redirect

## Goal
Replace the multi-step department application wizard at `/join` with a server-side redirect to a Google Form URL. Remove all custom forms code (the wizard components, Zod schemas, server actions, Drizzle schema) and drop the `applications` table from Supabase. **The rest of the auth system (signin / signup / profile / CMS) stays intact.**

## Decisions confirmed with user
- **Embed style:** server-side redirect — `/join` calls `redirect(googleFormUrl)`.
- **Auth scope:** keep auth system; only remove forms-related code.
- **Google Form URL:** placeholder `https://docs.google.com/forms/d/e/PLACEHOLDER/viewform`, configurable via `NEXT_PUBLIC_GOOGLE_FORM_URL`. User said "just add a random link for now".

## Current state (inventory — verified by reading the code)

### Forms-related files (to delete)
| Path | Role |
|---|---|
| `src/app/(routes)/(site)/join/page.tsx` | Wizard shell — replaced |
| `src/app/(routes)/(site)/join/dept-form-step.tsx` | Per-dept RHF form |
| `src/app/(routes)/(site)/join/dept-select-step.tsx` | Dept multi-select cards |
| `src/app/(routes)/(site)/join/schemas.ts` | Zod schemas for wizard |
| `src/app/(routes)/(site)/join/submitted-view.tsx` | Submitted-application summary |
| `src/lib/actions/applications.ts` | `submitApplication`, `getMyApplication` |
| `src/db/schema/applications.ts` | Drizzle table definition |
| `drizzle/0003_cooing_sentinels.sql` | **NOT deleted** — this migration also added `posts` columns (`custom_author_name`, `custom_author_avatar`, `custom_author_bio`). A new `0004_*.sql` migration will be generated that only drops the applications artefacts. |

### Files to edit
| Path | Edit |
|---|---|
| `src/db/schema/index.ts` | Remove `export * from "./applications";` line |
| `env.example` | Add `NEXT_PUBLIC_GOOGLE_FORM_URL` line |
| `src/components/nav.tsx` | Lines 64 & 84: drop the auth-conditional, hardcode `/join` |
| `src/app/(routes)/(site)/join/page.tsx` | Replaced entirely (new redirect version) |

### Files NOT touched
- `src/components/footer.tsx` line 9 (already plain `/join`)
- `src/app/(routes)/(site)/page.tsx` lines 36, 186 (already plain `/join`)
- `src/app/(routes)/(site)/opportunities/page.tsx` line 92 (already plain `/join`)
- `src/proxy.ts` — `/join` already in `publicRoutes` (good — no auth required)
- `src/routes.ts` — `/join` already in `publicRoutes`
- All other auth/CMS code

---

## Chunk 1 — Remove the forms system and replace `/join` with a redirect

**Complexity: simple** — pure file deletion + one small new file + drizzle-kit CLI + nav copy edit. No concurrency, no novel algorithms.

### Sub-steps (run in order)

1. **Delete the four wizard inner files** (the parent `page.tsx` stays for now and is replaced in step 5):
   - `src/app/(routes)/(site)/join/dept-form-step.tsx`
   - `src/app/(routes)/(site)/join/dept-select-step.tsx`
   - `src/app/(routes)/(site)/join/schemas.ts`
   - `src/app/(routes)/(site)/join/submitted-view.tsx`

2. **Delete `src/lib/actions/applications.ts`.**

3. **Delete `src/db/schema/applications.ts`.**

4. **Edit `src/db/schema/index.ts`**: remove the line `export * from "./applications";`. Keep the `auth` and `posts` exports.

5. **Create new `src/app/(routes)/(site)/join/page.tsx`** as a Next.js server component:
   ```tsx
   import { redirect } from "next/navigation";
   import Link from "next/link";

   const FALLBACK_FORM_URL =
     "https://docs.google.com/forms/d/e/PLACEHOLDER/viewform";

   export default function JoinPage() {
     const url = process.env.NEXT_PUBLIC_GOOGLE_FORM_URL || FALLBACK_FORM_URL;

     // If the env var points at our placeholder, render a tiny fallback
     // page so a misconfigured deploy doesn't silently redirect users to
     // docs.google.com/.../PLACEHOLDER. Otherwise redirect server-side.
     if (url === FALLBACK_FORM_URL) {
       return (
         <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-16">
           <div className="max-w-md rounded-3xl bg-surface p-10 text-center shadow-subtle border border-manara-teal/10">
             <h1 className="font-display text-3xl font-bold text-ink mb-3">
               Join Manarat Science Club
             </h1>
             <p className="text-ink/60 font-body mb-6">
               Our application form is hosted on Google Forms. The link will be
               available soon — check back shortly.
             </p>
             <Link
               href={url}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center justify-center gap-2 rounded-xl bg-manara-teal px-8 py-3 font-display font-bold text-white shadow-academic transition hover:-translate-y-0.5 hover:bg-manara-yellow hover:text-manara-teal"
             >
               Open Application Form
             </Link>
           </div>
         </main>
       );
     }

     redirect(url);
   }
   ```
   - Server component (no `"use client"` directive).
   - Uses `redirect()` from `next/navigation` for the configured case.
   - Renders a fallback card when the env var is unset or still a placeholder, so an unconfigured deploy doesn't send users to `…/PLACEHOLDER`.

6. **Edit `src/components/nav.tsx`**:
   - Line 64: change
     `href={session ? "/join" : "/signin?redirect=/join"}` → `href="/join"`
   - Line 84: same change.
   - Do **not** remove the `useSession` import — it's used elsewhere (line 56 — `session` feeds the profile/signup icon link).
   - Do **not** remove the `session` destructuring — it's still needed for the profile/signup icon.

7. **Edit `env.example`** — append a new section after the existing Supabase block:
   ```
   # Google Form URL — where /join redirects to.
   # Replace PLACEHOLDER with the real Google Form viewform URL.
   NEXT_PUBLIC_GOOGLE_FORM_URL="https://docs.google.com/forms/d/e/PLACEHOLDER/viewform"
   ```

8. **Generate the Drizzle migration** that drops the `applications` table:
   - Run `bunx drizzle-kit generate` (the project uses `bun` and `drizzle-kit` is in devDependencies).
   - This reads the current schema (now without `applications.ts`) and the previous snapshot, and writes a new `drizzle/0004_<random>.sql` that drops the `applications` table, its RLS policy, and the FK to `user`.
   - **Verify the generated SQL contains:**
     - `DROP POLICY` (or equivalent) for the `users manage own applications` RLS policy on `applications`
     - `DROP TABLE "applications"` (or `ALTER TABLE ... DROP CONSTRAINT ... FOREIGN KEY ...` followed by `DROP TABLE`)
   - If drizzle-kit's output is unexpectedly noisy (e.g. it tries to drop the `posts.custom_author_*` columns too), stop and report — don't ship a broken migration.

9. **Verification** (run all three; each must exit 0):
   - `cd "/mnt/e/Web Dev/test/manaratscienceclub" && bunx tsc --noEmit`
   - `cd "/mnt/e/Web Dev/test/manaratscienceclub" && bun run lint`
   - `cd "/mnt/e/Web Dev/test/manaratscienceclub" && bun run build`

10. **Manual grep sanity check** — must return zero hits under `src/`:
    - `grep -rn "schema/applications" src/`
    - `grep -rn "actions/applications" src/`
    - `grep -rn "submitApplication\|getMyApplication" src/`
    - `grep -rn "ApplicationSchema\|DeptId" src/` (the wizard-specific identifiers)

### Acceptance criteria
1. `GET /join` (signed in or not) either redirects to `NEXT_PUBLIC_GOOGLE_FORM_URL` (when set to a real URL) or renders the fallback card (when unset/placeholder).
2. `src/` contains zero references to `@/db/schema/applications`, `@/lib/actions/applications`, `submitApplication`, `getMyApplication`, `ApplicationSchema`, or `DeptId`.
3. `drizzle/0004_*.sql` exists and contains `DROP POLICY` for the applications RLS policy AND `DROP TABLE` for the applications table.
4. `bunx tsc --noEmit`, `bun run lint`, and `bun run build` all exit 0.
5. `env.example` documents `NEXT_PUBLIC_GOOGLE_FORM_URL` with a placeholder and an inline comment.
6. Nav `Join MSC` button now hardcodes `/join` (no `signin?redirect=` fallback).
7. Signin / signup / profile / CMS still work — not touched.

### Files affected (final)
**Created:**
- `src/app/(routes)/(site)/join/page.tsx` (replaces existing)
- `drizzle/0004_<random>.sql` (auto-generated)

**Deleted:**
- `src/app/(routes)/(site)/join/dept-form-step.tsx`
- `src/app/(routes)/(site)/join/dept-select-step.tsx`
- `src/app/(routes)/(site)/join/schemas.ts`
- `src/app/(routes)/(site)/join/submitted-view.tsx`
- `src/lib/actions/applications.ts`
- `src/db/schema/applications.ts`

**Edited:**
- `src/db/schema/index.ts`
- `env.example`
- `src/components/nav.tsx`

### Edge cases the builder must handle
- **Missing env var:** the new `page.tsx` must render the fallback card instead of redirecting to `…/PLACEHOLDER`.
- **drizzle-kit unexpectedly dropping `posts.custom_author_*` columns:** stop, do not ship, report to orchestrator.
- **Drizzle migration file naming:** drizzle-kit picks the random suffix; whatever it generates is fine as long as the SQL is correct.
- **Drizzle migration history:** the project uses snapshot-based diffs in `drizzle/meta/`. Don't touch `meta/_journal.json` manually — let drizzle-kit update it.

### Verification commands the builder must run (and capture exit codes)
```bash
cd "/mnt/e/Web Dev/test/manaratscienceclub"
bunx tsc --noEmit
bun run lint
bun run build
grep -rn "schema/applications\|actions/applications\|submitApplication\|getMyApplication\|ApplicationSchema\|DeptId" src/ || echo "clean"
ls drizzle/0004_*.sql
```
All five must succeed / match expectations.
