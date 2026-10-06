"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { adminAccentStyle } from "@/lib/admin/accents";
import { Button } from "@/components/ui/button";

/**
 * Scoped to the admin segment so a single failed query renders inside the admin
 * shell — sidebar and navigation intact — instead of escalating to the root
 * boundary and replacing the entire page.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    // A failure is not a section, so this panel wears the warning hue rather than
    // whichever section's accent the page that failed would have scoped.
    <div
      style={adminAccentStyle("amber")}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <div className="flex max-w-2xl flex-col items-start gap-4 rounded-[10px] border border-admin-line border-t-2 border-t-admin-accent bg-admin-surface p-8">
        <span
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-[8px] bg-admin-warn-bg text-admin-warn-ink"
        >
          <AlertTriangle className="size-4" />
        </span>
        <div>
          <h1 className="font-space-display text-3xl leading-tight font-medium tracking-tight text-admin-ink">
            This view could not load
          </h1>
          <p className="mt-2 font-space-body text-sm leading-relaxed text-admin-muted">
            The query behind this page failed. Other admin sections may still
            work — use the sidebar to keep going.
          </p>
        </div>
        {error.digest && (
          <p className="font-space-body text-xs text-admin-muted">
            Reference:{" "}
            <code className="rounded-[4px] bg-admin-sunken px-1.5 py-0.5 font-mono text-2xs text-admin-ink-soft">
              {error.digest}
            </code>
          </p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
