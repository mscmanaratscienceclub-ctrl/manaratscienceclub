"use client";

import { AlertTriangle, Check, Loader2 } from "lucide-react";

import { describeWrite, type PendingWrite } from "@/lib/admin/pending-writes";
import { cn } from "@/lib/utils";
import { adminTag } from "./styles";

/**
 * The one honest word about a change that has not reached the server.
 *
 * An optimistic row is a promise, and a promise the admin cannot see is the one thing
 * that makes this kind of cache dangerous: a fest desk that reads "Verified" and walks
 * away has taken the desk's word for it. So the badge beside the pill says which of
 * four states the row is in — saving, retried and failing, saved, or given up on — and
 * the failing state carries the attempt count, because "retrying 2/5" is a different
 * decision from "retry manually".
 *
 * It is deliberately small, quiet and next to the value it describes rather than in a
 * corner of the page: the admin's eye is already on the pill.
 */
export default function PendingBadge({
  write,
  onRetry,
  className,
}: {
  /** The outstanding write for this row's field, or `null` when there is nothing to say. */
  write: PendingWrite | null;
  onRetry?: (key: string) => void;
  className?: string;
}) {
  const label = write ? describeWrite(write) : null;
  if (!write || !label) return null;

  const failed = write.state === "failed";
  const saved = write.state === "saved";

  // The badge answers the pill beside it, not the row: a screen reader on the cell
  // already reads the status, and this says whether it holds.
  return (
    <span
      aria-live="polite"
      title={write.label}
      className={cn(
        adminTag,
        "gap-1",
        failed
          ? "bg-admin-warn-bg text-admin-warn-ink"
          : saved
            ? "bg-admin-positive-bg text-admin-positive-ink"
            : "bg-admin-neutral-bg text-admin-neutral-ink",
        className,
      )}
    >
      {failed ? (
        <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
      ) : saved ? (
        <Check className="size-3 shrink-0" aria-hidden="true" />
      ) : (
        <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />
      )}

      {label}

      {failed && onRetry && (
        <button
          type="button"
          onClick={() => onRetry(write.key)}
          aria-label={`Send ${write.label} again`}
          className="-mr-1 rounded-full px-1 font-space-body text-2xs font-semibold underline underline-offset-2 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-admin-ink"
        >
          Retry
        </button>
      )}
    </span>
  );
}
