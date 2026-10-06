"use client";

import { useId, type RefObject } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";

import { adminExportFormats, type AdminExportFormat } from "@/lib/admin/exports";
import { cn } from "@/lib/utils";
import { adminLabel } from "./styles";

/**
 * The "PDF or Excel" half of the export dialog.
 *
 * Real radios rather than two buttons, because it is one choice with two
 * answers: arrow keys move between them, a screen reader announces the group and
 * which one is taken, and the note under each spells out what will actually
 * happen — that the PDF is made by the browser on the admin's machine, and that
 * the spreadsheet is sent straight to it.
 */
export default function ExportFormatChoice({
  value,
  onChange,
  firstOptionRef,
}: {
  value: AdminExportFormat;
  onChange: (format: AdminExportFormat) => void;
  /** Held by the dialog, which focuses it when the dialog opens. */
  firstOptionRef: RefObject<HTMLInputElement | null>;
}) {
  const groupId = useId();

  return (
    <fieldset>
      <legend className={cn(adminLabel, "mb-3")}>Format</legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {adminExportFormats.map((option, index) => {
          const inputId = `${groupId}-${option.id}`;
          const active = value === option.id;
          return (
            <label
              key={option.id}
              htmlFor={inputId}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-[6px] border p-3.5 transition-colors",
                active
                  ? "border-admin-ink bg-admin-sunken"
                  : "border-admin-line hover:border-admin-ink/35",
              )}
            >
              <input
                id={inputId}
                type="radio"
                name={groupId}
                value={option.id}
                checked={active}
                onChange={() => onChange(option.id)}
                ref={index === 0 ? firstOptionRef : undefined}
                className="mt-0.5 size-4 shrink-0 accent-admin-ink"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 font-space-body text-sm font-medium text-admin-ink">
                  {option.id === "pdf" ? (
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  {option.label}
                </span>
                <span className="mt-1 block font-space-body text-xs leading-relaxed text-admin-muted">
                  {option.note}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
