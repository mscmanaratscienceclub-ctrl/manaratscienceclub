"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
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
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div className="flex max-w-2xl flex-col items-start gap-4 rounded-2xl bg-surface p-8 shadow-subtle">
        <div className="rounded-xl bg-amber-50 p-3">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            This view could not load
          </h1>
          <p className="mt-2 font-body text-ink/60">
            The query behind this page failed. Other admin sections may still
            work — use the sidebar to keep going.
          </p>
        </div>
        {error.digest && (
          <p className="font-body text-xs text-ink/40">
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
