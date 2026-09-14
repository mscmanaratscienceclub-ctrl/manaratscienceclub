/**
 * Integration check for the admin-panel database fix.
 *
 * Drives the real `withDbTimeout` helper and the real Drizzle table objects
 * against the live Supabase pooler, reproducing the query shapes the admin
 * actions now issue. Deliberately not a mocked unit test — this bug only
 * appears against a real pooler.
 *
 * Bundled with esbuild (the repo has no tsx):
 *   node_modules/.pnpm/esbuild@0.28.1/node_modules/esbuild/bin/esbuild \
 *     scripts/verify-admin-db.ts --bundle --platform=node --format=esm \
 *     --packages=external --outfile=scripts/.verify-admin-db.mjs
 *   node --env-file=.env scripts/.verify-admin-db.mjs
 */
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { DbTimeoutError, isRetryableDbError, withDbTimeout } from "../src/db/query";
import { campusAmbassadorRegistrations } from "../src/db/schema/registrations";
import { volunteerRegistrations } from "../src/db/schema/volunteer-registrations";
import { stemfestRegistrations } from "../src/db/schema/stemfest-registrations";
import { stemfestPaymentSms } from "../src/db/schema/stemfest-payment-sms";

const PAGE_SIZE = 25;
let failures = 0;

setTimeout(() => {
  console.log("\n[HANG] watchdog fired — the fix did NOT hold");
  process.exit(1);
}, 120_000).unref();

function check(label: string, ok: boolean, detail: string): void {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
}

/** Mirrors `searchAmbassadorRegistrations`. */
async function ambassadorSearchPage(query: string, page: number) {
  const t = campusAmbassadorRegistrations;
  const q = query.trim();
  const pattern = `%${q}%`;
  const where = q
    ? or(
        ilike(t.name, pattern),
        ilike(t.school, pattern),
        ilike(t.class, pattern),
        ilike(t.phone, pattern),
        ilike(t.email, pattern),
        ilike(t.type, pattern),
      )
    : undefined;

  return withDbTimeout("searchAmbassadorRegistrations", async (tx) => {
    const [countRow] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(t)
      .where(where);
    const rows = await tx
      .select()
      .from(t)
      .where(where)
      .orderBy(desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    const total = countRow?.total ?? 0;
    return { rows, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  });
}

/** Mirrors `searchVolunteerRegistrations` — different columns from the above. */
async function volunteerSearchPage(query: string, page: number) {
  const t = volunteerRegistrations;
  const q = query.trim();
  const pattern = `%${q}%`;
  const where = q
    ? or(
        ilike(t.fullName, pattern),
        ilike(t.classSection, pattern),
        ilike(t.roll, pattern),
        ilike(t.shift, pattern),
        ilike(t.studentCode, pattern),
      )
    : undefined;

  return withDbTimeout("searchVolunteerRegistrations", async (tx) => {
    const [countRow] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(t)
      .where(where);
    const rows = await tx
      .select()
      .from(t)
      .where(where)
      .orderBy(desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    const total = countRow?.total ?? 0;
    return { rows, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  });
}

/** Mirrors `getSmsLogs` — the shape that used to fire 5 parallel queries. */
async function smsLogsPage(page: number) {
  return withDbTimeout("getSmsLogs", async (tx) => {
    const t = stemfestPaymentSms;
    const [countRow] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(t);
    const rows = await tx
      .select()
      .from(t)
      .orderBy(desc(t.receivedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    const [statusCounts] = await tx
      .select({
        matched: sql<number>`count(*) filter (where ${t.status} = 'matched')::int`,
        unmatched: sql<number>`count(*) filter (where ${t.status} = 'unmatched')::int`,
        ignored: sql<number>`count(*) filter (where ${t.status} = 'ignored')::int`,
      })
      .from(t);
    const total = countRow?.total ?? 0;
    return {
      rows,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      matchedCount: statusCounts?.matched ?? 0,
      unmatchedCount: statusCounts?.unmatched ?? 0,
      ignoredCount: statusCounts?.ignored ?? 0,
    };
  });
}

/** Mirrors `searchStemfestRegistrations`, including the bounded TrxID lookup. */
async function stemfestPage(page: number) {
  return withDbTimeout("searchStemfestRegistrations", async (tx) => {
    const t = stemfestRegistrations;
    const [countRow] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(t);
    const rows = await tx
      .select()
      .from(t)
      .orderBy(desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const pageTrxIds = rows.map((row) => row.transactionId.toUpperCase());
    const verifiedTrxIds =
      pageTrxIds.length === 0
        ? []
        : (
            await tx
              .select({ transactionId: stemfestPaymentSms.transactionId })
              .from(stemfestPaymentSms)
              .where(
                and(
                  eq(stemfestPaymentSms.status, "matched"),
                  inArray(sql`upper(${stemfestPaymentSms.transactionId})`, pageTrxIds),
                ),
              )
          ).flatMap((item) =>
            item.transactionId ? [item.transactionId.toUpperCase()] : [],
          );

    const total = countRow?.total ?? 0;
    return { rows, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), verifiedTrxIds };
  });
}

/** Mirrors `getStemfestStats` — four aggregates in one statement. */
async function stemfestStats() {
  return withDbTimeout("getStemfestStats", async (tx) => {
    const t = stemfestRegistrations;
    const [row] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${t.createdAt} >= now() - interval '7 days')::int`,
        uniqueSchools: sql<number>`count(distinct lower(btrim(${t.school})))::int`,
        verifiedCount: sql<number>`(
          select count(*)::int from ${stemfestPaymentSms}
          where ${stemfestPaymentSms.status} = 'matched'
        )`,
      })
      .from(t);
    return {
      total: row?.total ?? 0,
      thisWeek: row?.thisWeek ?? 0,
      uniqueSchools: row?.uniqueSchools ?? 0,
      verifiedCount: row?.verifiedCount ?? 0,
    };
  });
}

// ── 1. The new sequential page shape, under the concurrency that used to hang ─
console.log("\n1. Concurrent admin page loads (the previously-hanging shape)");
try {
  const t = Date.now();
  const [smsA, smsB, smsC, ambo, vol, stem] = await Promise.all([
    smsLogsPage(1),
    smsLogsPage(2),
    smsLogsPage(1),
    ambassadorSearchPage("", 1),
    volunteerSearchPage("", 1),
    stemfestPage(1),
  ]);
  check("no hang under 6 concurrent page loads", true, `${Date.now() - t}ms`);
  check("sms totals consistent across pages", smsA.total === smsB.total, `page1=${smsA.total} page2=${smsB.total}`);
  check(
    "sms status counts sum to total",
    smsA.matchedCount + smsA.unmatchedCount + smsA.ignoredCount === smsA.total,
    `${smsA.matchedCount}+${smsA.unmatchedCount}+${smsA.ignoredCount}=${smsA.total}`,
  );
  check("ambassador page rows bounded", ambo.rows.length <= PAGE_SIZE, `${ambo.rows.length} rows, total ${ambo.total}`);
  check("volunteer page rows bounded", vol.rows.length <= PAGE_SIZE, `${vol.rows.length} rows, total ${vol.total}`);
  check("stemfest page rows bounded", stem.rows.length <= PAGE_SIZE, `${stem.rows.length} rows, verified ${stem.verifiedTrxIds.length}`);
  check("repeat page load shape stable", smsC.totalPages === smsA.totalPages, `totalPages ${smsC.totalPages}`);
} catch (error) {
  check("no hang under 6 concurrent page loads", false, (error as Error).message);
}

// ── 2. Repeat rounds, to catch intermittent behaviour ────────────────────────
console.log("\n2. Repeated rounds (intermittency check)");
for (let round = 1; round <= 4; round += 1) {
  try {
    const t = Date.now();
    await Promise.all([
      smsLogsPage(1),
      smsLogsPage(1),
      ambassadorSearchPage("", 1),
      stemfestStats(),
    ]);
    check(`round ${round}`, true, `${Date.now() - t}ms`);
  } catch (error) {
    check(`round ${round}`, false, (error as Error).message);
  }
}

// ── 3. The dashboard's four independent sources ──────────────────────────────
console.log("\n3. Dashboard: four sources via allSettled");
const settled = await Promise.allSettled([
  withDbTimeout("getAmbassadorStats", async (tx) => {
    const t = campusAmbassadorRegistrations;
    const [row] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${t.createdAt} >= now() - interval '7 days')::int`,
        thisMonth: sql<number>`count(*) filter (where ${t.createdAt} >= date_trunc('month', now()))::int`,
        uniqueSchools: sql<number>`count(distinct lower(btrim(${t.school})))::int`,
      })
      .from(t);
    return row;
  }),
  withDbTimeout("getVolunteerCount", async (tx) => {
    const [row] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(volunteerRegistrations);
    return row?.total ?? 0;
  }),
  withDbTimeout("getRecentAmbassadorRegistrations", (tx) =>
    tx
      .select({ id: campusAmbassadorRegistrations.id, name: campusAmbassadorRegistrations.name })
      .from(campusAmbassadorRegistrations)
      .orderBy(desc(campusAmbassadorRegistrations.createdAt))
      .limit(5),
  ),
  stemfestStats(),
]);
const rejectedCount = settled.filter((r) => r.status === "rejected").length;
check("all four dashboard sources fulfilled", rejectedCount === 0, `${settled.length - rejectedCount}/${settled.length} ok`);
const ambassadorStats = settled[0].status === "fulfilled" ? settled[0].value : null;
check(
  "ambassador stats usable",
  (ambassadorStats?.total ?? -1) >= 0,
  `total=${ambassadorStats?.total} week=${ambassadorStats?.thisWeek} month=${ambassadorStats?.thisMonth} schools=${ambassadorStats?.uniqueSchools}`,
);
const stemStats = settled[3].status === "fulfilled" ? settled[3].value : null;
check(
  "stemfest stats include folded-in verified count",
  typeof stemStats?.verifiedCount === "number",
  `total=${stemStats?.total} verified=${stemStats?.verifiedCount} schools=${stemStats?.uniqueSchools}`,
);

// ── 4. Server-side statement timeout is actually enforced ────────────────────
console.log("\n4. statement_timeout enforcement (server-side cancel)");

/**
 * Drizzle wraps driver errors in `DrizzleQueryError`, so the Postgres `code`
 * lives on `error.cause`, not on the thrown error. Walk the chain — this is
 * exactly what `isRetryableDbError` in `src/db/query.ts` has to do.
 */
function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function errorShape(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const named = current as { name?: unknown; code?: unknown; message?: unknown };
    parts.push(
      `[${depth}] name=${String(named.name)} code=${String(named.code)} msg=${String(named.message).slice(0, 60).replace(/\n/g, " ")}`,
    );
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(" -> ");
}

const probes: Array<[string, number, boolean]> = [
  ["fast query (pg_sleep 0.2) within 8s budget", 0.2, false],
  ["slow query (pg_sleep 12) exceeds 8s budget", 12, true],
];
for (const [label, sleepSeconds, expectCancel] of probes) {
  const t = Date.now();
  let threw = false;
  let code: string | undefined;
  let message = "";
  let shape = "";
  try {
    await withDbTimeout("timeout-probe", async (tx) => {
      await tx.execute(sql.raw(`select pg_sleep(${sleepSeconds})`));
    });
  } catch (error) {
    threw = true;
    code = pgErrorCode(error);
    message = (error as Error).message;
    shape = errorShape(error);
  }
  const elapsed = Date.now() - t;
  if (expectCancel) {
    // Attempt 1 is cancelled by Postgres at 8s; the helper retries once, so the
    // total lands near 16s. Anything near 8s means the retry did not happen.
    check(
      label,
      threw && code === "57014" && elapsed < 30_000,
      `threw=${threw} code=${code} elapsed=${elapsed}ms`,
    );
    console.log(`        error chain: ${shape}`);
    console.log(`        message: ${message.slice(0, 120).replace(/\n/g, " ")}`);
  } else {
    check(label, !threw, `elapsed=${elapsed}ms`);
  }
}

// ── 5. The retry decision, including the drizzle `cause` wrapper ──────────────
console.log("\n5. Retry decision (isRetryableDbError)");
const pgError = (code: string, message: string): Error => {
  const driver = new Error(message) as Error & { code: string };
  driver.name = "PostgresError";
  driver.code = code;
  // Exactly how drizzle surfaces driver failures: wrapped, with `.cause` set.
  return new Error(`Failed query: select 1\nparams: `, { cause: driver });
};
const retryCases: Array<[string, unknown, boolean]> = [
  ["client watchdog (pooler lost response) is retried", new DbTimeoutError("probe", 12_000), true],
  ["wrapped 08006 connection_failure is retried", pgError("08006", "connection failure"), true],
  ["wrapped 53300 too_many_connections is retried", pgError("53300", "too many connections"), true],
  ["wrapped 57P01 admin_shutdown is retried", pgError("57P01", "terminating connection"), true],
  ["wrapped 57014 statement timeout is NOT retried", pgError("57014", "canceling statement due to statement timeout"), false],
  ["wrapped 42P01 undefined_table is NOT retried", pgError("42P01", 'relation "nope" does not exist'), false],
  ["wrapped 42501 insufficient_privilege is NOT retried", pgError("42501", "permission denied"), false],
  [
    "pooler bare-message 'Connection closed' is retried",
    new Error("write CONNECTION_CLOSED pool.example.com:5432", { cause: new Error("Connection closed") }),
    true,
  ],
  ["plain TypeError is NOT retried", new TypeError("cannot read properties of undefined"), false],
  ["null is NOT retried", null, false],
];
for (const [label, error, expected] of retryCases) {
  check(label, isRetryableDbError(error) === expected, `expected=${expected}`);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
