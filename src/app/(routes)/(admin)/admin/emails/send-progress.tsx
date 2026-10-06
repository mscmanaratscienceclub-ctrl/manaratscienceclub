"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { BulkSendProgress } from "@/lib/hooks/use-bulk-email-send";

/**
 * What a blast is doing, and what it could not do.
 *
 * The failure list is the point: a blast that reports "38 of 40" and stops is
 * useless unless it names the two addresses that bounced, because those are the
 * people an admin has to reach another way.
 */
export default function SendProgress({
  progress,
}: {
  progress: BulkSendProgress;
}) {
  if (!progress.running && !progress.finished) return null;

  // Skips count as processed: a recipient left alone is one the blast has
  // finished deciding about, so the bar still reaches the end.
  const processed = progress.sent + progress.failed + progress.skipped;
  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((processed / progress.total) * 100))
      : 0;

  const headline = progress.running
    ? `Sending — ${processed} of ${progress.total}`
    : `Finished — ${progress.sent} sent${
        progress.skipped ? `, ${progress.skipped} left alone` : ""
      }${progress.failed ? `, ${progress.failed} not sent` : ""}`;

  return (
    <div className="mt-4 rounded-[6px] border border-admin-line bg-admin-sunken p-4">
      <div className="flex items-center gap-2">
        {progress.running ? (
          <TriangleAlert className="size-4 text-admin-warn-ink" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="size-4 text-admin-positive-ink" aria-hidden="true" />
        )}
        <p className="font-space-body text-sm font-medium text-admin-ink">{headline}</p>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-[2px] bg-admin-line"
        role="progressbar"
        aria-label="Send progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full bg-admin-ink"
          style={{ width: `${percent}%` }}
        />
      </div>

      {progress.message && (
        <p className="mt-2 font-space-body text-sm text-admin-ink-soft">{progress.message}</p>
      )}

      {progress.failures.length > 0 && (
        <ul className="mt-3 space-y-1">
          {progress.failures.slice(0, 12).map((failure, index) => (
            <li
              key={`${failure.email}-${index}`}
              className="font-space-body text-xs text-admin-danger-ink"
            >
              <span className="font-medium">{failure.name}</span> (
              {failure.email}) — {failure.message}
            </li>
          ))}
          {progress.failures.length > 12 && (
            <li className="font-space-body text-xs text-admin-muted">
              …and {progress.failures.length - 12} more.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
