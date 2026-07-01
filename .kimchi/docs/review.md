# Review — Google Forms migration

## Verdict: APPROVED

## Acceptance criteria
- [x] /join redirects or renders fallback — evidence: `src/app/(routes)/(site)/join/page.tsx` is a server component (no `"use client"`), imports `redirect` from `next/navigation` (line 1), reads `process.env.NEXT_PUBLIC_GOOGLE_FORM_URL` (line 9), and branches on `url === FALLBACK_FORM_URL` to render a fallback card before calling `redirect(url)`.
- [x] No leftover form refs in src/ — evidence: `grep -rn "schema/applications\|actions/applications\|submitApplication\|getMyApplication\|ApplicationSchema\|DeptId" src/` returned no matches.
- [x] drizzle/0004 drops only applications — evidence: single statement: `DROP TABLE "applications" CASCADE;` (CASCADE handles FK + RLS policy). No `posts.custom_author_*` touched.
- [x] nav.tsx no longer auth-conditional — evidence:
  - line 64: `<Link href="/join" className="rounded-full bg-manara-teal ...`
  - line 84: `<Link href="/join" className="rounded-full bg-manara-yellow ...`
  - `useSession` and `{ data: session }` destructure retained (line 16–17) for the profile/signup icon (`href={session ? "/profile" : "/signup"}`).
- [x] env.example documents URL — evidence: `# Google Form URL — where /join redirects to.` followed by `NEXT_PUBLIC_GOOGLE_FORM_URL="https://docs.google.com/forms/d/e/PLACEHOLDER/viewform"`.
- [x] auth system untouched — evidence: `git diff HEAD -- src/proxy.ts src/routes.ts src/lib/auth/ src/app/(routes)/(auth)/ src/app/(routes)/(cms)/` returned empty.
- [x] all 6 files deleted — evidence: all 6 `ls` probes returned ENOENT (dept-form-step.tsx, dept-select-step.tsx, schemas.ts, submitted-view.tsx, src/lib/actions/applications.ts, src/db/schema/applications.ts). Additionally `src/db/schema/index.ts` no longer re-exports `./applications` (only `./auth` and `./posts`).

## Other /join hrefs
All seven `/join` references across `src/` are plain strings:
- `routes.ts:8` (public-route allowlist)
- `components/footer.tsx:9`
- `components/nav.tsx:64`, `:84`
- `app/(routes)/(site)/page.tsx:36`, `:186`
- `app/(routes)/(site)/opportunities/page.tsx:92`

Zero occurrences of `/signin?redirect=/join` anywhere in `src/`; zero occurrences of `/signin` in `nav.tsx`. Redirect-to-signin pattern is fully gone.

## Notes
- Lint failure: pre-existing, unrelated — `eslint.config.mjs` references `@typescript-eslint/*` packages that are not installed. Out of scope.
- Pre-existing dirty files (NOT touched by this refactor; identical to baseline): `src/db/index.ts`, `src/lib/supabase.ts`, `src/app/(routes)/(site)/blogs/[slug]/page.tsx`, `package.json`, `package-lock.json`. `drizzle/meta/_journal.json` is also modified by this refactor (expected — 0003/0004 entries added); `drizzle/0003_cooing_sentinels.sql` is the untracked precursor that originally created the `applications` table and was never committed.
- Build (`bun run build`) and typecheck (`bunx tsc --noEmit`) reported exit 0 by the build agent; not re-run.
