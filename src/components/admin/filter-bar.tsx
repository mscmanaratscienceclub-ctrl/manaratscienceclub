"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  activeFilterList,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import type { AdminFilterControls } from "@/lib/hooks/use-admin-filters";
import { cn } from "@/lib/utils";
import { FilterField } from "./filter-controls";
import ExportPdfLink from "./export-pdf-link";

/**
 * Search, filters, sort and export for one admin table.
 *
 * Which controls exist comes entirely from the source's config in
 * `src/lib/admin/filters.ts`; this file only decides how they are laid out. The
 * always-visible row is the handful of filters that answer the common questions,
 * everything else is behind "More filters" — a dozen controls at once is a wall,
 * not a tool — and it opens itself whenever a hidden filter is active, so a chip
 * is never the only evidence of a filter that is narrowing the list.
 */
export default function FilterBar({
  source,
  state,
  controls,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  controls: AdminFilterControls;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = source.filters.filter((field) => field.primary);
  const secondary = source.filters.filter((field) => !field.primary);
  const secondaryActive = secondary.some((field) => state.values[field.id]);
  const showSecondary = moreOpen || secondaryActive;

  const active = activeFilterList(source, state);

  return (
    <div className="border-b border-ink/5 px-6 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="admin-search" className="sr-only">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/35"
              aria-hidden="true"
            />
            <input
              id="admin-search"
              type="search"
              value={controls.search}
              onChange={(event) => controls.setSearch(event.target.value)}
              placeholder={source.searchPlaceholder}
              className="w-full rounded-xl border border-ink/10 bg-cream/40 py-2 pr-3 pl-9 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-manara-teal"
            />
          </div>
        </div>

        {primary.map((field) => (
          <FilterField
            key={field.id}
            field={field}
            value={state.values[field.id] ?? ""}
            onChange={controls.setFilter}
          />
        ))}

        <div className="min-w-40 flex-1">
          <label
            htmlFor="admin-sort"
            className="mb-1 block font-body text-xs font-semibold tracking-wider text-ink/40 uppercase"
          >
            Sort
          </label>
          <select
            id="admin-sort"
            value={state.sort}
            onChange={(event) =>
              controls.setSort(event.target.value as AdminQueryState["sort"])
            }
            className="w-full rounded-xl border border-ink/10 bg-cream/40 px-3 py-2 font-body text-sm text-ink outline-none transition-colors focus:border-manara-teal"
          >
            {source.sort.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ExportPdfLink href={controls.exportHref} />
      </div>

      {showSecondary && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {secondary.map((field) => (
            <FilterField
              key={field.id}
              field={field}
              value={state.values[field.id] ?? ""}
              onChange={controls.setFilter}
            />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {secondary.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={showSecondary}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border border-ink/10 px-3 py-1.5",
              "font-body text-sm text-ink/60 transition-colors hover:border-manara-teal hover:text-manara-teal",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            {showSecondary ? "Fewer filters" : `More filters (${secondary.length})`}
          </button>
        )}

        {active.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => controls.clearFilter(filter.id)}
            aria-label={`Remove filter: ${filter.label} ${filter.display}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-manara-teal/10 px-3 py-1.5 font-body text-sm text-manara-teal transition-colors hover:bg-manara-teal/20"
          >
            <span className="text-manara-teal/60">{filter.label}:</span>
            <span className="max-w-40 truncate">{filter.display}</span>
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </button>
        ))}

        {active.length > 1 && (
          <button
            type="button"
            onClick={controls.clearAll}
            className="font-body text-sm text-ink/45 underline underline-offset-2 transition-colors hover:text-ink"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
