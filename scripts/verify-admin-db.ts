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
import { and, desc, eq, ilike, inArray, or, sql, type AnyColumn } from "drizzle-orm";
import { DbTimeoutError, isRetryableDbError, withDbTimeout } from "../src/db/query";
import { campusAmbassadorRegistrations } from "../src/db/schema/registrations";
import { volunteerRegistrations } from "../src/db/schema/volunteer-registrations";
import { stemfestRegistrations } from "../src/db/schema/stemfest-registrations";
import { stemfestPaymentSms } from "../src/db/schema/stemfest-payment-sms";
import { stemfestEffectivePaymentStatus } from "../src/db/queries/stemfest-payment";
import { ADMIN_TIME_ZONE } from "../src/lib/admin/filters";
import {
  BRIEF_TREND_DAYS,
  BRIEF_WINDOW_DAYS,
  estimateNextDay,
  referrerKindOf,
  summarizeTrend,
  toMovementRows,
  type MovementInput,
  type ReferrerKind,
  type RegistrationBrief,
} from "../src/lib/admin/brief";
import { recentDayKeys, TREND_RANGES, type RegistrationTrendPoint } from "../src/lib/admin/dashboard";
import {
  getStemfestSegment,
  manaratSchoolLabel,
  manaratSchoolLikePattern,
  stemfestEvents,
  stemfestSegments,
} from "../src/lib/data/stemfest-registration";

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

/**
 * Mirrors `getRegistrationTrend` — three grouped day counts, sequential.
 *
 * The statement *count* and the tables it touches are what this harness is
 * checking (the pool is sized to the fan-out), not the aggregates themselves.
 */
async function registrationTrend(days: number) {
  return withDbTimeout("getRegistrationTrend", async (tx) => {
    const dayOf = (column: AnyColumn) =>
      sql<string>`to_char((${column} at time zone 'Asia/Dhaka')::date, 'YYYY-MM-DD')`;

    const stemfest = await tx
      .select({
        day: dayOf(stemfestRegistrations.createdAt),
        count: sql<number>`count(*)::int`,
      })
      .from(stemfestRegistrations)
      .groupBy(dayOf(stemfestRegistrations.createdAt));

    return {
      days,
      buckets: stemfest.length,
    };
  });
}

/**
 * Mirrors `getDashboardBreakdown` — four sequential reads: the recent feed, the
 * event popularity join over a values list, the school ranking, and the reference
 * leaderboard. Every read is STEM Fest only, and the school ranking normalises
 * Manarat spellings to one label before grouping.
 */
async function dashboardBreakdown() {
  const s = stemfestRegistrations;

  return withDbTimeout("getDashboardBreakdown", async (tx) => {
    const recent = await tx
      .select({ id: s.id, name: s.name })
      .from(s)
      .orderBy(desc(s.createdAt))
      .limit(6);

    const events = await tx.execute(sql`
      select e.event_id, count(*)::int as total
      from (values
        ('lfr'::text, 'LFR (Line Following Robot)'::text),
        ('robosoccer'::text, 'Robosoccer'::text)
      ) as e(event_id, event_name)
      join ${s} on ${s.segments} ilike '%' || e.event_name || '%'
      group by e.event_id
    `);

    const schools = await tx.execute(sql`
      select label, cnt as count, total_groups as total
      from (
        select
          min(label) as label,
          count(*)::int as cnt,
          (count(*) over ())::int as total_groups
        from (
          select
            case
              when ${s.school} ilike '%manarat%' then 'Manarat Dhaka International School & College'
              else btrim(${s.school})
            end as label
          from ${s}
        ) as schools
        group by lower(label)
      ) as ranked
      order by count desc, label asc
      limit 6
    `);

    const references = await tx.execute(sql`
      select referrer as reference, cnt as count
      from (
        select ${s.reference} as referrer, count(*)::int as cnt
        from ${s}
        group by ${s.reference}
      ) as ranked
      order by count desc, referrer asc nulls last
      limit 8
    `);

    return {
      recent: recent.length,
      eventRows: Array.isArray(events) ? events.length : 0,
      schoolRows: Array.isArray(schools) ? schools.length : 0,
      referenceRows: Array.isArray(references) ? references.length : 0,
    };
  });
}

// ── 3. The dashboard's three independent sources ─────────────────────────────
console.log("\n3. Dashboard: three sources via allSettled");
const settled = await Promise.allSettled([
  registrationTrend(30),
  dashboardBreakdown(),
  stemfestStats(),
]);
const rejectedCount = settled.filter((r) => r.status === "rejected").length;
check("all three dashboard sources fulfilled", rejectedCount === 0, `${settled.length - rejectedCount}/${settled.length} ok`);
const trend = settled[0].status === "fulfilled" ? settled[0].value : null;
check(
  "registration trend grouped without failing",
  typeof trend?.buckets === "number",
  `${trend?.days} days, ${trend?.buckets} day buckets`,
);

/**
 * Every span the dashboard's segmented control offers, not just the default.
 *
 * `/admin-preview` renders the chart from fixtures, so it can prove the axis is
 * drawn but never that the SQL window agrees with it. The two are built from
 * different sides of the same number — `recentDayKeys(days)` in JS and
 * `(now() at time zone …)::date - (days - 1)::int` in SQL — and if the cast ever
 * regresses to the date-difference operator (which hands back a day *number*, not
 * a date) or the zones drift apart, the chart silently drops the oldest columns
 * while still labelling them. So both are computed here and compared.
 *
 * Two statements, whatever the span count: one resolves each window start, one
 * buckets days over the widest window, and the narrower windows are read out of
 * the same rows.
 */
const spans = await withDbTimeout("trend spans", async (tx) => {
  const starts = rowsOf<{ days: number; since: string }>(
    await tx.execute(sql`
      select
        s.days,
        to_char(((now() at time zone ${ADMIN_TIME_ZONE})::date - (s.days - 1)::int)::date, 'YYYY-MM-DD') as since
      from (values ${sql.join(
        TREND_RANGES.map((days) => sql`(${days}::int)`),
        sql`, `,
      )}) as s(days)
    `),
  );

  const buckets = rowsOf<{ day: string; count: number }>(
    await tx.execute(sql`
      select to_char(day, 'YYYY-MM-DD') as day, count(*)::int as count
      from (
        select (${stemfestRegistrations.createdAt} at time zone ${ADMIN_TIME_ZONE})::date as day
        from ${stemfestRegistrations}
        where (${stemfestRegistrations.createdAt} at time zone ${ADMIN_TIME_ZONE})::date >= (
          (now() at time zone ${ADMIN_TIME_ZONE})::date - ${Math.max(...TREND_RANGES) - 1}::int
        )
      ) as buckets
      group by day
    `),
  );

  return { starts, buckets };
});

for (const days of TREND_RANGES) {
  const keys = recentDayKeys(days);
  const since = spans.starts.find((row) => row.days === days)?.since ?? "";

  check(
    `trend span ${days}: axis and SQL window start on the same local day`,
    keys.length === days && keys[0] === since && /^\d{4}-\d{2}-\d{2}$/.test(since),
    `axis ${keys.length} columns from ${keys[0]}, SQL window from ${since}`,
  );

  // The same rows must survive either filter: `>= the SQL window start`, or
  // `one of the axis keys`. A mismatch is a day the chart labels but never plots.
  const sqlSide = spans.buckets.filter((row) => row.day >= since);
  const axisSide = spans.buckets.filter((row) => keys.includes(row.day));
  check(
    `trend span ${days}: every day bucket the window returns is on the axis`,
    sqlSide.length === axisSide.length &&
      sqlSide.reduce((s, r) => s + r.count, 0) ===
        axisSide.reduce((s, r) => s + r.count, 0),
    `${sqlSide.length} buckets / ${sqlSide.reduce((s, r) => s + r.count, 0)} entries in the ${days}-day window`,
  );
}
const breakdown = settled[1].status === "fulfilled" ? settled[1].value : null;
check(
  "dashboard breakdown returned all four reads",
  typeof breakdown?.recent === "number" &&
    typeof breakdown?.referenceRows === "number",
  `recent=${breakdown?.recent} events=${breakdown?.eventRows} schools=${breakdown?.schoolRows} referrers=${breakdown?.referenceRows}`,
);
const stemStats = settled[2].status === "fulfilled" ? settled[2].value : null;
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

// ── 6. The printable registration brief ──────────────────────────────────────
console.log("\n6. Printable brief: six sequential statements on one connection");

function rowsOf<T>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : [];
}

/** Mirrors the private `dayAfter` in `src/lib/admin/brief.ts`. */
function dayKeyAfter(day: string): string {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * Mirrors `getRegistrationBrief`, whose own body cannot be called here because it
 * requires an admin session. The statements are the action's, in the same order,
 * on the same transaction — only two extra aggregates ride along in the totals
 * read (`spanTotal`, `windowTotal`), which exist so the JS-side gap-filled window
 * can be compared against what Postgres counts for the same bounds.
 *
 * What this section is really checking is that the brief's five printed sections
 * cannot contradict each other: same seven local days everywhere, the referrer
 * tally covering exactly the referred rows, and the forecast inside its own band.
 */
async function registrationBrief(): Promise<
  RegistrationBrief & { spanTotal: number; windowTotal: number }
> {
  const s = stemfestRegistrations;
  const ca = campusAmbassadorRegistrations;

  const stemfestDay = sql`(${s.createdAt} at time zone ${ADMIN_TIME_ZONE})::date`;
  const windowStart = sql`(now() at time zone ${ADMIN_TIME_ZONE})::date - ${BRIEF_WINDOW_DAYS - 1}::int`;
  const priorStart = sql`(now() at time zone ${ADMIN_TIME_ZONE})::date - ${BRIEF_WINDOW_DAYS * 2 - 1}::int`;
  const spanStart = sql`(now() at time zone ${ADMIN_TIME_ZONE})::date - ${BRIEF_TREND_DAYS - 1}::int`;

  return withDbTimeout("getRegistrationBrief (mirror)", async (tx) => {
    const [totals] = await tx
      .select({
        allTime: sql<number>`count(*)::int`,
        verified: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'verified')::int`,
        pending: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'pending')::int`,
        rejected: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'rejected')::int`,
        referred: sql<number>`count(*) filter (where ${s.reference} is not null)::int`,
        spanTotal: sql<number>`count(*) filter (where ${stemfestDay} >= ${spanStart})::int`,
        windowTotal: sql<number>`count(*) filter (where ${stemfestDay} >= ${windowStart})::int`,
      })
      .from(s);

    // 1. Trend — the daily read `dailyCounts` wraps, inlined because it is not exported.
    const dayKeys = recentDayKeys(BRIEF_TREND_DAYS);
    const dailyRows = rowsOf<{ day: string; count: number }>(
      await tx.execute(sql`
        select to_char(day, 'YYYY-MM-DD') as day, count(*)::int as count
        from (
          select (${s.createdAt} at time zone ${ADMIN_TIME_ZONE})::date as day
          from ${s}
          where (${s.createdAt} at time zone ${ADMIN_TIME_ZONE})::date >= ${spanStart}
        ) as buckets
        group by day
      `),
    );
    const daily = new Map(dailyRows.map((row) => [row.day, row.count]));
    const points: RegistrationTrendPoint[] = dayKeys.map((day) => ({
      day,
      counts: [daily.get(day) ?? 0],
    }));

    // 2. Segments and their events, one statement for both windows.
    const eventCatalogue = sql.join(
      stemfestEvents.map((event) => sql`(${event.id}::text, ${event.name}::text)`),
      sql`, `,
    );

    const eventRows = rowsOf<{ event_id: string; recent: number; prior: number }>(
      await tx.execute(sql`
        select
          e.event_id,
          count(*) filter (where ${stemfestDay} >= ${windowStart})::int as recent,
          count(*) filter (
            where ${stemfestDay} < ${windowStart} and ${stemfestDay} >= ${priorStart}
          )::int as prior
        from (values ${eventCatalogue}) as e(event_id, event_name)
        join ${s} on ${s.segments} ilike '%' || e.event_name || '%'
        where ${stemfestDay} >= ${priorStart}
        group by e.event_id
      `),
    );

    const windowById = new Map(
      eventRows.map((row) => [row.event_id, { current: row.recent, previous: row.prior }]),
    );
    const eventById = new Map(stemfestEvents.map((event) => [event.id, event]));

    const eventInputs: MovementInput[] = eventRows.flatMap((row) => {
      const event = eventById.get(row.event_id);
      if (!event) return [];
      return [
        {
          id: event.id,
          label: event.name,
          sublabel: getStemfestSegment(event.segmentId)?.name ?? event.segmentId,
          current: row.recent,
          previous: row.prior,
        },
      ];
    });

    const segments = toMovementRows(
      stemfestSegments.map((segment) => {
        let current = 0;
        let previous = 0;
        for (const event of stemfestEvents) {
          if (event.segmentId !== segment.id) continue;
          const counted = windowById.get(event.id);
          if (counted) {
            current += counted.current;
            previous += counted.previous;
          }
        }
        return { id: segment.id, label: segment.name, sublabel: segment.blurb, current, previous };
      }),
    );

    // 3. Schools.
    const schoolRows = rowsOf<{
      label: string | null;
      total: number;
      recent: number;
      groups: number;
    }>(
      await tx.execute(sql`
        select label, cnt as total, recent, total_groups as groups
        from (
          select
            min(label) as label,
            count(*)::int as cnt,
            count(*) filter (where day >= ${windowStart})::int as recent,
            (count(*) over ())::int as total_groups
          from (
            select
              case
                when ${s.school} ilike ${manaratSchoolLikePattern} then ${manaratSchoolLabel}
                else btrim(${s.school})
              end as label,
              ${stemfestDay} as day
            from ${s}
          ) as entry
          group by lower(label)
        ) as ranked
        order by total desc, label asc
        limit 6
      `),
    );

    // 4. Referrers, and the kind of register each one signed up on.
    const referrerRows = rowsOf<{
      name: string | null;
      total: number;
      recent: number;
      is_campus: boolean;
      is_batch: boolean;
    }>(
      await tx.execute(sql`
        with referred as (
          select
            lower(btrim(${s.reference})) as key,
            min(${s.reference}) as name,
            count(*)::int as total,
            count(*) filter (where ${stemfestDay} >= ${windowStart})::int as recent
          from ${s}
          where ${s.reference} is not null
          group by 1
        ), ambassadors as (
          select
            lower(btrim(${ca.name})) as key,
            bool_or(${ca.type} = 'campus') as is_campus,
            bool_or(${ca.type} = 'batch') as is_batch
          from ${ca}
          group by 1
        )
        select
          r.name,
          r.total,
          r.recent,
          coalesce(a.is_campus, false) as is_campus,
          coalesce(a.is_batch, false) as is_batch
        from referred as r
        left join ambassadors as a on a.key = r.key
        order by r.total desc, r.name asc
        limit 10
      `),
    );

    const referrerTallies = rowsOf<{ kind: ReferrerKind; referrals: number }>(
      await tx.execute(sql`
        select kind, count(*)::int as referrals
        from (
          select
            case
              when a.is_campus and a.is_batch then 'both'
              when a.is_campus then 'campus'
              when a.is_batch then 'batch'
              else 'unmatched'
            end as kind
          from (
            select lower(btrim(${s.reference})) as key
            from ${s}
            where ${s.reference} is not null
          ) as r
          left join (
            select
              lower(btrim(${ca.name})) as key,
              bool_or(${ca.type} = 'campus') as is_campus,
              bool_or(${ca.type} = 'batch') as is_batch
            from ${ca}
            group by 1
          ) as a on a.key = r.key
        ) as kinds
        group by kind
        order by referrals desc, kind asc
      `),
    );

    return {
      spanDays: dayKeys.length,
      windowDays: BRIEF_WINDOW_DAYS,
      totals: {
        allTime: totals?.allTime ?? 0,
        verified: totals?.verified ?? 0,
        pending: totals?.pending ?? 0,
        rejected: totals?.rejected ?? 0,
      },
      spanTotal: totals?.spanTotal ?? 0,
      windowTotal: totals?.windowTotal ?? 0,
      trend: summarizeTrend(points),
      segments,
      events: toMovementRows(eventInputs),
      schools: schoolRows.map((row) => ({
        id: (row.label ?? "unknown").trim().toLowerCase(),
        school: row.label?.trim() ? row.label : "School not given",
        total: row.total,
        recent: row.recent,
      })),
      uniqueSchools: schoolRows[0]?.groups ?? 0,
      referrers: referrerRows.map((row, index) => ({
        id: row.name?.trim().toLowerCase() ?? `referrer-${index}`,
        name: row.name?.trim() ? row.name : "Name not given",
        total: row.total,
        recent: row.recent,
        kind: referrerKindOf({ isCampus: row.is_campus, isBatch: row.is_batch }),
      })),
      referrerTallies,
      referredTotal: totals?.referred ?? 0,
      estimate: estimateNextDay(points),
    };
  });
}

/**
 * How many stored rows the admin's Event filter can reach per catalogue event.
 *
 * Mirrors `segmentMatch` in `src/lib/actions/registrations.ts`: the option is an
 * event id, the predicate is that event's name as one `ILIKE` over the `segments`
 * text. Counted here against the whole table so the brief's windowed per-event
 * counts below have an all-time ceiling to be checked against.
 */
async function eventReachability(): Promise<Map<string, number>> {
  const t = stemfestRegistrations;
  const catalogue = sql.join(
    stemfestEvents.map((event) => sql`(${event.id}::text, ${event.name}::text)`),
    sql`, `,
  );

  return withDbTimeout("eventReachability", async (tx) => {
    const rows = rowsOf<{ event_id: string; total: number }>(
      await tx.execute(sql`
        select e.event_id, count(*)::int as total
        from (values ${catalogue}) as e(event_id, event_name)
        join ${t} on ${t.segments} ilike '%' || e.event_name || '%'
        group by e.event_id
      `),
    );
    return new Map(rows.map((row) => [row.event_id, row.total]));
  });
}

let brief: (RegistrationBrief & { spanTotal: number; windowTotal: number }) | null = null;
try {
  brief = await registrationBrief();
  check("brief read completes on one pooled connection", true, "6 statements, sequential");
} catch (error) {
  check("brief read completes on one pooled connection", false, (error as Error).message);
}

if (brief) {
  const statusSum = brief.totals.verified + brief.totals.pending + brief.totals.rejected;
  check(
    "every registration has exactly one effective payment status",
    statusSum === brief.totals.allTime,
    `verified+pending+rejected=${statusSum} allTime=${brief.totals.allTime}`,
  );
  check(
    "trend covers the whole advertised span",
    brief.trend.days.length === BRIEF_TREND_DAYS && brief.spanDays === BRIEF_TREND_DAYS,
    `${brief.trend.days.length} of ${BRIEF_TREND_DAYS} days, ${brief.trend.spanTotal} entries`,
  );

  // The JS gap-fill and the SQL window bound have to name the same rows.
  const spanSum = brief.trend.days.reduce((sum, day) => sum + day.count, 0);
  const windowSum = brief.trend.days
    .slice(-BRIEF_WINDOW_DAYS)
    .reduce((sum, day) => sum + day.count, 0);
  check(
    "daily buckets sum to the SQL span count",
    spanSum === brief.spanTotal,
    `js=${spanSum} sql=${brief.spanTotal}`,
  );
  check(
    "brief window matches the SQL window count",
    brief.trend.current === windowSum && windowSum === brief.windowTotal,
    `trend.current=${brief.trend.current} last-${BRIEF_WINDOW_DAYS}=${windowSum} sql=${brief.windowTotal}`,
  );

  const segmentIds = brief.segments.map((row) => row.id).sort().join(",");
  const catalogueIds = stemfestSegments.map((segment) => segment.id).sort().join(",");
  check(
    "every segment gets a row, even a quiet one",
    segmentIds === catalogueIds,
    `brief=[${segmentIds}] catalogue=[${catalogueIds}]`,
  );
  check(
    "movement rows carry a direction the brief can print",
    [...brief.segments, ...brief.events].every(
      (row) =>
        (row.direction === "rising" || row.direction === "falling" || row.direction === "flat") &&
        row.delta === row.current - row.previous &&
        row.current >= 0 &&
        row.previous >= 0,
    ),
    `${brief.segments.length} segments / ${brief.events.length} events, ` +
      `${brief.segments.filter((r) => r.direction === "rising").length} rising`,
  );
  const eventOverruns = brief.events.filter(
    (row) => row.current > brief.trend.current || row.previous > brief.trend.previous,
  );
  check(
    "no single event claims more entries than its window has registrations",
    eventOverruns.length === 0,
    eventOverruns.length
      ? `over: ${eventOverruns.map((r) => `${r.id}=${r.current}/${brief.trend.current}`).join(",")}`
      : `${brief.events.length} events, window holds ${brief.trend.current} registrations`,
  );
  // A segment sums its events, so it may legitimately exceed the registration count —
  // what must not happen is the roll-up disagreeing with the rows it rolls up.
  const eventById = new Map(brief.events.map((row) => [row.id, row]));
  const segmentMismatch = brief.segments.filter((segment) => {
    const expected = stemfestEvents
      .filter((event) => event.segmentId === segment.id)
      .reduce(
        (sum, event) => ({
          current: sum.current + (eventById.get(event.id)?.current ?? 0),
          previous: sum.previous + (eventById.get(event.id)?.previous ?? 0),
        }),
        { current: 0, previous: 0 },
      );
    return segment.current !== expected.current || segment.previous !== expected.previous;
  });
  check(
    "each segment row equals the sum of its own events",
    segmentMismatch.length === 0,
    segmentMismatch.length
      ? `off: ${segmentMismatch.map((r) => r.id).join(",")}`
      : `entries across segments=${brief.segments.reduce(
          (sum, r) => sum + r.current,
          0,
        )} vs ${brief.trend.current} registrations — a form entering two events is counted in both`,
  );
  // The join matches `segments ilike '%'||event_name||'%'`, so two catalogue names that
  // contain each other would count one registration under both events.
  const ambiguous = stemfestEvents.flatMap((a) =>
    stemfestEvents.filter(
      (b) =>
        a.id !== b.id &&
        (a.name === b.name ||
          a.name.toLowerCase().includes(b.name.toLowerCase()) ||
          b.name.toLowerCase().includes(a.name.toLowerCase())),
    ),
  );
  check(
    "event names stay distinguishable inside the stored segments text",
    ambiguous.length === 0,
    ambiguous.length
      ? `overlapping: ${ambiguous.map((e) => e.id).join(",")}`
      : `${stemfestEvents.length} names, none a substring of another`,
  );

  // The Event filter reaches a row by its event *name*; the brief counts the same
  // rows. If a windowed count exceeds what the filter reaches all-time, the id the
  // URL carries no longer resolves to the text the row stores — and a filtered
  // table would print fewer registrations than the brief claims.
  const reachable = await eventReachability();
  const unreachable = brief.events.filter(
    (row) => row.current > (reachable.get(row.id) ?? 0),
  );
  check(
    "every event the brief counts is reachable by the Event filter",
    unreachable.length === 0,
    unreachable.length
      ? `filter reaches ${unreachable
          .map((r) => `${r.id}=${reachable.get(r.id) ?? 0}/${r.current}`)
          .join(",")}`
      : `${reachable.size} of ${stemfestEvents.length} events have rows`,
  );

  check(
    "school table is capped and every window count fits its all-time count",
    brief.schools.length <= 6 &&
      brief.schools.every((row) => row.total >= row.recent) &&
      brief.uniqueSchools >= brief.schools.length,
    `${brief.schools.length} rows of ${brief.uniqueSchools} distinct schools`,
  );

  const tallySum = brief.referrerTallies.reduce((sum, row) => sum + row.referrals, 0);
  check(
    "referrer tallies account for every referred registration",
    tallySum === brief.referredTotal &&
      brief.referrerTallies.every(
        (row) =>
          row.referrals > 0 &&
          ["campus", "batch", "both", "unmatched"].includes(row.kind),
      ),
    `tally=${tallySum} referred=${brief.referredTotal} (${brief.referrerTallies
      .map((row) => `${row.kind}:${row.referrals}`)
      .join(" ")})`,
  );
  check(
    "top referrers are ranked, capped, and never claim a window wider than the register",
    brief.referrers.length <= 10 &&
      brief.referrers.every((row) => row.total >= row.recent) &&
      brief.referrers.every(
        (row, index) => index === 0 || row.total <= brief.referrers[index - 1].total,
      ),
    `${brief.referrers.length} rows, top: ${
      brief.referrers[0] ? `${brief.referrers[0].name} (${brief.referrers[0].kind})` : "—"
    }`,
  );

  const e = brief.estimate;
  check(
    "next-day estimate is inside its own band and states its method",
    e.low <= e.expected &&
      e.expected <= e.high &&
      e.low >= 0 &&
      (e.confidence === "moderate" || e.confidence === "low") &&
      e.basis.trim().length > 0 &&
      e.day === dayKeyAfter(brief.trend.days[brief.trend.days.length - 1]?.day ?? ""),
    `${e.label}: ${e.low}–${e.high}, expected ${e.expected}, ${e.confidence}`,
  );
  console.log(`        basis: ${e.basis}`);
  for (const note of e.notes) console.log(`        note:  ${note}`);
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
