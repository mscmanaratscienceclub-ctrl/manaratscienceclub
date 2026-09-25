"use server";

import {
  campusAmbassadorRegistrations,
  type CampusAmbassadorRegistration,
} from "@/db/schema/registrations";
import {
  volunteerRegistrations,
  type VolunteerRegistration,
} from "@/db/schema/volunteer-registrations";
import { stemfestRegistrations } from "@/db/schema/stemfest-registrations";
import { stemfestPaymentSms } from "@/db/schema/stemfest-payment-sms";
import type { DbTransaction } from "@/db";
import { withDbTimeout } from "@/db/query";
import { getServerSession } from "@/lib/auth/get-session";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import {
  ADMIN_TIME_ZONE,
  REPORT_ROW_LIMIT,
  type AdminQueryState,
  type AdminSortId,
  type AdminSourceId,
} from "@/lib/admin/filters";
import {
  adminRowIdSchema,
  contactEmailSchema,
  isSmsLogStatus,
  isStemfestPaymentStatus,
  smsLogStatusOptions,
  statusOption,
  stemfestPaymentStatusOptions,
  type AdminStatusActionResult,
  type StemfestPaymentStatus,
} from "@/lib/admin/statuses";
import {
  stemfestEffectivePaymentStatus,
  stemfestPaymentAmount,
  stemfestPaymentFilter,
} from "@/db/queries/stemfest-payment";
import {
  formatBdt,
  getStemfestClassLabel,
  getStemfestSegment,
  stemfestEvents,
} from "@/lib/data/stemfest-registration";
import {
  DASHBOARD_TREND_DAYS,
  recentDayKeys,
  type EventPopularityRow,
  type RegistrationTrendPoint,
  type SchoolCountRow,
} from "@/lib/admin/dashboard";
import { sendPaymentVerifiedEmail } from "@/lib/email/resend";
import { z } from "zod";

function assertAdmin(role: string) {
  if (role !== "admin") throw new Error("Unauthorized: Admin only");
}

/**
 * postgres.js hands back a `RowList` — array-like, but not `T[]`. Normalising it
 * here keeps the raw-SQL reads below typed at the call site instead of leaking
 * the driver's row shape into the dashboard.
 */
function asRows<T>(result: unknown): T[] {
  return Array.isArray(result) ? (result as T[]) : [];
}

/**
 * Administrators only, and the caller gets told *who* is acting.
 *
 * Every status write records the admin that made it (`payment_decided_by`), and
 * the audit trail is worthless without the address. Returning it here rather than
 * re-reading the session at each call site keeps one definition of "an admin" —
 * existing callers ignore the value.
 */
async function requireAdmin(): Promise<{ email: string }> {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertAdmin(role);
  return { email: session.user.email };
}

/**
 * Runs a status change, turning the refusals an admin can actually cause into a
 * sentence instead of a thrown error.
 *
 * React redacts an error thrown out of a Server Action in production, so a throw
 * reaches the panel as "an error occurred" — no use when the real answer is "that
 * row no longer exists". Genuine faults (a lost connection, a failed update) still
 * throw, because those are not the admin's to read.
 */
async function statusAction(
  run: () => Promise<AdminStatusActionResult>,
): Promise<AdminStatusActionResult> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof StatusRefusal) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/**
 * A refusal the admin can act on. Thrown for control flow, caught by
 * `statusAction` and handed back as a message — never shown as a crash.
 */
class StatusRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatusRefusal";
  }
}

/** Parses an action's input, refusing with the first problem rather than throwing. */
function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new StatusRefusal(
      parsed.error.issues[0]?.message ?? "That change could not be read.",
    );
  }
  return parsed.data;
}

const PAGE_SIZE = 25;

/**
 * Escapes LIKE/ILIKE wildcards so a literal `%`, `_`, or `\` typed in the search
 * box matches itself instead of acting as a wildcard. Postgres' default LIKE
 * escape character is the backslash.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function clampPage(page: number): number {
  return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
}

function pageCount(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** Trims a filter value, treating a whitespace-only value as absent. */
function term(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * `ILIKE '%value%'` with wildcards escaped — the `kind: "text"` comparison in
 * `src/lib/admin/filters.ts`. Case-insensitive because these columns hold typed
 * free text: "Manarat" and "manarat" are the same school.
 */
function contains(column: AnyColumn, value: string | undefined): SQL | undefined {
  const needle = term(value);
  if (!needle) return undefined;
  return ilike(column, `%${escapeLike(needle)}%`);
}

/** The `kind: "select"` comparison — case-insensitive equality. */
function equalsLoose(column: AnyColumn, value: string | undefined): SQL | undefined {
  const needle = term(value);
  if (!needle) return undefined;
  return sql`lower(${column}) = ${needle.toLowerCase()}`;
}

/** The search box: one `OR` across every column that form's search should reach. */
function containsAny(columns: AnyColumn[], query: string): SQL | undefined {
  const needle = term(query);
  if (!needle) return undefined;
  const pattern = `%${escapeLike(needle)}%`;
  return or(...columns.map((column) => ilike(column, pattern)));
}

/**
 * The `kind: "date"` comparison — an inclusive day range on a `timestamptz`.
 *
 * Written as a plain range on the column (`>= start`, `< the day after the end`)
 * rather than as `column::date between …` for two reasons: the range can use the
 * existing `(created_at desc)` indexes whereas an expression on the column cannot,
 * and "14 September" has to mean the 14th *in Dhaka*, which is what an admin
 * reading this panel expects. Comparing against a bare date would use UTC and
 * split the local day at 6am.
 */
function dayRange(
  column: AnyColumn,
  from: string | undefined,
  to: string | undefined,
): SQL[] {
  const bounds: SQL[] = [];
  const start = term(from);
  const end = term(to);

  if (start) {
    bounds.push(
      sql`${column} >= (${start}::timestamp at time zone ${ADMIN_TIME_ZONE})`,
    );
  }
  if (end) {
    bounds.push(
      sql`${column} < ((${end}::date + 1)::timestamp at time zone ${ADMIN_TIME_ZONE})`,
    );
  }

  return bounds;
}

/** The `kind: "number"` comparison — a numeric bound on an amount. */
function amountBound(
  column: AnyColumn,
  value: string | undefined,
  direction: "min" | "max",
): SQL | undefined {
  const bound = term(value);
  if (!bound) return undefined;
  return direction === "min"
    ? sql`${column} >= ${bound}::numeric`
    : sql`${column} <= ${bound}::numeric`;
}

/** A boolean column selected by a named choice rather than by `true`/`false`. */
function booleanChoice(
  column: AnyColumn,
  value: string | undefined,
  trueValue: string,
): SQL | undefined {
  const choice = term(value);
  if (!choice) return undefined;
  return eq(column, choice === trueValue);
}

/**
 * Sort vocabulary → `ORDER BY`. An unrecognised combination falls back to
 * newest-first, so a hand-edited `?sort=` can never reach the database as
 * anything but a supported order. Alphabetical and amount sorts keep a
 * newest-first tiebreak so equal keys still come back in a meaningful order.
 */
interface SortColumns {
  timestamp: AnyColumn;
  name?: AnyColumn;
  amount?: AnyColumn;
}

function orderFor(sort: AdminSortId, columns: SortColumns): SQL[] {
  switch (sort) {
    case "oldest":
      return [asc(columns.timestamp)];
    case "name-asc":
      if (columns.name) return [asc(columns.name), desc(columns.timestamp)];
      break;
    case "name-desc":
      if (columns.name) return [desc(columns.name), desc(columns.timestamp)];
      break;
    case "amount-asc":
      if (columns.amount) return [sql`${columns.amount} asc nulls last`];
      break;
    case "amount-desc":
      if (columns.amount) return [sql`${columns.amount} desc nulls last`];
      break;
    case "newest":
      break;
  }

  return [desc(columns.timestamp)];
}

// ── Per-source filters ───────────────────────────────────────────────────────
//
// One builder per source, shared by the paged list and the printed report, so a
// filter can never mean one thing on screen and another in the export.

function ambassadorWhere(state: AdminQueryState): SQL | undefined {
  const t = campusAmbassadorRegistrations;
  const v = state.values;

  return and(
    containsAny(
      [t.name, t.school, t.class, t.phone, t.email, t.type, t.experience],
      state.query,
    ),
    equalsLoose(t.type, v.type),
    equalsLoose(t.gender, v.gender),
    booleanChoice(t.firstTimeCa, v.firstTime, "first-time"),
    ...dayRange(t.createdAt, v.from, v.to),
    contains(t.class, v.class),
    contains(t.school, v.school),
  );
}

function volunteerWhere(state: AdminQueryState): SQL | undefined {
  const t = volunteerRegistrations;
  const v = state.values;

  return and(
    containsAny(
      [
        t.fullName,
        t.classSection,
        t.roll,
        t.shift,
        t.studentCode,
        t.personalPhone,
        t.parentsPhone,
      ],
      state.query,
    ),
    equalsLoose(t.shift, v.shift),
    ...dayRange(t.createdAt, v.from, v.to),
    contains(t.classSection, v.classSection),
    contains(t.roll, v.roll),
    contains(t.studentCode, v.studentCode),
    contains(t.attendanceWeek, v.attendanceWeek),
    contains(t.parentsComfort, v.parentsComfort),
    contains(t.campusHesitation, v.campusHesitation),
  );
}

/**
 * The STEM Fest filter set.
 *
 * `payment` compares the **effective** status — an admin's stored decision, or
 * the forwarded-SMS match when no admin has ruled — through the fragments in
 * `src/db/queries/stemfest-payment.ts`. Those fragments are shared with the table's
 * status pill, the stat cards, the verification action and the printed report, so
 * the four can never disagree about what a row's payment status is.
 */
function stemfestWhere(state: AdminQueryState): SQL | undefined {
  const t = stemfestRegistrations;
  const v = state.values;

  // Narrowed before it reaches SQL, so a hand-edited `?payment=` cannot reach the
  // database as a comparison against a value no option offers.
  const paymentValue = term(v.payment);
  const payment =
    paymentValue && isStemfestPaymentStatus(paymentValue)
      ? stemfestPaymentFilter(paymentValue)
      : undefined;

  return and(
    containsAny(
      [t.name, t.class, t.school, t.segments, t.transactionId, t.paymentNumber],
      state.query,
    ),
    payment,
    equalsLoose(t.class, v.class),
    contains(t.school, v.school),
    ...dayRange(t.createdAt, v.from, v.to),
    contains(t.segments, v.segment),
    contains(t.transactionId, v.transactionId),
  );
}

function smsWhere(state: AdminQueryState): SQL | undefined {
  const t = stemfestPaymentSms;
  const v = state.values;

  return and(
    containsAny(
      [t.sender, t.rawMessage, t.transactionId, t.senderNumber, t.status],
      state.query,
    ),
    equalsLoose(t.status, v.status),
    contains(t.sender, v.sender),
    ...dayRange(t.receivedAt, v.from, v.to),
    contains(t.senderNumber, v.senderNumber),
    amountBound(t.amount, v.minAmount, "min"),
    amountBound(t.amount, v.maxAmount, "max"),
  );
}

/**
 * `count(*)` for the current filter.
 *
 * Counts and their page rows are issued as two **sequential** statements, never
 * through `Promise.all`. That is what keeps every query on its own pooled
 * connection: stacking them onto one connection is what makes the Supavisor
 * pooler lose a response and hang the request forever (see `src/db/index.ts`).
 * The count goes first so a hand-edited out-of-range `?page=` still reports a
 * real total rather than an empty page's `undefined`.
 */
async function countRows(
  tx: DbTransaction,
  table: PgTable,
  where: SQL | undefined,
): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(table)
    .where(where);

  return row?.total ?? 0;
}

export interface AmbassadorSearchResult {
  rows: CampusAmbassadorRegistration[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * One page of ambassador responses matching `state`.
 *
 * `state` carries the search box, every filter and the sort, so the paged list
 * here and the printed report in `getAdminReportRows` read the same query — the
 * contract lives in `src/lib/admin/filters.ts`.
 */
export async function searchAmbassadorRegistrations(
  state: AdminQueryState,
): Promise<AmbassadorSearchResult> {
  await requireAdmin();
  const t = campusAmbassadorRegistrations;
  const requested = clampPage(state.page);
  const where = ambassadorWhere(state);

  return withDbTimeout("searchAmbassadorRegistrations", async (tx) => {
    const total = await countRows(tx, t, where);
    // A hand-edited `?page=999` lands on the last real page rather than an empty
    // one, which would otherwise read as "no matches".
    const page = Math.min(requested, pageCount(total));
    const rows = await tx
      .select()
      .from(t)
      .where(where)
      .orderBy(...orderFor(state.sort, { timestamp: t.createdAt, name: t.name }))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return { rows, total, page, totalPages: pageCount(total) };
  });
}

export interface VolunteerSearchResult {
  rows: VolunteerRegistration[];
  total: number;
  page: number;
  totalPages: number;
}

/** One page of volunteer applications matching `state`. */
export async function searchVolunteerRegistrations(
  state: AdminQueryState,
): Promise<VolunteerSearchResult> {
  await requireAdmin();
  const t = volunteerRegistrations;
  const requested = clampPage(state.page);
  const where = volunteerWhere(state);

  return withDbTimeout("searchVolunteerRegistrations", async (tx) => {
    const total = await countRows(tx, t, where);
    const page = Math.min(requested, pageCount(total));
    const rows = await tx
      .select()
      .from(t)
      .where(where)
      .orderBy(
        ...orderFor(state.sort, { timestamp: t.createdAt, name: t.fullName }),
      )
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return { rows, total, page, totalPages: pageCount(total) };
  });
}

export interface StemfestAdminRow {
  id: string;
  /** `<GENDER><CLASS><NNN>`, minted by the insert trigger — the admin-facing ID. */
  registrationCode: string;
  name: string;
  class: string;
  school: string;
  segments: string;
  /**
   * Who referred the participant, from the list for their school. `null` for a
   * row filed before the question existed, and for "not referred by anyone" —
   * both read as an em dash in the panel.
   */
  reference: string | null;
  /**
   * What the participant was told to send, in BDT, or `null` for a row filed
   * before the column existed. What the club *asked for*, as opposed to `amount`
   * below, which is what a forwarded SMS says actually arrived.
   */
  totalFee: number | null;
  transactionId: string;
  paymentNumber: string;
  /** Nullable: rows collected before the form asked for an address have none. */
  email: string | null;
  createdAt: Date;
  /**
   * The status the admin sees, decided in SQL by `stemfestEffectivePaymentStatus`:
   * the stored decision, or the forwarded-SMS match when no admin has ruled.
   */
  status: StemfestPaymentStatus;
  /** The stored decision, or `null` when the status is still SMS-derived. */
  decision: StemfestPaymentStatus | null;
  decidedAt: Date | null;
  /** Admin email that decided, or `null` for an SMS-derived status. */
  decidedBy: string | null;
  emailSentAt: Date | null;
  /** Amount a forwarded SMS reported, already as text; `null` when unknown. */
  amount: string | null;
}

export interface StemfestSearchResult {
  rows: StemfestAdminRow[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * One page of STEM Fest registrations matching `state`.
 *
 * The payment status is resolved in SQL, by the same fragments the `payment`
 * filter, the stat cards, the printed report and the verify action use, so the
 * pill on a row can never disagree with what filtering for "verified" returns. It
 * used to be computed in JS from a second query for the TrxIDs on the current
 * page — which could only ever answer for rows already fetched, and left the
 * filter itself inexpressible.
 */
export async function searchStemfestRegistrations(
  state: AdminQueryState,
): Promise<StemfestSearchResult> {
  await requireAdmin();
  const t = stemfestRegistrations;
  const requested = clampPage(state.page);
  const where = stemfestWhere(state);

  return withDbTimeout("searchStemfestRegistrations", async (tx) => {
    const total = await countRows(tx, t, where);
    const page = Math.min(requested, pageCount(total));
    const rows = await tx
      .select({
        id: t.id,
        registrationCode: t.registrationCode,
        name: t.name,
        class: t.class,
        school: t.school,
        segments: t.segments,
        reference: t.reference,
        totalFee: t.totalFee,
        transactionId: t.transactionId,
        paymentNumber: t.paymentNumber,
        email: t.email,
        createdAt: t.createdAt,
        status: stemfestEffectivePaymentStatus(),
        decision: t.paymentDecision,
        decidedAt: t.paymentDecidedAt,
        decidedBy: t.paymentDecidedBy,
        emailSentAt: t.paymentEmailSentAt,
        amount: stemfestPaymentAmount(),
      })
      .from(t)
      .where(where)
      .orderBy(...orderFor(state.sort, { timestamp: t.createdAt, name: t.name }))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return {
      rows,
      total,
      page,
      totalPages: pageCount(total),
    };
  });
}

export interface StemfestStats {
  total: number;
  thisWeek: number;
  uniqueSchools: number;
  verifiedCount: number;
  pendingCount: number;
  rejectedCount: number;
  /**
   * What the verified rows' matched bKash messages added up to, as text.
   *
   * Text because `numeric` arrives from postgres.js as a string and this is only
   * ever formatted (`formatBdt`); `null` when no verified row has a matched
   * amount, which is not the same as a real zero.
   */
  amountCollected: string | null;
  /**
   * The sum of what the club asked every row to send, as text.
   *
   * The counterpart to `amountCollected`: that is what arrived and was accepted,
   * this is what was requested, so the two side by side say how far the club is
   * from being paid. Summed in SQL rather than by pulling every row, and `null`
   * when no row carries a figure — all of them filed before `total_fee` existed —
   * which is not the same as a real zero.
   */
  amountToCollect: string | null;
}

export async function getStemfestStats(): Promise<StemfestStats> {
  await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("getStemfestStats", async (tx) => {
    const [row] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${t.createdAt} >= now() - interval '7 days')::int`,
        uniqueSchools: sql<number>`count(distinct lower(btrim(${t.school})))::int`,
        // The same definition the status pill and the `payment=verified` filter
        // use, so the card cannot promise a number the table below it contradicts.
        // It counted matched SMS messages before, which drifted from both as soon
        // as an admin verified a payment by hand (audit: card vs. pill mismatch).
        verifiedCount: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'verified')::int`,
        pendingCount: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'pending')::int`,
        rejectedCount: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'rejected')::int`,
        // Summed only over verified rows, through the same amount fragment the
        // receipt quotes — so the collection figure can never include a payment
        // the club has not accepted.
        amountCollected: sql<string | null>`sum(((${stemfestPaymentAmount()})::numeric)) filter (where ${stemfestEffectivePaymentStatus()} = 'verified')::text`,
        // Every row, verified or not: the club asked for this money, so it is what
        // the panel compares `amountCollected` against.
        amountToCollect: sql<string | null>`sum(${t.totalFee})::text`,
      })
      .from(t);

    return {
      total: row?.total ?? 0,
      thisWeek: row?.thisWeek ?? 0,
      uniqueSchools: row?.uniqueSchools ?? 0,
      verifiedCount: row?.verifiedCount ?? 0,
      pendingCount: row?.pendingCount ?? 0,
      rejectedCount: row?.rejectedCount ?? 0,
      amountCollected: row?.amountCollected ?? null,
      amountToCollect: row?.amountToCollect ?? null,
    };
  });
}

// ── Dashboard series ─────────────────────────────────────────────────────────
//
// The figures the dashboard's charts plot. Each action groups in SQL and returns a
// fixed-size result, and each issues its statements **sequentially** inside its own
// transaction — the dashboard fires four independent actions at once, which is the
// widest read fan-out the panel has and the reason the pool is sized at five.

/** Rows in each chart's list before it stops. */
const TOP_SCHOOL_LIMIT = 6;
const RECENT_REGISTRATION_LIMIT = 6;

/**
 * Daily `count(*)` for one table, keyed by the admin's calendar day.
 *
 * The filter is on the *local* date rather than `now() - interval`: the chart
 * fills the gaps with `recentDayKeys`, so the two have to agree about which days
 * the window contains, and `at time zone` is what makes a "day" here mean a Dhaka
 * day rather than a UTC one.
 *
 * The day is projected by a subquery and the outer query groups on the subquery's
 * own `day` column, rather than on the expression itself. Postgres matches a
 * `group by` expression to the one in the select list by parse-tree equality, and
 * the two are NOT equal when the expression is interpolated twice — every
 * interpolation is its own bind parameter, so the trees differ and the query fails
 * with "column \"…created_at\" must appear in the GROUP BY clause". Verified
 * against the live database; grouping on the alias is the version that works.
 */
async function dailyCounts(
  tx: DbTransaction,
  table: PgTable,
  column: AnyColumn,
  since: SQL,
): Promise<Map<string, number>> {
  const rows = asRows<{ day: string; count: number }>(
    await tx.execute(sql`
      select to_char(day, 'YYYY-MM-DD') as day, count(*)::int as count
      from (
        select (${column} at time zone ${ADMIN_TIME_ZONE})::date as day
        from ${table}
        where (${column} at time zone ${ADMIN_TIME_ZONE})::date >= ${since}
      ) as buckets
      group by day
    `),
  );

  return new Map(rows.map((row) => [row.day, row.count]));
}

/**
 * Registrations per day over the last `span` days, across all three forms.
 *
 * Every returned point carries one count per `registrationTrendSeries` entry, in
 * that order, and a day with no registrations returns a real zero rather than
 * being missing — a stacked chart that silently dropped empty days would shift
 * every bar after it.
 */
export async function getRegistrationTrend(
  span: number = DASHBOARD_TREND_DAYS,
): Promise<RegistrationTrendPoint[]> {
  await requireAdmin();
  const days = Math.min(Math.max(Math.floor(span), 7), 90);
  const dayKeys = recentDayKeys(days);

  return withDbTimeout("getRegistrationTrend", async (tx) => {
    // `::int` is load-bearing: `date - $1` leaves Postgres guessing the
    // parameter's type, and it resolves `date - unknown` to the date-difference
    // operator and returns an *integer* day number (verified: 20716 rather than a
    // date) — which would then be compared against a date in every filter below.
    const since = sql`(now() at time zone ${ADMIN_TIME_ZONE})::date - ${days - 1}::int`;

    // Sequential, never `Promise.all`: pipelining statements onto one pooled
    // connection is what wedges Supavisor.
    const ambassador = await dailyCounts(
      tx,
      campusAmbassadorRegistrations,
      campusAmbassadorRegistrations.createdAt,
      since,
    );
    const stemfest = await dailyCounts(
      tx,
      stemfestRegistrations,
      stemfestRegistrations.createdAt,
      since,
    );
    const volunteer = await dailyCounts(
      tx,
      volunteerRegistrations,
      volunteerRegistrations.createdAt,
      since,
    );

    return dayKeys.map((day) => ({
      day,
      counts: [
        ambassador.get(day) ?? 0,
        stemfest.get(day) ?? 0,
        volunteer.get(day) ?? 0,
      ],
    }));
  });
}

/**
 * How many registrations name each event, counted from the stored `segments` text.
 *
 * The column holds the human-readable entry list (`describeEntry` output), not
 * event ids, so the catalogue's own names are matched against it — one statement
 * per event would be a round trip each. A values list joined to the table keeps it
 * to one, and the catalogue is what supplies both the ids and the names, so a new
 * event appears here the moment it is added to registration.
 */
async function stemfestEventCounts(
  tx: DbTransaction,
): Promise<EventPopularityRow[]> {
  const t = stemfestRegistrations;

  const catalogue = sql.join(
    stemfestEvents.map(
      (event) => sql`(${event.id}::text, ${event.name}::text)`,
    ),
    sql`, `,
  );

  const rows = asRows<{ event_id: string; total: number }>(
    await tx.execute(sql`
      select e.event_id, count(*)::int as total
      from (values ${catalogue}) as e(event_id, event_name)
      join ${t} on ${t.segments} ilike '%' || e.event_name || '%'
      group by e.event_id
    `),
  );

  const byId = new Map(rows.map((row) => [row.event_id, row.total]));

  return stemfestEvents.map((event) => ({
    eventId: event.id,
    name: event.name,
    segmentName: getStemfestSegment(event.segmentId)?.name ?? event.segmentId,
    count: byId.get(event.id) ?? 0,
  }));
}

export interface DashboardBreakdown {
  volunteerCount: number;
  /** Volunteers who applied in the last seven days — the weekly KPI's third term. */
  volunteerThisWeek: number;
  recent: RecentAmbassadorRegistration[];
  events: EventPopularityRow[];
  topSchools: SchoolCountRow[];
  /**
   * Distinct schools across both dated forms, counted once.
   *
   * Adding the two forms' own `uniqueSchools` would double-count every school that
   * registered for both, so the number comes from the same union the school list
   * is ranked on — the list is the top six of that union, and this is its size.
   */
  uniqueSchools: number;
}

/**
 * The dashboard's secondary figures: volunteers, the recent feed, event
 * popularity and the school league table.
 *
 * One action rather than four, because the dashboard's concurrency budget is the
 * pool size: `src/db/index.ts` documents that more than four simultaneous sources
 * makes Supavisor lose responses. Its statements run sequentially here instead.
 */
export async function getDashboardBreakdown(): Promise<DashboardBreakdown> {
  await requireAdmin();
  const v = volunteerRegistrations;
  const a = campusAmbassadorRegistrations;
  const s = stemfestRegistrations;

  return withDbTimeout("getDashboardBreakdown", async (tx) => {
    const [volunteers] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${v.createdAt} >= now() - interval '7 days')::int`,
      })
      .from(v);

    const recent = await tx
      .select({
        id: a.id,
        name: a.name,
        class: a.class,
        school: a.school,
        createdAt: a.createdAt,
      })
      .from(a)
      .orderBy(desc(a.createdAt))
      .limit(RECENT_REGISTRATION_LIMIT);

    const events = await stemfestEventCounts(tx);

    // `count(*) over ()` is evaluated after `group by`, so it is the number of
    // distinct schools in the whole union — the ranking's ceiling — rather than
    // the six rows returned here. `min(label)` keeps a real school's casing
    // instead of the lower-cased key the grouping needs.
    const schoolRows = asRows<{
      label: string | null;
      count: number;
      total: number;
    }>(
      await tx.execute(sql`
        select label, cnt as count, total_groups as total
        from (
          select
            min(label) as label,
            count(*)::int as cnt,
            (count(*) over ())::int as total_groups
          from (
            select
              lower(btrim(${a.school})) as key,
              btrim(${a.school}) as label
            from ${a}
            union all
            select
              lower(btrim(${s.school})),
              btrim(${s.school})
            from ${s}
          ) as schools
          group by key
        ) as ranked
        order by count desc, label asc
        limit ${TOP_SCHOOL_LIMIT}
      `),
    );

    return {
      volunteerCount: volunteers?.total ?? 0,
      volunteerThisWeek: volunteers?.thisWeek ?? 0,
      recent,
      events,
      topSchools: schoolRows.map((row) => ({
        school: row.label ?? "School not given",
        count: row.count,
      })),
      uniqueSchools: schoolRows[0]?.total ?? 0,
    };
  });
}

export interface AmbassadorStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  uniqueSchools: number;
}

/**
 * Dashboard numbers computed in SQL. Pulling every column of every row and
 * counting in JS grows linearly with registrations; these aggregates return a
 * fixed-size result no matter how many applications exist.
 */
export async function getAmbassadorStats(): Promise<AmbassadorStats> {
  await requireAdmin();
  const t = campusAmbassadorRegistrations;

  return withDbTimeout("getAmbassadorStats", async (tx) => {
    const [row] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        thisWeek: sql<number>`count(*) filter (where ${t.createdAt} >= now() - interval '7 days')::int`,
        thisMonth: sql<number>`count(*) filter (where ${t.createdAt} >= date_trunc('month', now()))::int`,
        uniqueSchools: sql<number>`count(distinct lower(btrim(${t.school})))::int`,
      })
      .from(t);

    return {
      total: row?.total ?? 0,
      thisWeek: row?.thisWeek ?? 0,
      thisMonth: row?.thisMonth ?? 0,
      uniqueSchools: row?.uniqueSchools ?? 0,
    };
  });
}

/**
 * The columns the dashboard's recent feed renders — and nothing else.
 *
 * The rows themselves are read by `getDashboardBreakdown`, which issues this
 * select inside its own transaction rather than calling out to a second action: a
 * nested `withDbTimeout` would open a *second* pooled connection, and the pool is
 * deliberately sized to the dashboard's fan-out (see `src/db/index.ts`).
 */
export interface RecentAmbassadorRegistration {
  id: string;
  name: string;
  class: string;
  school: string;
  createdAt: Date;
}

// ── SMS Logs ─────────────────────────────────────────────────────────────────

export interface SmsLogRow {
  id: string;
  sender: string;
  rawMessage: string;
  transactionId: string | null;
  amount: string | null;
  senderNumber: string | null;
  status: string;
  matchedRegistrationId: string | null;
  receivedAt: Date;
  createdAt: Date;
}

export interface SmsLogsResult {
  rows: SmsLogRow[];
  total: number;
  page: number;
  totalPages: number;
  /**
   * Section-wide tallies for the stat cards, deliberately **not** narrowed by
   * the active filters — they describe the whole log, while `total` above is the
   * filtered count the table is showing.
   */
  matchedCount: number;
  unmatchedCount: number;
  ignoredCount: number;
}

/** One page of forwarded SMS matching `state`. */
export async function getSmsLogs(state: AdminQueryState): Promise<SmsLogsResult> {
  await requireAdmin();
  const t = stemfestPaymentSms;
  const requested = clampPage(state.page);
  const where = smsWhere(state);

  return withDbTimeout("getSmsLogs", async (tx) => {
    const total = await countRows(tx, t, where);
    const page = Math.min(requested, pageCount(total));
    const rows = await tx
      .select()
      .from(t)
      .where(where)
      .orderBy(
        ...orderFor(state.sort, { timestamp: t.receivedAt, amount: t.amount }),
      )
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    // One statement for the three status tallies instead of three round trips,
    // and issued *after* the page rows rather than alongside them so nothing is
    // ever pipelined onto a pooled connection.
    const [statusCounts] = await tx
      .select({
        matched: sql<number>`count(*) filter (where ${t.status} = 'matched')::int`,
        unmatched: sql<number>`count(*) filter (where ${t.status} = 'unmatched')::int`,
        ignored: sql<number>`count(*) filter (where ${t.status} = 'ignored')::int`,
      })
      .from(t);

    return {
      rows,
      total,
      page,
      totalPages: pageCount(total),
      matchedCount: statusCounts?.matched ?? 0,
      unmatchedCount: statusCounts?.unmatched ?? 0,
      ignoredCount: statusCounts?.ignored ?? 0,
    };
  });
}

// ── Printed reports ──────────────────────────────────────────────────────────
//
// A report is the same query as the list with paging removed, plus the row
// ceiling above. Both go through the builders in this file, so the rows on paper
// are the rows that were on screen when the admin pressed Export.

export interface AdminReport {
  rows: Record<string, string>[];
  /** Rows matching the filters, before the ceiling was applied. */
  total: number;
  /** `true` when the ceiling cut the result short — the report says so. */
  truncated: boolean;
}

/** Formats a timestamp for print, pinned to the admin timezone. */
const reportDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: ADMIN_TIME_ZONE,
});

function reportDate(value: Date | null): string {
  return value ? reportDateFormatter.format(value) : "";
}

/** `—` for a null column, so a blank cell is never read as an empty answer. */
function reportText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

/**
 * Every row matching `state`, shaped for the printed report.
 *
 * Rows are plain `Record<string, string>` keyed by column id: the report route
 * renders whatever columns its source declares, so adding a column never needs a
 * change here. Values are formatted server-side in a fixed timezone — the
 * printout is the one artefact nobody can scroll to double-check.
 */
export async function getAdminReportRows(
  sourceId: AdminSourceId,
  state: AdminQueryState,
): Promise<AdminReport> {
  await requireAdmin();

  return withDbTimeout(`getAdminReportRows:${sourceId}`, async (tx) => {
    switch (sourceId) {
      case "ambassador": {
        const t = campusAmbassadorRegistrations;
        const where = ambassadorWhere(state);
        const total = await countRows(tx, t, where);
        const rows = await tx
          .select()
          .from(t)
          .where(where)
          .orderBy(
            ...orderFor(state.sort, { timestamp: t.createdAt, name: t.name }),
          )
          .limit(REPORT_ROW_LIMIT);

        return {
          total,
          truncated: total > rows.length,
          rows: rows.map((row) => ({
            type: row.type === "batch" ? "Batch" : "Campus",
            name: reportText(row.name),
            class: reportText(row.class),
            school: reportText(row.school),
            phone: reportText(row.phone),
            email: reportText(row.email),
            gender: reportText(row.gender),
            firstTime: yesNo(row.firstTimeCa),
            facebook: reportText(row.facebook),
            instagram: reportText(row.instagram),
            submitted: reportDate(row.createdAt),
          })),
        };
      }


      case "volunteer": {
        const t = volunteerRegistrations;
        const where = volunteerWhere(state);
        const total = await countRows(tx, t, where);
        const rows = await tx
          .select()
          .from(t)
          .where(where)
          .orderBy(
            ...orderFor(state.sort, { timestamp: t.createdAt, name: t.fullName }),
          )
          .limit(REPORT_ROW_LIMIT);

        return {
          total,
          truncated: total > rows.length,
          rows: rows.map((row) => ({
            name: reportText(row.fullName),
            classSection: reportText(row.classSection),
            roll: reportText(row.roll),
            shift: reportText(row.shift),
            studentCode: reportText(row.studentCode),
            personalPhone: reportText(row.personalPhone),
            parentsPhone: reportText(row.parentsPhone),
            submitted: reportDate(row.createdAt),
          })),
        };
      }

      case "stemfest": {
        const t = stemfestRegistrations;
        const where = stemfestWhere(state);
        const total = await countRows(tx, t, where);
        const rows = await tx
          .select({
            id: t.id,
            registrationCode: t.registrationCode,
            name: t.name,
            class: t.class,
            school: t.school,
            segments: t.segments,
            totalFee: t.totalFee,
            transactionId: t.transactionId,
            paymentNumber: t.paymentNumber,
            createdAt: t.createdAt,
            status: stemfestEffectivePaymentStatus(),
          })
          .from(t)
          .where(where)
          .orderBy(
            ...orderFor(state.sort, { timestamp: t.createdAt, name: t.name }),
          )
          .limit(REPORT_ROW_LIMIT);

        return {
          total,
          truncated: total > rows.length,
          rows: rows.map((row) => ({
            registrationCode: reportText(row.registrationCode),
            name: reportText(row.name),
            class: reportText(row.class),
            school: reportText(row.school),
            segments: reportText(row.segments),
            // What was asked for, formatted the same way the panel shows it. An
            // em dash for a row filed before `total_fee` existed, never a zero.
            amountToSend:
              row.totalFee === null ? reportText(null) : formatBdt(row.totalFee),
            transactionId: reportText(row.transactionId),
            paymentNumber: reportText(row.paymentNumber),
            // The label for the *effective* status, from the same option table the
            // pill on screen reads — so a printed "Rejected" is a Rejected pill.
            payment:
              statusOption(stemfestPaymentStatusOptions, row.status)?.label ??
              reportText(row.status),
            submitted: reportDate(row.createdAt),
          })),
        };
      }

      case "sms": {
        const t = stemfestPaymentSms;
        const where = smsWhere(state);
        const total = await countRows(tx, t, where);
        const rows = await tx
          .select()
          .from(t)
          .where(where)
          .orderBy(
            ...orderFor(state.sort, { timestamp: t.receivedAt, amount: t.amount }),
          )
          .limit(REPORT_ROW_LIMIT);

        return {
          total,
          truncated: total > rows.length,
          rows: rows.map((row) => ({
            receivedAt: reportDate(row.receivedAt),
            sender: reportText(row.sender),
            transactionId: reportText(row.transactionId),
            amount: reportText(row.amount),
            senderNumber: reportText(row.senderNumber),
            status: row.status,
            message: reportText(row.rawMessage),
          })),
        };
      }
    }
  });
}


// ── Status actions ────────────────────────────────────────────────────────────
//
// The writes an admin makes from a table row. Each one answers with a sentence
// (`AdminStatusActionResult`) instead of throwing, and each one reaches for the
// shared fragments in `@/db/queries/stemfest-payment` when it needs to know what a
// payment's status is — the same definition the pill, the filter, the stat card and
// the printed report use.

/**
 * Narrows a status the browser sent to one this build offers.
 *
 * The `<select>` is not a guarantee: a Server Action is a public HTTP endpoint, so
 * an unknown value has to be refused here rather than reaching Postgres as a text
 * comparison that silently matches nothing (or, for a write, a check-constraint
 * violation the admin cannot read).
 */
function parseStatus<TValue extends string>(
  input: unknown,
  isKnown: (value: string) => value is TValue,
  subject: string,
): TValue {
  const value = parseInput(z.string("That status could not be read."), input).trim();

  if (!isKnown(value)) {
    throw new StatusRefusal(
      `That is not a ${subject} status this panel knows. Refresh the page and try again.`,
    );
  }

  return value;
}

/**
 * The STEM Fest columns a decision needs.
 *
 * Read inside the transaction that writes the decision, so the confirmation email
 * quotes the row that was actually stored rather than the one the browser had when
 * the admin pressed the button. The email doubles as the participant's receipt, so
 * this carries the whole registration — ID, participant details, payment reference
 * — not just the payment columns.
 */
function stemfestDecisionSelection() {
  const t = stemfestRegistrations;

  return {
    id: t.id,
    registrationCode: t.registrationCode,
    name: t.name,
    class: t.class,
    school: t.school,
    phone: t.paymentNumber,
    segments: t.segments,
    transactionId: t.transactionId,
    paymentNumber: t.paymentNumber,
    email: t.email,
    createdAt: t.createdAt,
    status: stemfestEffectivePaymentStatus(),
    decision: t.paymentDecision,
    decidedAt: t.paymentDecidedAt,
    amount: stemfestPaymentAmount(),
  };
}

interface StemfestDecisionTarget {
  id: string;
  registrationCode: string;
  name: string;
  class: string;
  school: string;
  phone: string;
  segments: string;
  transactionId: string;
  paymentNumber: string;
  email: string | null;
  createdAt: Date;
  /** Effective status *before* the write: the decision, or the forwarded-SMS match. */
  status: StemfestPaymentStatus;
  decision: StemfestPaymentStatus | null;
  decidedAt: Date | null;
  amount: string | null;
}

/** How the email prints the moment of confirmation: the admin's clock, not the server's. */
const paymentConfirmationFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ADMIN_TIME_ZONE,
});

/**
 * The amount the confirmation quotes.
 *
 * `numeric` arrives as a string and is only ever formatted here, so an unparseable
 * value is dropped rather than printed to a participant as `NaN`.
 */
function confirmationAmount(amount: string | null): string | undefined {
  if (!amount) return undefined;

  const value = Number(amount);
  return Number.isFinite(value) ? formatBdt(value) : undefined;
}

/** Submission time as the email prints it: the admin's clock, same as `verifiedOn`. */
function confirmationDate(value: Date | null): string | undefined {
  return value ? paymentConfirmationFormatter.format(value) : undefined;
}


/**
 * Sends the confirmation and reports what actually happened.
 *
 * `sent` is true only for a send Resend accepted. The two other outcomes —
 * `simulated` (no usable key, so the message was logged) and a refusal — are
 * reported as *not sent*, because an admin who is told "emailed" will stop
 * chasing a receipt the participant never received.
 */
async function deliverConfirmation(
  target: StemfestDecisionTarget,
  to: string,
  confirmedAt: Date,
): Promise<{ sent: boolean; detail: string }> {
  const result = await sendPaymentVerifiedEmail({
    registrationCode: target.registrationCode || undefined,
    to,
    name: target.name,
    classLabel: getStemfestClassLabel(target.class),
    school: target.school,
    // The phone the participant gave is their contact number; the row has no
    // separate phone column, so the wallet number is what the form collected.
    phone: target.paymentNumber,
    transactionId: target.transactionId,
    paymentNumber: target.paymentNumber,
    segments: target.segments,
    verifiedOn: paymentConfirmationFormatter.format(confirmedAt),
    submittedOn: confirmationDate(target.createdAt),
    amount: confirmationAmount(target.amount),
  });

  if (result.success && !result.simulated) {
    return { sent: true, detail: `Confirmation emailed to ${to}.` };
  }

  if (result.success) {
    return {
      sent: false,
      detail:
        "this environment has no working Resend key, so the message was only written to the server log.",
    };
  }

  return {
    sent: false,
    detail: `Resend refused it: ${result.error ?? "no reason given"}.`,
  };
}

/** Stamps the last accepted confirmation, which the table shows beside the pill. */
async function recordConfirmationSent(rowId: string): Promise<void> {
  await withDbTimeout("recordConfirmationSent", (tx) =>
    tx
      .update(stemfestRegistrations)
      .set({ paymentEmailSentAt: new Date() })
      .where(eq(stemfestRegistrations.id, rowId)),
  );
}

/**
 * Records an admin's decision about a bKash payment. Sends nothing.
 *
 * Verifying used to fire the confirmation off as part of the same action, which
 * meant an admin clearing a queue of payments emailed every one of them before
 * having a chance to look at the list. The decision and the message are two
 * separate acts now: this records who decided what and when, and the receipt goes
 * out only when an admin presses Send confirmation on the row
 * (`resendStemfestPaymentEmail`). It is the same delivery behind both, so nothing
 * about the message itself changed.
 *
 * A decision is stored even when the status it produces is the one already showing:
 * a row the forwarded SMS has verified reads `verified` with `payment_decision` as
 * `null`, and only an explicit decision survives a late SMS or a correction to the
 * log. `null` rows stay null, so no backfill was needed for the column.
 */
export async function setStemfestPaymentStatus(
  rowId: string,
  status: string,
): Promise<AdminStatusActionResult> {
  return statusAction(async () => {
    const admin = await requireAdmin();
    const id = parseInput(adminRowIdSchema, rowId);
    const next = parseStatus(status, isStemfestPaymentStatus, "payment");
    const label =
      statusOption(stemfestPaymentStatusOptions, next)?.label ?? next;
    const t = stemfestRegistrations;
    // One timestamp for the record and the email, so the receipt cannot be dated
    // differently from the decision it confirms.
    const decidedAt = new Date();

    const target = await withDbTimeout(
      "setStemfestPaymentStatus",
      async (tx): Promise<StemfestDecisionTarget | null> => {
        const [row] = await tx
          .select(stemfestDecisionSelection())
          .from(t)
          .where(eq(t.id, id));

        if (!row) {
          throw new StatusRefusal(
            "That registration is no longer there. Refresh the table and try again.",
          );
        }

        // Already decided: write nothing, and above all do not re-send. The select
        // cannot normally fire on its current value, so this is a double submit.
        if (row.decision === next) return null;

        await tx
          .update(t)
          .set({ paymentDecision: next, paymentDecidedAt: decidedAt, paymentDecidedBy: admin.email })
          .where(eq(t.id, id));

        return row;
      },
    );

    if (!target) {
      return {
        ok: true,
        message: `${label} is already the decision on record for this registration.`,
      };
    }

    if (next !== "verified") {
      return { ok: true, message: `Payment for ${target.name} marked ${label}.` };
    }

    // Nothing is emailed here on purpose. An address being missing is no longer a
    // reason to hold a decision back either: the admin records what they verified
    // and sends the receipt when they choose, from the row's own button.
    return {
      ok: true,
      message: `${target.name}'s payment is verified. Press Send confirmation on the row to email the receipt.`,
    };
  });
}


/**
 * Sends the confirmation again, for the admin whose participant never received it.
 *
 * A resend is only offered for a payment that reads `verified`, and the email is
 * dated from the decision on record (`payment_decided_at`) rather than from now —
 * a receipt that changes its date every time it is re-sent is not a receipt. Rows
 * verified by a forwarded SMS have no decision time, so the moment of the resend is
 * the best available answer.
 */
export async function resendStemfestPaymentEmail(
  rowId: string,
): Promise<AdminStatusActionResult> {
  return statusAction(async () => {
    await requireAdmin();
    const id = parseInput(adminRowIdSchema, rowId);
    const t = stemfestRegistrations;

    const target = await withDbTimeout(
      "resendStemfestPaymentEmail",
      async (tx): Promise<StemfestDecisionTarget> => {
        const [row] = await tx
          .select(stemfestDecisionSelection())
          .from(t)
          .where(eq(t.id, id));

        if (!row) {
          throw new StatusRefusal(
            "That registration is no longer there. Refresh the table and try again.",
          );
        }

        return row;
      },
    );

    if (target.status !== "verified") {
      const currentLabel =
        statusOption(stemfestPaymentStatusOptions, target.status)?.label ??
        target.status;

      throw new StatusRefusal(
        `Only a verified payment has a confirmation to send — this one is ${currentLabel.toLowerCase()}.`,
      );
    }

    const email = target.email?.trim() ?? "";

    if (!email) {
      throw new StatusRefusal(
        `No contact email on file for ${target.name} — add one first, then send.`,
      );
    }

    const delivery = await deliverConfirmation(
      target,
      email,
      target.decidedAt ?? new Date(),
    );

    if (!delivery.sent) {
      return { ok: false, message: `No email went out — ${delivery.detail}` };
    }

    await recordConfirmationSent(id);

    return { ok: true, message: delivery.detail };
  });
}

/**
 * Saves — or clears — the address a participant's confirmation goes to.
 *
 * The column is nullable because rows collected before the form asked for an email
 * have none, and an empty field is therefore a legitimate value: it clears the
 * address rather than failing validation, which is what an admin deleting one means.
 */
export async function setStemfestContactEmail(
  rowId: string,
  email: string,
): Promise<AdminStatusActionResult> {
  return statusAction(async () => {
    await requireAdmin();
    const id = parseInput(adminRowIdSchema, rowId);
    // Trimmed into the schema, so a field emptied with stray spaces reads as a clear
    // and an address pasted with a trailing space is not rejected.
    const value = parseInput(contactEmailSchema, email.trim());
    const t = stemfestRegistrations;

    const updated = await withDbTimeout("setStemfestContactEmail", async (tx) => {
      const [row] = await tx
        .update(t)
        .set({ email: value === "" ? null : value })
        .where(eq(t.id, id))
        .returning({ name: t.name });

      if (!row) {
        throw new StatusRefusal(
          "That registration is no longer there. Refresh the table and try again.",
        );
      }

      return row;
    });

    return {
      ok: true,
      message:
        value === ""
          ? `Contact email cleared for ${updated.name}.`
          : `Contact email for ${updated.name} saved as ${value}.`,
    };
  });
}

/**
 * Corrects which registration a forwarded payment SMS was reconciled against.
 *
 * The log is the *evidence* for a row whose `payment_decision` is still `null`, so
 * editing it here changes what the STEM Fest table reads — which is the point: the
 * matcher gets it wrong when the registration arrives after the message, or when a
 * TrxID is mistyped.
 *
 * Only `matched` keeps a link. Marking a message `ignored` (a promotion, an OTP) or
 * `unmatched` clears `matched_registration_id`, and that is what un-verifies any
 * registration whose only evidence was this message — so the answer says so instead
 * of leaving the admin to discover it in the table.
 */
export async function setSmsLogStatus(
  rowId: string,
  status: string,
): Promise<AdminStatusActionResult> {
  return statusAction(async () => {
    await requireAdmin();
    const id = parseInput(adminRowIdSchema, rowId);
    const next = parseStatus(status, isSmsLogStatus, "message");
    const label = statusOption(smsLogStatusOptions, next)?.label ?? next;
    const t = stemfestPaymentSms;
    const r = stemfestRegistrations;

    const linked = await withDbTimeout("setSmsLogStatus", async (tx) => {
      const [message] = await tx
        .select({ id: t.id, transactionId: t.transactionId })
        .from(t)
        .where(eq(t.id, id));

      if (!message) {
        throw new StatusRefusal(
          "That message is no longer in the log. Refresh the table and try again.",
        );
      }

      if (next !== "matched") {
        await tx
          .update(t)
          .set({ status: next, matchedRegistrationId: null })
          .where(eq(t.id, id));

        return null;
      }

      // Re-run the reconciliation the forwarder webhook does, so the link this log
      // shows is the same link the STEM Fest status pill derives from — rather than
      // a bare `matched` flag that points at no registration.
      const [registration] = message.transactionId
        ? await tx
            .select({ id: r.id, name: r.name })
            .from(r)
            .where(sql`upper(${r.transactionId}) = upper(${message.transactionId})`)
            .limit(1)
        : [];

      await tx
        .update(t)
        .set({ status: "matched", matchedRegistrationId: registration?.id ?? null })
        .where(eq(t.id, id));

      return registration?.name ?? null;
    });

    if (next === "matched") {
      return {
        ok: true,
        message: linked
          ? `Marked ${label} — linked to ${linked}'s registration.`
          : `Marked ${label}, but no registration carries this TrxID yet, so no payment status changed.`,
      };
    }

    return {
      ok: true,
      message: `Marked ${label} and unlinked — a registration this message was the only evidence for now reads Pending.`,
    };
  });
}

