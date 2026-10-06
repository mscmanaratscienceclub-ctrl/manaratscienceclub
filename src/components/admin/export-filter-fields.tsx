"use client";

import { useId } from "react";
import type { AdminSourceConfig } from "@/lib/admin/filters";
import { cn } from "@/lib/utils";
import { FilterField } from "./filter-controls";
import { adminControl, adminLabel, adminTextButton } from "./styles";

/**
 * The "what filters to use" half of the export dialog.
 *
 * Every filter the source has, whether or not the filter bar shows it in its
 * first row — the dialog has room for the lot, and the ones behind "More filters"
 * on the table are exactly the ones an admin is most likely to want to reach
 * deliberately.
 *
 * The controls are the filter bar's own `FilterField`s, so a filter looks and
 * behaves the same in both places, with one difference: they commit on every
 * keystroke here (`immediate`). There is no query behind this dialog, and a
 * download must include a term the admin typed and clicked straight after.
 */
export default function ExportFilterFields({
  source,
  query,
  values,
  activeCount,
  onQueryChange,
  onValueChange,
  onClearAll,
}: {
  source: AdminSourceConfig;
  query: string;
  values: Record<string, string>;
  /** How many filters are currently narrowing the export; shown by Clear all. */
  activeCount: number;
  onQueryChange: (value: string) => void;
  onValueChange: (id: string, value: string) => void;
  onClearAll: () => void;
}) {
  const searchId = useId();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={adminLabel}>Filters</h3>
        {activeCount > 0 && (
          <button type="button" onClick={onClearAll} className={adminTextButton}>
            Clear all {activeCount} filter{activeCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <p className="mb-3 font-space-body text-xs leading-relaxed text-admin-muted">
        Starts as what the table is showing. Change anything here and it applies to
        this export only.
      </p>

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-40 flex-1 basis-full">
          <label htmlFor={searchId} className={cn(adminLabel, "mb-1.5 block")}>
            Search
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={source.searchPlaceholder}
            className={adminControl}
          />
        </div>

        {source.filters.map((field) => (
          <FilterField
            key={field.id}
            field={field}
            value={values[field.id] ?? ""}
            onChange={onValueChange}
            immediate
          />
        ))}
      </div>
    </div>
  );
}
