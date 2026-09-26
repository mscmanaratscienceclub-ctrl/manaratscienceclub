"use client";

import { Search, X } from "lucide-react";
import {
  activeFilterList,
  type AdminFilterField,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import { BULK_EMAIL_FILTER_IDS } from "@/lib/admin/bulk-email";
import type { AdminFilterControls } from "@/lib/hooks/use-admin-filters";
import { FilterField } from "@/components/admin/filter-controls";

/**
 * Which people a blast reaches.
 *
 * The controls are read out of `stemfestSource.filters` rather than declared
 * again, so a filter that means one thing on the Science Competition table means
 * the same thing here — and the audience is the very set an admin can see by
 * following the same filters to that table. Sort and export are left off: neither
 * describes *who* is in an audience.
 */
export default function AudienceFilters({
  source,
  state,
  controls,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  controls: AdminFilterControls;
}) {
  const fields = BULK_EMAIL_FILTER_IDS.map((id) =>
    source.filters.find((field) => field.id === id),
  ).filter((field): field is AdminFilterField => Boolean(field));

  const active = activeFilterList(source, state);

  return (
    <section className="rounded-2xl bg-surface p-5 shadow-subtle sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">Who receives it</h2>
      <p className="mt-1 font-body text-sm text-ink/60">
        Both sections below write to exactly this group. The filters are the ones
        on the Science Competition table, so an audience here matches the rows
        there.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="bulk-email-search" className="sr-only">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink/35"
              aria-hidden="true"
            />
            <input
              id="bulk-email-search"
              type="search"
              value={controls.search}
              onChange={(event) => controls.setSearch(event.target.value)}
              placeholder={source.searchPlaceholder}
              className="w-full rounded-xl border border-ink/10 bg-cream/40 py-2 pr-3 pl-9 font-body text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-manara-teal"
            />
          </div>
        </div>

        {fields.map((field) => (
          <FilterField
            key={field.id}
            field={field}
            value={state.values[field.id] ?? ""}
            onChange={controls.setFilter}
          />
        ))}
      </div>

      {active.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
      )}
    </section>
  );
}
