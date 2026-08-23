# Manarat Science Club

The official website of **Manarat Science Club (MSC)** — the student-led science
society of Manarat Dhaka International School & College, Dhaka, Bangladesh.
A full-featured Next.js 16 application: public site, blog CMS, grand admin
panel, form registrations, and a complete auth system.

> Adapted from the `textura-agency/next16-claude-starter` scaffold. The stack
> differs from the starter's — see `obsidian/meta/decisions-log.md` (ADR-0023).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (Turbopack) + React 19 + TypeScript |
| **Package manager** | pnpm |
| **Styling** | Tailwind CSS v4 (CSS-first config) + shadcn/ui (`radix-sera` style) + lucide-react |
| **Auth** | Better Auth v1.6 (username/password sign-in, email verification, admin plugin, roles) |
| **Database** | PostgreSQL (Supabase-hosted), Drizzle ORM + Drizzle Kit |
| **Email** | Resend (verification links, password reset) |
| **Forms** | react-hook-form + Zod v4 + @hookform/resolvers |
| **Rich text** | TipTap (StarterKit, Link, Placeholder, Underline) for the CMS editor |
| **Motion** | GSAP + ScrollTrigger (scroll/reveal), `motion/react` (micro-interactions), three.js (home blackhole shader) |
| **Monitoring** | Sentry (`@sentry/nextjs`), Vercel Analytics + Speed Insights |
| **Toasts** | sonner |

---

## Architecture Overview

### Rendering model

**Server Components by default.** `"use client"` appears only at the leaves
(sidebars, forms, tables with interaction, animation components). Pages fetch
data by calling admin/role-guarded server actions or cached queries directly.

### Route groups (`src/app/(routes)/`)

Three sibling groups, each with its own layout and visual language:

| Group | Purpose | Theme | Gate |
|-------|---------|-------|------|
| `(site)` | Public pages (home, blogs, events, robotics…) | Dark "space / msc console" (`bg-space-deep`, ion orange accents) with Nav + Footer | Public |
| `(auth)` | Sign-in, sign-up, verify/reset password | Dark msc theme | Redirects signed-in users away |
| `(cms)` | Content management (`/cms/*`) | Light cream (`bg-cream`, ink text) with `CmsSidebar` | Session + role `admin` or `writer` |
| `(admin)` | Grand admin panel (`/admin/*`) | Light cream with `AdminSidebar` | Session + role `admin` only |

### Authorization — three layers

1. **`src/proxy.ts`** (Next 16's replacement for `middleware.ts`) runs on every
   request. It checks for a session *cookie* and redirects signed-out users away
   from any route not listed in `src/routes.ts` (`publicRoutes` /
   `publicRoutePatterns`). It never checks roles.
2. **Layouts** (`(cms)/layout.tsx`, `(admin)/layout.tsx`) re-validate the
   session server-side and enforce role requirements, redirecting if needed.
3. **Server actions** (`src/lib/actions/*`) repeat the check on every mutation
   or sensitive read — `getServerSession()` then `assertAdmin`/`assertCmsRole` —
   because actions are callable independently of the pages that use them.

`getServerSession()` (`src/lib/auth/get-session.ts`) is a `cache()`-wrapped
helper that fetches the better-auth session **and re-hydrates the user from the
database**, so role edits take effect immediately instead of waiting for
better-auth's 5-minute cookie cache to expire.

**Roles:** `admin`, `writer`, `member` (default). Managed in `/cms/users`.

### Data layer

- **Drizzle ORM** against the Supabase-hosted Postgres (`src/db/index.ts` —
  pgbouncer-safe singleton: `max: 1`, `prepare: false`).
- Schema lives in `src/db/schema/` (`auth/*`, `posts.ts`, `registrations.ts`),
  exported through `schema/index.ts`. Migrations are generated with
  `drizzle-kit` into `drizzle/`.
- **Exception:** `campus_ambassador_registrations` was originally created via a
  manual Supabase SQL migration (`drizzle/campus_ambassador_migration.sql`,
  RLS restricted to `service_role`). The public form *writes* through the
  Supabase service-role client; the admin panel *reads* through a Drizzle
  schema mirror of the same table.
- All site copy/content for public pages lives in **`src/lib/data/index.ts`**
  (`siteConfig`, `metrics`, `leadership`, `events`, `achievements`, `teams`,
  `projects`, members, legacy history) — components never hardcode content.

### Design system (`src/app/globals.css`)

Two visual languages share one token set:

- **Light brand tokens** (`--cream`, `--ink`, `--surface`, `--manara-*`
  accents) — used by CMS/admin and legal content. Shadows: `shadow-subtle`,
  `shadow-academic`.
- **Interstellar / msc tokens** (`--space-*`, `--ion`, `--ion-bright`,
  `--ion-line`) — used by the public site and auth pages.
- Fonts: `font-display` (Fredoka), `font-body` (Rubik), `font-voyage`
  (Unbounded), `font-space-display` (Cormorant), `font-space-body` (DM Sans),
  `font-mono` (Geist Mono).

### Motion system (hard rule)

Only **GSAP** (scroll-driven reveals — shared `ScrollReveal` component),
**`motion/react`** (springs/micro-interactions), and **three.js** (3D scenes).
No `framer-motion`, no CSS `@keyframes`, no other animation libraries. Every
animation honours `prefers-reduced-motion` via `useReducedMotion()`
(`src/lib/hooks/use-reduced-motion.ts`). Three.js scenes follow the
`optimize-3d-scene` skill (clamped DPR, gated render loops, full disposal).

---

## Project Structure

```
├── agents.md                  # AI-agent rules of engagement (hard rules)
├── obsidian/                  # Documentation vault — single source of truth
│   ├── README.md              #   Map of Content
│   ├── architecture/          #   system overview, data flow, env vars, tech stack
│   ├── backend/               #   API architecture, Supabase notes
│   ├── frontend/              #   design system, animation, routing, SEO
│   ├── meta/                  #   changelog.md, decisions-log.md (ADRs)
│   └── workflows/             #   agent harness guide
├── .claude/                   # Commands, skills, agents, verify.sh
├── drizzle/                   # Generated SQL migrations + ambassador table SQL
├── env.example                # Environment variable template
└── src/
    ├── proxy.ts               # Next 16 middleware: cookie-based route gating
    ├── routes.ts              # publicRoutes, authRoutes, redirect constants
    ├── instrumentation.ts     # Sentry server init
    ├── instrumentation-client.ts  # Sentry client init
    ├── types/                 # Shared TS types
    ├── app/
    │   ├── layout.tsx         # Root layout — fonts, metadata, Providers
    │   ├── globals.css        # All design tokens + Tailwind v4 theme
    │   ├── not-found.tsx      # Themed 404 ("Lost in space")
    │   ├── error.tsx          # Route error boundary
    │   ├── global-error.tsx   # Root error boundary
    │   ├── api/
    │   │   ├── auth/[...all]/ # better-auth handler (toNextJsHandler)
    │   │   └── upload/        # Image upload route handler
    │   └── (routes)/
    │       ├── (site)/        # Public site
    │       │   ├── layout.tsx #   Nav + Footer + dark shell
    │       │   ├── page.tsx   #   Homepage (hero, divisions, journal…)
    │       │   ├── legacy/    #   Club history & member generations
    │       │   ├── blogs/     #   Blog index + [slug] post pages
    │       │   ├── events/    #   Events calendar
    │       │   ├── achievements/  # Club honors
    │       │   ├── robotics/  #   Robotics division hub (projects, olympiads)
    │       │   ├── opportunities/ # Member opportunities
    │       │   ├── join/      #   Membership form (→ Google Form)
    │       │   ├── register/  #   Campus Ambassador registration + action
    │       │   ├── profile/   #   Signed-in profile editing
    │       │   ├── privacy-policy/ & terms/  # Legal pages (LegalShell)
    │       ├── (auth)/        # signin, signup, verify-email, forgot/reset password
    │       ├── (cms)/cms/     # CMS: dashboard, posts (CRUD + TipTap), tags, users
    │       └── (admin)/admin/ # Grand admin: dashboard, campus-ambassador viewer,
    │                          # science-competition placeholder
    ├── components/
    │   ├── nav.tsx / footer.tsx   # Thin wrappers picking variant/theme
    │   ├── home/
    │   │   ├── msc-nav.tsx     # Site navbar (overlay/bar variants, scroll blur)
    │   │   ├── msc-footer.tsx  # 4-column footer + legal bottom bar
    │   │   ├── msc-hero.tsx    # GSAP scramble-text hero
    │   │   ├── blackhole-shader.tsx  # three.js home shader (reference 3D impl)
    │   │   ├── divisions-pan.tsx, journal-console.tsx, journal-rows.tsx,
    │   │   ├── manifesto-lines.tsx, telemetry.tsx, tesseract-canvas.tsx
    │   ├── cms/               # editor.tsx (TipTap), toolbar, post-form, sidebar
    │   ├── admin/sidebar.tsx  # Grand-admin sidebar
    │   ├── site/legal-shell.tsx  # Shared layout for privacy/terms pages
    │   ├── animations/ScrollReveal.tsx  # Shared GSAP reveal wrapper
    │   └── ui/                # shadcn primitives (button, form, input…)
    ├── db/
    │   ├── index.ts           # Drizzle client singleton (pgbouncer-safe)
    │   └── schema/
    │       ├── auth/          # user, account, session, verification tables
    │       ├── posts.ts       # Blog posts (slug, HTML content, status, tags)
    │       └── registrations.ts  # campus_ambassador_registrations mirror
    ├── lib/
    │   ├── auth/
    │   │   ├── server.ts      # betterAuth() config (drizzle adapter, admin plugin,
    │   │   │                  #   username plugin, role additionalField)
    │   │   ├── client.ts      # createAuthClient (browser)
    │   │   ├── get-session.ts # cached server session + DB user re-hydration
    │   │   ├── password.ts    # shared password policy (zod)
    │   │   └── usernames.ts   # username validation helpers
    │   ├── actions/           # "use server" actions — all session+role guarded
    │   │   ├── posts.ts       #   CMS post CRUD + publish toggle
    │   │   ├── users.ts       #   user listing + role changes (admin)
    │   │   └── registrations.ts  # ambassador registrations read (admin)
    │   ├── data/index.ts      # All static site content (see Data layer)
    │   ├── email/             # Resend client + HTML email templates
    │   ├── hooks/use-reduced-motion.ts
    │   ├── supabase.ts        # service-role Supabase client singleton
    │   ├── analytics.ts       # event tracking wrapper
    │   ├── sentry-helpers.ts  # safe Sentry user/context helpers
    │   ├── tag-styles.ts      # blog tag colour mapping
    │   └── utils.ts           # cn() and misc helpers
    └── providers/             # Client providers (Toaster, analytics, toploader)
```

---

## Pages & Routes

### Public site (`(site)`)

| Route | Description |
|-------|-------------|
| `/` | Homepage — msc hero, divisions pan, journal console, manifesto, telemetry |
| `/legacy` | Club history timeline and member generations |
| `/blogs`, `/blogs/[slug]` | Published posts from the CMS |
| `/events` | Events calendar (data module) |
| `/achievements` | Club honors by tier/category |
| `/robotics` | Robotics division hub — project display, olympiads & honors, upcoming |
| `/opportunities` | Opportunities for members |
| `/join` | Membership application (redirects to Google Form) |
| `/register` | Campus Ambassador registration (Supabase insert) |
| `/privacy-policy`, `/terms` | Legal pages |
| `/profile` | Signed-in profile editing |

### Auth (`(auth)`)

| Route | Description |
|-------|-------------|
| `/signin` | Username + password sign-in (`?redirect=` deep-link support) |
| `/signup` | Registration with email verification |
| `/verify-email`, `/forgot-password`, `/reset-password` | Email flows |

### CMS (`(cms)`) — `admin` + `writer`

| Route | Description |
|-------|-------------|
| `/cms` | Dashboard — post stats + recent posts |
| `/cms/posts`, `/cms/posts/new`, `/cms/posts/[id]` | Post list, create, edit (TipTap) |
| `/cms/tags` | Tag management |
| `/cms/users` | **Admin only** — list users, change roles |

### Grand admin (`(admin)`) — `admin` only

| Route | Description |
|-------|-------------|
| `/admin` | Stats dashboard (total/week/month/unique schools) + form cards |
| `/admin/campus-ambassador` | Full registration viewer — search + expandable responses |
| `/admin/science-competition` | Placeholder until the competition form launches |

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `user` | Users with `role` (`admin`/`writer`/`member`), username, gender, ban status |
| `account` | Credentials / linked accounts |
| `session` | Sessions with IP + user-agent |
| `verification` | Email verification tokens |
| `posts` | Blog posts — slug, HTML content, tags, status, author refs |
| `campus_ambassador_registrations` | Ambassador form responses (name, class, school, experience) — raw-SQL migration, service_role-only RLS |

Migrations: `drizzle/0000…0005` (drizzle-kit) + `campus_ambassador_migration.sql`
(applied manually via Supabase SQL editor).

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.19, pnpm
- A Supabase project (Postgres + storage)
- A Resend account (email delivery)

### Setup

```bash
git clone <repo-url>
cd manaratscienceclub
pnpm install
cp env.example .env.local
```

Fill in `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase connection string (Supavisor pooler, pgbouncer mode) |
| `DIRECT_URL` | Yes | Direct Supabase connection — used by drizzle-kit |
| `BETTER_AUTH_SECRET` | Yes | Long random string (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_BASE_URL` | Yes | App base URL (production URL on Vercel) |
| `RESEND_API_KEY` | Yes* | Resend key for transactional email |
| `EMAIL_FROM` | Yes* | Verified sender address |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes* | Supabase project URL (uploads + ambassador form) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Server-only service role key — **never** `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_GOOGLE_FORM_URL` | No | Destination of `/join` |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry error tracking |

Then push the schema and start developing:

```bash
pnpm db:migrate   # drizzle-kit push
pnpm dev          # http://localhost:3000
```

> The `campus_ambassador_registrations` table must also be created by running
> `drizzle/campus_ambassador_migration.sql` in the Supabase SQL editor.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build (Turbopack) |
| `pnpm start` | Serve production build |
| `pnpm lint` | ESLint over the whole repo |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Push schema to the database |
| `pnpm db:studio` | Drizzle Studio GUI |

Before finishing any change: `.claude/scripts/verify.sh` (0 FAILs) +
`pnpm lint` + `pnpm build`.

---

## Documentation & Agent Harness

- **`obsidian/`** — the Obsidian vault is the single source of truth:
  architecture notes, ADRs (`decisions-log.md`), `changelog.md`, and the
  component/design-system catalogs.
- **`.claude/`** — commands, path-scoped rules, skills (`qa-verify`,
  `optimize-3d-scene`, `seo-audit`…), subagents, and `scripts/verify.sh`
  (mechanical rule checks).
- **`agents.md`** — the hard rules for AI agents and humans alike (motion
  stack, no hardcoded values, server-first, verification gate).

## License

MIT — Copyright 2026 Abrar Jawad
