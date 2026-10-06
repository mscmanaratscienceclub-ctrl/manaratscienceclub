"use client";

import { useId } from "react";
import type { AdminReportColumn } from "@/lib/admin/filters";
import { cn } from "@/lib/utils";
import { adminLabel, adminTextButton } from "./styles";

/**
 * The "what fields to choose" half of the export dialog: the source's report
 * columns as real checkboxes, in the order the report prints them, so the
 * selection reads as the finished table top-to-bottom.
 *
 * It is a `fieldset` with a `legend` rather than a titled `<div>`, because a set
 * of checkboxes that all answer one question *is* a fieldset — a screen reader
 * announces the group and its question before the first box.
 */
export default function ExportFieldList({
  columns,
  selected,
  onToggle,
  onSelectAll,
}: {
  columns: AdminReportColumn[];
  selected: ReadonlySet<string>;
  /** `checked` is the state the box was moved to, never a flip of the current one. */
  onToggle: (id: string, checked: boolean) => void;
  /** Selects every column, or clears the lot when they are all already on. */
  onSelectAll: (checked: boolean) => void;
}) {
  const groupId = useId();
  const allSelected = columns.every((column) => selected.has(column.id));

  return (
    <fieldset>
      <legend className="sr-only">Columns to export</legend>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className={adminLabel}>
          {selected.size} of {columns.length} columns
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectAll(true)}
            disabled={allSelected}
            className={adminTextButton}
          >
            All fields
          </button>
          <span aria-hidden="true" className="text-admin-line">
            ·
          </span>
          <button
            type="button"
            onClick={() => onSelectAll(false)}
            disabled={selected.size === 0}
            className={adminTextButton}
          >
            None
          </button>
        </div>
      </div>

      <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((column) => {
          const inputId = `${groupId}-${column.id}`;
          const checked = selected.has(column.id);
          return (
            <li key={column.id}>
              <label
                htmlFor={inputId}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-1.5 transition-colors hover:bg-admin-sunken",
                  checked && "bg-admin-sunken",
                )}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onToggle(column.id, event.target.checked)}
                  className="size-4 shrink-0 accent-admin-ink"
                />
                <span className="truncate font-space-body text-sm text-admin-ink-soft">
                  {column.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
