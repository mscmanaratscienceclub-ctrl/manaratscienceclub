"use client";

import { useEffect } from "react";

/**
 * Opens the browser's print dialog as soon as the report has settled.
 *
 * This is what makes choosing "PDF" in the export dialog a one-click PDF: the
 * report opens in its own tab with `print=1`, and "Save as PDF" is waiting. The
 * file is written by the browser, on the admin's machine — the server never
 * generates one, so there is nothing to store.
 *
 * It waits for `document.fonts.ready` before printing. The report is set in the
 * club's own typefaces, and printing before they arrive is how a print preview
 * ends up in a fallback font — most visible on the `৳` sign and the Bengali SMS
 * bodies, the two things in here that a system font may not even have.
 *
 * The only script on the report page, and it renders nothing.
 */
export default function AutoPrint() {
  useEffect(() => {
    let cancelled = false;

    const openPrintDialog = async () => {
      try {
        await document.fonts.ready;
      } catch {
        // A browser without the Font Loading API prints with what it has.
      }
      if (!cancelled) window.print();
    };

    void openPrintDialog();

    // React may run this effect twice in development; the guard stops the second
    // pass opening a second print dialog over the first.
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
