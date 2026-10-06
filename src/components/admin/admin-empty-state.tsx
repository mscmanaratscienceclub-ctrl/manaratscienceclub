"use client";

import type { LucideIcon } from "lucide-react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminButton } from "./styles";

/**
 * The empty state shared by the admin tables.
 *
 * When filters are what emptied the table, it offers a way back to everything
 * rather than leaving the admin to hunt for the chips — the usual reason a table
 * looks empty is a filter set three screens ago.
 *
 * The mark sits on section colour rather than in bare grey: an empty table is a
 * state of *this* section, and the chip keeps that identity while the message says
 * what happened.
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
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-[10px] bg-admin-accent-soft text-admin-accent-ink"
      >
        <Icon className="size-5" />
      </span>
      <p className="mt-4 max-w-md font-space-body text-sm leading-relaxed text-admin-muted">
        {label}
      </p>
      {onClearAll && (
        <button type="button" onClick={onClearAll} className={cn(adminButton, "mt-5 text-xs")}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Clear all filters
        </button>
      )}
    </div>
  );
}
