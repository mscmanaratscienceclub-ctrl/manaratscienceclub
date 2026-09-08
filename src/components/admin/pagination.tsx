"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between border-t border-ink/5 px-6 py-4">
      <p className="font-body text-sm text-ink/50">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <PaginationButton
          label="Previous page"
          disabled={prevDisabled}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </PaginationButton>
        <PaginationButton
          label="Next page"
          disabled={nextDisabled}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </PaginationButton>
      </div>
    </div>
  );
}

function PaginationButton({
  children,
  disabled,
  onClick,
  label,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-ink/10 px-3 py-1.5",
        "font-body text-sm text-ink/70 transition-colors",
        "hover:border-manara-teal hover:text-manara-teal",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
