"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AttendanceSnapshot,
  AttendanceSnapshotRow,
  AttendanceTally,
  CachedSnapshot,
  SmsSnapshot,
  SmsSnapshotRow,
  SmsTallies,
  StemfestSnapshot,
  StemfestSnapshotRow,
} from "@/lib/admin/snapshot";
import {
  buildAdminHref,
  parseAdminQuery,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import {
  localAttendanceTally,
  localSmsTallies,
  localStemfestStats,
  queryAttendanceLocally,
  querySmsLocally,
  queryStemfestLocally,
  type LocalPage,
} from "@/lib/admin/local-query";
import type { StemfestStats } from "@/lib/actions/registrations";
import type { AdminQueryTransport } from "./use-admin-filters";
import { useSnapshotCache, type CacheView } from "./use-snapshot-cache";

/**
 * Answering one table's list from this browser, and keeping the URL honest about it.
 *
 * The three fest tables used to receive `rows / total / page / totalPages` as props
 * and ask the server for a new set on every interaction. The hooks here hand back the
 * *same shape*, produced either from those props or by `src/lib/admin/local-query.ts`
 * over the cached copy, plus a `transport` that tells `useAdminFilters` which of the
 * two it is talking to.
 *
 * ## The fallback *is* the current code path
 *
 * With no cached copy — first paint, a dead connection, a browser that will not open
 * IndexedDB, a matcher that could not reproduce the server's page — `transport` is
 * `undefined`, the props come back verbatim, and the panel navigates exactly as it
 * always has. That is why there is no feature flag: the degraded mode is the tested
 * mode, not a second one somebody has to get right under pressure.
 *
 * ## The handoff guard
 *
 * Local mode takes over only after asserting that the local query, run over the
 * *pristine* download for the state the server just rendered, returns the same total
 * and the same ordered ids the server returned. If it does not, the cache is suspect
 * and the panel keeps querying.
 *
 * That is what turns a matcher bug into a *performance* problem rather than a
 * wrong-answer problem, and it costs one comparison per handoff.
 * `scripts/verify-local-query.ts` is what makes it rarely fire.
 *
 * ## Adopting navigations
 *
 * A filter picked locally never reaches the server, so the props go on describing an
 * older list. The hook therefore tracks the state it has been answering — `applied` —
 * and adopts a *real* navigation (a document load, Back, a pasted link, a `<Link>`) by
 * comparing hrefs. Comparing hrefs rather than objects is what makes that work:
 * `buildAdminHref` canonicalises filter order and omits defaults, so the state the
 * address bar was parsed from and the state this hook submitted produce the same
 * string, and a soft commit is not mistaken for a new navigation.
 */

/** What the Server Component rendered — the page the guard is checked against. */
interface ServerPage<TRow> {
  rows: TRow[];
  total: number;
  page: number;
  totalPages: number;
}

/** One cached row of a snapshot, without making every caller spell it out. */
type RowOf<TSnapshot extends CachedSnapshot> = TSnapshot["rows"][number];

export interface LocalTable<TRow> extends ServerPage<TRow> {
  /** The state the rows on screen answer to: the server's, or the locally applied one. */
  state: AdminQueryState;
  /** `true` when `rows` came from this browser rather than from the server. */
  local: boolean;
  /** `undefined` until the cache has proved itself; the table then navigates normally. */
  transport: AdminQueryTransport | undefined;
  cache: CacheView;
  /** Overlay `patch` on one visible row, for an optimistic write. */
  patchRow: (rowId: string, patch: Partial<TRow>) => void;
}

interface CoreArgs<TSnapshot extends CachedSnapshot> {
  source: TSnapshot["source"];
  config: AdminSourceConfig;
  server: ServerPage<RowOf<TSnapshot>>;
  serverState: AdminQueryState;
  query: (
    rows: RowOf<TSnapshot>[],
    state: AdminQueryState,
  ) => LocalPage<RowOf<TSnapshot>>;
}

function useLocalTableCore<TSnapshot extends CachedSnapshot>(
  args: CoreArgs<TSnapshot>,
): LocalTable<RowOf<TSnapshot>> & { snapshot: TSnapshot | null; cachedRows: RowOf<TSnapshot>[] } {
  const { config, server, serverState, query, source } = args;
  const cache = useSnapshotCache<TSnapshot>(source);
  type TRow = RowOf<TSnapshot>;

  const [applied, setApplied] = useState<AdminQueryState>(serverState);
  const [agrees, setAgrees] = useState(false);

  /**
   * The optimistic edits, keyed by row id.
   *
   * They belong here rather than in the cache because they are applied to whatever is
   * about to be rendered — the cached list once it lands, and the Server Component's
   * page before it does. A write that only overlaid the cache would leave the first
   * thirty seconds of a session, the window in which a fest desk is most likely to
   * start working, showing a pill that had not moved under a toast saying it had.
   */
  const [patches, setPatches] = useState<Record<string, Partial<TRow>>>({});

  const patchRow = useCallback(
    (rowId: string, patch: Partial<TRow>) => {
      setPatches((current) => ({ ...current, [rowId]: { ...current[rowId], ...patch } }));
    },
    [],
  );

  // The server's page, spread into the values that actually matter. `server` itself is
  // a fresh object on every render of the provider, so nothing below may depend on it —
  // a memo that did would re-sort the whole cached list on each keystroke in the search
  // box. These four come from the Server Component's props and are stable until it next
  // renders, which is exactly the change worth reacting to.
  const { rows: serverRows, total: serverTotal } = server;
  const serverHref = buildAdminHref(config.path, serverState);

  // The download the guard was last run against, kept in a ref so the effect can read
  // the current copy without the copy itself being a dependency.
  const downloadedRef = useRef(cache.snapshot);
  downloadedRef.current = cache.snapshot;

  /**
   * The handoff guard.
   *
   * Read against the *pristine* download, never the patched rows: an optimistic write
   * legitimately changes what `payment=verified` returns, and that must not be read as
   * a cache that disagrees with the database.
   *
   * Keyed on `cache.revision` — which moves only when the whole copy is replaced —
   * rather than on the rows. A freshness append is the cache learning about a new
   * registration, not the matcher being wrong; re-checking an appended cache against a
   * server page from before the append would fail, and turn the fast path off once a
   * minute.
   */
  useEffect(() => {
    const downloaded = downloadedRef.current;
    if (!downloaded) {
      setAgrees(false);
      return;
    }

    const answered = query([...downloaded.rows], serverState);
    setAgrees(
      answered.total === serverTotal &&
        answered.rows.length === serverRows.length &&
        answered.rows.every((row, index) => row.id === serverRows[index]?.id),
    );
  }, [cache.revision, query, serverHref, serverRows, serverState, serverTotal]);

  const local = cache.snapshot !== null && agrees;

  // A real navigation replaces what this hook has been answering, because its props now
  // describe the list the address bar asks for. A soft commit does not: the href already
  // matches, so the locally applied state stands and no round trip is wasted.
  useEffect(() => {
    setApplied((current) =>
      buildAdminHref(config.path, current) === serverHref ? current : serverState,
    );
  }, [config.path, serverHref, serverState]);

  // Back and Forward. Next re-renders the tree for the restored URL in its own time;
  // re-deriving from the address bar here is what makes the page change instantly, and
  // the two settle on the same list because it is the same function of the same URL.
  useEffect(() => {
    if (!local) return;

    const onPopState = () => {
      const raw: Record<string, string> = {};
      new URLSearchParams(window.location.search).forEach((value, key) => {
        raw[key] = value;
      });
      setApplied(parseAdminQuery(config, raw));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [local, config]);

  const transport = useMemo<AdminQueryTransport | undefined>(
    () => (local ? { submit: (next) => setApplied(next) } : undefined),
    [local],
  );

  // The rows as they now appear to this admin: the cached list once it has landed and
  // passed the guard, the Server Component's page until then, with the optimistic edits
  // overlaid on either.
  const shown = useMemo(() => {
    const base = local ? (cache.snapshot?.rows ?? []) : server.rows;
    if (Object.keys(patches).length === 0) return base as TRow[];

    return base.map((row) => {
      const patch = patches[row.id];
      return patch ? ({ ...row, ...patch } as TRow) : row;
    });
  }, [local, cache.snapshot, server.rows, patches]);

  const answered = useMemo(() => {
    if (!local) {
      return {
        rows: shown,
        total: server.total,
        page: server.page,
        totalPages: server.totalPages,
      };
    }

    const list = query(shown, applied);
    return { rows: list.rows, total: list.total, page: list.page, totalPages: list.totalPages };
    // `server` is read field by field above so this memo's identity does not change on
    // every render; the four values it contributes are what this depends on.
  }, [local, shown, applied, query, server.total, server.page, server.totalPages]);

  return {
    state: local ? applied : serverState,
    local,
    transport,
    cache: cache.cache,
    patchRow,
    snapshot: cache.snapshot,
    // The whole cached list with the edits applied — what the figures are computed
    // over. `rows` below is one *page* of it, and a stat card fed a page prints the
    // page: 25 registrations where the table holds 804.
    cachedRows: shown,
    ...answered,
  };
}

// ── The three tables ─────────────────────────────────────────────────────────

/**
 * The registrations table, and the eight figures beside it.
 *
 * The figures are recomputed from the cached rows whenever the browser is answering,
 * because marking a payment Verified moves that row between buckets and changes what
 * the club has collected — a card that still printed the downloaded numbers would
 * contradict the pill the admin just clicked. A `truncated` copy holds only the newest
 * slice, so it cannot produce whole-table figures and the ones that came with it stand,
 * with the chip saying what is actually cached.
 */
export function useLocalStemfestTable({
  source,
  state,
  registrations,
  total,
  page,
  totalPages,
  stats: serverStats,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  registrations: StemfestSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  stats: StemfestStats;
}): LocalTable<StemfestSnapshotRow> & { stats: StemfestStats } {
  const core = useLocalTableCore<StemfestSnapshot>({
    source: "stemfest",
    config: source,
    server: { rows: registrations, total, page, totalPages },
    serverState: state,
    query: (rows, queryState) => queryStemfestLocally(rows, queryState),
  });

  const stats = useMemo<StemfestStats>(() => {
    const shipped = core.snapshot?.stats ?? serverStats;
    if (!core.local || !core.snapshot || core.snapshot.truncated) return shipped;
    return localStemfestStats(core.cachedRows, core.snapshot.generatedAt);
  }, [core.local, core.snapshot, core.cachedRows, serverStats]);

  return { ...core, stats };
}

/**
 * The forwarded-SMS log, and its three status tallies.
 *
 * Same rule as above, and the same exception for a truncated copy.
 */
export function useLocalSmsTable({
  source,
  state,
  messages,
  total,
  page,
  totalPages,
  tallies: serverTallies,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  messages: SmsSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  tallies: SmsTallies;
}): LocalTable<SmsSnapshotRow> & { tallies: SmsTallies } {
  const core = useLocalTableCore<SmsSnapshot>({
    source: "sms",
    config: source,
    server: { rows: messages, total, page, totalPages },
    serverState: state,
    query: (rows, queryState) => querySmsLocally(rows, queryState),
  });

  const tallies = useMemo<SmsTallies>(() => {
    const shipped = core.snapshot?.tallies ?? serverTallies;
    if (!core.local || !core.snapshot || core.snapshot.truncated) return shipped;
    return localSmsTallies(core.cachedRows);
  }, [core.local, core.snapshot, core.cachedRows, serverTallies]);

  return { ...core, tallies };
}

/**
 * The attendance sheet, and the two figures above it.
 *
 * Same rule as the other two, and the same exception for a truncated copy. The
 * figures matter here more than they do elsewhere: "marked present: 412 of 804" is
 * the sentence a desk reports at the end of a session, and an optimistic tick that
 * moved a row without moving the count would make the switch and the headline
 * contradict each other on the same screen.
 */
export function useLocalAttendanceTable({
  source,
  state,
  participants,
  total,
  page,
  totalPages,
  tally: serverTally,
}: {
  source: AdminSourceConfig;
  state: AdminQueryState;
  participants: AttendanceSnapshotRow[];
  total: number;
  page: number;
  totalPages: number;
  tally: AttendanceTally;
}): LocalTable<AttendanceSnapshotRow> & { tally: AttendanceTally } {
  const core = useLocalTableCore<AttendanceSnapshot>({
    source: "attendance",
    config: source,
    server: { rows: participants, total, page, totalPages },
    serverState: state,
    query: (rows, queryState) => queryAttendanceLocally(rows, queryState),
  });

  const tally = useMemo<AttendanceTally>(() => {
    const shipped = core.snapshot?.tally ?? serverTally;
    if (!core.local || !core.snapshot || core.snapshot.truncated) return shipped;
    return localAttendanceTally(core.cachedRows);
  }, [core.local, core.snapshot, core.cachedRows, serverTally]);

  return { ...core, tally };
}
