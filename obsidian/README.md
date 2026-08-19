---
tags: [moc, home]
updated: 2026-08-19
---

# 🧠 Manarat Science Club — Project Brain

This vault is the **single source of truth** for the Manarat Science Club
project. It documents how the project is built, why decisions were made, and
how to extend it — for both humans and AI agents (Claude Code, Cursor, Qoder).

> [!info] What is this project?
> Manarat Science Club is a **Next.js 16 site** for the science club of Manarat
> Dhaka International School & College — public site, research blog, member
> auth (better-auth) and an in-house CMS. Motion runs on GSAP + `motion/react`
> + three.js; the database is Postgres via Drizzle.
>
> The vault and `.claude/` harness were adopted from
> [textura-agency/next16-claude-starter](https://github.com/textura-agency/next16-claude-starter)
> on 2026-08-19. Notes describing the starter's spring engine or
> Payload/Supabase backend are reference-only here — see ADR-0023 in
> [[decisions-log]] and the hard rules in `AGENTS.md` at the repo root.

## 🗺️ Map of Content

### 00 — Meta
- [[meta/README|Meta overview]] — how to use and maintain this vault
- [[changelog]] — log of notable changes to **this** project (starts fresh per project)
- [[decisions-log]] — Architecture Decision Records: why the conventions are what they are

### 01 — Architecture
- [[system-overview]] — the big picture, request lifecycle, mental model
- [[tech-stack]] — every dependency and why it is here
- [[folder-structure]] — where everything lives and what belongs where
- [[data-flow]] — how state, scroll, and animation data move through the app
- [[environment-variables]] — config & secrets handling

### 02 — Frontend
- [[routing]] — App Router conventions, route → view delegation
- [[design-system]] — Tailwind v4 tokens, CSS layers, styling rules
- [[animation-system]] — the spring component library (the core of this starter)
- [[text-engine]] — `spring-text-engine` usage summary & project rules
- [[text-engine-reference]] — full `spring-text-engine` API reference
- [[smooth-scroll]] — Lenis integration + scroll store
- [[component-conventions]] — how to write & place components
- [[html-semantics]] — semantic, accessible, SEO-correct markup rules
- [[seo-metadata]] — metadata generation & bot detection
- [[components/animation-springs|Spring components catalog]]
- [[components/common|Common components catalog]]
- [[hooks]] — custom hooks catalog
- [[utils]] — utility functions catalog

### 03 — Backend
- [[backend/README|Backend overview]] — API layer, CMS & database
- [[api-architecture]] — `app/api` route-handler convention & secret handling
- [[cms-payload]] — Payload CMS, installed per project into this Next app
- [[database-supabase]] — Supabase Postgres: connections, keys, RLS, migrations

### 04 — Workflows
- [[ai-agent-guide]] — rules of engagement for AI agents working in this repo
- [[agent-harness]] — the `.claude/` execution layer: commands, rules, skills, agents
- [[new-page]] — playbook for implementing a new page/section
- [[generic-layout-prompt]] — fill-in prompt template for a new page/section
- [[figma-to-code]] — turning a Figma frame into components
- [[qa-verification]] — how work is checked before it is called done
- [[ship]] — the pre-launch gate and deployment
- [[seo-aeo]] — SEO & answer-engine visibility as an ongoing practice
- [[site-migration]] — protecting rankings when rebuilding a live site
- [[optimize-3d-scene]] — performance work on a three.js/WebGL scene

### Templates
- [[templates/component-note|Component note template]]
- [[templates/hook-note|Hook note template]]
- [[templates/adr-note|ADR template]]

## 🏷️ Tag legend

| Tag | Meaning |
|-----|---------|
| `#stable` | Documented and reliable — safe to depend on |
| `#wip` | Work in progress / partially documented |
| `#todo` | Needs attention or is unfinished |
| `#decision` | Records or relates to an architectural decision |
| `#do-not-modify` | Code that must not be edited (animation engine) |

## 🔌 Obsidian setup

Open this folder (`obsidian/`) as an Obsidian vault. Recommended:
- **Graph view** — see how specs, components, and hooks connect
- **Dataview plugin** — query notes (e.g. list all `#wip` pages)
- **Templates core plugin** — point it at the `templates/` folder
