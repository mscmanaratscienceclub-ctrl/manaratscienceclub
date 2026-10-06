---
tags: [admin, stable]
updated: 2026-10-06
---

# Admin filters & printed reports

The admin panel has four tables — Campus Ambassador, Science Competition
(STEM Fest), Volunteer and SMS Logs — plus a printable report for each. All five
surfaces read **one contract**: `src/lib/admin/filters.ts`. That module decides
what can be filtered, how a filter is written into the URL, and what the printed
report contains; the pages parse from it, the filter bar renders from it and the
report route honours it.

> [!important] Why one module
> A table's filters, its PDF export and its empty-state copy used to be three
> separately written things that could disagree — an export that silently
> ignored a filter, a "no results" message shown on an unfiltered table. Now the
> filter is applied by **the same WHERE builder** in
> `src/lib/actions/registrations.ts` for the list and for the report, so the
> rows on paper are the rows that were on screen when Export was pressed. See
> [[decisions-log]] (ADR-0029).

`filters.ts` is plain data and pure functions: it is imported by Server
Components *and* client leaves, so it must never read `env`, the database or
`next/headers`.

## Sources

| `id` | Route | Table component | Rows come from |
|------|-------|-----------------|----------------|
| `ambassador` | `/admin/campus-ambassador` | `registrations-table.tsx` | `searchAmbassadorRegistrations` |
| `stemfest` | `/admin/science-competition` | `science-competition-table.tsx` | `searchStemfestRegistrations` |
| `volunteer` | `/admin/volunteer` | `volunteer-registrations-table.tsx` | `searchVolunteerRegistrations` |
| `sms` | `/admin/sms-logs` | `sms-log-table.tsx` | `getSmsLogs` |

Each source also carries the copy that used to be scattered across pages:
`reportTitle`, `reportNote`, `searchPlaceholder`, `empty.{filtered,unfiltered}`,
`noun.{one,many}`, `listNote`, `sort` and `reportColumns`. Components never
hardcode that text — see [[component-conventions]].

`adminSources` is the registry; `adminSourceById(kind)` resolves the `[kind]`
segment of a report URL and returns `null` for anything unknown, which the route
turns into a `404`.

## URL contract

| Param | Meaning |
|-------|---------|
| `q` | Search box — matched against the columns that source's query searches |
| `sort` | One of `newest`, `oldest`, `name-asc`, `name-desc`, `amount-asc`, `amount-desc` |
| `page` | 1-based page of the table |
| `days` | Dashboard only — the activity chart's span: `7`, `30` or `90` |
| *(field id)* | One filter, e.g. `?from=2026-09-01&type=campus` |
| *(field id)*, prefixed | The same filter with an **operator**: `!value` for *not*, `=value` for a text field's *is exactly* |

The names `q`, `sort` and `page` are reserved (`FILTER_QUERY_PARAM`,
`FILTER_SORT_PARAM`, `FILTER_PAGE_PARAM`) and may not be a field id.

`buildAdminHref` writes `q` first, then the filter values in sorted key order,
then `sort` and `page`; `DEFAULT_SORT` and `page=1` are left out. The href is
therefore a function of the filter *set*, not of the order a caller assembled it:
the hook appends a newly-set filter to the end of its values object, so an
unsorted builder would serialise the same filters as `?school=x&type=campus`
while the page read them back as `?type=campus&school=x`. That byte-identity is
what stops the search box re-navigating forever — the hook's no-op guard compares
hrefs as strings.

`parseAdminQuery(source, searchParams)` drops anything invalid rather than
erroring: an unknown field id, a value outside a `select`'s whitelist, a
malformed date. A hand-edited `?page=999` lands on the last real page, not on an
empty one that would read as "no matches".

`days` is the odd one out: it is the dashboard chart's span, not a filter, so its
key (`TREND_RANGE_PARAM`) is declared beside the control in
`src/components/admin/range-segments.tsx` and `parseAdminQuery` never sees it.
Two guards keep a hand-edited value from breaking the page: `parseTrendRange`
degrades anything outside `TREND_RANGES` to `DASHBOARD_TREND_DAYS` — an empty
chart is a worse answer than a default one — and `getRegistrationTrend` clamps to
`7…90` whatever the caller passes. `pnpm db:verify` §3 then checks every offered
span against live data, both that the JS axis and the SQL window start on the same
local day and that every day bucket inside the window has a column on the axis.

## Filter kinds → SQL

`kind` fully describes the comparison, and the action layer implements exactly
these four — there is no fifth behaviour hiding in a component.

| `kind` | SQL | Notes |
|--------|-----|-------|
| `text` | `ILIKE '%value%'` on one column | Case-insensitive substring |
| `select` | case-insensitive equality | `Morning` = `morning` |
| `date` | inclusive day range | A `to` date covers that whole day |
| `number` | numeric bound | `min` is `>=`, `max` is `<=` |

Date bounds convert through `ADMIN_TIME_ZONE` (`Asia/Dhaka`) because the tables
store `timestamptz`. A bare date bound would be read as UTC and would split a
Dhaka calendar day at 6am local, so "registrations from 14 September" would
quietly mean 13 Sep 18:00 → 14 Sep 18:00. See `dayRange` in
`src/lib/actions/registrations.ts`.

Fields marked `primary: true` render in the always-visible row; the rest sit
behind **More filters**, which opens itself whenever a hidden filter is active so
a chip is never the only evidence of a filter that is narrowing the list.

## Operators

A `text` or `select` field compares through an **operator** as well as a value,
chosen in a small picker in front of the control (`filter-controls.tsx`):

| `kind` | Operators offered (default first) |
|--------|-----------------------------------|
| `text` | *Contains* (`similar`) · *Is exactly* (`is`) · *Does not contain* (`not`) |
| `select` | *Is* (`is`) · *Is not* (`not`) |
| `date` | none — the two bounds **are** the range |
| `number` | none — a bound is already the question |

**The operator rides on the value, not on a second parameter.** The URL contract
is unchanged: a value that is not the field's default is written with a
one-character prefix — `!` for `not`, `=` for a text field's `is` — so
`?school=!Manarat` reads "school does not contain Manarat" and
`?segment=!lfr` "did not enter LFR". Values are therefore stored
in `AdminQueryState.values` **exactly as the URL spells them**, and
`readFilterValue` (in `filters.ts`) is the single place that takes one apart:
only `parseAdminQuery`, the action layer, and the operator picker decode a prefix,
and only `encodeFilterValue` writes one.

Validation happens **after** the prefix is stripped, so a `select`'s whitelist
still sees the raw option value — `!verified` validates as `verified`, negated. A
value that does not decode is dropped rather than passed on: a filter this build
no longer recognises narrows nothing instead of reaching Postgres as a comparison
against a value no option offers.

The operator also shapes what a chip, the report's scope strip and the
spreadsheet's scope sheet say: `activeFilterList` renders the non-default
operators as a phrase, so a chip reads "School: does not contain Manarat" and the
printed report's *Active filters* line matches it character for character.

One deliberate asymmetry: a **negative** comparison on a `select` is SQL's plain
`<>`, so it excludes rows where that column is empty. The only nullable select in
the catalogue is the ambassador `gender`, where a row filed before the form asked
has no answer — "is not Female" excluding it is the honest reading, since an
unrecorded value is not a statement that the answer was something else.

## The event filter (STEM Fest)

`stemfest.segment` is a **select of every event the fest offers** — Mathematics,
Physics, Bio-Chem, General Science, Computer Science, LFR, Robosoccer, Project
Display, EA FC 26, Clash Royale, Minecraft — built from `stemfestEvents`, the same
catalogue the registration form's step 02 picks from, so every option here is
something somebody could actually have entered. It is a primary filter, and it is
also in `BULK_EMAIL_FILTER_IDS`, so the bulk-email audience gets the same dropdown.

The list is **grouped, not flattened**: each option carries a `group` naming its
parent segment, and `FilterField` renders one `<optgroup>` per heading — so an
admin narrows to "Mathematics" while still seeing which segment it belongs to.
`group` is presentation only: it never reaches the URL, and validation reads
`value` alone.

Two names survive from the older shape of this data, and both are deliberate:

- The **field id stays `segment`**, because that is the column these names are
  stored in and the query key links already use. Its *values* are event ids.
- The stored column holds the **events** a registration entered (`describeEntry`
  joins the parts of one entry with ` · ` and the entries with `, `), never a
  segment name. So `segmentMatch` in `src/lib/actions/registrations.ts` resolves
  the id through `getStemfestEvent()` and matches **that one name** with
  `ILIKE '%Event Name%'`; `not` keeps the rows that entered something else.

One substring match is only safe because no catalogue event name contains another,
and because every event the brief counts is reachable by that predicate — both are
asserted against the live table by `pnpm db:verify`, whose per-event counts use the
identical join. The old segment-level expansion helper `stemfestSegmentEventNames()`
is gone; nothing expands a segment into its events any more.

> [!note] It used to be free text, then four coarse options
> `segment` was a `text` filter until 2026-10-05, matched as `ILIKE '%value%'`
> against the same column. It became a select of the four **segments**, and on
> 2026-10-06 the select of every **event**. A bookmark from either earlier shape
> (`?segment=Robotics`, `?segment=olympiads`) no longer validates and is dropped
> by `parseAdminQuery`, leaving the list unfiltered rather than erroring.
> `?segment=project-display` is the one that survives by coincidence: the event
> and its segment share an id, and the event name is the same text.

## Filter catalogue

| Source | Field id | Kind | Notes |
|--------|----------|------|-------|
| `ambassador` | `type` | select | `campus` · `batch` — primary |
| | `gender` | select | `male` · `female` · `other` — primary |
| | `firstTime` | select | `first-time` · `returning` — primary |
| | `from`, `to` | date | Submission range — primary |
| | `class`, `school` | text | Behind More filters |
| `volunteer` | `shift` | select | `morning` · `day` — primary |
| | `from`, `to` | date | Submission range — primary |
| | `classSection`, `roll`, `studentCode` | text | Behind More filters |
| | `attendanceWeek`, `parentsComfort`, `campusHesitation` | text | Free-text answers — behind More filters |
| `stemfest` | `payment` | select | `pending` · `verified` · `rejected` — primary, matched on the **effective** status |
| | `class` | select | From `stemfestClasses` — primary |
| | `school` | text | Primary, operators |
| | `from`, `to` | date | Submission range — primary |
| | `segment` | select | The fest's **events**, from `stemfestEvents` in `<optgroup>`s by segment — primary, operators. Label reads "Event"; the key stays `segment` |
| | `transactionId` | text | Behind More filters |
| `sms` | `status` | select | `matched` · `unmatched` · `ignored` — primary |
| | `sender` | text | Primary |
| | `from`, `to` | date | `receivedAt` range — primary |
| | `senderNumber`, `minAmount`, `maxAmount` | text / number | Behind More filters |

The STEM Fest `payment` filter is one `EXISTS` against a matched, forwarded
payment SMS — and the Verified/Pending pill in the table is resolved by **that
same expression in SQL**, so the pill and the filter can never disagree. It used
to be computed in JS from a second query for the TrxIDs on the current page,
which could only ever answer for rows already fetched and left the filter itself
inexpressible.

## Report columns

**This is the section `filters.ts` refers to.** `AdminReportColumn.id` is a plain
string on purpose: the query layer builds report rows as
`Record<string, string>`, keyed by these ids. **The ids below and the object
literals in `getAdminReportRows` (`src/lib/actions/registrations.ts`) must stay
in step** — TypeScript cannot check a `Record<string, string>` against a config
list, so a mismatch shows up as a blank column on paper, not as a compile error.

| Source | Column ids, in order |
|--------|---------------------|
| `ambassador` | `type`, `name`, `class`, `school`, `phone`, `email`, `gender`, `firstTime`, `facebook`, `instagram`, `submitted` |
| `volunteer` | `name`, `classSection`, `roll`, `shift`, `studentCode`, `personalPhone`, `parentsPhone`, `submitted` |
| `stemfest` | `name`, `class`, `school`, `segments`, `amountToSend`, `transactionId`, `paymentNumber`, `payment`, `submitted` |
| `sms` | `receivedAt`, `sender`, `transactionId`, `amount`, `senderNumber`, `status`, `message` |

Formatting is done server-side and in a fixed timezone, because a printout is the
one artefact nobody can scroll to double-check:

- dates → `reportDate` (`en-GB`, `Asia/Dhaka`)
- empty strings / nulls → `—` via `reportText`, so a blank cell is never read as
  an empty answer
- booleans → `Yes` / `No` via `yesNo`
- the STEM Fest `payment` column → `Verified` / `Pending`
- the STEM Fest `amountToSend` column → `formatBdt(row.totalFee)`, or `—` for a
  row filed before that column existed

A report reads **every matching row**, not one page, so it needs a ceiling the
paged table does not have: `REPORT_ROW_LIMIT` (2 000). Without one, an unfiltered
export of a table that grew unexpectedly would pin a pooled connection until the
statement timeout. Past the ceiling the report renders an amber notice saying the
export is not the whole result — it never truncates silently. The constant lives
in `filters.ts` because a `"use server"` module may only export async functions.

## Printing

Three surfaces reach paper, and all end at the browser's own print dialog — there
is no PDF library in the stack (ADR-0032):

1. **`/admin/reports/[kind]`** — a real server-rendered page. It parses the
   incoming query string with the same `parseAdminQuery` the table used, runs
   `getAdminReportRows`, and prints a masthead (club name, title, generated
   stamp), a scope strip (rows, sort, active filters, and the column subset when
   the export dialog chose one), the sorted table and a closing footer.
2. **`/admin/reports/brief`** — the analytics brief reached from the dashboard's
   **Print a report** and from ⌘K. It is not a source, so it has no filters, no
   column subset and no scope strip: it prints a short document of five sections
   instead of one long table. See below.
3. **`ReportPrintButton`** calls `window.print()` by hand. **`AutoPrint`** does it
   for you when the page arrives with `print=1` — which is what makes the export
   dialog's "PDF" choice a one-click PDF, and what the dashboard's
   **Print a report** link uses. It waits for two things, in this order: `load`,
   because every admin route renders behind `admin/loading.tsx` and a report's
   rows therefore arrive in *continuation* chunks — printing a half-written page
   makes a half-written file; then `document.fonts.ready`, because the `৳` sign and
   the Bengali SMS bodies are the two things a fallback font shows up on most
   clearly.

The `@media print` block in `src/app/globals.css` styles that document structure
into a clean A4 PDF: a tinted band behind the repeating table header, zebra rows
that never split, tabular numerals, and the document's own closing footer.
Print sizes are points/mm; the title size and hairline come from tokens
(`--print-title-size`, `--print-rule`) rather than literals — see
[[design-system]].

`@page` margin is **zero on purpose**. Chrome draws its own date/title strip and
URL footer *inside* whatever page margin you leave — the screenshot that opened
ADR-0033 — and Chrome does not support `@page` margin boxes, so the running
"Page x of y" footer they once promised never existed there. With zero margins
the strip has nowhere to draw and the document carries its own 14/18mm padding
on `[data-print="report"]`. Keep the margin at zero or the strip returns.

> [!warning] What that costs a long report
> The padding above sits on a box that **fragments**, and a fragmented box's
> vertical padding applies only to its first and last fragment. So sheets 2…N of a
> 400-row report carry no top or bottom padding and sit flush to the paper edge —
> where a printer's own unprintable band (≈5mm) can clip the first row. The
> horizontal padding *does* repeat, so the sides are never at risk.
>
> There is no print-CSS answer: an in-flow box cannot give every fragment room, and
> the alternative — non-zero `@page` margins — brings the browser's strip back. This
> is a limit of letting the browser paginate, not of these rules, and only real page
> geometry on the server removes it.

The report page also exports `generateMetadata`, because the tab title is the
filename Chrome proposes in "Save as PDF" — through the root template it becomes
`STEM Fest Registrations | Manarat Science Club.pdf`.

### The registration brief — `/admin/reports/brief`

Not a source: no `AdminSourceConfig`, no `parseAdminQuery`, no column subset. The
route is a **static sibling** of the dynamic one (ADR-0038) because the brief has
nothing to parametrise — sharing `[kind]` would have meant a config that says
"this one is different" and a `kind` union the table pages cannot render. `pnpm
build` lists `ƒ /admin/reports/brief` beside `ƒ /admin/reports/[kind]`, static
taking precedence.

One server action, `getRegistrationBrief` in `src/lib/actions/registrations.ts`,
returns a `RegistrationBrief` (`src/lib/admin/brief.ts`) that the page lays out as
five sections:

| § | Says | Comes from |
|---|------|-----------|
| 1 | The trend, and whether it is rising or falling | 21 local days bucketed in SQL, then `summarizeTrend` for the 7-day window, the prior 7, the delta and the direction |
| 2 | Which segments are booming and which are down | `toMovementRows` over the four STEM Fest segments, each with its events |
| 3 | The schools with the most entries | Top 6 by `lower(btrim(school))`, with Manarat's spelling variants folded into one label |
| 4 | The most effective referrers, batch vs campus ambassador | Top 10 names, each tagged `batch` / `campus` / `both` / `unmatched` by `referrerKindOf` |
| 5 | An estimate for tomorrow | `estimateNextDay` over section 1's last 7 days |

The action is **one transaction with sequential statements**. `withDbTimeout`
borrows a single pooled connection, and the Supabase pooler is sized for roughly
five — six parallel reads from one page would be six connections. Payment status
comes from `stemfestEffectivePaymentStatus()` so the brief cannot disagree with the
table it summarises, and a day is a **local** day:
`(created_at at time zone 'Asia/Dhaka')::date`. Offsets in those expressions need
an explicit `::int` or `date - $1` silently becomes the date-difference operator.

Section 5 is arithmetic the reader can check, printed as a `Method ·` sentence: a
least-squares line through the last seven local days read one day past the end,
clamped at twice the week's busiest day, with a band of `max(1, residual scatter,
20% of the figure)`. Not a mean — a mean answers "what has a day been lately" and
predicts the past on a growth week; a line answers "what is a day right now". It
prints `low – expected – high` plus confidence (`moderate`/`low`), and any notes
the estimator adds (thin history, the cap biting, wide scatter, direction).

> [!warning] Sections 1 and 2 count different things
> The trend counts **forms**; the segment table counts **event entries**, and one
> form that entered two events counts under both. When the entry total exceeds the
> window's registrations the page prints the difference rather than letting a
> reader find it as a contradiction.

`pnpm db:verify` mirrors all six statements against the live database (its §6) and
asserts the arithmetic: payment components summing to the total, buckets matching
the span, each segment equal to the sum of its own catalogue events, no event name
a substring of another, every event the brief counts reachable by the event
filter's own `ILIKE` — one extra all-time count on top of the six — referrer
tallies matching the referral count, and
`low ≤ expected ≤ high` with the estimate's date one past the last trend day.
**Change the brief, change the mirror, run `pnpm db:verify`** — none of this is
statically checkable.

The hooks below — set by the admin layout, the shell, the sidebar, the palette and
the report pages — tell the print CSS what it is looking at, so no component has to
know how it is printed:

| Hook | Element | Effect on paper |
|------|---------|-----------------|
| `data-print="shell"` | `(admin)/layout.tsx` root | Unwinds `h-screen` + `overflow-hidden` |
| `data-print="chrome"` | `admin/sidebar.tsx`, `admin-shell.tsx`'s mobile top bar and drawer, `command-palette.tsx`'s overlay, the report's back-link row | `display: none` |
| `data-print="content"` | `(admin)/layout.tsx` scroll column | Drops the flex/overflow box |
| `data-print="report"` | `reports/[kind]/page.tsx`, `reports/brief/page.tsx` | A4 document; the brief adds `.brief-document`, which restates the type ladder in pt |
| `data-print="footer"` | the report's closing line | In-document footer under the table |

Anything whose class contains `admin-wash`, `admin-edge`, `admin-fill` or
`admin-sheen` also loses its `background-image` under `[data-print]` — the
section accents and gradient layer are screen chrome, and paper keeps the flat
treatment (ADR-0036).

> [!warning] A blank second page is the usual symptom
> The admin shell is a fixed-height, scrollable viewport. Without unwinding it, a
> report longer than one screenful is clipped at the fold and every page after it
> prints blank. If a report ever does that again, check the `data-print`
> attributes before touching the table.

## Exporting

**Export** in the filter bar opens a dialog (`src/components/admin/export-dialog.tsx`)
that owns the three choices an export needs — none of which a single link can carry:

| Section | What it offers |
|---------|----------------|
| Format | **PDF** — opens `/admin/reports/[kind]?…&print=1` in a new tab, keeping the filtered list where it was. **Excel** — downloads `/api/admin/export/[kind]?…` |
| Fields | The source's `reportColumns` as checkboxes, in the order the report prints them |
| Filters | Every filter the source has, plus the search box, seeded from `useAdminFilters().exportState` |

The contract for all of it is `src/lib/admin/exports.ts`: the reserved `cols` and
`print` parameters, `buildPrintHref` / `buildExcelHref`, the file name
(`msc-<source>-YYYY-MM-DD.xlsx`) and the sheet name. Everything an export is
filtered by is still an `AdminQueryState`, so a filter can only mean one thing. An
invalid or missing `cols` resolves to every column — a hand-edited URL lands on the
full report, never on an empty table — and the dialog refuses to submit an empty
column set rather than falling back to all of them.

**Nothing is stored, in either format** (ADR-0032):

- **PDF** — no file is generated server-side at all. The report page is handed to
  the browser, whose own "Save as PDF" writes it on the admin's machine. That is
  also the only way `৳`, the Bengali SMS bodies and the club's typefaces come out
  right without a font file to carry them.
- **Excel** — `src/app/api/admin/export/[kind]/route.ts` builds the workbook in
  memory, streams it in one response and forgets it. `Cache-Control: no-store`.
  Two sheets: the rows (frozen header row, the widths from `AdminReportColumn.width`,
  landscape past six columns) and a **Scope** sheet repeating the rows, sort,
  active filters, columns and the admin who asked — the same thing the printed
  report's scope strip says, so a spreadsheet opened next month can still say what
  it is.

Every cell is text, deliberately: the values are the report's own formatted strings
(a fee reads `৳1,450.00`, a day reads `18 Sep 2026`), and one row builder feeding
both formats is what keeps the sheet and the paper agreeing.

Both formats read `getAdminReportRows`, so a spreadsheet and a PDF of the same
filters cannot disagree about a row. If `REPORT_ROW_LIMIT` bites, the Excel route
answers `413` rather than handing back a spreadsheet quietly missing rows — a file
someone has already sorted and formatted is the worst place to discover a
truncation. The dialog shows that sentence and stays open.

`scripts/verify-excel-export.run.mjs` (`pnpm export:verify`) exercises the writer
with no database and no session: it builds a workbook of the same shape and reads
it back out of its own ZIP container, asserting the two sheets, the frozen header,
the column widths, and that `৳` and Bengali text survive.

## Extending

**A new filter** — add a field to the source's `filters` array, then make the
matching WHERE builder in `src/lib/actions/registrations.ts` handle the id.
Nothing else changes: the filter bar renders it, `parseAdminQuery` validates it,
and the chip, the empty-state copy and the report's filter list all follow.

**A new report column** — add `{ id, label }` to `reportColumns` *and* the key to
the mapper in `getAdminReportRows`. Both, in the same commit. Add `width` when the
default (the label's own width) would clip the values under it in Excel — an SMS
body, a list of events. It shapes the `.xlsx` only; the printed report sizes its
own columns.

**A new source** — add an `AdminSourceConfig`, register it in `adminSources`,
write the WHERE builder and the `getAdminReportRows` case, add the route, and add
a sidebar entry in `src/components/admin/sidebar.tsx`.

**A page that aggregates several sources** — read them with `Promise.allSettled`
and resolve each through `unwrap` from `src/lib/admin/source-status.ts`. One
failing source degrades to `UNAVAILABLE` (`—`) and files itself in Sentry; it
must never blank the page or render as a zero, because a missing figure and a
real zero must not look the same to an admin.

## Related

[[decisions-log]] (ADR-0029, ADR-0026, ADR-0038 for the brief; ADR-0036 and
ADR-0037 for the panel's accent and type layer) · [[design-system]] ·
[[component-conventions]] · [[database-supabase]] · [[sms-forwarder]]
