import * as schema from "./schema";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

// ── Singleton ────────────────────────────────────────────────────────────────
// Next.js dev-mode HMR re-imports every module on each save.
// Without a singleton, each reload creates a NEW postgres pool, rapidly
// exhausting Supabase's free-tier 15-connection limit.
// We stash the connection on `globalThis` so it survives HMR reloads.

const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    // Small pool against the Supavisor transaction pooler (:6543). Kept > 1 so a
    // single wedged connection — e.g. after a transient free-tier pooler blip —
    // can't block every query in the app. That max:1 failure mode froze all
    // DB-backed routes (/, /blogs, /admin) indefinitely until a manual restart,
    // while non-DB routes stayed instant.
    max: 3,
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
