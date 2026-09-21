/**
 * Clean concurrency test — deliberately does NOT terminate any backend, so the
 * result is not contaminated by wedging Supavisor's internal pool (which is what
 * pg_terminate_backend on a pooled backend does).
 *
 * Reproduces the exact shape of an admin page load:
 *   /admin/sms-logs      -> 5 parallel queries (1 paged SELECT + 4 aggregates)
 *   /admin/science-competition -> 2 server actions, each firing queries
 *
 * Run with:  node --env-file=.env scripts/db-concurrency-clean.mjs
 */
import postgres from "postgres";

const started = Date.now();
setTimeout(() => {
  console.log(`\n[WATCHDOG] ${Date.now() - started}ms elapsed — HUNG. Forcing exit.`);
  process.exit(1);
}, 60_000).unref?.();

const PAGE_QUERIES = (sql, table) => [
  sql`select * from ${sql(table)} order by created_at desc limit 25 offset 0`,
  sql`select count(*)::int as n from ${sql(table)}`,
  sql`select count(*)::int as n from ${sql(table)} where created_at >= now() - interval '7 days'`,
  sql`select count(*)::int as n from ${sql(table)} where created_at >= date_trunc('month', now())`,
  sql`select count(distinct lower(btrim(school)))::int as n from ${sql(table)}`,
];

async function phase(label, { max, pages, table }) {
  console.log(`\n── ${label}: pool max=${max}, ${pages} concurrent page loads ──`);
  const sql = postgres(process.env.DATABASE_URL, {
    max,
    prepare: false,
    connect_timeout: 15,
  });

  // Sanity: one sequential query first, so we can tell "pool is wedged" apart
  // from "queries are slow".
  const t0 = Date.now();
  try {
    await sql`select 1 as ok`;
    console.log(`  sanity query: ${Date.now() - t0} ms`);
  } catch (error) {
    console.log(`  sanity query FAILED after ${Date.now() - t0} ms: ${error.message}`);
  }

  const results = await Promise.all(
    Array.from({ length: pages }, async (_, i) => {
      const t = Date.now();
      try {
        await Promise.all(PAGE_QUERIES(sql, table));
        return { i, ms: Date.now() - t, ok: true };
      } catch (error) {
        return { i, ms: Date.now() - t, ok: false, code: error.code, message: error.message };
      }
    }),
  );

  for (const r of results) {
    console.log(`  page ${r.i}: ${r.ms} ms ${r.ok ? "ok" : `FAILED code=${r.code} ${r.message}`}`);
  }
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  console.log(`  min=${times[0]} median=${times[Math.floor(times.length / 2)]} max=${times.at(-1)} ms`);

  await sql.end({ timeout: 5 });
}

await phase("A — SMS logs page shape", { max: 3, pages: 6, table: "stem_fest_payment_sms" });
await phase("B — same, larger pool", { max: 10, pages: 6, table: "stem_fest_payment_sms" });
await phase("C — ambassador table", { max: 3, pages: 6, table: "campus_ambassador_registrations" });
await phase("D — heavier burst", { max: 3, pages: 12, table: "campus_ambassador_registrations" });

console.log(`\ntotal elapsed: ${Date.now() - started} ms`);
console.log("done");
process.exit(0);
