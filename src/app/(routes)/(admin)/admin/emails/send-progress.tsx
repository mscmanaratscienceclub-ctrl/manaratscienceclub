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

  const processed = progress.sent + progress.failed;
  const percent =
    progress.total > 0
      ? Math.min(100, Math.round((processed / progress.total) * 100))
      : 0;

  const headline = progress.running
    ? `Sending — ${processed} of ${progress.total}`
    : `Finished — ${progress.sent} sent${
        progress.failed ? `, ${progress.failed} not sent` : ""
      }`;

  return (
    <div className="mt-4 rounded-xl border border-ink/10 bg-cream/40 p-4">
      <div className="flex items-center gap-2">
        {progress.running ? (
          <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-manara-teal" aria-hidden="true" />
        )}
        <p className="font-body text-sm font-semibold text-ink">{headline}</p>
      </div>

      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
        aria-label="Send progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-manara-teal"
          style={{ width: `${percent}%` }}
        />
      </div>

      {progress.message && (
        <p className="mt-2 font-body text-sm text-ink/70">{progress.message}</p>
      )}

      {progress.failures.length > 0 && (
        <ul className="mt-3 space-y-1">
          {progress.failures.slice(0, 12).map((failure, index) => (
            <li
              key={`${failure.email}-${index}`}
              className="font-body text-xs text-rose-700"
            >
              <span className="font-semibold">{failure.name}</span> (
              {failure.email}) — {failure.message}
            </li>
          ))}
          {progress.failures.length > 12 && (
            <li className="font-body text-xs text-ink/50">
              …and {progress.failures.length - 12} more.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
