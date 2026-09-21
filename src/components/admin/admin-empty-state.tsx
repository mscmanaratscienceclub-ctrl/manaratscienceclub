"use client";

import type { LucideIcon } from "lucide-react";

/**
 * The empty state shared by the admin tables.
 *
 * When filters are what emptied the table, it offers a way back to everything
 * rather than leaving the admin to hunt for the chips — the usual reason a table
 * looks empty is a filter set three screens ago.
 */
export default function AdminEmptyState({
  icon: Icon,
  label,
  onClearAll,
}: {
  icon: LucideIcon;
  label: string;
  onClearAll?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <Icon className="mb-3 h-10 w-10 text-ink/20" aria-hidden="true" />
      <p className="font-body text-ink/50">{label}</p>
      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="mt-4 inline-flex items-center gap-1 rounded-xl border border-ink/10 px-3 py-1.5 font-body text-sm text-ink/70 transition-colors hover:border-manara-teal hover:text-manara-teal"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
