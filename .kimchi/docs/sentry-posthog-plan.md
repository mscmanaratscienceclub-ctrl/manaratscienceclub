# Plan: Sentry (Error Tracking) + PostHog (Analytics) Integration

## Goal

Add production-grade error tracking (Sentry) and product analytics (PostHog) to the
Manarat Science Club Next.js 16 App Router site. Track uncaught errors, server-action
exceptions, route-level errors, and key product events (sign-in, sign-up, post
publish, role change, etc.) while preserving privacy for a student-facing site.

## Stack assumptions (from exploration)

- Next.js **16.2.4** App Router + React **19.2.5** + TypeScript strict
- pnpm (lockfile present)
- Better Auth (email/password + username + admin roles) — already wired
- Drizzle + Supabase Postgres (no edge runtime in use anywhere)
- Vercel Speed Insights already present in `src/app/layout.tsx`
- No existing error boundaries — errors currently bubble to Next.js default page
- `env.example` is the canonical env-var template (no `.env.example` etc.)

## Library choices (pinned)

- **`@sentry/nextjs` `^9.0.0`** — official Next.js SDK. **v8 only supports up to
  Next.js 15**, so v9 is required for Next.js 16. Provides browser, server (Node),
  and edge bundles, plus the `withSentryConfig` Next.js wrapper. v9 supports
  Turbopack (which this project uses for both `next dev` and `next build`).
- **`posthog-js`** — official browser SDK. Supports Next.js App Router via a
  client `PostHogProvider`. We do **not** need `posthog-node` for this site
  (no server-side analytics requirements were specified).

Rejected: `@sentry/react` (manual, no SSR/edge), `posthog-node` (out of scope),
Datadog/LogRocket (not requested).

## Architecture

```
                        ┌────────────────────────────────────────┐
                        │          next.config.ts                │
                        │   wrapped with withSentryConfig(...)   │
                        └────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┼───────────────────────────────┐
        │                                │                               │
        ▼                                ▼                               ▼
┌───────────────┐               ┌──────────────────┐          ┌────────────────────┐
│ instrumentation│               │ instrumentation- │          │ sentry.server.config│
│      .ts      │  load() hook  │    client.ts     │ onReady  │  sentry.edge.config │
│ (root level)  ├──────────────►│  (root level)    │ hook     │ (root level)       │
└───────────────┘               └──────────────────┘          └────────────────────┘
        │                                │                               │
        ▼                                ▼                               ▼
   server init                    browser init                    server/edge init
```

```
┌─────────────────────┐         ┌──────────────────────────┐
│ app/global-error.tsx│         │ app/error.tsx            │
│ (root-level React   │         │ (route-segment level)    │
│  error boundary)    │         │                          │
└─────────────────────┘         └──────────────────────────┘
        │                                │
        └─────────────┬──────────────────┘
                      ▼
            Sentry.captureException(...)


┌──────────────────────────┐         ┌──────────────────────────┐
│ providers/               │         │ lib/analytics.ts         │
│   posthog-provider.tsx   │◄────────┤  trackEvent() / identify │
│  <PostHogProvider>       │ context │  () / reset() typed API  │
└──────────────────────────┘         └──────────────────────────┘
```

## File inventory

### Created
- `instrumentation.ts` — root, server-side Sentry loader
- `instrumentation-client.ts` — root, client-side Sentry loader
- `sentry.server.config.ts` — root, Node Sentry init
- `sentry.edge.config.ts` — root, Edge Sentry init (kept minimal; no edge code yet)
- `src/app/global-error.tsx` — root-level React error boundary (calls Sentry)
- `src/app/error.tsx` — route-segment error boundary (calls Sentry)
- `src/providers/posthog-provider.tsx` — PostHog client provider
- `src/lib/sentry-helpers.ts` — typed `captureException`, `captureMessage`, `setSentryUser`, `clearSentryUser`
- `src/lib/analytics.ts` — typed `trackEvent`, `identifyUser`, `resetAnalytics`, `getPostHog`

### Modified
- `next.config.ts` — wrap with `withSentryConfig`
- `src/providers/index.tsx` — mount `<PostHogProvider>`
- `src/app/layout.tsx` — no change (Sentry browser init is auto via `instrumentation-client.ts`)
- `src/app/(routes)/(auth)/signin/form.tsx` — call `trackEvent("user_signed_in")` on success
- `src/app/(routes)/(auth)/signup/form.tsx` — call `trackEvent("user_signed_up")` on success
- `src/app/(routes)/(auth)/signout/route.ts` *(or handler)* — call `resetAnalytics()` + `clearSentryUser()`
- `src/lib/auth/get-session.ts` — call `setSentryUser()` when session exists (server)
- `src/lib/actions/posts.ts` — track `post_published`, `post_deleted`; capture exceptions on validation throws
- `src/lib/actions/users.ts` — track `user_role_changed`
- `src/app/api/upload/route.ts` — capture upload failures to Sentry
- `env.example` — append `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`,
  `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `package.json` — add `@sentry/nextjs` and `posthog-js`

## Environment variables (added to `env.example`)

```env
# Sentry (error tracking)
# https://docs.sentry.io/platforms/javascript/guides/nextjs/
NEXT_PUBLIC_SENTRY_DSN=
# Build-time only — used by Sentry release plugin to upload sourcemaps. Not exposed at runtime.
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=

# PostHog (product analytics)
# https://posthog.com/docs/libraries/next-js
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

The app must boot when all of these are empty (dev/offline mode). Sentry and PostHog
both no-op when their key is missing — we still wire the call sites, so production
just needs the keys filled in to start collecting.

## Chunks

Each chunk is independently buildable and produces a coherent, verifiable unit.

---

### Chunk 1 — Sentry SDK installation & config files  *(simple)*

**Files (created):**
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation.ts`
- `next.config.ts` (modified)
- `env.example` (modified)
- `package.json` (modified — install `@sentry/nextjs@^9.0.0`)

> **Turbopack note:** This project runs `next dev --turbopack` and
> `next build --turbopack`. `@sentry/nextjs` v9 supports Turbopack — do **not**
> remove the `--turbopack` flag from either script. The `withSentryConfig`
> wrapper injects its loaders in a way that is compatible with both bundlers.

**Files (read first to know the type shape):**
- `next.config.ts`
- `tsconfig.json` (to know path alias `@/*` resolves to `./src/*` — confirmed via `@/providers`)

**Implementation details:**

`instrumentation.ts` (project root, **NOT** inside `src/` — Next.js looks for it at root):
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
```

`sentry.server.config.ts`:
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,           // 10% of transactions
  enableLogs: true,
  debug: false,
});
```

`sentry.edge.config.ts` — minimal placeholder (no edge code yet), same shape.

`next.config.ts`:
```ts
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = { /* existing config */ };

export default withSentryConfig(nextConfig, {
  silent: true,                 // suppress build banner noise
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  disable: !process.env.SENTRY_AUTH_TOKEN,  // skip sourcemap upload when token missing
  widenClientFileUpload: true,
  hideSourceMaps: true,
});
```

`env.example` — append the four Sentry vars + comments.

**Acceptance criteria:**
1. `pnpm install` completes; `@sentry/nextjs` appears in `package.json`.
2. `pnpm run build` succeeds (sourcemap plugin must not break build when token is empty — `disable: !SENTRY_AUTH_TOKEN` handles this).
3. The four files exist at project root.
4. `next.config.ts` compiles and is wrapped by `withSentryConfig`.

---

### Chunk 2 — Sentry client init + error boundaries + capture helpers  *(simple)*

**Files (created):**
- `instrumentation-client.ts` (project root — Next.js loads this automatically)
- `src/app/global-error.tsx`
- `src/app/error.tsx`
- `src/lib/sentry-helpers.ts`

**Implementation details:**

`instrumentation-client.ts`:
```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,    // session replays off by default; capture on error only
  debug: false,
});
```

`src/app/global-error.tsx` (root boundary, must render its own `<html>`):
```tsx
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en">
      <body>
        <h2>Something went wrong</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

`src/app/error.tsx` (route-segment boundary, plain UI):
```tsx
"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <div className="container mx-auto py-16 text-center">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      {error.digest && <p className="text-muted-foreground mt-2 text-sm">Reference: {error.digest}</p>}
      <Button onClick={reset} className="mt-6">Try again</Button>
    </div>
  );
}
```

`src/lib/sentry-helpers.ts` — thin typed wrappers:
```ts
import * as Sentry from "@sentry/nextjs";

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (context) Sentry.setExtras(context);
  Sentry.captureException(error);
}

export function captureMessage(msg: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(msg, level);
}

export function setSentryUser(user: { id: string; username?: string; email?: string }) {
  Sentry.setUser({ id: user.id, username: user.username, email: user.email });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
```

**Acceptance criteria:**
1. `pnpm run build` still succeeds.
2. Visiting any broken route renders the new error UI (manual smoke — must show "Something went wrong" + a digest).
3. `pnpm run lint` passes.
4. `src/lib/sentry-helpers.ts` exports the four functions.

---

### Chunk 3 — PostHog provider + typed analytics API  *(simple)*

**Files (created):**
- `src/providers/posthog-provider.tsx`
- `src/lib/analytics.ts`

**Files (modified):**
- `src/providers/index.tsx` — mount the provider inside `<ThemeProvider>`
- `env.example` — append PostHog vars
- `package.json` — install `posthog-js`

**Implementation details:**

`src/providers/posthog-provider.tsx`:
```tsx
"use client";
import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

if (typeof window !== "undefined" && key && !posthog.__loaded) {
  posthog.init(key, {
    api_host: host,
    capture_pageview: false,    // we handle this manually below
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!key) return;
    if (pathname) posthog.capture("$pageview", { $current_url: window.location.href });
  }, [pathname, search, key]);

  if (!key) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
```

`src/lib/analytics.ts` — typed event API:
```ts
"use client";
import posthog from "posthog-js";

export type AnalyticsEvent =
  | "user_signed_in"
  | "user_signed_up"
  | "user_signed_out"
  | "post_published"
  | "post_updated"
  | "post_deleted"
  | "user_role_changed"
  | "file_uploaded"
  | "file_upload_failed";

export function trackEvent(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

export function identifyUser(user: { id: string; username?: string; email?: string }) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.identify(user.id, { username: user.username, email: user.email });
}

export function resetAnalytics() {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  posthog.reset();
}
```

`src/providers/index.tsx`:
```tsx
import { PostHogProvider } from "./posthog-provider";
// ... existing imports

export default function Providers({ children }) {
  return (
    <>
      <NextTopLoader ... />
      <ThemeProvider ...>
        <PostHogProvider>{children}</PostHogProvider>
      </ThemeProvider>
      <Toaster ... />
    </>
  );
}
```

**Acceptance criteria:**
1. `pnpm install` succeeds; `posthog-js` in `package.json`.
2. `pnpm run build` succeeds.
3. `pnpm run lint` passes.
4. With no `NEXT_PUBLIC_POSTHOG_KEY`, the app boots and `<PostHogProvider>` is a passthrough (early `return <>{children}</>`).
5. `trackEvent("user_signed_in")` is a valid call — TypeScript accepts the event name.

---

### Chunk 4 — Wire analytics + Sentry user context into auth & key actions  *(simple)*

**Files (modified):**
- `src/app/(routes)/(auth)/signin/form.tsx` — `trackEvent("user_signed_in", { method: "password" })` on success
- `src/app/(routes)/(auth)/signup/form.tsx` — `trackEvent("user_signed_up")` on success
- `src/app/(routes)/(auth)/signout/*` — `resetAnalytics()`, `clearSentryUser()` (find the right handler — might be an API route or server action; read first)
- `src/lib/auth/get-session.ts` — `setSentryUser({ id, username, email })` when session present
- `src/lib/actions/posts.ts` — `trackEvent("post_published" | "post_updated" | "post_deleted", { postId })` on success paths
- `src/lib/actions/users.ts` — `trackEvent("user_role_changed", { userId, newRole })`; wrap thrown errors with `captureException` so we get a stack trace
- `src/app/api/upload/route.ts` — `captureException(err, { route: "upload" })` on failure paths
- `env.example` — already updated in chunks 1 & 3

**Implementation rules:**
- All `trackEvent`/`captureException` calls must live alongside existing error-handling blocks, not inside `try { ... }` swallowing logic. If a function already throws, do **not** try/catch just to instrument — that would suppress the throw. Instead, only add `trackEvent` on success branches and let `captureException` happen at the boundary (the route's `error.tsx`).
- Track only **successful** outcomes for analytics (sign-in count, not failed attempts). Failed-attempt Sentry capture already happens via error boundaries + the `signin/form.tsx` `toast.error` path does **not** throw, so we do not capture failed sign-in attempts. (Documented limitation; a future task could add explicit `captureMessage("signin_failed")`.)
- User identification must use Better Auth's `user.id` (stable across sessions). Do not include email in PostHog if it contains PII we don't need — but the user already exposes email in their auth flow, so it's fine.

**Acceptance criteria:**
1. `pnpm run build` succeeds.
2. `pnpm run lint` passes.
3. `grep -r "trackEvent\|captureException" src/` returns ≥10 call sites across auth + posts + users + upload.
4. `src/lib/auth/get-session.ts` calls `setSentryUser` exactly once per request where a session is found.

---

## Verification strategy (after all 4 chunks)

| Layer | Command | Expected |
|---|---|---|
| Typecheck | `pnpm run build` (or `tsc --noEmit`) | exit 0 |
| Lint | `pnpm run lint` | exit 0 |
| Smoke (offline mode) | `pnpm dev` then open `/`, `/signin`, any route | no errors; both error.tsx and global-error.tsx are reachable |
| Verify `posthog-js` disabled when key missing | `grep` PostHog provider — should still mount but no-op | confirmed via code review |
| Verify Sentry disabled when DSN missing | Sentry SDK is no-op when DSN empty | confirmed via code review |

We will **not** write integration tests that hit Sentry/PostHog servers (CI costs,
network flakes, secrets required). The build + lint + smoke criteria cover shape;
call-site coverage proves wiring.

## Privacy notes

- No PII beyond what the user already submits (email, username) is sent to Sentry/PostHog.
- `person_profiles: "identified_only"` in PostHog means anonymous events don't create profiles.
- `tracesSampleRate: 0.1` keeps volume manageable for a school club site.
- Source maps hidden in production builds (`hideSourceMaps: true`) — sentry sees a stack, not the original code unless auth token present.

## Out of scope

- Sentry alerting/regression tracking
- PostHog feature flags
- Session replay UI configuration
- Server-side PostHog (`posthog-node`)
- Custom dashboards / Sentry performance metrics
- Migrating existing `console.error` calls (they remain as-is — Sentry will still capture uncaught exceptions)
