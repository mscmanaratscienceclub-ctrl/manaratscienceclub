"use client";

import { createContext, useContext, useMemo } from "react";

import type { StemfestStats } from "@/lib/actions/registrations";
import {
  describeList,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import type { StemfestSnapshotRow } from "@/lib/admin/snapshot";
import {
  useAdminFilters,
  type AdminFilterControls,
} from "@/lib/hooks/use-admin-filters";
import { useLocalStemfestTable } from "@/lib/hooks/use-local-admin-table";
import {
  useOptimisticWrites,
  type OptimisticWrites,
} from "@/lib/hooks/use-optimistic-action";
import type { CacheView } from "@/lib/hooks/use-snapshot-cache";
import CacheChip, { PendingPill } from "./cache-chip";

/**
 * One place for the STEM Fest list's live state, so nothing on the page can drift.
 *
 * The heading's row count, the eight figures, the filter bar, the table and its
 * pagination all describe the same list. Before the browser could answer a query, they
 * all read one set of props from the Server Component and could not disagree. Now the
 * list can move without a round trip — and a page that printed the server's `total`
 * beside a table showing a cached page would be the card-versus-pill drift this repo has
 * already been audited for, one floor higher.
 *
 * So the provider owns the controller, the filter controls and the write queue, and
 * every part of the page asks it. The provider sits in the page rather than in
 * `AdminShell` because only this section has a cache to be honest about.
 */
interface StemfestListValue {
  source: AdminSourceConfig;
  /** The state the rows on screen answer to — not necessarily the one the server rendered. */
  state: AdminQueryState;
  registrations: StemfestSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  stats: StemfestStats;
  /** `true` while the list is being answered from this browser. */
  local: boolean;
  cache: CacheView;
  controls: AdminFilterControls;
  writes: OptimisticWrites;
}

const StemfestListContext = createContext<StemfestListValue | null>(null);

export function useStemfestList(): StemfestListValue {
  const value = useContext(StemfestListContext);
  if (!value) {
    throw new Error("useStemfestList must be used inside a <StemfestListProvider>.");
  }
  return value;
}

export function StemfestListProvider({
  source,
  state,
  registrations,
  total,
  page,
  totalPages,
  stats,
  children,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  registrations: StemfestSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  stats: StemfestStats;
  children: React.ReactNode;
}) {
  const table = useLocalStemfestTable({
    source,
    state,
    registrations,
    total,
    page,
    totalPages,
    stats,
  });

  const writes = useOptimisticWrites<StemfestSnapshotRow>({
    source: "stemfest",
    patchRow: table.patchRow,
  });

  // Driven by the *applied* state, not the server's: a filter picked locally has to be
  // what the next change derives from, or the second pick would silently drop the first.
  const controls = useAdminFilters({
    basePath: source.path,
    state: table.state,
    transport: table.transport,
  });

  const value = useMemo<StemfestListValue>(
    () => ({
      source,
      state: table.state,
      registrations: table.rows,
      total: table.total,
      page: table.page,
      totalPages: table.totalPages,
      stats: table.stats,
      local: table.local,
      cache: table.cache,
      controls,
      writes,
    }),
    [table, controls, writes],
  );

  return (
    <StemfestListContext.Provider value={value}>
      {children}
    </StemfestListContext.Provider>
  );
}

/** The sentence under the heading, read from the same state as the list below it. */
export function StemfestListDescription() {
  const { source, state, registrations, total } = useStemfestList();
  return <>{describeList(source, state, registrations.length, total)}</>;
}

/** The cache chip and the unsaved-changes pill, for the heading's action slot. */
export function StemfestHeaderStatus() {
  const { cache, writes } = useStemfestList();

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
