"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The strip that appears when the session ends while the table keeps answering.
 *
 * A cached list is useful right up until the moment it stops being *yours*: a 401 from
 * the freshness probe means the sign-in died, and from here on every read still works
 * and every write goes nowhere. That is the worst possible state to leave unexplained,
 * because the panel looks perfectly healthy.
 *
 * So it says three things in one line: what happened, what is being kept for you, and
 * where to go. The second is the load-bearing one — an admin who has just marked forty
 * payments Verified will abandon the tab and reload it if nothing tells them their work
 * is still there, and a reloaded tab forgets what was never sent.
 */
export default function SessionExpiredNotice({
  unsaved,
  className,
}: {
  /** Changes this browser is still holding for the dead session to finish. */
  unsaved: number;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[10px] border border-admin-line bg-admin-warn-bg px-4 py-3 font-space-body text-sm text-admin-warn-ink",
        className,
      )}
    >
      <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />

      <span>
        Your sign-in expired. This list still answers from this browser, but nothing you
        change will reach the server until you sign in again.
      </span>

      {unsaved > 0 && (
        <strong className="font-semibold">
          {unsaved} unsent change{unsaved === 1 ? "" : "s"} kept here.
        </strong>
      )}

      <Link
        href="/signin"
        className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-ink"
      >
        Sign in again
      </Link>
    </p>
  );
}
