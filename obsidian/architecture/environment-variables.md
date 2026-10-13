---
tags: [architecture, config, stable]
updated: 2026-09-14
---

# Environment Variables

Rules for handling configuration and secrets.

## Rules

- Store all secrets in **`.env.local`** — never commit it (it is git-ignored).
- Document every required variable in **`.env.example`** (committed, no real values).
- Reference variables in code via `process.env.VARIABLE_NAME`.
- Prefix with **`NEXT_PUBLIC_`** only if the value is safe to expose to the browser.
  Unprefixed variables are server-only.

## Current variables

| Name | Scope | Purpose |
|------|-------|---------|
| `NEXT_PUBLIC_SITE_URL` | public | Site origin (no trailing slash). Drives canonical URLs, OG/Twitter tags, `robots.txt`, `sitemap.xml`, JSON-LD. Falls back to `http://localhost:3000` when unset — **set it in production**. See [[seo-metadata]]. |
| `CONTACT_ENDPOINT` | server-only | Optional upstream the `/api/contact` route forwards leads to (CRM / webhook). When unset, submissions are logged server-side. See [[api-architecture]]. |
| `SMS_FORWARDER_SECRET` | server-only | Shared secret the Android SMS-forwarder app sends as the `x-forwarder-secret` header to `/api/webhooks/sms`. **When unset the webhook accepts every POST** (fails open) — set it in every environment. See [[sms-forwarder]]. |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | public | Public origin of the Tigris bucket holding every PDF and content image. **A billing control as much as a config value**: set, `src/lib/media.ts` serves all media reads from Tigris and Supabase's metered cached egress goes to the profile avatars only; unset, every URL is built against Supabase again. No trailing slash. Inlined into prerendered HTML, so it must be set in Vercel **and** redeployed — see [[decisions-log]] ADR-0041. |
| `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` | script-only | Used by `scripts/migrate-media-to-tigris.mjs` and by nothing in `src/` — `@aws-sdk/client-s3` is a devDependency precisely so the app cannot pull it into a serverless bundle. Named as the AWS SDK expects because Tigris speaks S3; `TIGRIS_*` overrides any one. Anonymous reads come from `https://<bucket>.t3.tigrisfiles.io`, not from `t3.storage.dev`. |
| `PORT_SOURCE_DB`, `PORT_TARGET_DB`, `PORT_TARGET_RUNTIME`, `PORT_TARGET_PROJECT_URL`, `PORT_TARGET_REF`, `PORT_TARGET_PUBLISHABLE_KEY`, `PORT_TARGET_SERVICE_ROLE_KEY` | script-only, separate file | `scripts/db-port-*.mjs` — the Supabase project-to-port ([[backend/database-supabase]], ADR-0042). They live in **`.env.port`**, not `.env`, because `.env` holds the live production DSN and a port script must never be able to read it as a target; `.gitignore`'s `.env*` rule already covers the file. `PORT_SOURCE_DB` may be left blank — the scripts then read `DIRECT_URL` out of `.env`, so the production password keeps one home. `PORT_TARGET_RUNTIME` (6543) is used only by the verify probes; DDL and the row copy use `PORT_TARGET_DB` (5432, session mode). Never pass a DSN or key as `--flag=value`: argv is visible in `ps`, shell history and build logs. |

Documented in `.env.example` (committed). Validated by `src/env.ts` (zod):
`publicEnv` for `NEXT_PUBLIC_*` (safe anywhere), `getServerEnv()` for
server-only secrets (route handlers only) — see [[api-architecture]]. Read env
through `src/env.ts`, never `process.env` directly.

> [!important] Optional variables must treat `""` as unset
> `cp .env.example .env` — the documented setup step — leaves declared-but-blank
> keys (`CONTACT_ENDPOINT=`), which arrive as `""`, **not** `undefined`. A bare
> `z.url().optional()` rejects `""` as *"Invalid URL"*, so the copy alone broke
> `/api/contact`. Every optional variable therefore goes through the
> `optionalUrl()` helper in `src/env.ts`, which preprocesses `""` → `undefined`.
> **Follow this for any new optional variable** — `.optional()` on its own is not
> enough.

> [!important] Secret handling
> Secret keys are **unprefixed** — `NEXT_PUBLIC_` is only for values safe in the
> browser. Secrets are read in server code (`app/api/**`); the browser never
> holds one. See [[api-architecture]].

When the next variable is introduced:
1. Add it to `.env.example` with a comment describing it.
2. Add a row to the table above (name, scope, purpose).
3. If it is optional, wrap it so `""` parses as unset (see the note above) —
   otherwise copying `.env.example` breaks it.
4. Add a [[changelog]] entry.

## Related

[[tech-stack]] · [[seo-metadata]] · [[backend/README]]
