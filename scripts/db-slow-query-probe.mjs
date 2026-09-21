/**
 * Looks for the statement that could plausibly have burned the 120s
 * statement_timeout: slow queries by mean/total execution time, cron jobs that
 * hammer the DB, and missing-index (seq scan) signals on the admin tables.
 *
 * Run with:  node --env-file=.env scripts/db-slow-query-probe.mjs
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
});

async function attempt(label, fn) {
  try {
    await fn();
  } catch (error) {
    console.log(`\n[skipped] ${label}: code=${error.code} ${error.message}`);
  }
}

await attempt("extensions", async () => {
  const rows = await sql`
    select extname, extversion from pg_extension order by extname
  `;
  console.log(`extensions: ${rows.map((r) => `${r.extname}@${r.extversion}`).join(", ")}`);
});

await attempt("pg_stat_statements slowest", async () => {
  const rows = await sql`
    select calls,
           round(total_exec_time)::int as total_ms,
           round(mean_exec_time)::int as mean_ms,
           round(max_exec_time)::int as max_ms,
           rows,
           left(regexp_replace(query, '\\s+', ' ', 'g'), 110) as q
    from pg_stat_statements
    where query not ilike '%pg_stat_statements%'
    order by max_exec_time desc
    limit 15
  `;
  console.log("\npg_stat_statements — worst statements by MAX execution time:");
  for (const r of rows) {
    console.log(
      `  calls=${r.calls} max=${r.max_ms}ms mean=${r.mean_ms}ms total=${r.total_ms}ms rows=${r.rows} :: ${r.q}`,
    );
  }

  const stemfest = await sql`
    select calls,
           round(total_exec_time)::int as total_ms,
           round(mean_exec_time)::int as mean_ms,
           round(max_exec_time)::int as max_ms,
           left(regexp_replace(query, '\\s+', ' ', 'g'), 110) as q
    from pg_stat_statements
    where query ilike '%stem_fest%'
    order by total_exec_time desc
    limit 12
  `;
  console.log("\npg_stat_statements — stem_fest statements:");
  for (const r of stemfest) {
    console.log(
      `  calls=${r.calls} mean=${r.mean_ms}ms max=${r.max_ms}ms total=${r.total_ms}ms :: ${r.q}`,
    );
  }
});

await attempt("cron jobs", async () => {
  const jobs = await sql`select jobid, schedule, active, left(command, 90) as cmd from cron.job`;
  console.log(`\ncron.job rows: ${jobs.length}`);
  for (const j of jobs) {
    console.log(`  jobid=${j.jobid} active=${j.active} ${j.schedule} :: ${j.cmd}`);
  }
  const runs = await sql`
    select status, count(*)::int as n from cron.job_run_details
    group by status order by n desc
  `;
  console.log(`  run history: ${runs.map((r) => `${r.status}=${r.n}`).join(", ") || "<none>"}`);
});

await attempt("table stats", async () => {
  const rows = await sql`
    select relname,
           seq_scan,
           idx_scan,
           n_live_tup,
           last_autovacuum,
           last_autoanalyze
    from pg_stat_user_tables
    where relname in ('stem_fest_registrations', 'stem_fest_payment_sms',
                      'campus_ambassador_registrations', 'volunteer_registrations')
    order by relname
  `;
  console.log("\ntable activity:");
  for (const r of rows) {
    console.log(
      `  ${r.relname}: seq_scan=${r.seq_scan} idx_scan=${r.idx_scan} live=${r.n_live_tup} last_autovacuum=${r.last_autovacuum ?? "-"}`,
    );
  }
});

await attempt("indexes on stemfest tables", async () => {
  const rows = await sql`
    select tablename, indexname, indexdef
    from pg_indexes
    where tablename like 'stem_fest%'
    order by tablename, indexname
  `;
  console.log("\nindexes:");
  for (const r of rows) {
    console.log(`  ${r.tablename}.${r.indexname}: ${r.indexdef.replace(/^CREATE /, "")}`);
  }
});

await sql.end({ timeout: 5 });
console.log("\ndone");
