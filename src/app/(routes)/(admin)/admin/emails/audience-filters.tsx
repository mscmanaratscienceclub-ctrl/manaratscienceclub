"use client";

import { Search, Users, X } from "lucide-react";
import {
  activeFilterList,
  type AdminFilterField,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import { BULK_EMAIL_FILTER_IDS } from "@/lib/admin/bulk-email";
import type { AdminFilterControls } from "@/lib/hooks/use-admin-filters";
import { FilterField } from "@/components/admin/filter-controls";
import { cn } from "@/lib/utils";
import {
  adminChipSoft,
  adminControl,
  adminPanel,
  adminTextButton,
} from "@/components/admin/styles";

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
    <section className={cn(adminPanel, "p-5 sm:p-6")}>
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className={cn(adminChipSoft, "size-9")}>
          <Users className="size-4" />
        </span>
        <div>
          <h2 className="font-space-display text-2xl leading-tight font-medium tracking-tight text-admin-ink">
            Who receives it
          </h2>
          <p className="mt-1.5 max-w-3xl font-space-body text-sm leading-relaxed text-admin-muted">
            Both sections below write to exactly this group. The filters are the
            ones on the Science Competition table, so an audience here matches the
            rows there.
          </p>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="bulk-email-search" className="sr-only">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-muted"
              aria-hidden="true"
            />
            <input
              id="bulk-email-search"
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
              className={cn(adminControl, "pr-3 pl-9")}
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
              className="inline-flex items-center gap-1.5 rounded-full border border-admin-line bg-admin-sunken py-1.5 pr-2.5 pl-3 font-space-body text-xs text-admin-ink-soft transition-colors hover:border-admin-ink/30 hover:text-admin-ink"
            >
              <span className="text-admin-muted">{filter.label}</span>
              <span className="max-w-40 truncate">{filter.display}</span>
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </button>
          ))}

          {active.length > 1 && (
            <button type="button" onClick={controls.clearAll} className={adminTextButton}>
              Clear all
            </button>
          )}
        </div>
      )}
    </section>
  );
}
