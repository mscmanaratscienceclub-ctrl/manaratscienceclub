"use client";

import { createContext, useContext, useMemo } from "react";

import {
  describeList,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import type { SmsSnapshotRow, SmsTallies } from "@/lib/admin/snapshot";
import {
  useAdminFilters,
  type AdminFilterControls,
} from "@/lib/hooks/use-admin-filters";
import { useLocalSmsTable } from "@/lib/hooks/use-local-admin-table";
import {
  useOptimisticWrites,
  type OptimisticWrites,
} from "@/lib/hooks/use-optimistic-action";
import type { CacheView } from "@/lib/hooks/use-snapshot-cache";
import CacheChip, { PendingPill } from "./cache-chip";

/**
 * One place for the SMS log's live state.
 *
 * The registration table's provider (`stemfest-list.tsx`) explains why the heading, the
 * figures and the list have to read one controller rather than three sets of props; this
 * is the same arrangement for the forwarded-message log, whose three tallies sit beside a
 * `<select>` an admin corrects message by message.
 *
 * A message's status is the only thing here that changes another table's answer — an
 * `ignored` message un-verifies the registration that was verified from it — and that
 * cross-table effect is not patched live, because the two lists are never on screen at
 * once. Instead a confirmed SMS write drops the registrations cache altogether, so the
 * next visit to that table re-downloads it and the handoff guard compares fresh against
 * fresh. See `use-optimistic-action.ts`.
 */
interface SmsListValue {
  source: AdminSourceConfig;
  state: AdminQueryState;
  messages: SmsSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  tallies: SmsTallies;
  local: boolean;
  cache: CacheView;
  controls: AdminFilterControls;
  writes: OptimisticWrites;
}

const SmsListContext = createContext<SmsListValue | null>(null);

export function useSmsList(): SmsListValue {
  const value = useContext(SmsListContext);
  if (!value) {
    throw new Error("useSmsList must be used inside a <SmsListProvider>.");
  }
  return value;
}

export function SmsListProvider({
  source,
  state,
  messages,
  total,
  page,
  totalPages,
  tallies,
  children,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  messages: SmsSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  tallies: SmsTallies;
  children: React.ReactNode;
}) {
  const table = useLocalSmsTable({
    source,
    state,
    messages,
    total,
    page,
    totalPages,
    tallies,
  });

  const writes = useOptimisticWrites<SmsSnapshotRow>({
    source: "sms",
    patchRow: table.patchRow,
  });

  const controls = useAdminFilters({
    basePath: source.path,
    state: table.state,
    transport: table.transport,
  });

  const value = useMemo<SmsListValue>(
    () => ({
      source,
      state: table.state,
      messages: table.rows,
      total: table.total,
      page: table.page,
      totalPages: table.totalPages,
      tallies: table.tallies,
      local: table.local,
      cache: table.cache,
      controls,
      writes,
    }),
    [table, controls, writes],
  );

  return <SmsListContext.Provider value={value}>{children}</SmsListContext.Provider>;
}

/** The sentence under the heading, read from the same state as the list below it. */
export function SmsListDescription() {
  const { source, state, messages, total } = useSmsList();
  return <>{describeList(source, state, messages.length, total)}</>;
}

/** The cache chip and the unsaved-changes pill, for the heading's action slot. */
export function SmsHeaderStatus() {
  const { cache, writes } = useSmsList();

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
