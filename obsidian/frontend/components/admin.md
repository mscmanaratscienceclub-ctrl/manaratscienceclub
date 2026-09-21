---
tags: [frontend, admin, stable]
updated: 2026-09-14
---

# Catalog — Admin Components

The pieces the admin panel's four tables are assembled from, in
`src/components/admin/`. They hold no copy and know no filter: everything they
display comes from an `AdminSourceConfig` in `src/lib/admin/filters.ts` and the
`AdminFilterControls` returned by `useAdminFilters`. See
[[admin/filters-reports]] for the whole contract, [[component-conventions]] for
the house rules.

| File | Export | Props | Role |
|------|--------|-------|------|
| `filter-bar.tsx` | `FilterBar` | `source`, `state`, `controls` | Search box, the `primary` filters, sort, export link, chips, and **More filters** for the rest |
| `filter-controls.tsx` | `FilterField` | `field`, `value`, `onChange` | One control, chosen by `field.kind` — text, select, date or number |
| `pagination.tsx` | `Pagination` | `page`, `totalPages`, `onPage` | Footer pager; renders `null` at one page so a short list has no dead controls |
| `export-pdf-link.tsx` | `ExportPdfLink` | `href`, `label?`, `disabled?` | Opens the printable report in a new tab, keeping the filtered list where it was |
| `report-print-button.tsx` | `ReportPrintButton` | — | `window.print()`. The only script on the report page |
| `admin-empty-state.tsx` | `AdminEmptyState` | `icon`, `label`, `onClearAll?` | Empty-table state; offers **Clear all filters** when filters are what emptied it |
| `sidebar.tsx` | `AdminSidebar` | `user: { name, email, role }` | Admin navigation; carries `data-print="chrome"` so it never prints |

## How they fit together

Every table page is a Server Component that parses the query string and fetches
its page of rows; the table itself is the client leaf:

```
page.tsx (server)                 table.tsx (client leaf)
  parseAdminQuery(source, sp)  →    useAdminFilters({ sourceId, basePath, state })
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

## Print hooks

`AdminSidebar` is the only component here that declares itself to the print
stylesheet (`data-print="chrome"` → `display: none`). The rest of the hooks live
on the admin layout and the report page; the table is listed in
[[admin/filters-reports]] → "Printing". Nothing in `src/components/admin/`
contains a `print:` utility class — print behaviour is CSS keyed on
`data-print`, so it can outweigh the flex/height/overflow rules already on those
elements.

## Related

[[admin/filters-reports]] · [[components/common]] · [[html-semantics]] ·
[[design-system]]
