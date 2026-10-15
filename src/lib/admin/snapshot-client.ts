/**
 * Fetching and filing the admin panel's browser cache.
 *
 * The layer between the snapshot endpoint (`src/app/api/admin/snapshot/[kind]/route.ts`)
 * and the hook that renders from it. It owns three decisions the rest of the panel
 * should not have to repeat: how long to wait for a download on a bad connection,
 * what a 401 means for the rows already sitting in IndexedDB, and whether what came
 * back is actually the table that was asked for.
 *
 * This module runs in the browser. It reads no environment, touches no database and
 * imports the server's action layer for its *types* only.
 */

import { clearAdminCache, isCacheSupported, readSnapshot, writeSnapshot } from "@/lib/admin/idb";
import {
  SNAPSHOT_FETCH_TIMEOUT_MS,
  snapshotUrl,
  type AttendanceSnapshot,
  type AttendanceSnapshotRow,
  type CachedSnapshot,
  type SnapshotDelta,
  type SnapshotProbe,
  type SnapshotSource,
  type SmsSnapshot,
  type SmsSnapshotRow,
  type StemfestSnapshot,
  type StemfestSnapshotRow,
} from "@/lib/admin/snapshot";

/** One source's payload, so a caller that asked for `sms` is handed `SmsSnapshot`. */
interface SnapshotForSource {
  stemfest: StemfestSnapshot;
  sms: SmsSnapshot;
  attendance: AttendanceSnapshot;
}

export type SnapshotOf<TSource extends SnapshotSource> = SnapshotForSource[TSource];

interface DeltaRowForSource {
  stemfest: StemfestSnapshotRow;
  sms: SmsSnapshotRow;
  attendance: AttendanceSnapshotRow;
}

export type SnapshotDeltaOf<TSource extends SnapshotSource> = SnapshotDelta<
  DeltaRowForSource[TSource]
>;

/**
 * Why a download did not arrive.
 *
 * Split this finely because the panel answers each one differently: `signed-out`
 * empties the cache and points at the sign-in page, `timeout` and `network` are the
 * bad-connection case the whole feature exists for and are simply retried, and
 * `forbidden` or `server` mean something is wrong that waiting will not fix.
 */
export type SnapshotErrorKind =
  | "signed-out"
  | "forbidden"
  | "timeout"
  | "network"
  | "server";

export class SnapshotError extends Error {
  constructor(
    readonly kind: SnapshotErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "SnapshotError";
  }

  /** Whether another attempt could plausibly succeed without anyone fixing anything. */
  get retryable(): boolean {
    return this.kind === "timeout" || this.kind === "network" || this.kind === "server";
  }
}

/**
 * Ask the endpoint for one of the three shapes it serves.
 *
 * The abort timer is what keeps a dropped connection from turning into a chip that
 * spins forever: `SNAPSHOT_FETCH_TIMEOUT_MS` outlasts the server's own watchdog, so
 * a request the server abandoned is not one this side waits on indefinitely.
 *
 * The body comes back as `unknown` and each caller narrows it to the shape it asked
 * for. That is not ceremony — the endpoint routes on a path segment, so the check is
 * what stops one table's rows from being filed under another's key.
 */
async function fetchSnapshot(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SNAPSHOT_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      // Never let an intermediary or the browser's own HTTP cache serve a participant
      // list to the wrong session. The endpoint says `no-store`; this says it too.
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch (error) {
    throw new SnapshotError(
      controller.signal.aborted ? "timeout" : "network",
      error instanceof Error ? error.message : "The list could not be reached.",
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) {
    // The session died while a list of participants sat in this browser. Dropping it
    // here, rather than waiting for the sign-out button, is what makes the 12-hour
    // bound mean something on a laptop that is simply closed and handed over.
    await clearAdminCache();
    throw new SnapshotError("signed-out", "Your session has ended.");
  }

  if (response.status === 403) {
    throw new SnapshotError("forbidden", "This list is for admins.");
  }

  if (!response.ok) {
    throw new SnapshotError(
      response.status === 504 ? "timeout" : "server",
      `The server answered ${response.status}.`,
    );
  }

  return response.json();
}

/** Does this body look like a full snapshot for `source`? */
function isPayload(body: unknown, source: SnapshotSource): body is CachedSnapshot {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Partial<CachedSnapshot>;
  return (
    candidate.source === source &&
    typeof candidate.generatedAt === "string" &&
    Array.isArray(candidate.rows)
  );
}

/** The whole list, downloaded and filed. */
export async function refreshSnapshot<TSource extends SnapshotSource>(
  source: TSource,
): Promise<SnapshotOf<TSource>> {
  const body = await fetchSnapshot(snapshotUrl(source));
  if (!isPayload(body, source)) {
    throw new SnapshotError("server", "The list arrived in a shape this build cannot read.");
  }

  // A write that does not land is not a failure to report: the caller has the rows
  // in memory and can render from them, and will simply download again next time.
  if (isCacheSupported()) await writeSnapshot(body);

  return body as SnapshotOf<TSource>;
}

/**
 * The cached list if this browser has a usable one, otherwise a download.
 *
 * `admin` is the address signed in now, so a copy another admin left behind on this
 * machine is treated as no copy at all.
 */
export async function loadSnapshot<TSource extends SnapshotSource>(
  source: TSource,
  admin: string,
): Promise<SnapshotOf<TSource>> {
  if (isCacheSupported()) {
    const cached = await readSnapshot(source, admin);
    if (cached && isPayload(cached, source)) return cached as SnapshotOf<TSource>;
  }

  return refreshSnapshot(source);
}

/** The count and cursors, cheap enough to poll once a minute. */
export async function probeSnapshot(source: SnapshotSource): Promise<SnapshotProbe> {
  const body = await fetchSnapshot(`${snapshotUrl(source)}?probe=1`);
  const probe = body as Partial<SnapshotProbe> | null;

  if (typeof probe !== "object" || probe === null || typeof probe.count !== "number") {
    throw new SnapshotError("server", "The freshness check could not be read.");
  }

  return {
    count: probe.count,
    cursor: probe.cursor ?? null,
    decidedCursor: probe.decidedCursor ?? null,
  };
}

/** Rows filed since a cursor, or `truncated` when too many arrived to patch. */
export async function fetchSnapshotDelta<TSource extends SnapshotSource>(
  source: TSource,
  since: string,
): Promise<SnapshotDeltaOf<TSource>> {
  const url = `${snapshotUrl(source)}?since=${encodeURIComponent(since)}`;
  const body = await fetchSnapshot(url);
  const delta = body as Partial<SnapshotDelta<never>> | null;

  if (
    typeof delta !== "object" ||
    delta === null ||
    !Array.isArray(delta.rows) ||
    typeof delta.generatedAt !== "string"
  ) {
    throw new SnapshotError("server", "The new rows arrived in a shape this build cannot read.");
  }

  return body as SnapshotDeltaOf<TSource>;
}
