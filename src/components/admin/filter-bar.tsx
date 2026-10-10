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
import ExportDialog from "./export-dialog";
import {
  adminButton,
  adminLabel,
  adminTextButton,
} from "./styles";

/**
 * Search, filters, sort and export for one admin table.
 *
 * Which controls exist comes entirely from the source's config in
 * `src/lib/admin/filters.ts`; this file only decides how they are laid out. The
 * always-visible row is the handful of filters that answer the common questions,
 * everything else is behind "More filters" — a dozen controls at once is a wall,
 * not a tool — and it opens itself whenever a hidden filter is active, so a chip
 * is never the only evidence of a filter that is narrowing the list.
 *
 * Export sits here rather than in the table because it exports the same thing the
 * bar is describing: the source's columns, filtered the same way. The dialog it
 * opens owns the format and field choices on top of that.
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
    <div className="border-b border-admin-line px-6 py-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="admin-search" className="sr-only">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-accent-ink"
              aria-hidden="true"
            />
            <input
              id="admin-search"
              type="search"
              value={controls.search}
              onChange={(event) => controls.setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                controls.commitSearch();
              }}
              onBlur={controls.commitSearch}
              placeholder={source.searchPlaceholder}
              className="w-full rounded-[6px] border border-admin-line bg-admin-surface py-2 pr-3 pl-9 font-space-body text-sm text-admin-ink outline-none transition-colors placeholder:text-admin-muted focus:border-admin-ink"
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
          <label htmlFor="admin-sort" className={cn(adminLabel, "mb-1.5 block")}>
            Sort
          </label>
          <select
            id="admin-sort"
            value={state.sort}
            onChange={(event) =>
              controls.setSort(event.target.value as AdminQueryState["sort"])
            }
            className="w-full rounded-[6px] border border-admin-line bg-admin-surface px-3 py-2 font-space-body text-sm text-admin-ink outline-none transition-colors focus:border-admin-ink"
          >
            {source.sort.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <ExportDialog source={source} state={controls.exportState} />
      </div>

      {showSecondary && (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-admin-line pt-4">
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {secondary.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={showSecondary}
            className={cn(adminButton, "py-1.5 text-xs")}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            {showSecondary ? "Fewer filters" : `More filters (${secondary.length})`}
          </button>
        )}

        {active.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => controls.clearFilter(filter.id)}
            aria-label={`Remove filter: ${filter.label} ${filter.display}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-admin-accent-soft bg-admin-accent-soft py-1.5 pr-2.5 pl-3 font-space-body text-xs text-admin-accent-ink transition-colors hover:border-admin-accent"
          >
            <span className="opacity-70">{filter.label}</span>
            <span className="max-w-48 truncate">{filter.display}</span>
            <X className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
          </button>
        ))}

        {active.length > 1 && (
          <button type="button" onClick={controls.clearAll} className={adminTextButton}>
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
