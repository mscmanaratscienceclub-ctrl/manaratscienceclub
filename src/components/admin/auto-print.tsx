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
 * It waits for **two** things, in this order, because each protects a different
 * half of the page:
 *
 * 1. `load` — the *document*. `admin/loading.tsx` puts every admin route inside a
 *    Suspense boundary, so a report is a continuation of its own response: the
 *    shell flushes with the skeleton, and the masthead, the scope strip and all
 *    four hundred-odd rows arrive afterwards on the same still-open document. The
 *    dialog must not open while that is happening, because a print snapshot of a
 *    half-written page is a half-written PDF — `load` is the one signal that says
 *    the document has finished arriving.
 * 2. `document.fonts.ready` — the *type*. The report is set in the club's own
 *    faces, and printing before they arrive is how a preview ends up in a
 *    fallback font — most visible on the `৳` sign and the Bengali SMS bodies, the
 *    two things here a system font may not even have.
 *
 * The only script on the report page, and it renders nothing.
 */
export default function AutoPrint() {
  useEffect(() => {
    let cancelled = false;

    const openPrintDialog = async () => {
      await documentComplete();
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

/** Resolves once the browser has finished writing this document. */
function documentComplete(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    window.addEventListener("load", () => resolve(), { once: true });
  });
}
