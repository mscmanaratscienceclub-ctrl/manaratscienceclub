import { sql } from "drizzle-orm";
import { db, type DbTransaction } from "./index";

/**
 * Guard rails for every read that touches Supabase through the pooler.
 *
 * Two independent timeouts are needed, because the pooler can fail in two
 * different ways and each one defeats the other guard:
 *
 * - **Server-side** (`SET LOCAL statement_timeout`): covers a statement that is
 *   genuinely executing — typically blocked behind a lock held by a SQL-editor
 *   transaction. Postgres cancels it and releases the connection. Supabase's
 *   role default is 120s, which pins a pooled connection for two minutes; 8s is
 *   far longer than any query here takes (measured: ≤48ms) and short enough
 *   that the connection comes back quickly.
 * - **Client-side**: covers the pooler losing a response. The backend is then
 *   `state = idle` with the statement already finished, so no `statement_timeout`
 *   can ever fire — without this, the request waits forever. This is the hang
 *   that made the admin panel load only "sometimes".
 *
 * `SET LOCAL` (rather than `SET`) is deliberate: the transaction pooler may route
 * each transaction to a different backend, so session-level settings would leak
 * onto whatever client uses that backend next. It also cannot be passed at
 * connection time — Supavisor discards startup parameters (verified: a
 * `connection: { statement_timeout }` option is silently ignored and reads back
 * as Supabase's default `2min`).
 */
const STATEMENT_TIMEOUT_MS = 8_000;
const CLIENT_TIMEOUT_MS = 12_000;

/**
 * One retry, on a fresh connection from the pool. Both failure modes above are
 * races — a retry re-issues the same statement and normally succeeds — and the
 * pool is sized above the app's concurrency, so a spare connection is available.
 */
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

/**
 * How far down an error's `cause` chain to look for a Postgres code. Drizzle's
 * wrapper adds one level; the bound just stops a self-referential `cause` from
 * looping forever.
 */
const MAX_CAUSE_DEPTH = 5;

/**
 * Postgres error codes worth retrying: connection loss, pooler reassignment,
 * overload. Deliberately **excludes** `57014` (`query_canceled`) — see
 * `isRetryableDbError`.
 */
const RETRYABLE_PG_CODES = new Set([
  "08000", // connection_exception
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08003", // connection_does_not_exist
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
  "08006", // connection_failure
  "53300", // too_many_connections
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
]);

/**
 * A statement cancelled by its own `statement_timeout` is *not* retried.
 * Measured: the server cancels at 8s and the client watchdog is 12s, so the
 * server always wins — a retry would double the user's wait to ~16s and fail
 * identically, because the query did not get slower the second time.
 */
const NON_RETRYABLE_PG_CODES = new Set([
  "57014", // query_canceled (our own statement_timeout, or a lock wait)
]);

/** The pooler's equivalents of the codes above, which arrive as bare messages. */
const RETRYABLE_MESSAGE_FRAGMENTS = [
  "connection closed",
  "connection ended",
  "connection terminated",
  "econnreset",
  "etimedout",
  "epipe",
  "socket hang up",
];

/** Thrown when a query did not report back inside `CLIENT_TIMEOUT_MS`. */
export class DbTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`Database query "${label}" did not respond within ${timeoutMs}ms`);
    this.name = "DbTimeoutError";
  }
}

/**
 * Walks an error's `cause` chain and returns the first Postgres error code.
 *
 * This walk is mandatory, not defensive: drizzle wraps every driver failure in
 * its own `Error` (`"Failed query: …"`) with the `PostgresError` on `.cause`.
 * Verified against the live pooler — `error.code` is `undefined` and only
 * `error.cause.code` reads `57014`. Reading `.code` directly made every entry in
 * `RETRYABLE_PG_CODES` unreachable, so no retry ever ran.
 */
function findPgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Every `message` in the `cause` chain, lowercased — the pooler's is on `.cause`. */
function collectMessages(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current; depth += 1) {
    if (current instanceof Error) messages.push(current.message);
    current = (current as { cause?: unknown }).cause;
  }
  return messages.join(" | ").toLowerCase();
}

/**
 * `true` for failures that a second attempt can plausibly fix. A connection that
 * dropped, a pooler that reassigned the backend, or a client-side watchdog that
 * fired mid-response are all infrastructure hiccups. An undefined table or a
 * permission error would fail identically next time, so it is surfaced
 * immediately instead of doubling the latency.
 */
export function isRetryableDbError(error: unknown): boolean {
  // The pooler lost the response — the exact hang this module exists to break.
  // A retry is issued on a fresh connection and normally succeeds.
  if (error instanceof DbTimeoutError) return true;

  const code = findPgErrorCode(error);
  if (code && NON_RETRYABLE_PG_CODES.has(code)) return false;
  if (code && RETRYABLE_PG_CODES.has(code)) return true;

  return RETRYABLE_MESSAGE_FRAGMENTS.some((fragment) => collectMessages(error).includes(fragment));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Races `work` against the client-side watchdog. The timer is always cleared so
 * it cannot hold the event loop open once the query settles.
 */
function withClientTimeout<T>(label: string, work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      reject(new DbTimeoutError(label, CLIENT_TIMEOUT_MS));
    }, CLIENT_TIMEOUT_MS);

    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Runs one or more related reads inside a single transaction, with a
 * server-side statement timeout and a client-side watchdog.
 *
 * Grouping reads into one transaction also has a correctness benefit: the page
 * rows and their totals come from the same snapshot instead of two separate
 * round trips that a concurrent insert can fall between.
 *
 * @param label Short name used in the timeout error and Sentry reports.
 * @param read Receives the transaction handle; issue reads **sequentially**
 *   (`await` each one). Pipelining several statements onto one pooled
 *   connection is what wedges Supavisor in the first place.
 */
export async function withDbTimeout<T>(
  label: string,
  read: (tx: DbTransaction) => Promise<T>,
): Promise<T> {
  let lastError: unknown = new Error(`Database query "${label}" did not run`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await withClientTimeout(
        label,
        db.transaction(async (tx) => {
          // Safe to interpolate: STATEMENT_TIMEOUT_MS is a module-level integer
          // constant, and `SET` does not accept bind parameters anyway.
          await tx.execute(
            sql.raw(`set local statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`),
          );
          return read(tx);
        }),
      );
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS || !isRetryableDbError(error)) break;
      await delay(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}
