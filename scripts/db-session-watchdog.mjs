/**
 * Watchdogged session inventory. Uses its own connection, sets a 3s statement
 * timeout per transaction, and force-exits after 45s so it can never hang like
 * the app does.
 *
 * Run with:  node --env-file=.env scripts/db-session-watchdog.mjs
 */
import postgres from "postgres";

setTimeout(() => {
  console.log("\n[WATCHDOG] 45s elapsed — some query is wedged. Forcing exit.");
  process.exit(1);
}, 45_000).unref?.();

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
});

async function withTimeout(label, fn) {
  try {
    return await sql.begin(async (tx) => {
      await tx`set local statement_timeout = '3000'`;
      return await fn(tx);
    });
  } catch (error) {
    console.log(`[FAILED] ${label}: code=${error.code} ${error.message}`);
    return null;
  }
}

const t0 = Date.now();
const identity = await withTimeout("identity", async (tx) => {
  const [row] = await tx`select current_user, now() as ts`;
  return row;
});
console.log(`identity in ${Date.now() - t0} ms: ${JSON.stringify(identity)}`);

const sessions = await withTimeout("session list", (tx) =>
  tx`
    select pid, usename, application_name, state, wait_event_type, wait_event,
           backend_start, now() - xact_start as xact_age,
           now() - query_start as query_age,
           left(regexp_replace(query, '\\s+', ' ', 'g'), 85) as query
    from pg_stat_activity
    where datname = current_database()
    order by (state = 'active') desc, query_start
    limit 25
  `,
);

if (sessions) {
  console.log(`\nsessions (${sessions.length}):`);
  for (const s of sessions) {
    console.log(
      `  pid=${s.pid} app=${s.application_name || "<empty>"} user=${s.usename} state=${s.state} wait=${s.wait_event_type ?? "-"}/${s.wait_event ?? "-"} xact=${s.xact_age ?? "-"} age=${s.query_age ?? "-"}`,
    );
    console.log(`     ${s.query}`);
  }
}

await sql.end({ timeout: 5 });
console.log("\ndone");
process.exit(0);
