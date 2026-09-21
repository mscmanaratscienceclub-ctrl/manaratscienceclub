/**
 * One-off diagnostic for the admin panel's intermittent statement timeouts.
 *
 * Run with:  node --env-file=.env scripts/db-diagnose.mjs
 *
 * Prints (no secrets): the connected role, the server-side timeouts that apply
 * to it, which expected tables exist, how long each count takes, and any other
 * session/branch that is holding locks or sitting idle in a transaction.
 */
import postgres from "postgres";

const urls = [
  ["pooler (DATABASE_URL)", process.env.DATABASE_URL],
  ["direct (DIRECT_URL)", process.env.DIRECT_URL],
].filter(([, url]) => Boolean(url));

function redact(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port}${parsed.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

const TABLES = [
  "campus_ambassador_registrations",
  "volunteer_registrations",
  "stem_fest_registrations",
  "stem_fest_payment_sms",
];

async function check(label, url) {
  console.log(`\n=== ${label} — ${redact(url)} ===`);
  const sql = postgres(url, {
    max: 1,
    prepare: false,
    connect_timeout: 15,
    idle_timeout: 5,
  });

  try {
    const t0 = Date.now();
    const [identity] = await sql`
      select current_user,
             current_database(),
             inet_server_addr()::text as server_addr,
             (select setting from pg_settings where name = 'statement_timeout') as statement_timeout,
             (select setting from pg_settings where name = 'lock_timeout') as lock_timeout,
             (select setting from pg_settings where name = 'idle_in_transaction_session_timeout') as idle_in_tx_timeout,
             (select setting from pg_settings where name = 'max_connections') as max_connections,
             (select count(*) from pg_stat_activity)::int as active_sessions
    `;
    console.log(`  connect+identity: ${Date.now() - t0} ms`);
    console.log(`  role=${identity.current_user} db=${identity.current_database}`);
    console.log(
      `  statement_timeout=${identity.statement_timeout}  lock_timeout=${identity.lock_timeout}  idle_in_tx=${identity.idle_in_tx_timeout}`,
    );
    console.log(
      `  max_connections=${identity.max_connections} sessions=${identity.active_sessions}`,
    );

    const existing = new Set(
      (
        await sql`
          select table_name from information_schema.tables
          where table_schema = 'public'
        `
      ).map((r) => r.table_name),
    );
    console.log(`  public tables: ${[...existing].sort().join(", ")}`);

    for (const table of TABLES) {
      if (!existing.has(table)) {
        console.log(`  [MISSING] ${table}`);
        continue;
      }
      const start = Date.now();
      try {
        const [row] = await sql`
          select count(*)::int as n from ${sql(table)}
        `;
        console.log(`  [ok] ${table}: ${row.n} rows in ${Date.now() - start} ms`);
      } catch (error) {
        console.log(
          `  [FAIL] ${table}: ${Date.now() - start} ms — code=${error.code} ${error.message}`,
        );
      }
    }

    // Anything else holding locks, sitting idle in a transaction, or running long.
    const blockers = await sql`
      select pid,
             usename,
             state,
             wait_event_type,
             wait_event,
             now() - xact_start as xact_age,
             now() - query_start as query_age,
             left(regexp_replace(query, '\\s+', ' ', 'g'), 90) as query
      from pg_stat_activity
      where datname = current_database()
        and pid <> pg_backend_pid()
        and (state <> 'idle' or xact_start is not null)
      order by xact_start
      limit 10
    `;
    if (blockers.length === 0) {
      console.log("  no other busy/stuck sessions");
    } else {
      console.log("  other sessions:");
      for (const b of blockers) {
        console.log(
          `    pid=${b.pid} user=${b.usename} state=${b.state} wait=${b.wait_event_type ?? "-"}/${b.wait_event ?? "-"} xact=${b.xact_age ?? "-"} query=${b.query_age ?? "-"} :: ${b.query}`,
        );
      }
    }
  } catch (error) {
    console.log(`  [CONNECT/QUERY FAILED] code=${error.code} ${error.message}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

for (const [label, url] of urls) {
  await check(label, url);
}

console.log("\ndone");
