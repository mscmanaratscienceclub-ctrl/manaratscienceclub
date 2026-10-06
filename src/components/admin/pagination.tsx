"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminButton } from "./styles";

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
    <div className="flex items-center justify-between border-t border-admin-line bg-admin-accent-soft/40 px-6 py-4">
      <p className="font-space-body text-sm text-admin-muted">
        Page <span className="font-medium text-admin-accent-ink tabular-nums">{page}</span> of{" "}
        <span className="tabular-nums">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <PaginationButton
          label="Previous page"
          disabled={prevDisabled}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Prev
        </PaginationButton>
        <PaginationButton
          label="Next page"
          disabled={nextDisabled}
          onClick={() => onPage(page + 1)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
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
      className={cn(adminButton, "px-3 py-1.5 text-xs")}
    >
      {children}
    </button>
  );
}
