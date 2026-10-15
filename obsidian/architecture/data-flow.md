---
tags: [architecture, stable]
updated: 2026-10-15
---

# Data Flow

How state, scroll position, and animation data move through the app. There is no
server data layer yet — all "data flow" here is **client-side UI state**.

## Provider hierarchy (fixed order)

The root layout (`src/app/layout.tsx`) wraps everything in this exact order.
**Do not reorder** — see [[decisions-log]].

```
<html> <body>
  <ScrollLayout>        ← Lenis smooth scroll + scroll state store
    <LazyCookie />      ← cookie consent banner + preferences modal
    {children}          ← the routed page
  </ScrollLayout>
</body> </html>
```

## Scroll state — Zustand store

The scroll store (`src/hooks/smooth-scroll/use-scroll.ts`) is the one piece of
global state. Shape:

```ts
{
  lenis: Lenis | null      // the Lenis instance
  setLenis(...)            // setter
  isEnableScroll: boolean  // is scrolling currently allowed?
  start()                  // enable scroll
  stop()                   // disable scroll (e.g. modal open)
}
```

### Flow

```
ScrollController (in ScrollLayout) mounts
   │
   ├─ new Lenis()  →  setLenis(instance)   ──► store.lenis
   │
   ├─ requestAnimationFrame loop  →  lenis.raf(time)   (continuous)
   │
   └─ watches store.isEnableScroll:
         true  → lenis.start() + native scroll on
         false → lenis.stop()  + native scroll locked (html overflow:hidden)
```

Any component reads/writes scroll state through the store:

```ts
const lenis = useScroll((s) => s.lenis)
const [start, stop] = useScroll(useShallow((s) => [s.start, s.stop]))
```

See [[smooth-scroll]] for the full API.

## Animation data flow

Animation values never live in React state — they live in **springs**.

```
Component renders with from / to props
   │
   ▼
@react-spring/web useSpring  →  animated values (outside React render cycle)
   │
   ▼
Trigger source updates the spring:
   ├─ IntersectionObserver   → <Inview>, <Spring>     (enter viewport)
   ├─ scroll position        → <SpringTrigger>        (scroll progress)
   ├─ mouse events           → <Hover>                (pointer enter/leave)
   └─ scroll position        → <TextEngine mode="progress">
   │
   ▼
animated.<tag> applies values directly to the DOM node — no re-render
```

Global animation behaviour (mobile disable, breakpoint) is read from
`src/lib/springs/config.ts` — see [[animation-system]].

## Page data flow

```
app/page.tsx  →  views/home.tsx  →  composed components
```

Per the [[component-conventions]]:
- **No hardcoded content** in components — data comes from props or hooks.
- Placeholder data → `src/data/mocks/<page>.ts`, passed via props.
- Async data → custom hook in `src/hooks/`; component handles `loading` / `error`
  / `empty` with skeleton loaders. See [[components/common]].

## Server / external data flow

External APIs are reached **only** through server code — the browser never
calls a third party directly or holds a secret.

```
Server Component         →  reads data at render time (no client request)
Client Component         →  apiFetch('/api/…')  →  app/api/**/route.ts  →  upstream
app/api/**/route.ts      →  validates (zod) → does the work → { data } | { error }
```

Secrets live in unprefixed env vars, read via `getServerEnv()` inside route
handlers. Full convention: [[api-architecture]].

## The cached admin table — one download, then no requests

ADR-0044 adds a second read path for **three tables only** (`stemfest`, `sms`,
`attendance` — the last added with ADR-0045). The rule
above still holds for every write and for every other surface; this is a browser holding
a copy of a list it is allowed to read, not a browser reaching a database.

```
/admin/science-competition (RSC)  →  searchStemfestRegistrations + getStemfestStats
        │  renders page 1 and the eight figures from Postgres, as it always did
        ▼
StemfestListProvider ("use client")
        ├─ useSnapshotCache ─→ requestIdleCallback ─→ GET /api/admin/snapshot/stemfest
        │       no-store · requireAdmin · REPORT_ROW_LIMIT cap · stamped with the admin
        │       └→ IndexedDB `snapshots` (12 h, per-admin, version-checked)
        │       └→ every 60 s: ?probe=1  →  append ?since=  |  refetch
        ├─ queryStemfestLocally(rows, state)  →  rows · total · page · stats
        ├─ useAdminFilters({ transport })     →  setApplied + window.history, no request
        └─ useOptimisticWrites                →  patch now → action in background → retry
                                                └→ IndexedDB `pending`
```

Three properties the shape is chosen for:

- **First paint is unchanged and correct.** The Server Component still renders page 1 and
  the cards, so a page with JavaScript off, or before the download lands, says exactly what
  it used to. Nothing is hidden behind the cache.
- **No cache is the old code path.** Until the copy lands — and forever, on a browser that
  will not open IndexedDB, on a dead connection, or on a source that is not one of the two —
  `transport` is `undefined`, the props are returned verbatim and the router navigates. That
  is why there is no feature flag: the degraded mode is the shipped mode.
- **A cached answer must equal the database's.** `local-query.ts` is a second implementation
  of the filter contract, so `pnpm verify:local-query` runs the real SQL builders and the
  matcher over the same live rows and compares total, page, the ordered id list and every
  figure. Reports and exports still read from SQL — they print up to 2 000 rows and must
  agree with the database rather than with one desk's cache.

The PII boundary: `force-dynamic` so no build output can hold a snapshot, `no-store` on
every response, a per-admin stamp so a shared laptop cannot hand over someone else's
participant list, 12-hour expiry (one shift), and a clear of the list store on sign-out and
on any 401 — while unsent writes are deliberately kept, because losing an admin's decision
is the failure this whole path exists to avoid.

## Hash-link scrolling

`ScrollController` watches `usePathname()`. If the path contains a `#hash`, it waits
300 ms then calls `scrollTo(hash, true)` so smooth scroll lands on the target.

## Related

[[system-overview]] · [[smooth-scroll]] · [[animation-system]]
