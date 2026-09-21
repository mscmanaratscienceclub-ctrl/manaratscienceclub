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
| `useDebouncedValue` | `use-debounce.ts` | Returns `value` after it stops changing for `delay` ms (default 350) — debounces the admin search so one query fires, not one per keystroke |
| `useReducedMotion` | `use-reduced-motion.ts` | Honour `prefers-reduced-motion` — required by hard rule #1 before any animation |

### `useAdminFilters`

```ts
const controls = useAdminFilters({ sourceId: source.id, basePath: source.path, state });
```

Returns `AdminFilterControls`: `search` / `setSearch`, `setFilter(id, value)`,
`clearFilter(id)` (also accepts `q` for the search box), `clearAll`, `setSort`,
`goToPage`, `isPending` and `exportHref`.

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
- **`exportHref` is built from the *live* search box**, not the committed query,
  so exporting right after typing still includes the term being typed.

## Adding a hook

Place it under `hooks/<domain>/`. Data-fetching logic belongs in hooks, not in
presentational components. Use [[templates/hook-note]] to document it here.

## Related

[[animation-system]] · [[smooth-scroll]] · [[utils]]
