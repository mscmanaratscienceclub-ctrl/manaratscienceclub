"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAdminEmail } from "@/components/admin/admin-identity";
import type { CacheStatus } from "@/components/admin/cache-chip";
import { isCacheSupported, readSnapshot, writeSnapshot } from "@/lib/admin/idb";
import {
  SNAPSHOT_DELTA_LIMIT,
  SNAPSHOT_SOURCES,
  type CachedSnapshot,
  type SnapshotSource,
} from "@/lib/admin/snapshot";
import {
  SnapshotError,
  fetchSnapshotDelta,
  loadSnapshot,
  probeSnapshot,
} from "@/lib/admin/snapshot-client";

/**
 * Downloading, holding, freshening and patching one table's browser cache.
 *
 * The half of ADR-0044 that is about *having* the rows; `use-local-admin-table.ts` is
 * the half about answering a query from them. Split because the two fail differently:
 * a download that never arrives leaves the panel in network mode, which is what it
 * does today, whereas a patch applied to the wrong rows would put a wrong answer on
 * screen.
 *
 * Three things here are load-bearing and easy to lose sight of:
 *
 * **This hook holds only what the server sent.** An admin's optimistic edit is not
 * applied to the snapshot; `use-local-admin-table.ts` overlays it on the rows about to
 * be rendered. That keeps the handoff guard honest — it always compares a *pristine*
 * copy against the server's page — and it means an edit shows up whether the list is
 * being answered from the cache or from the database, including in the seconds before
 * the cache exists.
 *
 * **Nothing is downloaded until the page has rendered.** The Server Component already
 * produced a correct page one and correct figures, so the first download starts at
 * `requestIdleCallback` and never competes with hydration for the connection this whole
 * feature exists to spare.
 *
 * **`revision` moves only when the copy is replaced.** A delta appends rows to a list
 * the guard has already vouched for; re-vouching after an append would compare a cache
 * that has *learned about a registration* against a server page from before it, fail,
 * and turn the fast path off every sixty seconds.
 */

/** How long the browser is given to finish hydrating before the download starts. */
const IDLE_TIMEOUT_MS = 1_500;

/**
 * How stale the *other* table's copy may be before opening this one warms it.
 *
 * An admin who searches registrations and then clicks across to the SMS log should find
 * it ready. A minute is short enough that the copy is not from another shift and long
 * enough that going back and forth does not download twice.
 */
const WARM_AFTER_MS = 60_000;

/** How often the panel asks whether the table has moved, seen and unseen. */
const SYNC_INTERVAL_MS = 60_000;
const SYNC_HIDDEN_MS = 300_000;

/**
 * What a failed download costs before the next attempt, and what a probe costs.
 *
 * A desk with a dead connection must not hammer the pooler: the whole point of the
 * cache is that the panel keeps working *while* the network is down, so a failing
 * download quietly backs off to ten minutes rather than retrying on every render.
 */
const FAILURE_BACKOFF_MS = [30_000, 120_000, 600_000] as const;

/** What `loadOnce` files, whatever source it was asked for. */
type AnySnapshot = CachedSnapshot;

/**
 * One download per source, shared by every hook that asks for it.
 *
 * Without it, a remount or a second table on the same page would start a second fetch
 * of the same few hundred kilobytes on the connection this feature exists to spare.
 */
const inflight = new Map<SnapshotSource, Promise<AnySnapshot>>();

function loadOnce(source: SnapshotSource, admin: string): Promise<AnySnapshot> {
  const existing = inflight.get(source);
  if (existing) return existing;

  const promise = loadSnapshot(source, admin).finally(() => {
    if (inflight.get(source) === promise) inflight.delete(source);
  });

  inflight.set(source, promise);
  return promise;
}

/** Fetch the other cached tables' copies if theirs is missing or older than a minute. */
async function warmOtherTables(source: SnapshotSource, admin: string): Promise<void> {
  for (const other of SNAPSHOT_SOURCES) {
    if (other === source) continue;

    try {
      const cached = await readSnapshot(other, admin);
      const age = cached ? Date.now() - Date.parse(cached.generatedAt) : Number.POSITIVE_INFINITY;
      if (age < WARM_AFTER_MS) continue;
      await loadOnce(other, admin);
    } catch {
      // Warming another table is a courtesy; its own hook reports a real failure.
    }
  }
}

/**
 * The one-line escape hatch for the first week this is on.
 *
 * There is no toggle in the UI: "no cache" is already today's code path, so a switch
 * would only put a decision on whoever is at the desk on the morning it matters. A
 * developer who needs to watch the network path sets `manarat.admin.localmode` to
 * `"0"`. Storage the page is not allowed to read is storage this feature cannot use
 * either, which is why the `catch` answers `true`.
 */
function localModeOff(): boolean {
  try {
    return window.localStorage.getItem("manarat.admin.localmode") === "0";
  } catch {
    return true;
  }
}

/** Run something once the browser is idle, or shortly after if it never is. */
function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(() => run(), { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(run, 200);
  return () => window.clearTimeout(handle);
}

/** A sentence for the chip's tooltip, which an admin reads rather than a console. */
function describeFailure(error: unknown): string {
  if (error instanceof SnapshotError) {
    return error.kind === "signed-out"
      ? "Your sign-in ended, so this list was cleared from the browser."
      : error.message;
  }
  return "The list could not be downloaded.";
}

/** What the chip prints, and the button that fetches again. */
export interface CacheView {
  status: CacheStatus;
  /** When the server produced these rows, as an ISO string. */
  generatedAt: string | null;
  rowCount: number;
  truncated: boolean;
  /** Why the last attempt failed; `null` when it did not. */
  message: string | null;
  /** `true` when the failure was a 401, which is a sign-in problem, not a network one. */
  signedOut: boolean;
  refresh: () => void;
}

export interface SnapshotCache<TSnapshot extends CachedSnapshot> {
  /** The copy as it arrived. `null` until one lands. */
  snapshot: TSnapshot | null;
  /** Moves only when the whole copy is replaced, so the handoff guard re-checks then. */
  revision: number;
  cache: CacheView;
}

/**
 * `source` decides what is fetched and filed; `TSnapshot` is what the caller's table
 * holds it as, and is the caller's assertion rather than a runtime check. The endpoint
 * routes on that same path segment and `loadSnapshot` rejects a body whose `source`
 * field does not match, so both halves of the assertion are already enforced.
 */
export function useSnapshotCache<TSnapshot extends CachedSnapshot>(
  source: SnapshotSource,
): SnapshotCache<TSnapshot> {
  const admin = useAdminEmail();

  const [snapshot, setSnapshot] = useState<TSnapshot | null>(null);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<CacheStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Read through a ref so the failure branch can ask "do we still have rows?", and the
  // poll can read the cursors, without either depending on the value it is deciding
  // whether to keep.
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  /** Replace the whole copy. The only thing that moves `revision`. */
  const replace = useCallback((loaded: TSnapshot) => {
    setSnapshot(loaded);
    setRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    // `admin` is `null` outside a signed-in session — the design-preview route renders
    // these same tables against fixture rows. "There is no cache here" is the honest
    // answer, and it is what keeps a preview from showing a chip that would never
    // resolve, or from touching a real participant list.
    if (!admin || !isCacheSupported() || localModeOff()) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;
    let retryHandle: number | undefined;
    let failures = 0;

    const download = async () => {
      setStatus((current) => (current === "ready" ? "refreshing" : "loading"));

      try {
        const loaded = (await loadOnce(source, admin)) as TSnapshot;
        if (cancelled) return;

        replace(loaded);
        setStatus("ready");
        setMessage(null);
        setSignedOut(false);
        void warmOtherTables(source, admin);
      } catch (error) {
        if (cancelled) return;

        setMessage(describeFailure(error));
        setSignedOut(error instanceof SnapshotError && error.kind === "signed-out");

        if (snapshotRef.current) {
          // Rows are already on screen and still answer a query. A refresh that did not
          // arrive is not a reason to throw them away.
          setStatus("ready");
          return;
        }

        setStatus("failed");
        // A dead connection is the case this feature exists for, so the next attempt
        // waits rather than competes with every other desk in the building.
        failures += 1;
        const wait =
          FAILURE_BACKOFF_MS[Math.min(failures - 1, FAILURE_BACKOFF_MS.length - 1)] ?? 600_000;
        retryHandle = window.setTimeout(download, wait);
      }
    };

    const cancel = whenIdle(() => void download());

    return () => {
      cancelled = true;
      if (retryHandle !== undefined) window.clearTimeout(retryHandle);
      cancel();
    };
  }, [admin, source, attempt, replace]);

  // ── Freshness ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!admin || status === "unsupported" || status === "failed") return;

    let stopped = false;
    let handle: number | undefined;

    const interval = () =>
      document.visibilityState === "visible" ? SYNC_INTERVAL_MS : SYNC_HIDDEN_MS;

    /**
     * Ask the server how big the table is now, and patch the cache to match.
     *
     * One probe is a dozen bytes, and a delta is only the rows since the newest one
     * already held — so a minute of polling costs two small requests against a pooler
     * that a fest desk on bad wifi would otherwise be hammering with every search.
     * `decidedCursor` is the part that cannot be detected by an append: it moves when
     * another admin decides a payment or sends a receipt, and a decision made elsewhere
     * outranks anything this browser holds, so a copy with an older one is refetched
     * whole rather than reasoned about row by row.
     */
    const tick = async () => {
      const held = snapshotRef.current;

      if (!navigator.onLine || !held) {
        // Offline or nothing to compare against: the row cache still answers queries,
        // and the download effect above owns getting the first copy.
        return;
      }

      try {
        const probe = await probeSnapshot(source);
        if (stopped) return;

        const decided = (probe.decidedCursor ?? null) !== (held.decidedCursor ?? null);
        const deleted = probe.count < held.count;
        const tooManyNew = probe.count - held.rows.length > SNAPSHOT_DELTA_LIMIT;

        if (deleted || decided || tooManyNew) {
          replace((await loadOnce(source, admin)) as TSnapshot);
          return;
        }

        if ((probe.cursor ?? null) === (held.cursor ?? null)) return;
        if (!held.cursor) {
          // An empty copy cannot be patched, because there is no cursor to ask from.
          replace((await loadOnce(source, admin)) as TSnapshot);
          return;
        }

        const delta = await fetchSnapshotDelta(source, held.cursor);
        if (stopped) return;

        if (delta.truncated) {
          replace((await loadOnce(source, admin)) as TSnapshot);
          return;
        }

        setSnapshot((current) => {
          if (!current) return current;
          const merged = {
            ...current,
            generatedAt: delta.generatedAt,
            cursor: delta.probe.cursor,
            count: delta.probe.count,
            rows: [...delta.rows, ...current.rows],
          } as unknown as TSnapshot;
          void writeSnapshot(merged);
          return merged;
        });
      } catch {
        // A probe that did not arrive is a connection problem, not a cache problem: the
        // rows on screen stay, and the next tick asks again.
      }
    };

    const loop = () => {
      handle = window.setTimeout(() => {
        void (async () => {
          await tick();
          if (!stopped) loop();
        })();
      }, interval());
    };

    loop();

    const wake = () => {
      if (document.visibilityState !== "visible") return;
      if (handle !== undefined) window.clearTimeout(handle);
      void (async () => {
        await tick();
        if (!stopped) loop();
      })();
    };

    const reconnected = () => {
      if (handle !== undefined) window.clearTimeout(handle);
      void (async () => {
        await tick();
        if (!stopped) loop();
      })();
    };

    window.addEventListener("online", reconnected);
    document.addEventListener("visibilitychange", wake);

    return () => {
      stopped = true;
      if (handle !== undefined) window.clearTimeout(handle);
      window.removeEventListener("online", reconnected);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [admin, source, status, replace]);

  const refresh = useCallback(() => setAttempt((current) => current + 1), []);

  return {
    snapshot,
    revision,
    cache: {
      status,
      generatedAt: snapshot?.generatedAt ?? null,
      rowCount: snapshot?.rows.length ?? 0,
      truncated: snapshot?.truncated ?? false,
      message,
      signedOut,
      refresh,
    },
  };
}
