/**
 * Probes two things the admin-panel fix depends on:
 *
 *  1. Does `postgres.js`'s `connection: { ... }` option actually apply
 *     session-level GUCs (statement_timeout / application_name) through the
 *     Supavisor transaction pooler?
 *  2. What does the session inventory look like right now — how many backends
 *     belong to our app vs Supabase internals, and which are stuck?
 *
 * Run with:  node --env-file=.env scripts/db-timeout-probe.mjs
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
const APP_NAME = "manarat-probe";

const sql = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
  connection: {
    application_name: APP_NAME,
    statement_timeout: "5000",
    idle_in_transaction_session_timeout: "10000",
  },
});

try {
  const [settings] = await sql`
    select current_setting('application_name') as app_name,
           current_setting('statement_timeout') as statement_timeout,
           current_setting('idle_in_transaction_session_timeout') as idle_in_tx
  `;
  console.log("connection-option GUCs applied by postgres.js:");
  console.log(`  application_name              = ${settings.app_name}`);
  console.log(`  statement_timeout             = ${settings.statement_timeout}`);
  console.log(`  idle_in_transaction_timeout   = ${settings.idle_in_tx}`);

  const seen = await sql`
    select application_name, count(*)::int as n
    from pg_stat_activity
    where datname = current_database()
    group by application_name
    order by n desc
  `;
  console.log("\nsessions grouped by application_name:");
  for (const row of seen) {
    console.log(`  ${row.n.toString().padStart(3)}  ${row.application_name || "<empty>"}`);
  }

  const stuck = await sql`
    select pid, usename, application_name, state, wait_event_type, wait_event,
           backend_start, now() - xact_start as xact_age,
           now() - query_start as query_age,
           left(regexp_replace(query, '\\s+', ' ', 'g'), 100) as query
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
      and state = 'active'
      and now() - query_start > interval '5 seconds'
    order by query_start
    limit 15
  `;
  console.log(`\nsessions running/loitering > 5s: ${stuck.length}`);
  for (const s of stuck) {
    console.log(
      `  pid=${s.pid} app=${s.application_name || "<empty>"} state=${s.state} wait=${s.wait_event_type ?? "-"}/${s.wait_event ?? "-"} xact=${s.xact_age} age=${s.query_age} started=${s.backend_start?.toISOString?.() ?? s.backend_start}`,
    );
    console.log(`     ${s.query}`);
  }

  // Prove the statement_timeout we configured actually cancels work.
  const t0 = Date.now();
  try {
    await sql`select pg_sleep(30)`;
    console.log("\npg_sleep(30) was NOT cancelled — statement_timeout not applied!");
  } catch (error) {
    console.log(
      `\npg_sleep(30) cancelled after ${Date.now() - t0} ms — code=${error.code} ${error.message}`,
    );
  }
} catch (error) {
  console.log(`[FAILED] code=${error.code} ${error.message}`);
} finally {
  await sql.end({ timeout: 5 });
}
