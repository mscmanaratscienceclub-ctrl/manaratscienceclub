/**
 * The admin panel's browser cache: a hand-rolled IndexedDB wrapper.
 *
 * Two STEM Fest tables keep a copy of their whole list here so that searching,
 * filtering, sorting and paging over a few hundred rows costs no round trip at all
 * (`obsidian/meta/decisions-log.md`, ADR-0044). The point of the cache is a fest desk
 * on a bad connection, so every function in here is written to fail *soft*: a browser
 * that will not open the database, a record that is too old, a write that runs out of
 * quota — all of them resolve to "no cache" and the panel simply queries the server
 * the way it always did. Nothing here ever throws at a caller.
 *
 * ## Why IndexedDB, and why by hand
 *
 * `localStorage` is out on two counts: it is synchronous, so reading a few hundred
 * rows of it blocks the main thread on the exact machine that can least afford a
 * stall, and its ~5 MB ceiling is uncomfortably close to a participant list that
 * carries every registration's name, school, email, phone and transaction ID.
 * IndexedDB is asynchronous and effectively unbounded.
 *
 * The wrapper is hand-rolled rather than `idb` because the whole surface the panel
 * needs is four verbs over two stores. A dependency would be more code than this
 * file, and this file has to be readable by whoever debugs the fest desk at 8am.
 *
 * ## What gets dropped, and when
 *
 * A record is read back only if all four of these hold — otherwise it is deleted and
 * reported absent:
 *
 * 1. its `v` stamp matches `SNAPSHOT_VERSION`, so a row shape this build cannot
 *    interpret is never guessed at;
 * 2. its `source` matches the store key it was filed under;
 * 3. its `admin` is the admin who is signed in now — a fest laptop is shared, and one
 *    browser's storage must not hand the next admin someone else's participant list;
 * 4. it is younger than `SNAPSHOT_MAX_AGE_MS`, measured from when *this browser*
 *    stored it rather than from the server's `generatedAt`, because the bound is about
 *    how long PII sits on a machine and a skewed client clock should not be able to
 *    make a fresh download look ancient.
 */

import {
  SNAPSHOT_MAX_AGE_MS,
  SNAPSHOT_VERSION,
  type CachedSnapshot,
  type SnapshotSource,
} from "@/lib/admin/snapshot";

const DB_NAME = "manarat-admin-cache";
const DB_VERSION = 1;

/**
 * The two stores. Both are created in version 1 — `pending` before anything writes
 * to it — because adding a store later means a schema bump, and an `onupgradeneeded`
 * that fires on a fest morning is a migration nobody gets to test.
 */
export type AdminStore = "snapshots" | "pending";

const SNAPSHOTS: AdminStore = "snapshots";

/** A cached list, plus when this browser took it. */
interface SnapshotRecord {
  storedAt: number;
  snapshot: CachedSnapshot;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Whether this browser offers IndexedDB at all.
 *
 * Deliberately a shallow check. Safari in private browsing hands out an `indexedDB`
 * that throws the moment it is touched, and no synchronous probe detects that
 * reliably — so the real answer comes from every operation below failing soft.
 */
export function isCacheSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function failure(message: string, cause?: Error | null): Error {
  return cause ? new Error(message, { cause }) : new Error(message);
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      // Keyed by source id — one record per table, overwritten on every refresh.
      if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS);
      // Keyed by the write's own id, so a queue can be drained one entry at a time.
      if (!db.objectStoreNames.contains("pending")) {
        db.createObjectStore("pending", { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema would otherwise block behind this handle
      // forever. Closing is the price of not wedging the panel in the other tab.
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () =>
      reject(failure("The browser cache could not be opened.", request.error));
    request.onblocked = () =>
      reject(failure("The browser cache is held open by another tab."));
  }).catch((error: unknown) => {
    // Forget the attempt so the next caller retries instead of inheriting a
    // rejection from a database that has since become reachable.
    dbPromise = null;
    throw error;
  });

  return dbPromise;
}

/** A read: settles with the request's own result. */
async function request<T>(
  store: AdminStore,
  mode: IDBTransactionMode,
  work: (source: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = work(tx.objectStore(store));

    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(failure("The browser cache could not be read.", req.error));
    tx.onabort = () =>
      reject(failure("The browser cache transaction was aborted.", tx.error));
  });
}

/**
 * A write: settles when the transaction *commits*, not when the request returns.
 *
 * The distinction is the quota case. A store that is full lets the `put` request
 * report success and then aborts the transaction, so resolving on the request would
 * tell the caller a record is cached that was never persisted — and the panel would
 * then answer searches from a list it does not actually have.
 */
async function commit<T>(
  store: AdminStore,
  work: (source: IDBObjectStore) => IDBRequest<T>,
): Promise<void> {
  const db = await openDb();

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    work(tx.objectStore(store));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(failure("The browser cache could not be written.", tx.error));
    tx.onabort = () => {
      // `QuotaExceededError` arrives as an abort reason, not as a request error.
      const reason = tx.error;
      reject(
        reason?.name === "QuotaExceededError"
          ? failure("The browser is out of room for this list.", reason)
          : failure("The browser cache transaction was aborted.", reason),
      );
    };
  });
}

// ── Generic store verbs ──────────────────────────────────────────────────────
//
// Exported because the pending-write queue (`src/lib/admin/pending-writes.ts`)
// stores its own record shape in its own store, and both queues have to share one
// database handle — two connections to one database is what turns a schema bump
// into a blocked tab.

export async function readRecord<T>(store: AdminStore, key: string): Promise<T | null> {
  try {
    const found = await request<T | undefined>(store, "readonly", (source) =>
      source.get(key),
    );
    return found ?? null;
  } catch (error) {
    console.warn(`[admin cache: read ${store}/${key} failed]`, error);
    return null;
  }
}

export async function readRecords<T>(store: AdminStore): Promise<T[]> {
  try {
    return await request<T[]>(store, "readonly", (source) => source.getAll());
  } catch (error) {
    console.warn(`[admin cache: read ${store} failed]`, error);
    return [];
  }
}

/**
 * File a record. `false` when the write did not land — the caller keeps working,
 * uncached.
 *
 * `key` is omitted for a store that carries its own key path (`pending`), where
 * passing one would be a `DataError`.
 */
export async function putRecord(
  store: AdminStore,
  value: unknown,
  key?: string,
): Promise<boolean> {
  try {
    await commit(store, (source) =>
      key === undefined ? source.put(value) : source.put(value, key),
    );
    return true;
  } catch (error) {
    console.warn(`[admin cache: write ${store} failed]`, error);
    return false;
  }
}

export async function deleteRecord(store: AdminStore, key: string): Promise<void> {
  try {
    await commit(store, (source) => source.delete(key));
  } catch (error) {
    console.warn(`[admin cache: delete ${store}/${key} failed]`, error);
  }
}

// ── Snapshots ────────────────────────────────────────────────────────────────

/**
 * The cached list for one table, or `null`.
 *
 * `admin` is the address signed in right now; a record stamped for anyone else is
 * deleted rather than returned, so the next download starts from an empty store.
 */
export async function readSnapshot(
  source: SnapshotSource,
  admin: string,
): Promise<CachedSnapshot | null> {
  const record = await readRecord<SnapshotRecord>(SNAPSHOTS, source);
  if (!record) return null;

  const snapshot = record.snapshot;
  const expired = Date.now() - record.storedAt > SNAPSHOT_MAX_AGE_MS;
  const usable =
    typeof snapshot === "object" &&
    snapshot !== null &&
    snapshot.v === SNAPSHOT_VERSION &&
    snapshot.source === source &&
    snapshot.admin === admin &&
    !expired;

  if (usable) return snapshot;

  // Gone rather than left to be re-examined on every keystroke. Best effort: a
  // browser that cannot delete it cannot serve it either, and the panel carries on.
  void deleteRecord(SNAPSHOTS, source);
  return null;
}

/**
 * Store a downloaded list.
 *
 * Returns whether it landed. A `false` is not an error to surface — the panel has
 * the rows in memory either way and simply will not have them after a reload.
 *
 * A quota failure is deliberately *not* answered by clearing the database to make
 * room: the other store holds admin writes that have not reached the server yet, and
 * trading an unsaved payment decision for a cache is the wrong trade in every
 * direction.
 */
export async function writeSnapshot(snapshot: CachedSnapshot): Promise<boolean> {
  return putRecord(
    SNAPSHOTS,
    { storedAt: Date.now(), snapshot } satisfies SnapshotRecord,
    snapshot.source,
  );
}

/**
 * Drop every cached participant list, and nothing else.
 *
 * Called on sign-out and on any 401, where the requirement is that no list of names,
 * schools, emails, phone numbers and TrxIDs survives in this browser. It clears the
 * `snapshots` store rather than deleting the database, because the other store holds
 * decisions an admin has made that the server has not received yet — and those are not
 * participant data. A row id, a status and an amount carry nobody's name, and losing
 * them is the one failure mode this whole design exists to avoid: a fest desk that
 * marked forty payments Verified, whose sign-in lapsed, and whose work vanished.
 *
 * The queue outlives the session; the server still decides whether each write in it is
 * allowed, and the session-expired notice promises the admin exactly this.
 */
export async function clearAdminCache(): Promise<void> {
  try {
    await commit(SNAPSHOTS, (source) => source.clear());
  } catch (error) {
    console.warn("[admin cache: clear snapshots failed]", error);
  }
}
