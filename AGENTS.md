# Agent Guide — Manarat Science Club

Adapted from `textura-agency/next16-claude-starter`. The vault and `.claude/`
enforcement system were adopted on 2026-08-19; the stack differs from the
starter's (see ADR-0023 in `obsidian/meta/decisions-log.md`).

## This is NOT the Next.js you know

This project runs Next.js 16 — APIs, conventions, and file structure may differ
from your training data. **Heed deprecation notices and verify against the docs
(`node_modules/next/dist/docs/`) before writing routing or framework code.**
Note: `middleware.ts` does not exist in Next 16 — it is `src/proxy.ts`.

## Documentation lives in the vault

All project documentation is the **`obsidian/`** Obsidian vault — it is the
single source of truth for how this project is built.

**Before working, read:**
- `obsidian/README.md` — Map of Content (index of every doc)
- `obsidian/workflows/ai-agent-guide.md` — full rules of engagement
- The relevant topic note before touching that area

**Commands, skills and agents** live in `.claude/` and are mapped in
`obsidian/workflows/agent-harness.md`.

Notes link each other with `[[wikilinks]]` — follow them to navigate.

## Hard rules (never violate)

1. **Motion: GSAP + motion + three.js — no new animation libraries.** Scroll-driven
   and reveal animation goes through GSAP (`gsap` + `ScrollTrigger`, registered
   once) or the shared `ScrollReveal` component; micro-interaction springs via
   `motion/react`. Never add `framer-motion` (this project uses the `motion`
   package), CSS `@keyframes`, or another animation library. CSS `transition-*`
   is allowed only for simple discrete state changes (hover/focus colour,
   opacity, border, small nudges). **Every animation must honour
   `prefers-reduced-motion`** via `useReducedMotion()`
   (`src/lib/hooks/use-reduced-motion.ts`).
2. **Three.js scenes follow the `optimize-3d-scene` skill** — clamped DPR,
   visibility-gated render loops, reduced octaves/particles on mobile, full
   cleanup + disposal on unmount, CSS fallback when WebGL is unavailable.
   Reference implementation: `src/components/home/blackhole-shader.tsx`.
3. **No hardcoded values** — design tokens in `src/app/globals.css` for styles;
   props/data modules for content. No raw hex/px in class names. Site content
   lives in `src/lib/data/index.ts` (`siteConfig`, `metrics`, `events`,
   `leadership`) — components never hardcode copy or config.
4. **Server Components by default**; add `"use client"` only at the leaves.
5. **No `any`.** Type everything. Run `pnpm lint` before finishing.
6. **Navigation** — standard `next/link` `<Link>` and `next/navigation`
   `useRouter`/`usePathname`. No `next/router`.
7. **API & secrets** — external/third-party calls with secret keys run
   server-side (server actions in `src/lib/actions/`, route handlers in
   `src/app/api/`). Secrets are server-only env vars, never `NEXT_PUBLIC_`.
   Validate input with `zod` (schemas live next to their forms, e.g.
   `(auth)/signin/validate.ts`).
8. **Semantic, SEO-correct HTML** — native elements over `div`s, one `<h1>` +
   a clean heading outline, named landmarks, real `button`/`a`, `alt` text
   on every image, `next/image` over raw `<img>`, JSON-LD (not microdata).
9. **Components** — typed props, content via props or `src/lib/data`, no
   `console.log` in committed code, keep components focused (~150 lines).
10. **Verify before reporting done.** `.claude/scripts/verify.sh` (zero FAILs)
    + `pnpm lint` + `pnpm build` after any code change, and the `qa-verify`
    skill after any UI change.
11. **The stack is Next.js 16 + React 19 + Tailwind v4 + Drizzle (Postgres) +
    better-auth + Supabase + Resend.** The starter-specific skills
    (`payload-cms`, `supabase-db`, `supabase-auth`) do NOT apply to this
    project's backend — ignore their install instructions; their general
    principles (secret hygiene, migrations discipline) still read worth.
    Skills that DO apply: `qa-verify`, `ship-check`, `seo-audit`,
    `schema-markup`, `aeo-visibility`, `site-migration`, `optimize-3d-scene`.

## After making changes

Update the vault: dependency changes → `tech-stack.md` + `changelog.md`;
architectural choices → an ADR in `decisions-log.md`; new component/hook/util →
the relevant catalog note. The `vault-librarian` agent can do this pass for you.
