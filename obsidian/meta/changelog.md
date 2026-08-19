---
tags: [meta, changelog]
updated: 2026-08-19
---

# Changelog

Chronological log of notable changes to **this project**. Newest first.
Human-curated — not a mirror of `git log`.

Log a change here when it would surprise someone returning in six months: a new
dependency, a new route or section, a convention bent, a bug whose cause is worth
remembering. Routine commits do not need an entry.

For *why* the conventions are what they are, see [[decisions-log]].

---

## Baseline — built from `next16-claude-starter` v0.1.0

What the starter ships, so the first project entry has something to diff against:

| Area | What is there |
|------|---------------|
| Framework | Next.js 16 App Router · React 19 · TypeScript · Yarn · Node ≥ 20.19 |
| Styling | Tailwind v4, CSS-only config, three-tier design tokens ([[design-system]]) |
| Motion | Vendored spring engine + `spring-text-engine`, shared rAF ticker, reduced-motion ([[animation-system]]) |
| Layout | Adaptive scaling grid — root font-size tracks the viewport ([[design-system]]) |
| Scroll | Lenis smooth scroll + Zustand scroll store ([[smooth-scroll]]) |
| Server | `app/api` route handlers, zod-validated env, `{ data }`/`{ error }` envelope ([[api-architecture]]) |
| SEO | Metadata generator, `robots.ts`, `sitemap.ts`, JSON-LD ([[seo-metadata]]) |
| Agent harness | 8 commands, 7 path-scoped rules, 11 skills, 4 subagents, `verify.sh` ([[agent-harness]]) |
| Not included | CMS, database, auth, payments, i18n, tests — added per project ([[backend/README]]) |

The home view (`src/views/home.tsx`, route `/`) ships empty on purpose — start
there ([[new-page]]).

<!-- Log this project's changes below, newest first, under a `## YYYY-MM-DD` heading. -->

## 2026-08-19 — Auth system audit: bug fixes & hardening

Audit pass over the better-auth layer. Schema decisions in ADR-0024.

| Area | Change |
|------|--------|
| Sign-out | `button-signout.tsx` called `redirect()` inside a client fetch callback (throws uncaught, never navigates) → `useRouter().push("/")` + `refresh()` |
| Proxy | `/api/*` and `/monitoring` (Sentry tunnel) no longer 307-redirected to `/signin` — `/api/upload` returns its own 401 and client-side Sentry reporting works for logged-out users |
| Routes | `/verify-email` added to `publicRoutes`; dead `/forgot-password` removed from `authRoutes` |
| Password policy | Sign-in reuses the shared `passwordSchema` (was min-6 vs signup's min-8+complexity, plus a "lenght" typo) |
| Role default | better-auth `role` additionalField default `"user"` → `"member"`, matching the DB default and the CMS admin/writer/member set |
| Role changes | CMS users table now calls the `updateUserRole` server action (gains the self-change guard) instead of `authClient.admin.setRole` |
| Error handling | Ambassador form no longer surfaces raw Supabase error messages to visitors |
| Rate limit | Explicit `rateLimit: { enabled: true }` (better-auth defaults cap sign-in/sign-up at 3 req/10s); in-memory store — add shared storage for multi-instance deploys |
| Secrets | `env.example` warns `BETTER_AUTH_SECRET` must be a real random value, never the placeholder |
| Schema | Dropped `enableRLS()` on the four auth tables, added `session.impersonatedBy`, made `user.gender` nullable (ADR-0024) |
| Hygiene | `console.log` → `console.info` in `resend.ts` dev verification-link fallback |

Verified: `verify.sh`/`pnpm lint` clean, `pnpm build` green.

## 2026-08-19 — Adopted the vault + `.claude/` enforcement system from `next16-claude-starter`

This is an **existing** Next.js 16 site (Manarat Science Club) that adopted the
starter's documentation vault and agent harness — not a fresh project built on
the starter. The stack differs materially; `AGENTS.md` carries the adapted hard
rules and ADR-0023 records the deviations.

| Area | Change |
|------|--------|
| Vault | `obsidian/` copied in as the single source of truth |
| Harness | `.claude/` (commands, rules, skills, agents, hooks, `verify.sh`) copied in and adapted: `yarn` → `pnpm`, spring-engine checks replaced by GSAP/motion/three checks |
| `AGENTS.md` | Rewritten for this project's hard rules (GSAP + motion + three.js motion stack, Drizzle + better-auth backend) |
| Code | First rules pass: removed all `any` (typed auth payloads via `Parameters<...>` casts, `UserRole` guard), tokenized footer gradients (`--manara-teal-deep`, `--manara-teal-bright`), `next/image` for teaser grid (+ `images.unsplash.com` remotePattern), `aria-label` on nav landmarks, GA id via `NEXT_PUBLIC_GA_MEASUREMENT_ID` with fallback, unused imports/props removed |
| Verification | `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green |

Known, justified WARNs: hex literals in `src/lib/tag-styles.ts` / `dot-grid.tsx`
defaults / `blogs-content.tsx` (config values, not stylesheets); raw `<img>` in
`profile-form.tsx` (blob: preview URLs); `console.log` in `resend.ts` (dev
verification-link fallback); two TODOs in auth forms.

**Build fix:** Tailwind v4 auto-scanned the vault and `.claude/` and generated
utilities from doc prose — including the wildcard example
`duration-[var(--duration-*)]`, which is invalid CSS and broke the build.
`globals.css` now scopes the scan with `@import "tailwindcss" source("../")`
(`src/` only). Keep class-like examples in docs harmless, or leave this
scoping in place if more vault folders land at the root.
