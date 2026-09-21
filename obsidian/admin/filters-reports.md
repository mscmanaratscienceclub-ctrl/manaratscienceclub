---
tags: [admin, stable]
updated: 2026-09-14
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
| *(field id)* | One filter, e.g. `?from=2026-09-01&type=campus` |

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
| `stemfest` | `payment` | select | `verified` · `pending` — primary |
| | `class` | select | From `stemfestClasses` — primary |
| | `school` | text | Primary |
| | `from`, `to` | date | Submission range — primary |
| | `segment`, `transactionId` | text | Behind More filters |
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

Two surfaces reach paper, and both end at the browser's own print dialog — there
is no PDF library in the stack:

1. **`/admin/reports/[kind]`** — a real server-rendered page. It parses the
   incoming query string with the same `parseAdminQuery` the table used, runs
   `getAdminReportRows`, and prints a heading, the resolved filter list
   (`describeFilters`), the row count and the sorted table. `ExportPdfLink` in
   the filter bar always points here, carrying the current filters via
   `buildReportHref`, so an export is never "the table, but unfiltered".
2. **`ReportPrintButton`** on the report page calls `window.print()`.

The printout is plain HTML, so the stylesheet has no client state to fight with.
Four hooks — set by the admin layout, the sidebar and the report page — tell the
print CSS what it is looking at, so no component has to know how it is printed:

| Hook | Element | Effect on paper |
|------|---------|-----------------|
| `data-print="shell"` | `(admin)/layout.tsx` root | Unwinds `h-screen` + `overflow-hidden` |
| `data-print="chrome"` | `admin/sidebar.tsx`, the report's back-link row | `display: none` |
| `data-print="content"` | `(admin)/layout.tsx` scroll column | Drops the flex/overflow box |
| `data-print="report"` | `reports/[kind]/page.tsx` | A4 page, repeats `<thead>`, rows never split |

They are attribute selectors rather than Tailwind `print:` utilities because each
one has to outweigh a flex/height/overflow rule already sitting on that element.
The `@media print` block in `src/app/globals.css` explains the same reasoning
from the CSS side, and the print sizes and hairlines are tokens
(`--print-page-margin`, `--print-title-size`, `--print-body-size`,
`--print-cell-padding`, `--print-rule`) rather than literals — see
[[design-system]].

> [!warning] A blank second page is the usual symptom
> The admin shell is a fixed-height, scrollable viewport. Without unwinding it, a
> report longer than one screenful is clipped at the fold and every page after it
> prints blank. If a report ever does that again, check the `data-print`
> attributes before touching the table.

## Extending

**A new filter** — add a field to the source's `filters` array, then make the
matching WHERE builder in `src/lib/actions/registrations.ts` handle the id.
Nothing else changes: the filter bar renders it, `parseAdminQuery` validates it,
and the chip, the empty-state copy and the report's filter list all follow.

**A new report column** — add `{ id, label }` to `reportColumns` *and* the key to
the mapper in `getAdminReportRows`. Both, in the same commit.

**A new source** — add an `AdminSourceConfig`, register it in `adminSources`,
write the WHERE builder and the `getAdminReportRows` case, add the route, and add
a sidebar entry in `src/components/admin/sidebar.tsx`.

**A page that aggregates several sources** — read them with `Promise.allSettled`
and resolve each through `unwrap` from `src/lib/admin/source-status.ts`. One
failing source degrades to `UNAVAILABLE` (`—`) and files itself in Sentry; it
must never blank the page or render as a zero, because a missing figure and a
real zero must not look the same to an admin.

## Related

[[decisions-log]] (ADR-0029, ADR-0026) · [[design-system]] ·
[[component-conventions]] · [[database-supabase]] · [[sms-forwarder]]
