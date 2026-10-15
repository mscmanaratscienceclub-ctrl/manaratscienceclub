---
tags: [frontend, stable]
updated: 2026-09-14
---

# Catalog — Hooks

Custom hooks in `src/hooks/`, grouped by domain.

## `hooks/animation/` — `#do-not-modify`

The hooks powering the [[animation-system]]. Consume them through the spring
components — don't call them directly unless extending the engine.

| Hook | File | Role |
|------|------|------|
| `useInViewRef` | `use-in-view-ref.ts` | IntersectionObserver ref for viewport detection |
| `useDynamicInView` | `use-dynamic-in-view.ts` | in-view detection with dynamic targets |
| `useLoopInView` | `use-loop-in-view.ts` | in-view tied to a render loop |
| `useProgressTrigger` | `use-progress-trigger.ts` | scroll → 0–1 progress (powers `<SpringTrigger>` / `<ProgressTrigger>`); returns `progress` as a `RefObject<number>` — read `.current` |
| `useSpringTrigger` | `use-spring-trigger.ts` | scroll-driven spring logic |
| `useLoop` | `use-render-loop.ts` | subscribes a callback to the shared rAF ticker (`src/lib/animation/ticker.ts`) |
| `useResizeLoop` | `user-resize-loop.ts` | runs a callback when window width changes (via `useLoop`) |

## `hooks/smooth-scroll/`

| Hook | File | Role |
|------|------|------|
| `useScroll` | `use-scroll.ts` | Zustand store for Lenis + scroll state — see [[smooth-scroll]] |

## `hooks/` (root)

| Hook | File | Role |
|------|------|------|
| `useWindowWidth` / `useWindowHeight` / `useWindowSize` | `use-window-size.ts` | SSR-safe window dimensions — all three share **one** debounced (300 ms) `resize` listener via a `useSyncExternalStore` store |
| `useAdaptiveGrid` | `use-adaptive-grid.ts` | Scales the root `<html>` font-size up while the viewport exceeds `baseWidth` — powers `<AdaptiveGrid>`, see [[components/common]] |

> [!note] Shared render loop
> Loop-based hooks (`useLoop`, `useResizeLoop`, `useLoopInView`, the trigger
> hooks) all subscribe to the single app-wide ticker in `src/lib/animation/ticker.ts`
> rather than each starting their own `requestAnimationFrame`. See
> [[animation-system]]. The ticker is **not** `#do-not-modify`.

## `src/lib/hooks/` — admin & feature hooks

Hooks the admin panel needs at a client leaf. They live beside `src/lib` rather
than under `src/hooks/` because they belong to a feature, not to the site's
motion/smooth-scroll layer — see [[admin/filters-reports]].

| Hook | File | Role |
|------|------|------|
| `useAdminFilters` | `use-admin-filters.ts` | Drives search, every filter, the sort and pagination through the URL — see below |
| `useSnapshotCache` | `use-snapshot-cache.ts` | Downloads, files, freshens and holds one table's browser cache — ADR-0044, see below |
| `useLocalStemfestTable` / `useLocalSmsTable` | `use-local-admin-table.ts` | Answer a query from that cache, or fall back to the server's page — see below |
| `useOptimisticWrites` | `use-optimistic-action.ts` | The write queue: patch now, send in the background, retry, roll back — see below |
| `useDebouncedValue` | `use-debounce.ts` | Returns `value` after it stops changing for `delay` ms (default 350) — debounces the admin search so one query fires, not one per keystroke |
| `useReducedMotion` | `use-reduced-motion.ts` | Honour `prefers-reduced-motion` — required by hard rule #1 before any animation |

### `useAdminFilters`

```ts
const controls = useAdminFilters({ basePath: source.path, state });
```

Returns `AdminFilterControls`: `search` / `setSearch`, `setFilter(id, value)`,
`clearFilter(id)` (also accepts `q` for the search box), `clearAll`, `setSort`,
`goToPage`, `isPending` and `exportState`.

It knows nothing about the source behind the table — it drives a URL, and the href
it builds is the whole of what it needs to know.

- **The URL is the state.** Every setter rebuilds it with `buildAdminHref` from
  `src/lib/admin/filters.ts` — the same function the pages and the report route
  parse with — so a filter can only mean one thing, and it is shareable and
  reloadable.
- **It skips no-op navigations.** `buildAdminHref` omits defaults and writes filter
  values in sorted key order, so two ways of reaching the same list produce
  byte-identical hrefs; the hook compares against the href it last sent. Without
  that, the debounced search box re-commits its own value on every server render
  and navigates in a loop.
- **A change lands on the state already in flight.** While a navigation is
  pending (`isPending`), `baseState()` is the state that was sent rather than the
  props the hook was last rendered with — the server state only arrives when its
  round trip finishes, so two changes inside one round trip would otherwise each
  derive from the state before either and the second would silently drop the
  first. `isPending` going false is what proves the sent state has been rendered,
  which is why clearing on it is safe.
- **Filters reset the page; pagination pushes history.** `setFilter` / `setSort` /
  the debounced search `replace` and go to page 1; `goToPage` `push`es so Back
  returns to the previous page of the same list.
- **`clearAll` keeps the sort.** The sort is how the admin is reading the list,
  not a criterion narrowing it, and resetting it under them is a surprise.
- **`exportState` is built from the *live* search box**, not the committed query,
  so an export opened right after typing still includes the term being typed — and
  from the in-flight state, so it also includes a filter still being fetched. It is
  a *state*, not a finished link, because the export dialog decides the columns and
  the format on top of it; only the dialog can put all three together.
- **Where the answer comes from is one optional argument.** `transport` (an
  `AdminQueryTransport`) is handed the state instead of the router, and the address
  bar is written through `window.history.pushState` / `replaceState`, which Next keeps
  in sync with `useSearchParams`. The submit stays inside the same
  `startTransition`, so `isPending` still flips and settles and every invariant above
  survives unchanged — including `exportState`, which still reports exactly what is on
  screen. Everything in this hook is about the URL; none of it is about where the rows
  come from, which is why adding a cache needed a seam rather than a rewrite.

### The cached-table trio — `use-snapshot-cache`, `use-local-admin-table`, `use-optimistic-action`

Three hooks, one per question, because they fail differently. Together they let
`/admin/science-competition`, `/admin/sms-logs` and `/admin/attendance` search, filter,
sort and paginate with **zero requests**, and still let a write through to the database
(ADR-0044; the sheet joined with ADR-0045).

```ts
const cache = useSnapshotCache<StemfestSnapshot>("stemfest"); // do I have the rows?
const table = useLocalStemfestTable({ source, state, registrations, total, page, totalPages, stats });
const writes = useOptimisticWrites({ source: "stemfest", patchRow: table.patchRow });
```

**`useSnapshotCache(source)`** owns the download. It starts at
`requestIdleCallback(timeout: 1500)` so it never competes with hydration; one
`inflight` Map per source dedupes a remount; it warms the *other* cached table if that
copy is over a minute old; it retries a failed download on a 30 s → 2 min → 10 min ladder
rather than hammering a dead pooler; and it polls every 60 s while visible (300 s hidden,
paused offline) to append new rows and refetch when the count shrinks or another admin has
decided something. `revision` moves **only** when the whole copy is replaced — a delta
append is the cache learning, not the matcher being wrong.

**`useLocalStemfestTable` / `useLocalSmsTable`** wrap a shared core that owns the *applied*
state, the handoff guard and the `transport`. Local mode takes over only after the local
query, run over the pristine download for the state the server just rendered, returns the
same total and the same ordered ids — which turns a matcher bug into a slow panel instead of
a wrong one. Navigations are adopted by comparing hrefs, so a document load, Back, a pasted
link or a `<Link>` all re-anchor the state while a soft commit does not. With no cache the
props come back verbatim and `transport` is `undefined`: **the fallback is the pre-existing
code path, which is why there is no feature flag.** Both hooks also recompute the figures
beside their table (eight stat cards, three tallies) from the cached rows, because a
decision made locally must not be contradicted by a card printed from before it.

**`useOptimisticWrites`** is the queue. It patches the row that is on screen — the cached
list, or the server's page in the seconds before a cache exists — files the write in
IndexedDB, then sends it outside any transition. Only a *network-level* failure retries
(jittered 1/4/12/30/60 s, gated on `navigator.onLine`, flushed on `online` and on the tab
becoming visible); a 200 with `ok: false` is a refusal, so the patch rolls back and the
server's own sentence is shown. `resendStemfestPaymentEmail` is `onceOnly`: it emails, so
after a reload it reads "Not saved · retry manually" and waits for a second click. It is
disabled entirely when `useAdminEmail()` is `null`, which is what keeps `/admin-preview`
from firing real writes — the picker still visibly works there, because that is what a
design surface is for.

Nothing in the trio runs without a signed-in admin, and nothing in it survives sign-out or
a 401 except the queued writes — see `src/lib/admin/idb.ts`.

## Adding a hook

Place it under `hooks/<domain>/`. Data-fetching logic belongs in hooks, not in
presentational components. Use [[templates/hook-note]] to document it here.

## Related

[[animation-system]] · [[smooth-scroll]] · [[utils]]
