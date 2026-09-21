/**
 * Pinpoints the concurrency shape that makes postgres.js + Supavisor hang, so
 * the app can be configured to avoid it.
 *
 *   node --env-file=.env scripts/db-hang-matrix.mjs <phase>
 *
 * Phases:
 *   seq1   pool max=1, queries awaited one at a time
 *   par1   pool max=1, queries fired concurrently (pipelined on one connection)
 *   par3   pool max=3, 3 concurrent queries
 *   par5   pool max=3, 5 concurrent queries (the /admin/sms-logs shape)
 *   par10  pool max=3, 10 concurrent queries
 *
 * Each phase has a 20s watchdog: if it hangs, we get the answer either way.
 */
import postgres from "postgres";

const phase = process.argv[2] ?? "par5";
const started = Date.now();
setTimeout(() => {
  console.log(`[HANG] ${phase}: watchdog fired at ${Date.now() - started}ms`);
  process.exit(1);
}, 20_000).unref?.();

const TABLE = "campus_ambassador_registrations";

const query = (sql, n) => [
  sql`select * from ${sql(TABLE)} order by created_at desc limit 25 offset 0`,
  sql`select count(*)::int as n from ${sql(TABLE)}`,
  sql`select count(*)::int as n from ${sql(TABLE)} where created_at >= now() - interval '7 days'`,
  sql`select count(*)::int as n from ${sql(TABLE)} where created_at >= date_trunc('month', now())`,
  sql`select count(distinct lower(btrim(school)))::int as n from ${sql(TABLE)}`,
  sql`select count(*)::int as n from ${sql(TABLE)} where school = ${String(n)}`,
  sql`select count(*)::int as n from ${sql(TABLE)} where class = ${String(n)}`,
  sql`select count(*)::int as n from ${sql(TABLE)} where name = ${String(n)}`,
  sql`select count(*)::int as n from ${sql(TABLE)} where type = ${String(n)}`,
  sql`select count(*)::int as n from ${sql(TABLE)} where phone = ${String(n)}`,
];

const CONFIG = {
  seq1: { max: 1, count: 5, sequential: true },
  par1: { max: 1, count: 5, sequential: false },
  par3: { max: 3, count: 3, sequential: false },
  par5: { max: 3, count: 5, sequential: false },
  par10: { max: 3, count: 10, sequential: false },
};

const { max, count, sequential } = CONFIG[phase];
const sql = postgres(process.env.DATABASE_URL, { max, prepare: false, connect_timeout: 15 });

const t0 = Date.now();
try {
  if (sequential) {
    for (const q of query(sql, 1)) await q;
  } else {
    await Promise.all(query(sql, 1).slice(0, count));
  }
  console.log(`[OK] ${phase} (max=${max}, ${count} queries, sequential=${sequential}): ${Date.now() - t0} ms`);
} catch (error) {
  console.log(`[ERROR] ${phase}: ${Date.now() - t0} ms code=${error.code} ${error.message}`);
}

await sql.end({ timeout: 3 });
process.exit(0);
