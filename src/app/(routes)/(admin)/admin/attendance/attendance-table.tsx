"use client";

import Link from "next/link";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import FilterBar from "@/components/admin/filter-bar";
import Pagination from "@/components/admin/pagination";
import PendingBadge from "@/components/admin/pending-badge";
import SessionExpiredNotice from "@/components/admin/session-expired-notice";
import { useAttendanceList } from "@/components/admin/attendance-list";
import {
  adminButton,
  adminPanel,
  adminTableScroller,
  adminTag,
  adminTh,
} from "@/components/admin/styles";
import { activeFilterCount, emptyStateLabel } from "@/lib/admin/filters";
import { planStemfestAttendance } from "@/lib/admin/pending-writes";
import { attendanceOption } from "@/lib/admin/statuses";
import type { AttendanceSnapshotRow } from "@/lib/admin/snapshot";
import { cn } from "@/lib/utils";

const COLUMNS = ["ID", "Name", "Class", "Attendance", "Full row"];

/**
 * The attendance sheet.
 *
 * Five columns against the registrations table's twelve, and no expandable row:
 * everything beyond these three fields lives on `/admin/science-competition`, which
 * every row links to with its own registration ID already in the search box.
 *
 * It takes no props. The list it shows is answered either by the Server Component's
 * page or by this browser's cached copy of the whole sheet, and only the provider
 * above it knows which — so the switch, the sentence under the heading and the page
 * number cannot be describing three different lists.
 */
export default function AttendanceTable() {
  const {
    source,
    state,
    participants,
    total,
    page,
    totalPages,
    controls,
    cache,
    writes,
  } = useAttendanceList();
  const filtering = activeFilterCount(source, state) > 0;

  return (
    <>
      {/* Outside the panel rather than inside it: the strip is about the session,
          not about this list's own chrome. */}
      {cache.signedOut && <SessionExpiredNotice unsaved={writes.unsaved.length} />}

      <div className={adminPanel}>
        <FilterBar source={source} state={state} controls={controls} />

        <div
          className={cn(
            "transition-opacity",
            controls.isPending && "pointer-events-none opacity-50",
          )}
        >
          {participants.length === 0 ? (
            <AdminEmptyState
              icon={ClipboardCheck}
              label={emptyStateLabel(source, state)}
              onClearAll={filtering ? controls.clearAll : undefined}
            />
          ) : (
            <div className={adminTableScroller}>
              <table className="w-full min-w-[46rem]">
                <caption className="sr-only">
                  {source.reportTitle}: every participant on the current page, with
                  the switch that marks them present.
                </caption>
                <thead>
                  <tr className="border-b border-admin-line text-left">
                    {COLUMNS.map((label) => (
                      <th key={label} scope="col" className={adminTh}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {participants.map((row) => (
                    <AttendanceRowView key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={controls.goToPage}
          />
        )}
      </div>
    </>
  );
}

/**
 * One participant, and the switch that says whether they are here.
 *
 * The write is optimistic like every other desk edit: the switch moves with the
 * click, the badge beside it says whether the server has agreed yet, and a tick made
 * while the connection is down is held in IndexedDB and sent when it returns. That
 * queue is the reason this table caches at all — a door that loses wifi mid-mark
 * must keep marking, not sit on a failed request.
 *
 * The switch stays enabled through a save, because a desk that changes its mind a
 * second later is normal and the second flick simply replaces the first in the queue.
 */
function AttendanceRowView({ row }: { row: AttendanceSnapshotRow }) {
  const { writes } = useAttendanceList();
  const option = attendanceOption(row.attendance);

  function apply(next: boolean) {
    if (next === row.attendance) return;

    writes.run({
      rowId: row.id,
      action: "setStemfestAttendance",
      // The filter's word, not the bit: a queued write is replayed verbatim out of
      // IndexedDB, and the panel's whole attendance vocabulary is these two words.
      args: [row.id, attendanceOption(next).value],
      plan: planStemfestAttendance(row, next),
    });
  }

  return (
    <tr>
      <td className="px-4 py-3 font-mono text-sm font-medium text-admin-ink">
        {row.registrationCode}
      </td>
      <td className="px-4 py-3 font-space-body text-base font-medium text-admin-ink">
        {row.name}
      </td>
      <td className="px-4 py-3 font-space-body text-sm text-admin-ink-soft">
        {row.classLabel}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={row.attendance}
            aria-label={`Mark ${row.name} (${row.registrationCode}) present`}
            onClick={() => apply(!row.attendance)}
            className={cn(
              "flex h-6 w-11 shrink-0 items-center rounded-full border border-admin-line px-1 transition-colors",
              row.attendance ? "bg-admin-positive-ink" : "bg-admin-sunken",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "block size-4 rounded-full bg-admin-surface shadow-admin-hover transition-transform",
                row.attendance && "translate-x-5",
              )}
            />
          </button>

          {/* The word beside the switch, never the colour alone: a tick is a mark,
              and a mark is not something to read through a hue. */}
          <span className={cn(adminTag, option.tone)}>{option.label}</span>

          <PendingBadge
            write={writes.writeFor(row.id, "attendance")}
            onRetry={writes.retryNow}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <DetailsLink row={row} />
      </td>
    </tr>
  );
}

/**
 * Across to the full row, with this participant's ID already in the search box.
 *
 * A `Link` rather than a router call so the address bar says what it is — an admin
 * who sends that link to the other desk has sent the row, not an instruction to go
 * and find it.
 */
function DetailsLink({ row }: { row: AttendanceSnapshotRow }) {
  return (
    <Link
      href={`/admin/science-competition?q=${encodeURIComponent(row.registrationCode)}`}
      className={cn(adminButton, "py-1.5 text-xs")}
      aria-label={`All information about ${row.name} (${row.registrationCode})`}
    >
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
      All info
    </Link>
  );
}
