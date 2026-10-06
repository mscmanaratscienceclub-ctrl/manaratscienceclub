"use client";

import { Printer } from "lucide-react";
import { adminButtonPrimary } from "./styles";

/**
 * Hands the report to the browser's print dialog, where "Save as PDF" produces
 * the file. Nothing in the report is client-rendered — this button is the only
 * script on the page, which is why a printed report is a faithful copy of what
 * the admin saw.
 */
export default function ReportPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={adminButtonPrimary}
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print / Save as PDF
    </button>
  );
}
