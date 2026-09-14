"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Opens the printable report for the filters currently applied.
 *
 * The report is a real server-rendered route, not a client-side PDF builder: the
 * browser's own print dialog then handles "Save as PDF" and the fonts, the `৳`
 * sign and the Bengali text in the SMS bodies all come out right, which a
 * hand-rolled generator would have to be taught one by one.
 *
 * A new tab keeps the admin's filtered list exactly where it was.
 */
export default function ExportPdfLink({
  href,
  label = "Export PDF",
  disabled = false,
}: {
  href: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener"
      aria-disabled={disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-ink/10 px-3 py-2",
        "font-body text-sm font-medium text-ink/70 transition-colors",
        "hover:border-manara-teal hover:text-manara-teal",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <FileDown className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  );
}
