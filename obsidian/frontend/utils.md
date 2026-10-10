---
tags: [frontend, stable]
updated: 2026-10-06
---

# Catalog — Utilities

Pure helper functions in `src/utils/` (no side effects, unless noted). A few
live in `src/lib/` where they sit beside the layer they serve — those are marked.

## `src/lib/media.ts`

Storage URL building. No Supabase client and no secrets, so it is safe to import
from Server Components, client components and the data modules in
`src/lib/data` alike — `src/lib/supabase.ts` (which holds the service-role
client) re-exports all of it.

| Export | Purpose |
|--------|---------|
| `AVATARS_BUCKET` | the `avatars` bucket name |
| `PDFS_BUCKET` | the public `pdfs` bucket name (club documents) |
| `pdfUrl(path)` | **The only URL a page may link for a `pdfs` object.** Percent-encodes each path segment (the club's keys are its uploaded filenames, spaces and brackets included) and always appends `?download`, so Supabase answers `Content-Disposition: attachment`. Deliberately not an option: the CDN caches per full URL, so a page that also linked the bare form would store the same multi-megabyte PDF twice and pay a cold origin pull for whichever variant nobody had clicked |
| `storagePublicUrl(bucket, path)` | public CDN URL for any object |
| `bucketImage(path)` | URL for a **pre-optimised** WebP under `optimized/` — see [[decisions-log\|ADR-0025]] |
| `bucketOriginal(path)` | URL for an `avatars` object served exactly as uploaded — the verbatim fallback for a photo with no optimised WebP |
| `contentImage(path)` | **Egress switch for `src/lib/data`.** Names a content image by its *original* bucket path (`"adminimages/abrar.png"`) and returns the WebP the bucket script encoded for it (`optimized/adminimages/abrar.png.webp`, one-year cache — 9.4 MB → 28 KB). Already-small uploads (`.webp`/`.avif`) are served verbatim. The `<original>.<ext>.webp` suffix mirrors the optimizer's target convention; keep the two in step or the card 404s |
| `renderedImageUrl(url, { width, height?, quality? })` | rewrite a public object URL to Supabase's `/render/image/` endpoint so Supabase resizes it, not Vercel; returns non-storage URLs untouched. **Egress guard:** already-optimised (`optimized/*`) URLs are returned untouched. |
| `isOptimizedObjectUrl(url)` | `true` when a URL points at a pre-optimised WebP under `optimized/` |
| `avatarUrl(url, width)` | resolve a stored avatar to the cheapest correct URL — serve already-optimised/small uploads verbatim, only `render/image`-transform genuine legacy originals |

> [!warning] Egress: avoid `/render/image/` for objects you already control
> The `render/image` endpoint pulls the original back out of storage and re-encodes on
> **every request** — for a multi-megabyte legacy original on a busy blog page that is
> the single largest source of metered Supabase egress. Prefer `avatarUrl()` /
> `isOptimizedObjectUrl()` so already-final bytes are served directly, and pre-optimise
> write-time uploads instead of transforming on read.

The origin comes from `NEXT_PUBLIC_SUPABASE_URL`, so no component or data module
hardcodes the project host. Anything rendered through `bucketImage()` is already
the final bytes and is served with `unoptimized` on purpose.

## `is-bot.ts`

`isBot(): Promise<boolean>` — **server-only**. Reads the `user-agent` header,
returns `true` for crawlers/audit tools. Used to skip heavy animation for bots.
See [[seo-metadata]].

## `scroll-to.ts`

`scrollTo(id?, immediate?)` — programmatic scroll to an element id (string) or a
numeric position. Integrates with the Lenis [[smooth-scroll|scroll store]];
temporarily disables scroll state during the animation. Has `//if lenis` guards so
the Lenis dependency can be stripped if smooth scroll is removed.

## `math.ts`

| Export | Purpose |
|--------|---------|
| `SpringValues` | `Record<string, string \| number>` — the shape `from`/`to` take on every spring component |
| `transformRange(value, min, max, newMin, newMax)` | remap a value between ranges (clamped) |
| `lerp(start, end, t)` | linear interpolation |
| `debounce(fn, delay)` | debounce helper — **currently unused**; `useWindowSize` has its own inline timer |
| `interpolate(from, to, progress)` | interpolate a whole `SpringValues` bag, preserving CSS units and transform functions (`"10px"`, `"45deg"`, `"translate(10px)"`) |

`interpolate` is the scrub engine's workhorse — [[hooks|useSpringTrigger]] calls it
every frame in `mode="scrub"`. It is the one util inside the animation hot path, so
changes here are felt everywhere.

> [!note] Typed in the 2026-08-18 pass
> These signatures used `any` (a hard rule #7 violation, caught by
> `.claude/scripts/verify.sh` on its first run). `interpolate` now takes and
> returns `SpringValues`, which is exactly what its only caller already declared;
> `extractNumber` takes `unknown` and narrows by `typeof`; `debounce`'s generic
> constraint uses `(...args: never[]) => void`, the strict-safe idiom for
> "any function". No runtime behaviour changed.

## `lvh.ts`

CSS-string builders for viewport-height units with fallbacks
(`vh` → `lvh` → `calc(var(--vh) …)`): `heightLvh`, `minHeightLvh`, `marginTopLvh`,
`marginBottomLvh`. Solves mobile-browser viewport-height inconsistencies.

## `animation/coords.ts`

Element-coordinate helpers — `getElementCoords`, `getScrollCoordsFromElement` —
used internally by the scroll/animation system. Marked `@ts-nocheck`. `#do-not-modify`

## `seo/generate-page-metadata.ts`

`generateMetadata(props?)` — shared page-`Metadata` builder. `generateViewport()`
— the `Viewport` export (carries `themeColor`). See [[seo-metadata]].

## `seo/structured-data.ts`

`getSiteStructuredData()` — builds the `Organization` + `WebSite` JSON-LD graph
rendered by the root layout. See [[seo-metadata]].

## Adding a util

Keep utilities **pure** and side-effect-free (server-only ones like `isBot` are the
exception — note it clearly). Group by domain under `utils/<domain>/`.

## Related

[[hooks]] · [[seo-metadata]] · [[smooth-scroll]]
