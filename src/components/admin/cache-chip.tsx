"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Database, Loader2, RefreshCw } from "lucide-react";

import { ADMIN_TIME_ZONE } from "@/lib/admin/filters";
import { cn } from "@/lib/utils";

/**
 * Where the browser's copy of a table stands.
 *
 * `loading` is the first download, `refreshing` a later one over a list that is
 * already on screen — the difference matters because only the second may keep
 * showing rows while it waits.
 */
export type CacheStatus =
  | "unsupported"
  | "loading"
  | "ready"
  | "refreshing"
  | "failed";

/**
 * The pill that says whether a table is answering from this browser or from the
 * server, and the button that makes it fetch again.
 *
 * A fest desk on a bad connection has to be able to see which of the two it is
 * looking at: a search that returns instantly from a six-hour-old copy and a search
 * that returns instantly from the database are indistinguishable without it, and the
 * first one is the one that can be wrong. So the chip states the moment its rows were
 * taken, in the panel's own timezone, and never hides behind an icon alone.
 *
 * Purely presentational — the hook that owns the cache passes the state in, so the
 * chip and the rows beside it cannot disagree about how fresh they are.
 *
 * It prints nothing until it has mounted. The label is a clock read in the panel's
 * timezone and the browser's IndexedDB is not on the server, so a chip that rendered
 * on the first pass would be markup the client then has to disagree with — the same
 * class of hydration mismatch `filters.ts` already guards against.
 */
export default function CacheChip({
  status,
  generatedAt,
  rowCount,
  truncated,
  message,
  onRefresh,
  className,
}: {
  status: CacheStatus;
  /** When the server produced the rows on screen, as an ISO string. */
  generatedAt: string | null;
  rowCount: number;
  /** `true` when the table outran the row ceiling and this is the newest slice. */
  truncated: boolean;
  /** Why the last attempt failed, shown as the button's tooltip. */
  message: string | null;
  onRefresh: () => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || status === "unsupported") return null;

  const busy = status === "loading" || status === "refreshing";
  const failed = status === "failed";

  const label = failed
    ? "Not cached"
    : busy
      ? status === "loading"
        ? "Caching…"
        : "Refreshing…"
      : `Cached ${formatClock(generatedAt)}`;

  const title = failed
    ? (message ?? "The list could not be downloaded. Every search goes to the server.")
    : truncated
      ? `The newest ${rowCount} rows — the table is larger than this cache's ceiling.`
      : `${rowCount} rows held in this browser. Searches, filters and sorting do not reach the server.`;

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-space-body text-2xs font-medium tracking-[0.05em] uppercase",
        failed
          ? "bg-admin-warn-bg text-admin-warn-ink"
          : "bg-admin-neutral-bg text-admin-neutral-ink",
        className,
      )}
    >
      {failed ? (
        <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
      ) : busy ? (
        <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <Database className="size-3 shrink-0" aria-hidden="true" />
      )}

      <span aria-live="polite">{label}</span>

      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        // The chip's own text already says what it holds; the button is the one part
        // of it that does something, so it is the part that needs a name.
        aria-label={failed ? "Try downloading this list again" : "Download this list again"}
        className="-mr-1 inline-flex size-4 items-center justify-center rounded-full text-current opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-admin-ink disabled:pointer-events-none"
      >
        <RefreshCw className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * The hour and minute a copy was taken, in the panel's timezone.
 *
 * A fest runs on Dhaka time and every other timestamp in the panel is printed in it,
 * so a chip that showed the browser's own zone would be the one figure on the page an
 * admin has to convert — on a machine whose clock is quite possibly wrong.
 */
function formatClock(iso: string | null): string {
  if (!iso) return "just now";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "just now";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
  }).format(at);
}

/**
 * How many changes on this table have not been confirmed yet.
 *
 * Per-row badges say it for one row; this says it for the page, because a fest desk
 * works top to bottom and paginates. A badge that scrolls away with its row must not
 * take the fact that something is unsent along with it — so the count lives in the
 * header, survives pagination, and is the last thing to clear.
 */
export function PendingPill({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <span
      aria-live="polite"
      title="These changes are held in this browser and will send themselves when the connection allows."
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-admin-warn-bg px-2.5 py-1 font-space-body text-2xs font-medium tracking-[0.05em] text-admin-warn-ink uppercase",
        className,
      )}
    >
      <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
      {count} change{count === 1 ? "" : "s"} not saved
    </span>
  );
}
