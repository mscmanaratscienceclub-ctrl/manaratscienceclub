---
tags: [meta, changelog]
updated: 2026-08-30
---

# Changelog

Chronological log of notable changes to **this project**. Newest first.
Human-curated — not a mirror of `git log`.

Log a change here when it would surprise someone returning in six months: a new
dependency, a new route or section, a convention bent, a bug whose cause is worth
remembering. Routine commits do not need an entry.

For *why* the conventions are what they are, see [[decisions-log]].

---

## 2026-08-30 — Supabase image pipeline: pre-optimised, zero transformations

- `scripts/optimize-bucket-images.mjs` (`pnpm images:optimize`, or
  `images:optimize:dry` to preview) re-encodes every bucket object referenced in
  `src/lib/data/index.ts` to WebP at 2x rendered size and uploads it under
  `optimized/` with a one-year `cache-control`. 23.5 MB → 0.85 MB across 31
  objects; `/legacy` drops from 17.7 MB to 0.66 MB. Originals are left in place.
- The 36 hardcoded `https://<project>.supabase.co/...` strings in the data
  module are replaced by `bucketImage()` from the new `src/lib/media.ts`, which
  derives the origin from `NEXT_PUBLIC_SUPABASE_URL`. `getPublicImageUrl()` is
  gone — it built a plain string through the service-role client.
- Blog author avatars and stored profile pictures route through Supabase's
  `/render/image/` endpoint (`renderedImageUrl()`) so Vercel is never asked to
  transform them. See [[decisions-log|ADR-0025]].
- `POST /api/upload` sets `cacheControl: "31536000"`; UUID-named uploads were
  inheriting Supabase's 1-hour default.
- The competition carousel no longer sends `priority` for below-the-fold slides,
  which was competing with the real LCP element.
- Fixed 6 `/memberimage/*.{png,jpg}` references left dangling by the in-flight
  WebP migration (they were 404ing); profile uploads are now 512 px WebP with a
  JPEG fallback where canvas WebP is unsupported.

## 2026-08-30 — Batch Ambassador registration

- `/register` now offers Campus Ambassador and Batch Ambassador side by side,
  reusing one validated form with programme-specific drafts and submission state.
- Ambassador submissions persist a constrained `type` value (`campus` or
  `batch`); existing rows default to `campus`. Run
  `drizzle/add_ambassador_type.sql` in the Supabase SQL Editor before deploying.
- The admin ambassador table now identifies and searches both registration types.
- Form payloads are validated by the same Zod schema on the client and server;
  the submit action no longer falls back to a publishable key or logs key details.

## 2026-08-28 — Tailwind scan scope and Tesseract loop recovery

- Restored Tailwind's `source("../")` import scope so only `src/` is scanned.
  The split `@source "../"` form allowed class-like wildcard examples in the
  root vault and `.claude/` files to produce invalid generated CSS such as
  `animation-duration: var(--duration-*)`.
- Removed the Tesseract canvas's duplicate initial `requestAnimationFrame`
  chain and clear the active frame handle at callback entry. Visibility and
  intersection pauses can now cancel the one authoritative loop and reliably
  wake it again.
- The scene now listens for live `prefers-reduced-motion` changes: enabling the
  preference freezes on a rendered frame, and disabling it safely resumes.

---

## 2026-08-28 — Hero FOUC fix: animated hero starts hidden in CSS, not JS

- On refresh, the server HTML painted all six scroll slides stacked on
  top of each other over the hero copy for the ~1s before React
  hydration — their hidden state existed only in GSAP
  (`useLayoutEffect`), which cannot run until the bundle loads.
- Fix: an inline gate script (first child of `<body>` in
  `src/app/layout.tsx`) adds `html.motion-ok` before first paint when
  `prefers-reduced-motion` is not set; new gate rules in `globals.css`
  start `[data-hero-rise]`/`[data-hero-fade]` at `opacity: 0` and
  position + hide `[data-slide]` under that class only.
- Hero slides now render **static-first** (bare divs in a `grid`); the
  absolute slide-deck layout moved from Tailwind classes into the CSS
  gate — no-JS and reduce-motion visitors get the readable static page
  immediately (before, they saw stacked slides until hydration).
- Intro tweens switched `.from()` → `.fromTo()` with explicit end
  values (a `from` would read the CSS-hidden 0 as the end state); the
  animation effect checks the media query directly since
  `useReducedMotion` syncs post-paint.
- `<html>` needs `suppressHydrationWarning` (missed initially): the
  pre-paint script mutates its `class` before React hydrates, and the
  mismatch could trip a client re-render that strips `motion-ok` and
  knocks the slides out of the pinned dive mid-animation. The hero
  effect also re-asserts the class before GSAP initializes as
  insurance against any framework attribute reconciliation.

---

## 2026-08-28 — Hero intro softened: gentle fade-rise replaces scramble decode

- Replaced the `ScrambleTextPlugin` cipher-decode intro in
  `src/components/home/msc-hero.tsx` with a subtle staggered fade + rise
  (`power2.out`, ~0.8s per element) — the decrypt effect read as visual
  noise on the landing hero.
- Data markers `data-scramble-status/-top/-bottom` renamed to a single
  `data-hero-rise` (DOM order drives the cascade). Scroll-driven tesseract
  dive and the `data-hero-fade` reveal are unchanged; `prefers-reduced-motion`
  still renders everything static. Plugin registration now loads only
  `ScrollTrigger`.

---



## 2026-08-20 — SEO metadata routes: sitemap.xml + robots.txt

- Added `src/app/sitemap.ts` (dynamic — static site routes + published CMS
  posts from the DB) and `src/app/robots.ts` (allows public pages, disallows
  `/admin`, `/cms`, `/profile`, auth pages, `/api/`, Sentry example routes).
- Both are whitelisted in `src/routes.ts` `publicRoutes` — the auth proxy in
  `src/proxy.ts` otherwise redirects unauthenticated requests to `/signin`.
- `metadataBase`, sitemap and robots all read `NEXT_PUBLIC_BASE_URL`
  (fallback `https://manaratscience.club`). Must be set to the production
  URL in the host env.
- Added `public/og.png` (1792×1024) as the OpenGraph/Twitter card image —
  the previous `/msc.svg` was not renderable by social crawlers.
- Deleted Sentry demo routes (`/sentry-example-page`, `/api/sentry-example-api`)
  and stray public assets (Minecraft mod jar, `Tr2n.ttf`, duplicate member
  images).

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

## 2026-08-20 — Single global navbar + data fix

- Fixed syntax error in `src/lib/data/index.ts` (unescaped quotes around
  "Science Talk" in the new advisor-2 quote).
- Navbar is now **one global bar everywhere** (home, inner pages, auth, 404):
  `MscNav` lost its overlay/bar variants; links are Home `/`, Members
  `/legacy`, Research `/blogs`, and Register `/register` (ion CTA).
  `src/components/nav.tsx` no longer branches on pathname.

## 2026-08-20 — Mission Queue replaced by Editorial advisor section

- Removed home `Telemetry` (radar + MISSION QUEUE) — `telemetry.tsx` deleted.
- Added `src/components/home/editorial-voices.tsx` (`#editorial`): "Editorial —
  Words of wisdom from our faculty advisors". Copy and quotes pulled from the
  `leadership` data (matches old-site `drawsvg-redesign.html` leadership section);
  advisors have no photos, so cards use monogram avatar frames like the old site.
- Home nav "Mission → #mission" became "Editorial → #editorial".

## 2026-08-20 — Fleet section replaced by competition carousel

- Removed the home "Fleet" divisions pan (`divisions-pan.tsx` + `src/lib/data/home-cards.ts` deleted).
- Added `src/components/home/competition-carousel.tsx` (`#showcase`): auto-scrolling
  photo strip (GSAP `xPercent` loop, 45s, pauses on hover/focus, static under
  reduced motion). No viewer/controls — just images moving in a line, edge-faded.
- Frames come from `competitionShowcase` in `src/lib/data/index.ts` — placeholder
  shots from `public/memberimage/` until real competition photos arrive.
- Home nav link "Fleet → #divisions" became "Showcase → #showcase".

## 2026-08-20 — GooeyNav navbar experiment — reverted

Briefly integrated React Bits GooeyNav into `msc-nav.tsx`; reverted same day
at request — the previous underline-link navbar was preferred. No residue left
(component files, `--sh-ion` token and nav rewrite all removed).

## 2026-08-20 — ChromaGrid member cards + full "//" sweep

- Integrated React Bits **ChromaGrid** as `src/components/ui/chroma-grid.tsx`
  (+ `chroma-grid.css`): TypeScript-typed, GSAP spotlight with
  `useReducedMotion` gating (durations drop to 0), `next/image` instead of raw
  `<img>`, token-based CSS (`--space-*`, `--radius-2xl`), social icon links
  with stopPropagation on the anchors, and a fallback placeholder for members
  without photos.
- `/legacy` redesigned around it: member sections map `Member[]` → `ChromaItem`
  with rotating token accents (ion / space-amber / space-sage / teal-bright);
  name, role, batch, and socials all preserved.
- Finished the `//` sweep missed earlier: kicker strings in achievements,
  events, join, opportunities, profile, signin, signup, forgot/reset-password,
  and legacy hero. Only URLs contain `//` now.

Verified: `verify.sh` 0 FAIL (6 pre-existing WARNs), `pnpm lint` clean,
`pnpm build` green, `/legacy` smoke-tested on the dev server.

## 2026-08-20 — Robotics hub + "//" removal + README rewrite

- New `/robotics` page: division stats, focus-area chips, **Project Display**
  (filtered from `projects`), **Olympiads & Honors** (robotics achievements),
  upcoming robotics events, join CTA. Two new robotics projects added to the
  data module (`proj-005` greenhouse system, `proj-006` line-follower).
  Wired into `publicRoutes`, nav, and footer Explore column.
- Removed all displayed `//` separators: nav/footer wordmarks are now
  `MSC`, hero status line uses an em dash, legal kickers
  are `MSC Legal`, 404 sign-off uses `·`.
- `README.md` fully rewritten to document the actual architecture: route
  groups, three-layer authorization, data layer, design tokens, motion rules,
  file-by-file structure, routes table, env setup.

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green,
`/robotics` smoke-tested on the dev server.

## 2026-08-20 — Navbar + footer redesign

- `msc-nav.tsx` — logo mark (Atom in ion square) + wordmark, scroll-aware
  blur/backdrop, animated ion underline on hover/active links, filled ion CTA,
  numbered mobile menu items. `siteNavigation` gains Opportunities. Mobile menu
  duration drops to 0 under `useReducedMotion`.
- `msc-footer.tsx` — expanded from one strip to a 4-column footer: brand +
  tagline + address/email/phone, Explore links, Get Involved (Join, Campus
  Ambassador, bug report) + Legal, Community (Instagram, Facebook, Discord,
  boys/girls WhatsApp), plus bottom bar with copyright, founded year, and
  developer credit. All info sourced from `siteConfig`.
- Smoke-tested against the running dev server: nav/footer render on `/legacy`,
  404 renders for invalid `/blogs/:slug`. Note: unknown top-level paths still
  307 to `/signin` (proxy gates non-public routes — pre-existing behaviour).

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green.

## 2026-08-20 — Custom 404 + legal pages

- `src/app/not-found.tsx` — themed "Lost in space" 404 with Nav +
  Footer, ion glow, and CTA links back to `/` and `/events`.
- `/privacy-policy` and `/terms` — built on a shared
  `src/components/site/legal-shell.tsx` (numbered sections, dark msc theme);
  both added to `publicRoutes` in `src/routes.ts` so the proxy lets them through.
- `msc-footer.tsx` gains a bottom row with copyright + Privacy/Terms links.

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green.

## 2026-08-20 — Grand admin panel (`/admin`)

New admin-only route group `(admin)` reusing the CMS auth stack
(`getServerSession` + better-auth roles). The layout redirects non-admins to `/`.

- `/admin` — stats dashboard (total / this week / this month / unique schools)
  plus recent `campus_ambassador_registrations`.
- `/admin/campus-ambassador` — full response viewer (search + expandable
  experience rows); client table at
  `src/app/(routes)/(admin)/admin/campus-ambassador/registrations-table.tsx`.
- `/admin/science-competition` — placeholder until that form launches.
- `campus_ambassador_registrations` is now mirrored in the Drizzle schema
  (`src/db/schema/registrations.ts`); reads go through the admin-guarded
  `src/lib/actions/registrations.ts`, not the Supabase client.
- CMS sidebar gains an "Admin Panel" link for admins.

Verified: `verify.sh` 0 FAIL, `pnpm lint` clean, `pnpm build` green.

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
