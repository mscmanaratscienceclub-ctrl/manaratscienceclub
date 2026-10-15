"use client";

import { createContext, useContext, useMemo } from "react";

import {
  describeList,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import type { AttendanceSnapshotRow, AttendanceTally } from "@/lib/admin/snapshot";
import {
  useAdminFilters,
  type AdminFilterControls,
} from "@/lib/hooks/use-admin-filters";
import { useLocalAttendanceTable } from "@/lib/hooks/use-local-admin-table";
import {
  useOptimisticWrites,
  type OptimisticWrites,
} from "@/lib/hooks/use-optimistic-action";
import type { CacheView } from "@/lib/hooks/use-snapshot-cache";
import CacheChip, { PendingPill } from "./cache-chip";

/**
 * One place for the attendance sheet's live state.
 *
 * Same arrangement as the registrations table's provider (`stemfest-list.tsx`): the
 * heading's sentence, the two figures, the filter bar, the rows and the pager all
 * describe one list, so once the browser can answer a search they must read one
 * controller rather than a set of props left describing the list from before the
 * last filter was picked.
 *
 * ## Why this table joined the cache ADR-0044 first kept to two
 *
 * The sheet's argument for querying was that two desks marking one gate have to see
 * each other's ticks. That is still true, and it is what `attendance_marked_at`
 * answers: the probe compares `max(attendance_marked_at)` once a minute, a moved
 * cursor refetches the whole copy, and so a mark made at the other desk arrives here
 * within a minute rather than never. What that buys is the thing a door actually
 * needs — a search that costs no round trip, and a queue of ticks that survives the
 * connection dropping mid-mark — at the price of up to a minute's lag on someone
 * else's write, which the chip states rather than hides.
 */
interface AttendanceListValue {
  source: AdminSourceConfig;
  /** The state the rows on screen answer to — not necessarily the one the server rendered. */
  state: AdminQueryState;
  participants: AttendanceSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  tally: AttendanceTally;
  /** `true` while the list is being answered from this browser. */
  local: boolean;
  cache: CacheView;
  controls: AdminFilterControls;
  writes: OptimisticWrites;
}

const AttendanceListContext = createContext<AttendanceListValue | null>(null);

export function useAttendanceList(): AttendanceListValue {
  const value = useContext(AttendanceListContext);
  if (!value) {
    throw new Error(
      "useAttendanceList must be used inside an <AttendanceListProvider>.",
    );
  }
  return value;
}

export function AttendanceListProvider({
  source,
  state,
  participants,
  total,
  page,
  totalPages,
  tally,
  children,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  participants: AttendanceSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  tally: AttendanceTally;
  children: React.ReactNode;
}) {
  const table = useLocalAttendanceTable({
    source,
    state,
    participants,
    total,
    page,
    totalPages,
    tally,
  });

  const writes = useOptimisticWrites<AttendanceSnapshotRow>({
    source: "attendance",
    patchRow: table.patchRow,
  });

  // Driven by the *applied* state, not the server's: a filter picked locally has to
  // be what the next change derives from, or the second pick would drop the first.
  const controls = useAdminFilters({
    basePath: source.path,
    state: table.state,
    transport: table.transport,
  });

  const value = useMemo<AttendanceListValue>(
    () => ({
      source,
      state: table.state,
      participants: table.rows,
      total: table.total,
      page: table.page,
      totalPages: table.totalPages,
      tally: table.tally,
      local: table.local,
      cache: table.cache,
      controls,
      writes,
    }),
    [table, controls, writes],
  );

  return (
    <AttendanceListContext.Provider value={value}>
      {children}
    </AttendanceListContext.Provider>
  );
}

/** The sentence under the heading, read from the same state as the list below it. */
export function AttendanceListDescription() {
  const { source, state, participants, total, tally } = useAttendanceList();

  return (
    <>
      {describeList(source, state, participants.length, total)} Marked present:{" "}
      {/* Not "of *N*" where *N* is the filtered total: the two figures are whole-list
          ones on the server and stay whole-list in the cache, so the sentence means
          the same thing whichever of the two painted the page. */}
      {tally.present} of {tally.total} registrations.
    </>
  );
}

/** The cache chip and the unsaved-ticks pill, for the heading's action slot. */
export function AttendanceHeaderStatus() {
  const { cache, writes } = useAttendanceList();

  return (
    <span className="flex flex-wrap items-center justify-end gap-2">
      <PendingPill count={writes.unsaved.length} />
      <CacheChip
        status={cache.status}
        generatedAt={cache.generatedAt}
        rowCount={cache.rowCount}
        truncated={cache.truncated}
        message={cache.message}
        onRefresh={cache.refresh}
      />
    </span>
  );
}
