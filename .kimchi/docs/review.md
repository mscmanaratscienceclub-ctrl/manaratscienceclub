# Implementation Review — Sentry + PostHog Integration

## Verdict: FAIL

The integration has the right surface area (config files, error boundaries, providers,
analytics helpers exist and `pnpm run build` passes), but two BLOCKER issues make it
unsafe to ship as-is:

1. The sign-out analytics/Sentry reset wiring was placed in a new component
   (`button-signout.tsx`) that **is not actually rendered anywhere in the app**. The
   real sign-out path is `cms/sidebar.tsx`, which never calls `trackEvent`,
   `resetAnalytics`, or `clearSentryUser` — so user identity leaks between sessions
   in both PostHog and Sentry.
2. The analytics module (`src/lib/analytics.ts`) carries a `"use client"` directive
   but is imported and invoked from **server actions and an API route**. Build
   artefacts confirm `posthog-js` is bundled into the server chunks and `trackEvent`
   calls `posthog.capture` server-side. This is the wrong runtime for a browser-only
   library and the plan explicitly rejected `posthog-node` for this reason.

A third issue — `createPost` emits `post_published` even when the post is saved as a
draft — corrupts the analytics signal.

Everything else (error boundaries, Sentry helpers, PostHog provider, env vars) is
correct or near-correct.

---

## Findings

### BLOCKER 1 — Sign-out analytics/Sentry reset wiring is in the wrong file
- **File**: `src/app/(routes)/(auth)/components/button-signout.tsx` (whole file) and
  the missing call sites in `src/components/cms/sidebar.tsx:24`.
- **Plan reference**: Chunk 4 explicitly says "`src/app/(routes)/(auth)/signout/*` —
  `resetAnalytics()`, `clearSentryUser()` (find the right handler — might be an API
  route or server action; read first)".
- **Evidence**: `grep` for `SignOutButton` and `button-signout` across `src/` returns
  only the definition itself — no consumer. The actual sign-out happens in
  `cms/sidebar.tsx:24`:
  ```tsx
  await signOut({ fetchOptions: { onSuccess: () => router.push("/signin") } });
  ```
  No `trackEvent("user_signed_out")`, no `resetAnalytics()`, no `clearSentryUser()`.
- **Impact**:
  - PostHog: the next visitor inherits the previous user's identity (user
    identification is never reset). With `person_profiles: "identified_only"`,
    this conflates every signed-out session into the previous user's profile.
  - Sentry: the Sentry user scope on the server is set by `get-session.ts` via
    `setSentryUser`. Without `clearSentryUser()` after sign-out, any server
    errors that surface through the request isolation scope retain the prior
    user's identity until the next `getServerSession()` clears it (e.g. an
    unauthenticated route hit). More importantly, client-side errors reported
    while the user is signed out still carry the previous user's id.
  - Analytics: `user_signed_out` is never emitted, breaking sign-out funnel
    metrics.
- **Suggested fix**: Either
  (a) wire the existing `button-signout.tsx` calls into `cms/sidebar.tsx`'s
      `handleSignOut` `onSuccess`, OR
  (b) add `trackEvent("user_signed_out")`, `resetAnalytics()`, `clearSentryUser()`
      directly inside `handleSignOut` in `cms/sidebar.tsx:23-25`.
  The first option is preferable because `button-signout.tsx` already has the
  correct ordering and uses `redirect` for navigation.

---

### BLOCKER 2 — Server-side execution of `posthog.capture` via `analytics.ts`
- **Files**:
  - `src/lib/analytics.ts:1` (`"use client"` directive)
  - `src/lib/actions/posts.ts:10,116,131,146` (server-action imports + calls)
  - `src/lib/actions/users.ts:8,35` (server-action imports + calls)
  - `src/app/api/upload/route.ts:6,26,32,51` (Node-route imports + calls)
- **Plan reference**: Chunk 4 calls for `trackEvent(...)` in these exact locations.
  The plan's "Architecture" section also states: *"We do **not** need
  `posthog-node` for this site (no server-side analytics requirements were
  specified)"*. The two statements are contradictory: the call sites are
  server-side, but no server-side SDK is provided.
- **Evidence**:
  - Build output `.next/server/chunks/ssr/src_lib_analytics_ts_0yx-ntr._.js`
    contains the actual function body, including:
    ```js
    function(a,c){
      process.env.NEXT_PUBLIC_POSTHOG_KEY&&(
        c ? b.default.capture(a,c) : b.default.capture(a)
      )
    }
    ```
    where `b.default` is the imported `posthog-js` module.
  - `.next/server/chunks/ssr/201z_posthog-js_dist_module_1ptozem.js` exists,
    confirming `posthog-js` is loaded into the Node bundle (not just client).
  - `posthog-js` is a browser-only library (v1.396.2 — legacy line; v3+ is
    the React 19 / Next.js 16+ rewrite). Importing it in Node and calling
    `.capture()` will either crash (if it accesses `window`/`document` during
    init), or silently swallow events, depending on the page that triggered
    init. In either case, the analytics events are not reaching PostHog
    correctly.
- **Impact**:
  - In offline mode (no `NEXT_PUBLIC_POSTHOG_KEY`), `trackEvent` short-circuits
    and the bug is invisible. Build/lint passes for that reason.
  - In production with a key set, server actions and the upload route will
    execute `posthog.capture(...)` in Node — either crashing the request or
    dropping the event. Either way, the analytics integration is broken
    server-side.
  - The `"use client"` directive is misleading: it marks the file for the
    client bundle but Next.js still allows the import from server modules
    (the function references compile to client-manifest stubs but in
    server-action bundles they resolve to the real implementation, as
    evidenced above).
- **Suggested fix**: Pick one of:
  1. **Add `posthog-node` and split the analytics module** — create
     `src/lib/analytics-server.ts` (no `"use client"`, uses `posthog-node`)
     for server-action and route callers, keep `src/lib/analytics.ts` (with
     `"use client"`) for client-side callers. Re-export the same `trackEvent`
     API with appropriate typing.
  2. **Move the server-side events to client-side** — call `trackEvent` from
     the client component that initiated the server action (e.g. wrap
     `createPost`/`updatePost`/`deletePost` server actions in client
     components that fire `trackEvent` on success). This avoids any
     server-side PostHog use and matches the plan's "no posthog-node" choice
     more honestly.
  3. **Guard `trackEvent` with `typeof window`** — change `trackEvent` to
     `if (typeof window === "undefined") return;` before calling
     `posthog.capture`. This makes the no-op explicit and prevents crashes,
     but does not deliver the events from server actions — so it just
     silences the bug.
  Option 1 is the only one that actually delivers server-side events.

---

### BLOCKER 3 — `createPost` emits `post_published` even for drafts
- **File**: `src/lib/actions/posts.ts:107-117`
- **Evidence**:
  ```ts
  export async function createPost(data: {
    ...; status: "draft" | "published"; ...
  }) {
    ...
    await db.insert(posts).values({ id, ..., status: data.status, ... });
    revalidatePath("/cms/posts"); revalidatePath("/blogs");
    trackEvent("post_published", { postId: id });   // <-- line 116
    return { id, slug };
  }
  ```
  The `trackEvent("post_published", ...)` fires unconditionally after the
  insert, regardless of whether `data.status === "draft"`.
- **Impact**: The PostHog event stream will record every draft save as a
  "post published" event. The metric becomes meaningless for measuring
  publishing throughput.
- **Suggested fix**: Gate the event on status, e.g.
  ```ts
  if (data.status === "published") trackEvent("post_published", { postId: id });
  ```
  Also consider emitting a separate `post_drafted` event if draft-saves are
  worth tracking.

---

### WARNING 1 — `Sentry.setExtras` mutates the current scope, not the event
- **File**: `src/lib/sentry-helpers.ts:13-21`
- **Evidence**:
  ```ts
  export function captureException(error, context?) {
    if (context) Sentry.setExtras(context);
    Sentry.captureException(error);
  }
  ```
  `Sentry.setExtras` sets extras on the current isolation scope, where they
  persist for the lifetime of the scope (i.e. the rest of the request). Any
  subsequent `Sentry.captureException` call without context still attaches
  those extras.
- **Impact**: In a route handler that calls `captureException(err, { route:
  "upload" })` and later captures another error (e.g. via the global error
  boundary), the second event will inherit `route: "upload"` from the first.
  This is most acute inside the upload route, where the only
  `captureException` call happens to be followed by a return, but the pattern
  is fragile.
- **Suggested fix**: Use the event-scoped form, either:
  ```ts
  Sentry.captureException(error, context ? { extra: context } : undefined);
  ```
  or
  ```ts
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
  ```
  The first is the minimal change.

---

### WARNING 2 — `posthog-js@^1.280.0` is the legacy v1 line, not v3+
- **File**: `package.json:34`
- **Evidence**: `node_modules/posthog-js/package.json` resolves to `1.396.2`.
  The PostHog team rewrote the SDK as `posthog-js` v3 in late 2024 specifically
  to support React 19 / Next.js 15+ (App Router patterns, `use client`
  semantics, server-component isolation). v1.x is the legacy line that pre-dates
  that rewrite.
- **Impact**:
  - Build passes (the code is forgiving enough to compile).
  - The PostHogProvider pattern in `src/providers/posthog-provider.tsx` uses
    `<Suspense>`-wrapped hooks, but the underlying v1 library's
    `PHProvider` may not be fully React 19 / Next.js 16 compatible.
  - Likely symptoms in production: missing client-side pageview events,
    "two copies of React" warnings, or hydration mismatches. Hard to predict
    without a real PostHog key.
- **Suggested fix**: Bump to `posthog-js@^3` (the major PostHog released for
  React 19 support) and re-verify the build. The provider shape stays the
  same.

---

### WARNING 3 — `Sentry.setUser` is invoked inside `getServerSession`, which is cached
- **File**: `src/lib/auth/get-session.ts:5-17`
- **Evidence**:
  ```ts
  export const getServerSession = cache(async () => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) setSentryUser({...});
    else clearSentryUser();
    return session;
  });
  ```
  React's `cache` memoizes per-request, so the function body runs at most once
  per request. That is fine for the `setSentryUser`/clear branch.
  However, `setSentryUser` is called only when this function is invoked. Any
  request that does not call `getServerSession` (e.g. an unauthenticated
  public page hit) inherits whatever user was set by the previous request in
  the same Node worker. The Next.js Sentry SDK uses AsyncLocalStorage to
  isolate scopes per request, but `Sentry.setUser` writes to the *current*
  scope, which is the per-request scope — so in practice this should be OK.
- **Impact**: Low in practice (Sentry's per-request scope isolates
  automatically). But the implicit "every server request must call
  `getServerSession` or have stale user data" invariant is fragile. The plan
  also notes this is acceptable. Flagging as a soft warning because the
  pattern depends on Sentry SDK behaviour that isn't visible from the code.
- **Suggested fix**: If we want hard isolation, call `clearSentryUser()` at
  the top of `getServerSession` before the `if` branch, or move user
  identification into Next.js middleware so it runs once per request
  regardless of which downstream handler is invoked. Not required to ship.

---

### WARNING 4 — `button-signout.tsx` uses `redirect()` from `next/navigation` inside an event handler
- **File**: `src/app/(routes)/(auth)/components/button-signout.tsx:7,22`
- **Evidence**:
  ```ts
  import { redirect } from "next/navigation";
  ...
  onSuccess: () => {
    trackEvent("user_signed_out");
    resetAnalytics();
    clearSentryUser();
    setIsPending(false);
    redirect("/");
  },
  ```
  `redirect` from `next/navigation` works by throwing `NEXT_REDIRECT`, which
  Next.js intercepts to perform navigation. In a client-component event
  handler, this works but is fragile: it throws across any code that may be
  added later in the same callback, and `setIsPending(false)` immediately
  before the throw is wasted work. The idiomatic client-side approach is
  `useRouter().push("/")` or `useRouter().replace("/")`.
- **Impact**: Cosmetic / fragile pattern. Will work today, may surprise future
  maintainers.
- **Suggested fix**: Replace the `redirect` import with `useRouter()` and
  `router.replace("/")`. Becomes a NIT once the BLOCKER-1 wiring is fixed
  anyway.

---

### WARNING 5 — Validation errors in upload route are returned with status 400 but not captured
- **File**: `src/app/api/upload/route.ts:23-33`
- **Plan reference**: Chunk 4 — "capture upload failures to Sentry".
- **Evidence**: The validation branches (no file, too large, invalid type)
  return `400` responses and track `file_upload_failed` but never call
  `captureException`. The user-upload-error branch (line 50-52) does call
  `captureException(uploadError, { route: "upload", step: "supabase_upload" })`
  before returning 500.
- **Impact**: This is what the plan intends — validation errors are expected
  outcomes, not exceptions, so they should not show up in Sentry's issue
  stream. Flagging as a WARNING because the user-supplied reason
  (`uploadError.message`) is forwarded into `trackEvent` properties without
  sanitisation, which could PII-leak server error text into PostHog.
- **Suggested fix**: Either accept the current behaviour (validation errors
  intentionally do not reach Sentry) or add a one-line confirmation comment
  in the upload route. The `uploadError.message` is low-risk for Supabase
  errors but worth a `String(uploadError.message).slice(0, 200)` cap to
  avoid runaway property values.

---

### NIT 1 — Error boundaries use inconsistent styling
- **Files**: `src/app/error.tsx` (Tailwind classes via `<Button>`), `src/app/global-error.tsx` (inline styles).
- The plan describes both as styled with Tailwind (`<Button>` from
  `@/components/ui/button`); `global-error.tsx` cannot use the project's
  Tailwind setup because the root layout is bypassed, so inline styles are
  the standard escape hatch. Acceptable, but worth noting for design review.

### NIT 2 — `next.config.ts` uses nested `sourcemaps.disable` vs plan's flat `disable`
- **File**: `next.config.ts:9-11`
- **Evidence**:
  ```ts
  export default withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    widenClientFileUpload: true,
    sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  });
  ```
- **Plan reference**: Plan shows `disable: !process.env.SENTRY_AUTH_TOKEN` as
  a top-level option.
- **Resolution**: The implementation is correct for `@sentry/nextjs` v9.47.1
  (resolved in `node_modules`). The `disable` flag moved under `sourcemaps`
  in v9. Implementation matches the SDK's actual API; plan text was just out
  of date.

### NIT 3 — `PostHogPageview` does not include referrer / properties
- **File**: `src/providers/posthog-provider.tsx:11-23`
- Only `$current_url` is forwarded. PostHog recommends also forwarding
  `$referrer` and `$referring_domain` for funnel analysis. Optional.

### NIT 4 — `signin/form.tsx` does not call `identifyUser` after success
- **File**: `src/app/(routes)/(auth)/signin/form.tsx:39-45`
- `trackEvent("user_signed_in", { method: "password" })` fires on success,
  but `identifyUser(...)` is never called. PostHog will record
  `user_signed_in` as an anonymous event and won't tie it to the user's
  profile unless the server `setSentryUser` flow is mirrored client-side via
  `identifyUser`. The plan does not require this, so flagging as NIT.

### NIT 5 — Plan said `<PostHogProvider>` wraps `<ThemeProvider>`; actual nesting is reversed
- **Files**: `src/providers/index.tsx:9-18`
- **Plan text**: *"mount `<PostHogProvider>`"* with example showing
  `<PostHogProvider>` *inside* `<ThemeProvider>` — but then re-checking the
  plan it actually shows `<PostHogProvider>` as a sibling of `<ThemeProvider>`.
- The implementation places `<PostHogProvider>` inside `<ThemeProvider>`.
  Functionally equivalent for both providers (no shared context dependency),
  but worth flagging if the plan intended the opposite.

---

## Plan adherence summary

| Plan item | Status |
|---|---|
| Root `instrumentation.ts` | OK |
| Root `instrumentation-client.ts` + `onRouterTransitionStart` export | OK |
| `sentry.server.config.ts` / `sentry.edge.config.ts` | OK |
| `next.config.ts` wrapped by `withSentryConfig` | OK (NIT 2) |
| `instrumentation.ts` is at root, not in `src/` | OK |
| `src/app/error.tsx` calls `Sentry.captureException` | OK |
| `src/app/global-error.tsx` calls `Sentry.captureException` + own `<html>` | OK |
| `src/providers/posthog-provider.tsx` initialises via `posthog.init` | OK (init moved into `useEffect` — better than plan, avoids SSR crash) |
| `<Suspense>` wraps `useSearchParams()` | OK |
| `trackEvent` typed API + `AnalyticsEvent` union | OK |
| `get-session.ts` calls `setSentryUser` | OK (WARNING 3) |
| Sign-out calls `resetAnalytics` + `clearSentryUser` | **FAIL — BLOCKER 1** |
| Server actions track on success | **FAIL — BLOCKER 2 (runtime) + BLOCKER 3 (drafts)** |
| Upload route captures exceptions + tracks `file_upload_failed` | OK (WARNING 5) |
| `env.example` includes all required vars | OK |
| `package.json` includes `@sentry/nextjs@^9` and `posthog-js@^1.280.0` | OK (WARNING 2 — version drift) |

---

## Verification I could not complete

`pnpm run lint` failed to run in the review environment because pnpm aborted
its install check (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`) and the
follow-up `CI=true pnpm run lint` exceeded the 120s shell timeout. Build
artefacts in `.next/server/chunks/ssr/` were inspected instead and confirm
the BLOCKER 2 finding (posthog-js is bundled into the Node chunks and
`trackEvent` calls `posthog.capture` server-side). The user-reported
`pnpm run build` success is taken as given per the task brief.

---

## Recommended fix order

1. Wire `trackEvent("user_signed_out")` + `resetAnalytics()` +
   `clearSentryUser()` into `cms/sidebar.tsx`'s `handleSignOut.onSuccess`.
   (BLOCKER 1)
2. Add `posthog-node` and split `trackEvent` into client/server variants, OR
   move the server-action success-tracking to client components that wrap
   the actions. (BLOCKER 2)
3. Gate `trackEvent("post_published", ...)` in `createPost` on
   `status === "published"`. (BLOCKER 3)
4. Replace `Sentry.setExtras` with the event-scoped form in
   `src/lib/sentry-helpers.ts`. (WARNING 1)
5. Bump `posthog-js` to `^3`. (WARNING 2)
