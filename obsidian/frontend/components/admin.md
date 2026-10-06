---
tags: [frontend, admin, stable]
updated: 2026-10-06
---

# Catalog — Admin Components

The pieces the admin panel is assembled from, in `src/components/admin/`: the shell and
its navigation, the page header, metric blocks and charts, and the tables' filter and
export machinery. They hold no copy and know no filter: everything they display comes from
an `AdminSourceConfig` in `src/lib/admin/filters.ts`, the plain data in `src/lib/admin/`,
and the `AdminFilterControls` returned by `useAdminFilters`. See
[[admin/filters-reports]] for the whole contract, [[component-conventions]] for
the house rules.

| File | Export | Props | Role |
|------|--------|-------|------|
| `admin-shell.tsx` | `AdminShell` | `user`, `children` | The full-viewport frame: rail + content, `data-admin`, the `[data-admin]` token scope, the mobile drawer, and ⌘K / Ctrl-K. Owns palette focus management — it saves the focused element, hands the palette `open`, and restores focus on Escape |
| `sidebar.tsx` | `AdminSidebar` | `user`, `className?`, `onSearch`, `collapsible?` | The rail: `ADMIN_NAV_GROUPS` from `src/lib/admin/nav.ts`, one accent per section, an active state, a search button that opens the palette, a user/account block with sign-out, and a collapse to an icon rail remembered in `localStorage` under `admin-rail-collapsed`. `collapsible={false}` in the mobile drawer, where an icon-only rail is unusable. Tooltips carry the label when collapsed. `data-print="chrome"` so it never prints |
| `command-palette.tsx` | `CommandPalette` | `open`, `onClose` | The search-over-navigation dialog: `ADMIN_ACTIONS` + `PALETTE_TARGETS` ranked by name, then keyword, then path; arrow keys and Enter, `role="dialog"` + `aria-modal`, an inert background, and it renders nothing when closed |
| `page-header.tsx` | `PageHeader` | `eyebrow?`, `title`, `description?`, `icon`, `action?`, `className?` | Every admin page's masthead: a washed, edge-marked band with an uppercase overline + icon chip, a display `<h1>`, a one-line description, and a right-aligned action slot. The title is always ink — the accent is identity, not something to read a heading through |
| `stat-card.tsx` | `StatCard` | `label`, `value`, `note`, `icon`, `tone` | A metric block: figure in `font-mono tabular-nums`, an icon chip on the tone's accent, a sparkline of the series behind it. `Panel` (same file) is the plain content container — title, optional note, optional action, an `admin-wash-head` head with a 2px accent edge; charts and tables sit in it, never in each other |
| `charts.tsx` | `Sparkline`, `RankedBars` | `values`/`tone`; `items`/`tone?`/`ariaLabel?` | A 24-unit area line (clip-path fade, `vector-effect` stroke so it keeps 1.5px when stretched) and a ranked list where each row is its own bar — for labels a column chart would have to abbreviate. `RankedBars` is a `<ul>` of labelled figures; the bar is decoration, the number is the data |
| `activity-chart.tsx` | `ActivityChart` | `points`, `series`, `ariaLabel`, `className?` | The registration trend: stacked series over local days, a y-axis whose ceiling rounds up to four even steps, faint gridlines, day labels on the x-axis, and a hover crosshair that names the day and every series in it. The plot's own minimum width is `max(34rem, days × 12px)`, so a 90-day span scrolls rather than shrinking the bars below the pointer that has to land on them. `ariaLabel` says what the plot shows for readers who cannot see it |
| `range-segments.tsx` | `RangeSegments` (+ `TREND_RANGE_PARAM`) | `value`, `basePath` | The trend's 7 / 30 / 90-day segmented control: three `Link`s on a track with `aria-current="true"` on the selected one, so the span lives in the URL and the whole thing renders with zero client JavaScript — and the back button works on it. Server component, no `"use client"`. `shrink-0` and no `flex-wrap`: half a control on one line and half on the next is not a segmented control |
| `donut-chart.tsx` | `DonutChart` | `slices`, `ariaLabel`, `centerValue`, `centerCaption`, `className?` | Part-to-whole as a ring with the key figure in the middle; hovering a slice dims the rest and highlights its legend row. Slices take `tone`, so payment statuses use the status inks, not the accents |
| `recent-registrations-table.tsx` | `RecentRegistrationsTable` | `rows: RecentStemfestRegistration[]` | The dashboard's activity feed as a real table, extracted from `admin/page.tsx` so `/admin-preview` can render it — one of the five tables that must scroll horizontally on a phone, and an inline-only table cannot be checked without an admin session |
| `row-disclosure.ts` | `adminRowDisclosure` | `expanded`, `onToggle`, `detailId` | The props that make a table row a keyboard-accessible disclosure: `tabIndex`, Enter/Space, `aria-expanded`, `aria-controls`, and a click that ignores controls inside the row. Returns a `Pick<HTMLAttributes<HTMLTableRowElement>, …>`, so a row cannot drift into an inaccessible shape |
| `filter-bar.tsx` | `FilterBar` | `source`, `state`, `controls` | Search box, the `primary` filters, sort, the **Export** dialog, chips, and **More filters** for the rest |
| `filter-controls.tsx` | `FilterField` | `field`, `value`, `onChange`, `immediate?` | One control, chosen by `field.kind` — text, select, date or number — plus the **comparison picker** for a text or select field (Contains / Is exactly / Does not contain). It hands back the operator and value **encoded** as the URL carries them, so nothing above it knows an operator is a prefix. `immediate` commits every keystroke instead of debouncing, for the export dialog. A `select` whose options carry a `group` renders one `<optgroup>` per heading, in first-appearance order — the event filter's eleven options under their four segments |
| `styles.ts` | class strings | — | The panel's shared classes: `adminPanel`, `adminPanelHead`, `adminChipSolid` / `adminChipSoft`, `adminLabel`, `adminControl`, `adminButton(Primary)`, `adminTextButton`, `adminTableScroller`, `adminTh`, `adminTd`, `adminTdFigures`, `adminRow` / `adminRowOpen`, `adminTag`, `adminDetailGrid/Label/Value`. Plain strings, resolved by Tailwind's scanner like any other source — and deliberately accent-free: they read `bg-admin-accent-soft`, so one class works in every section |
| `pagination.tsx` | `Pagination` | `page`, `totalPages`, `onPage` | Footer pager; renders `null` at one page so a short list has no dead controls |
| `export-dialog.tsx` | `ExportDialog` | `source`, `state` | The **Export** button and the modal it opens: format, fields, filters, and the two ways an export leaves |
| `export-format-choice.tsx` | `ExportFormatChoice` | `value`, `onChange`, `firstOptionRef` | PDF / Excel radios, each with the note saying what will actually happen |
| `export-field-list.tsx` | `ExportFieldList` | `columns`, `selected`, `onToggle`, `onSelectAll` | The report's columns as checkboxes, in the order the report prints them |
| `export-filter-fields.tsx` | `ExportFilterFields` | `source`, `query`, `values`, `activeCount`, `onQueryChange`, `onValueChange`, `onClearAll` | Every filter the source has, plus the search box |
| `auto-print.tsx` | `AutoPrint` | — | Opens the print dialog once the report has settled — first `load` (its rows stream in behind `admin/loading.tsx`, so the document is still being written when this effect runs), then `document.fonts.ready`. Renders nothing (`print=1`) |
| `report-print-button.tsx` | `ReportPrintButton` | — | `window.print()`. The only script on the report page |
| `admin-empty-state.tsx` | `AdminEmptyState` | `icon`, `label`, `onClearAll?` | Empty-table state; offers **Clear all filters** when filters are what emptied it |

## The panel's data modules (`src/lib/admin/`)

Components take content from plain modules, never hardcode it. These are importable by
Server Components, client leaves and the export path — none reads `env`, the database or
`next/headers`.

| Module | Exports | Role |
|--------|---------|------|
| `accents.ts` | `ADMIN_ACCENTS`, `SECTION_ACCENT`, `CHART_TONE_ACCENT`, `accentForTone()`, `adminAccentStyle()` | One hue per section, scoped as three custom properties (ADR-0036). The only place a hue is named |
| `nav.ts` | `AdminNavEntry`, `AdminNavGroup`, `ADMIN_NAV_GROUPS`, `ADMIN_NAV_ENTRIES`, `ADMIN_ACTIONS`, `PALETTE_TARGETS` | The rail's groups, and the same entries plus the page-level actions as the command palette's index. One table, two surfaces, so the palette can never offer a page the rail hides |
| `brief.ts` | `RegistrationBrief` and friends, `summarizeTrend()`, `toMovementRows()`, `referrerKindOf()`, `estimateNextDay()` | The printable brief's shape and all of its arithmetic: window comparison, direction, referrer kind, the least-squares next-day estimate (ADR-0038). Pure, so `pnpm db:verify` can assert the same numbers the page prints |
| `statuses.ts` / `dashboard.ts` | pill classes, `ChartTone`, `chartToneVar`; `DASHBOARD_TREND_DAYS`, `TREND_RANGES`, `parseTrendRange` | Status colour as a pastel pair; chart tones, where `green`/`yellow`/`red` stay status inks and the rest resolve to accents. The trend span lives here, not in `src/lib/actions/registrations.ts`, because a `"use server"` module may only export async functions. `parseTrendRange` degrades an unknown `?days=` to the default rather than to an empty chart |

## How they fit together

Every table page is a Server Component that parses the query string and fetches
its page of rows; the table itself is the client leaf:

```
page.tsx (server)                 table.tsx (client leaf)
  parseAdminQuery(source, sp)  →    useAdminFilters({ basePath, state })
  searchXRegistrations(state)  →      <FilterBar source state controls />
  rows / total / page / pages  →      <AdminEmptyState … />
                                      <Pagination page totalPages onPage={controls.goToPage} />
```

Two details that are easy to lose in a refactor:

- **Pending state dims, it does not blank.** Each table wraps its rows in a
  `div` that goes `pointer-events-none opacity-50` while `controls.isPending`,
  so the admin sees the old rows fade rather than the table disappear.
- **Every control is a real element.** `button` for actions, `Link` for
  navigation, labelled inputs — the filter bar is keyboard- and
  screen-reader-navigable, and each chip names itself
  (`aria-label="Remove filter: Shift — Morning"`).

## Admin visual language

The panel was rebuilt on 2026-10-05 (ADR-0034) as a warm-monochrome working surface,
deliberately *not* the public site's dark space theme, and reworked on 2026-10-06
(ADR-0036/0037) into one that also tells you which section you are in: the neutrals and
status pastels are untouched, and a per-section accent plus a gradient layer sit on top.
The rules live in two places — the tokens in `globals.css` and the class strings in
`src/components/admin/styles.ts` — so a new admin component copies a class, not a palette.

**Fonts (the same three the public pages load, reused by role):**

| Role | Class | Face |
|------|-------|------|
| UI, labels, body, buttons, table cells | `font-space-body` | DM Sans — the face the site shell sets on itself |
| Headings — page titles, panel titles, dialog titles | `font-space-display` | Cormorant Garamond, at weight 500 with tight tracking |
| Identifiers and figures — codes, TrxIDs, amounts, timestamps | `font-mono` | Geist Mono, `tabular-nums` |

The shell sets `[data-admin]`'s `font-family` to DM Sans and **recomposes
`--font-mono` there**: `--font-mono` is declared on `:root` as
`var(--font-geist-mono)` while Geist Mono's own variable is set on `<body>`, so
up at the root the chain resolves to nothing and `.font-mono` falls back to the
browser's default serif. Inside the panel both halves are in scope, so `font-mono`
finally renders Geist Mono. The same rule also raises lucide's stroke to 2.25 for
every admin icon (`[data-admin] .lucide`), since a 2px stroke reads thin at the
panel's sizes.

**Tokens** — `--admin-*` in `globals.css`, mapped to `bg-admin-*` / `text-admin-*` /
`border-admin-*` utilities:

| Token | Value | Used for |
|-------|-------|----------|
| `--admin-canvas` | `#f7f6f3` | The shell behind the cards — flat, never graded |
| `--admin-surface` | `#ffffff` | Cards, tables, dialogs, controls |
| `--admin-sunken` | `#fbfbfa` | A closed row's hover, quiet chips |
| `--admin-line` | `#eaeaea` | Every border and divider |
| `--admin-ink` / `--admin-ink-soft` / `--admin-muted` | `#111111` / `#2f3437` / `#6d6c69` | Primary text / data text / secondary text — 12.6:1 and 5.25:1 on a card, both clear of WCAG AA at the panel's 12–15px sizes (ADR-0034, amended 2026-10-06) |
| `--admin-{positive,info,warn,danger,neutral}-{bg,ink}` | pastel wash + its ink | Status pills and tone marks — the only place status colour lives |
| `--admin-accent-{teal,violet,amber,rose,emerald,azure}` + `-soft` / `-ink` | e.g. `#0f7c86` / `#e2f2f1` / `#0b5c64` | The six section hues, each as a triple: solid for rules and markers, `-soft` for the wash it sits on, `-ink` for text on white. Chosen in the same hue family as the club's `--manara-*` brand colours, pushed dark enough to read as ink on bone |
| `--admin-accent` / `-soft` / `-ink` | teal by default | The **live** triple. A section re-points it with `adminAccentStyle()`; everything below reads these three |
| `--admin-wash-masthead`, `--admin-glow-masthead`, `--admin-wash-head`, `--admin-edge-accent`, `--admin-fill-accent`, `--admin-fill-ink`, `--admin-sheen` | `color-mix()` of the live triple | The gradient layer (ADR-0036) |
| `--sh-admin-hover` / `--sh-admin-dialog` | `0 2px 8px rgba(0,0,0,0.04)` / `0 2px 16px rgba(0,0,0,0.06)` | A card's hover lift, a dialog's elevation |

Components never reference a gradient variable directly — they take the `@utility` wrapper:
`admin-wash-masthead` (page header), `admin-wash-head` (panel head, table head band),
`admin-edge-top` (the 2px accent edge on a panel), `admin-fill` / `admin-fill-ink` (a solid
accent surface, lit), `admin-sheen` (a lit face over a colour set elsewhere — a chart bar's
volume). One `adminAccentStyle()` call on a section root therefore re-colours its masthead,
its heads, its edges and its chart fills at once, and no component below knows the word
"accent".

Colour still carries meaning first: a payment status is a `--admin-{positive,info,danger}`
pair from `src/lib/admin/statuses.ts`, never an accent; the accent answers *where am I*, the
pastel answers *how is it doing*. `chartToneVar` in `src/lib/admin/dashboard.ts` splits the
chart tones the same way — `green`/`yellow`/`red` resolve to the status inks, while
`teal`/`blue`/`purple`/`pink` resolve to section accents (`CHART_TONE_ACCENT`).

**Type ladder** (ADR-0037) — the panel restates Tailwind's three smallest steps on
`[data-admin]`: `--text-2xs` 12px, `--text-xs` 13px, `--text-sm` 15px, each with its own
line-height. Nothing in the panel renders below 12px, and `text-[Npx]` literals are banned;
if a step is missing, the ladder gets one. Figures use `font-mono` + `tabular-nums`.

**Shape rules:** panels and tables are `1px solid var(--admin-line)`, `rounded-[10px]`, no
resting shadow, and carry `admin-edge-top` so the section hue marks them; the page header is
`rounded-[12px]`; icon chips are 8px; controls and buttons 6px; *tags* are pills
(`rounded-full`, uppercase, `letter-spacing: 0.05em`). Buttons come in three ranks —
`adminButtonPrimary` (`admin-fill-ink`, white ink, brightens on hover and nudges on press),
`adminButton` (hairline outline) and `adminTextButton` (a quiet underlined link).

**Motion:** none of the site's scroll choreography. Transitions are discrete state changes
only, which is what hard rule #1 permits: `transition-colors` on hover and focus;
`transition-[box-shadow,transform]` for a stat card's 1px hover lift plus
`--sh-admin-hover`; `transition-[filter,transform,box-shadow]` on the primary button, which
brightens the whole gradient on hover and nudges `active:scale-[0.985]` on press;
`motion-safe:transition-[filter]` for a ranked bar's hover; a 150ms opacity fade on a
collapsed-rail tooltip. The command palette is the one place `motion/react` is used —
`AnimatePresence` on the backdrop and the panel — and it passes `initial={false}` and a
plain opacity exit whenever `useReducedMotion()` says so. Nothing is hidden behind an
animation: content is present with `prefers-reduced-motion` because it is present without
JS.

**Responsive:** `lg` is the navigation breakpoint. At `lg` and above the rail sits in flow
(`hidden lg:flex`) and collapses to an icon strip at the admin's choice; below it the same
`AdminSidebar` renders as a `collapsible={false}` drawer over the page, and a top bar with
menu and search buttons appears (`lg:hidden`). Search is reachable without opening the
drawer, because on a phone the rail is one tap and three keystrokes away. The shell is
`h-dvh overflow-hidden`, so `#admin-content` is always the only scroller and no page ends in
dead canvas. Dashboard grids stack one-per-row by default, `sm:grid-cols-2 xl:grid-cols-4`
for metric blocks and `xl:grid-cols-3` for the content grid. Every data table sits in
`adminTableScroller` with a `min-w-[44rem]`-style floor on the table, so narrow screens
scroll the table rather than crushing a name column; the scroller is `relative` because an
`sr-only` label inside a row would otherwise widen the page instead of scrolling it.

## Print hooks

Print behaviour is CSS keyed on `data-print`, never a `print:` utility class — that is what
lets it outweigh the flex/height/overflow rules already sitting on those elements. The
markers, all in `src/components/admin/`:

| Marker | Where | Effect |
|--------|-------|--------|
| `data-print="shell"` | `AdminShell` root | Unlocks the full-viewport frame: `display: block`, `height: auto`, overflow visible, white |
| `data-print="content"` | The content scroller | `flex: none` + overflow visible, so a printed page is not clipped at the last visible row |
| `data-print="chrome"` | `AdminSidebar`, the mobile drawer, the mobile top bar, `CommandPalette`'s overlay | `display: none` — navigation and dialogs never print |

The gradient layer is screen chrome: under `[data-print]`, any class containing
`admin-wash`, `admin-edge`, `admin-fill` or `admin-sheen` gets `background-image: none`, so
paper keeps the flat treatment it had before the layer existed while each surface's
`background-color` fallback carries on. Nothing new was needed for that — it is why the
components take utility wrappers rather than inline gradients.

The printable analytics brief lives at `/admin/reports/brief` (ADR-0038): five sections from
one server action, `data-print="report"` + `brief-document` on the document root, `@page
{ size: A4; margin: 0 }` with the document carrying its own 14mm sides, the type ladder
restated in pt, and `?print=1` mounting `<AutoPrint />`. The per-source table reports are
`/admin/reports/[kind]`. Both are documented in [[admin/filters-reports]] → "Printing".

## Related

[[admin/filters-reports]] · [[components/common]] · [[html-semantics]] ·
[[design-system]]
