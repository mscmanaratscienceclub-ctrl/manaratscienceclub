/**
 * Validates the self-healing mechanism the admin fix will rely on.
 *
 * Supavisor (the transaction pooler) discards startup parameters, so a
 * connection-level `statement_timeout` is impossible. This tests the fallback:
 * `SET LOCAL statement_timeout` inside a transaction, plus whether the
 * connection is still usable after a statement gets cancelled.
 *
 * Run with:  node --env-file=.env scripts/db-tx-timeout-test.mjs
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  connect_timeout: 15,
});

try {
  // ── Test 1: does SET LOCAL take effect through the pooler? ────────────────
  try {
    await sql.begin(async (tx) => {
      await tx`set local statement_timeout = '3000'`;
      const [row] = await tx`select current_setting('statement_timeout') as v`;
      console.log(`test 1: SET LOCAL statement_timeout visible as "${row.v}"`);

      const t0 = Date.now();
      await tx`select pg_sleep(10)`;
      console.log("test 1: FAILED — pg_sleep(10) was not cancelled");
      console.log(`  (elapsed ${Date.now() - t0} ms)`);
    });
  } catch (error) {
    console.log(`test 1: pg_sleep cancelled — code=${error.code} ${error.message}`);
  }

  // ── Test 2: is the pooled connection reusable after the cancellation? ─────
  const [after] = await sql`select count(*)::int as n from stem_fest_payment_sms`;
  console.log(`test 2: connection reusable — stem_fest_payment_sms has ${after.n} rows`);

  // ── Test 3: is SET LOCAL leaky (does it escape the transaction)? ──────────
  const [leak] = await sql`select current_setting('statement_timeout') as v`;
  console.log(`test 3: after the transaction, statement_timeout = "${leak.v}"`);

  // ── Test 4: does a failed statement poison the transaction for retrying? ──
  try {
    await sql.begin(async (tx) => {
      await tx`set local statement_timeout = '2000'`;
      try {
        await tx`select pg_sleep(5)`;
      } catch (inner) {
        console.log(`test 4: inner statement aborted — code=${inner.code}`);
      }
      // A retry inside the same (now aborted) transaction must fail.
      await tx`select 1 as v`;
      console.log("test 4: unexpected — query succeeded inside an aborted transaction");
    });
  } catch (error) {
    console.log(
      `test 4: expected — transaction is aborted after cancellation, retry must use a NEW transaction (code=${error.code})`,
    );
  }
} catch (error) {
  console.log(`[FAILED] code=${error.code} ${error.message}`);
} finally {
  await sql.end({ timeout: 5 });
}

console.log("done");
