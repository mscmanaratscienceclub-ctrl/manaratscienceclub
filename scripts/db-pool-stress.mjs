/**
 * Two things:
 *
 *  1. Lists and terminates wedged backends belonging to this app (stuck > 60s
 *     while running a stem_fest query). These accumulate every time the dev
 *     server is killed mid-request and, because the project's
 *     `idle_in_transaction_session_timeout` is 0, the database never reaps them.
 *  2. Stress-tests the exact concurrency shape of an admin page load — 5
 *     parallel queries through a `max: 3` pool, the `getSmsLogs()` pattern — to
 *     see whether pool contention alone can produce multi-second waits.
 *
 * Run with:  node --env-file=.env scripts/db-pool-stress.mjs
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 3,
  prepare: false,
  connect_timeout: 15,
});

// ── 1. Wedged backends ───────────────────────────────────────────────────────
const wedged = await sql`
  select pid, state, wait_event_type, wait_event,
         now() - query_start as age,
         left(regexp_replace(query, '\\s+', ' ', 'g'), 80) as query
  from pg_stat_activity
  where datname = current_database()
    and pid <> pg_backend_pid()
    and state = 'active'
    and now() - query_start > interval '60 seconds'
    and (query ilike '%stem_fest%' or query ilike '%registrations%')
`;
console.log(`wedged app backends: ${wedged.length}`);
for (const w of wedged) {
  console.log(`  pid=${w.pid} age=${w.age} wait=${w.wait_event_type}/${w.wait_event} :: ${w.query}`);
}

if (wedged.length > 0) {
  const killed = await sql`
    select pg_terminate_backend(pid) as ok, pid
    from pg_stat_activity
    where datname = current_database()
      and pid <> pg_backend_pid()
      and state = 'active'
      and now() - query_start > interval '60 seconds'
      and (query ilike '%stem_fest%' or query ilike '%registrations%')
  `;
  console.log(`terminated: ${killed.filter((k) => k.ok).length}`);
}

// ── 2. Concurrency stress ────────────────────────────────────────────────────
// This is the shape of the SMS logs page: one paged SELECT plus four
// independent aggregates, all fired through Promise.all on a 3-connection pool.
const PAGE_SIZE = 25;

async function pageLoad(iteration) {
  const label = `iter-${iteration}`;
  const started = Date.now();
  try {
    await Promise.all([
      sql`select * from stem_fest_payment_sms order by received_at desc limit ${PAGE_SIZE} offset 0`,
      sql`select count(*)::int as n from stem_fest_payment_sms`,
      sql`select count(*)::int as n from stem_fest_payment_sms where status = 'matched'`,
      sql`select count(*)::int as n from stem_fest_payment_sms where status = 'unmatched'`,
      sql`select count(*)::int as n from stem_fest_payment_sms where status = 'ignored'`,
    ]);
    return { label, ms: Date.now() - started, ok: true };
  } catch (error) {
    return { label, ms: Date.now() - started, ok: false, code: error.code, message: error.message };
  }
}

const CONCURRENT_PAGES = 6;
const loaded = await Promise.all(
  Array.from({ length: CONCURRENT_PAGES }, (_, i) => pageLoad(i)),
);

const times = loaded.map((r) => r.ms).sort((a, b) => a - b);
console.log(`\n${CONCURRENT_PAGES} concurrent page loads (5 queries each, pool max 3):`);
for (const r of loaded) {
  console.log(`  ${r.label}: ${r.ms} ms ${r.ok ? "ok" : `FAILED code=${r.code} ${r.message}`}`);
}
console.log(
  `  min=${times[0]}ms median=${times[Math.floor(times.length / 2)]}ms max=${times[times.length - 1]}ms`,
);

// ── 3. Lock-wait visibility ──────────────────────────────────────────────────
const blocking = await sql`
  select blocked.pid as blocked_pid,
         blocker.pid as blocker_pid,
         blocker.state as blocker_state,
         now() - blocker.query_start as blocker_age,
         left(regexp_replace(blocker.query, '\\s+', ' ', 'g'), 70) as blocker_query
  from pg_locks blocked
  join pg_locks blocker
    on blocker.locktype = blocked.locktype
   and blocker.granted
   and not blocked.granted
   and blocker.relation is not distinct from blocked.relation
   and blocker.pid <> blocked.pid
  join pg_stat_activity b on b.pid = blocker.pid
`;
console.log(`\nblocking lock chains right now: ${blocking.length}`);
for (const b of blocking) {
  console.log(
    `  blocked=${b.blocked_pid} by=${b.blocker_pid} (${b.blocker_state}, ${b.blocker_age}) :: ${b.blocker_query}`,
  );
}

await sql.end({ timeout: 5 });
console.log("\ndone");
