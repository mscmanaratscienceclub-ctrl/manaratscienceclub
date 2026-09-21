import * as schema from "./schema";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";

// ── Singleton ────────────────────────────────────────────────────────────────
// Next.js dev-mode HMR re-imports every module on each save.
// Without a singleton, each reload creates a NEW postgres pool, rapidly
// exhausting Supabase's free-tier 15-connection limit.
// We stash the connection on `globalThis` so it survives HMR reloads.

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

/**
 * Pool size. This is deliberately larger than the 3 it used to be, and the
 * reason is not throughput — it is a hard failure mode.
 *
 * `postgres.js` pipelines: when more queries are issued concurrently than there
 * are pooled connections, the extra queries are written onto an already-busy
 * connection. Through the Supavisor transaction pooler that can lose the
 * response outright — the backend finishes and reports `state = idle` while the
 * client waits forever, so no server-side timeout can ever fire. Measured
 * against this project's pooler on 2026-09-13:
 *
 *   5 sequential queries, max: 1 ............ ok   (2.4s)
 *   5 concurrent queries, max: 1 ............ HUNG (never returns)
 *   3 concurrent queries, max: 3 ............ ok   (0.8s)
 *   5 concurrent queries, max: 3 ............ ok   (0.8s)
 *   10 concurrent queries, max: 3 ........... HUNG
 *   30 concurrent queries, max: 3 ........... HUNG
 *
 * i.e. up to 2 queries pipelined per connection survived; 3 or more hung.
 * Sizing the pool above the app's real concurrency keeps every query on its own
 * connection. `/admin` is the widest caller — four independent actions fire at
 * once — so 5 also leaves a connection free for better-auth's session lookup.
 * The queries themselves are cheap (`pg_stat_statements` shows every
 * `stem_fest` read at ≤48ms), so the extra client connections cost nothing.
 */
const POOL_MAX = 5;

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    max: POOL_MAX,
    idle_timeout: 20,  // Close idle connections after 20s
    connect_timeout: 10,
    max_lifetime: 60 * 5, // Recycle each connection after ~5 min so a stuck one self-heals
    prepare: false,    // Required for Supavisor (connection pooler) — it
                       // doesn't support prepared statements in transaction mode
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });

export type Database = PostgresJsDatabase<typeof schema>;

/** The `tx` handed to the `db.transaction()` / `withDbTimeout()` callback. */
export type DbTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

