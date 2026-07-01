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
    max: 1,            // Single connection — safe for serverless & free tier
    idle_timeout: 20,  // Close idle connections after 20s
    connect_timeout: 10,
    prepare: false,    // Required for Supavisor (connection pooler) — it
                       // doesn't support prepared statements in transaction mode
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
