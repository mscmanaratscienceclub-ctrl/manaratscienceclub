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
  gt,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import {
  ADMIN_TIME_ZONE,
  PAGE_SIZE,
  REPORT_ROW_LIMIT,
  clampPage,
  pageCount,
  type AdminQueryState,
  type AdminSourceId,
} from "@/lib/admin/filters";
import {
  BULK_EMAIL_DELAY_MS,
  BULK_EMAIL_MAX_RECIPIENTS,
  bulkEmailSendSchema,
  bulkEmailStateSchema,
  type BulkEmailAudience,
  type BulkEmailBatchResult,
  type BulkEmailFailure,
  type BulkEmailKind,
  type BulkEmailPreview,
  type BulkEmailPreviewInput,
  type BulkEmailRecipient,
  type BulkEmailSendInput,
} from "@/lib/admin/bulk-email";
import {
  adminRowIdSchema,
  attendanceOption,
  ATTENDANCE_PRESENT_VALUE,
  contactEmailSchema,
  isSmsLogStatus,
  isStemfestAttendance,
  isStemfestPaymentStatus,
  smsLogStatusOptions,
  statusOption,
  stemfestPaymentStatusOptions,
  type AdminStatusActionResult,
  type StemfestPaymentStatus,
} from "@/lib/admin/statuses";
import {
  SNAPSHOT_DELTA_LIMIT,
  SNAPSHOT_VERSION,
  toIso,
  toAttendanceSnapshotRow,
  toSmsSnapshotRow,
  toStemfestSnapshotRow,
  type AttendanceSnapshot,
  type AttendanceSnapshotRow,
  type AttendanceTally,
  type SmsSnapshot,
  type SmsSnapshotRow,
  type SmsTallies,
  type SnapshotDelta,
  type SnapshotProbe,
  type StemfestSnapshot,
  type StemfestSnapshotRow,
} from "@/lib/admin/snapshot";
import {
  stemfestEffectivePaymentStatus,
  stemfestPaymentAmount,
  stemfestPaymentFilter,
} from "@/db/queries/stemfest-payment";
import {
  ambassadorWhere,
  attendanceCountSelection,
  attendanceProbeSelection,
  attendanceSelection,
  attendanceWhere,
  countRows,
  orderFor,
  smsTallySelection,
  smsWhere,
  stemfestAdminSelection,
  stemfestStatsSelection,
  stemfestWhere,
  volunteerWhere,
} from "@/db/queries/admin-filters";
import {
  formatBdt,
  getStemfestClassLabel,
  getStemfestSegment,
  manaratSchoolLabel,
  manaratSchoolLikePattern,
  stemfestEvents,
  stemfestSegments,
} from "@/lib/data/stemfest-registration";
import {
  BRIEF_TREND_DAYS,
  BRIEF_WINDOW_DAYS,
  estimateNextDay,
  referrerKindOf,
  summarizeTrend,
  toMovementRows,
  type BriefSchoolRow,
  type MovementInput,
  type ReferrerKind,
  type ReferrerRow,
  type RegistrationBrief,
} from "@/lib/admin/brief";
import {
  DASHBOARD_TREND_DAYS,
  recentDayKeys,
  type EventPopularityRow,
  type ReferenceCountRow,
  type RegistrationTrendPoint,
  type SchoolCountRow,
} from "@/lib/admin/dashboard";
import { sendCustomEmail, sendPaymentVerifiedEmail } from "@/lib/email/resend";
import { getCustomEmailHtml } from "@/lib/email/templates/custom-message";
import { getPaymentVerifiedEmailHtml } from "@/lib/email/templates/payment-verified";
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
      .orderBy(...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }))
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
        ...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.fullName }),
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
      .select(stemfestAdminSelection())
      .from(t)
      .where(where)
      .orderBy(...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }))
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

export interface StemfestAttendanceRow {
  id: string;
  /** `<GENDER><CLASS><NNN>` — what the participant was told, and what the desk reads. */
  registrationCode: string;
  name: string;
  /** The stored class id (`class-9`); the sheet prints its label. */
  class: string;
  school: string;
  /** The stored bit: marked present at the desk, or not. */
  attendance: boolean;
  /** Sorted and paged by; printed nowhere on the sheet. */
  createdAt: Date;
}

export interface AttendanceSearchResult {
  rows: StemfestAttendanceRow[];
  total: number;
  /**
   * Marked present out of **every** registration, not out of what is on screen.
   *
   * Whole-table on purpose: the cached copy recomputes the same two figures over its
   * whole list, and a headline that meant "of the filtered rows" on the server and
   * "of everything" once the browser took over would be the card-vs-pill drift
   * ADR-0044 names as the one thing a cached panel must not do.
   */
  tally: AttendanceTally;
  page: number;
  totalPages: number;
}

/**
 * One page of the attendance sheet.
 *
 * A separate read from `searchStemfestRegistrations` rather than a projection of
 * it: the sheet selects the columns a desk can act on, so payment, TrxID and email
 * never cross the entrance with the name they belong to.
 */
export async function searchAttendance(
  state: AdminQueryState,
): Promise<AttendanceSearchResult> {
  await requireAdmin();
  const t = stemfestRegistrations;
  const requested = clampPage(state.page);
  const where = attendanceWhere(state);

  return withDbTimeout("searchAttendance", async (tx) => {
    const [counts] = await tx
      .select(attendanceCountSelection())
      .from(t)
      .where(where);

    const total = counts?.total ?? 0;
    const page = Math.min(requested, pageCount(total));

    // Sequential, never `Promise.all` — and the second statement carries no WHERE,
    // because the two figures beside the heading are whole-table ones.
    const [whole] = await tx.select(attendanceProbeSelection()).from(t);

    const rows = await tx
      .select(attendanceSelection())
      .from(t)
      .where(where)
      .orderBy(...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return {
      rows,
      total,
      tally: { present: whole?.present ?? 0, total: whole?.count ?? 0 },
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

/**
 * An aggregate row over an empty table: every `count` is a real zero, and both sums
 * are `null` — which the panel draws as an em dash, because "nothing was asked for"
 * and "no row carries a figure" are different statements.
 */
function normalizeStemfestStats(row: {
  total: number | null;
  thisWeek: number | null;
  uniqueSchools: number | null;
  verifiedCount: number | null;
  pendingCount: number | null;
  rejectedCount: number | null;
  amountCollected: string | null;
  amountToCollect: string | null;
} | undefined): StemfestStats {
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
}

export async function getStemfestStats(): Promise<StemfestStats> {
  await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("getStemfestStats", async (tx) => {
    const [row] = await tx.select(stemfestStatsSelection()).from(t);

    return normalizeStemfestStats(row);
  });
}

// ── Browser snapshots ────────────────────────────────────────────────────────
//
// The whole list, read once so a fest desk can search it without a round trip per
// keystroke. The rows, the effective payment status and the figures are exactly the
// paged table's — nothing narrows them, and the ceiling is `REPORT_ROW_LIMIT` with
// `truncated` saying so rather than a list quietly short of rows.

/**
 * The newest `created_at`, and the newest admin write, as the cursors a delta reads.
 *
 * Neither table has an `updated_at`, so appends are detected by `created_at` and the
 * one edit that must not be missed — an admin's decision, or a confirmation sent — by
 * the two timestamps those writes set. `greatest` ignores NULLs, so a row with only
 * one of them still reports it.
 */
function stemfestProbeSelection() {
  const t = stemfestRegistrations;

  return {
    count: sql<number>`count(*)::int`,
    cursor: sql<Date | null>`max(${t.createdAt})::timestamptz`,
    decidedCursor: sql<Date | null>`max(greatest(${t.paymentDecidedAt}, ${t.paymentEmailSentAt}))::timestamptz`,
  };
}

/** One probe row into the wire shape. A `null` cursor means the table is empty. */
function toProbe(
  row:
    | { count: number | null; cursor: Date | null; decidedCursor?: Date | null }
    | undefined,
): SnapshotProbe {
  return {
    count: row?.count ?? 0,
    cursor: row?.cursor ? toIso(row.cursor) : null,
    decidedCursor: row?.decidedCursor ? toIso(row.decidedCursor) : null,
  };
}

export async function probeStemfestSnapshot(): Promise<SnapshotProbe> {
  await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("probeStemfestSnapshot", async (tx) => {
    const [row] = await tx.select(stemfestProbeSelection()).from(t);
    return toProbe(row);
  });
}

export async function getStemfestSnapshot(): Promise<StemfestSnapshot> {
  const admin = await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("getStemfestSnapshot", async (tx) => {
    // One row past the ceiling is how truncation is detected: 2 001 come back, the
    // newest 2 000 are kept, and the payload says the list is a slice.
    const found = await tx
      .select(stemfestAdminSelection())
      .from(t)
      .orderBy(desc(t.createdAt))
      .limit(REPORT_ROW_LIMIT + 1);

    // Sequential, never `Promise.all` — two statements pipelined onto one pooled
    // connection is what wedges Supavisor (`src/db/query.ts`). Same transaction, so
    // the rows, the figures and the cursor all describe one instant.
    const [statsRow] = await tx.select(stemfestStatsSelection()).from(t);
    const [probeRow] = await tx.select(stemfestProbeSelection()).from(t);

    const truncated = found.length > REPORT_ROW_LIMIT;
    const rows = truncated ? found.slice(0, REPORT_ROW_LIMIT) : found;

    return {
      v: SNAPSHOT_VERSION,
      source: "stemfest",
      admin: admin.email,
      generatedAt: new Date().toISOString(),
      ...toProbe(probeRow),
      truncated,
      stats: normalizeStemfestStats(statsRow),
      rows: rows.map(toStemfestSnapshotRow),
    };
  });
}

/** Rows filed after `since`, oldest first so the cache can append them in order. */
export async function stemfestDeltaSince(
  since: Date,
): Promise<SnapshotDelta<StemfestSnapshotRow>> {
  await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("stemfestDeltaSince", async (tx) => {
    const found = await tx
      .select(stemfestAdminSelection())
      .from(t)
      .where(gt(t.createdAt, since))
      .orderBy(asc(t.createdAt))
      .limit(SNAPSHOT_DELTA_LIMIT + 1);

    const [probeRow] = await tx.select(stemfestProbeSelection()).from(t);
    const truncated = found.length > SNAPSHOT_DELTA_LIMIT;

    return {
      generatedAt: new Date().toISOString(),
      probe: toProbe(probeRow),
      truncated,
      rows: (truncated ? found.slice(0, SNAPSHOT_DELTA_LIMIT) : found).map(
        toStemfestSnapshotRow,
      ),
    };
  });
}

// ── The attendance sheet's snapshot ──────────────────────────────────────────
//
// The same table as the registrations snapshot above, read narrower: the sheet
// caches five fields per participant — a name, an ID, a class, a tick, and the
// submission moment it sorts by — so what sits in a fest laptop is not an email
// address, a phone number or a TrxID. Same freshness rules, same ceiling, same
// per-admin stamp.

/** The whole sheet as one download: the rows, the two figures, and the cursors. */
export async function getAttendanceSnapshot(): Promise<AttendanceSnapshot> {
  const admin = await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("getAttendanceSnapshot", async (tx) => {
    // One row past the ceiling is how truncation is detected: 2 001 come back, the
    // newest 2 000 are kept, and the payload says the list is a slice.
    const found = await tx
      .select(attendanceSelection())
      .from(t)
      .orderBy(desc(t.createdAt))
      .limit(REPORT_ROW_LIMIT + 1);

    // Sequential, never `Promise.all`, and in the same transaction — so the rows and
    // the figures describe one instant rather than two readings of a moving table.
    const [probeRow] = await tx.select(attendanceProbeSelection()).from(t);

    const truncated = found.length > REPORT_ROW_LIMIT;
    const rows = truncated ? found.slice(0, REPORT_ROW_LIMIT) : found;

    return {
      v: SNAPSHOT_VERSION,
      source: "attendance",
      admin: admin.email,
      generatedAt: new Date().toISOString(),
      ...toProbe(probeRow),
      truncated,
      tally: { present: probeRow?.present ?? 0, total: probeRow?.count ?? 0 },
      rows: rows.map(toAttendanceSnapshotRow),
    };
  });
}

export async function probeAttendanceSnapshot(): Promise<SnapshotProbe> {
  await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("probeAttendanceSnapshot", async (tx) => {
    const [row] = await tx.select(attendanceProbeSelection()).from(t);
    return toProbe(row);
  });
}

/** Rows filed after `since`, oldest first so the cache can append them in order. */
export async function attendanceDeltaSince(
  since: Date,
): Promise<SnapshotDelta<AttendanceSnapshotRow>> {
  await requireAdmin();
  const t = stemfestRegistrations;

  return withDbTimeout("attendanceDeltaSince", async (tx) => {
    const found = await tx
      .select(attendanceSelection())
      .from(t)
      .where(gt(t.createdAt, since))
      .orderBy(asc(t.createdAt))
      .limit(SNAPSHOT_DELTA_LIMIT + 1);

    const [probeRow] = await tx.select(attendanceProbeSelection()).from(t);
    const truncated = found.length > SNAPSHOT_DELTA_LIMIT;

    return {
      generatedAt: new Date().toISOString(),
      probe: toProbe(probeRow),
      truncated,
      rows: (truncated ? found.slice(0, SNAPSHOT_DELTA_LIMIT) : found).map(
        toAttendanceSnapshotRow,
      ),
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
/** Referrer rows on the dashboard's reference leaderboard before it stops. */
const REFERENCE_LEADERBOARD_LIMIT = 8;

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
 * STEM Fest entries per day over the last `span` days.
 *
 * Every returned point carries one count per `stemfestTrendSeries` entry, in that
 * order, and a day with no registrations returns a real zero rather than being
 * missing — a chart that silently dropped empty days would shift every bar after
 * it.
 *
 * Campus/batch ambassador and volunteer registrations are deliberately not read:
 * they have their own admin sections and the dashboard no longer charts them.
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

    const stemfest = await dailyCounts(
      tx,
      stemfestRegistrations,
      stemfestRegistrations.createdAt,
      since,
    );

    return dayKeys.map((day) => ({
      day,
      counts: [stemfest.get(day) ?? 0],
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
  /**
   * The latest STEM Fest entries — the dashboard's recent feed.
   *
   * This used to be ambassador responses; every figure on the panel is now the
   * fest's own, so the feed is its most recent registrations.
   */
  recent: RecentStemfestRegistration[];
  events: EventPopularityRow[];
  topSchools: SchoolCountRow[];
  /**
   * Distinct schools among STEM Fest entries, counted once each.
   *
   * Every Manarat spelling collapses to `manaratSchoolLabel` before counting, so
   * the host school is one school here rather than one per way it was typed. It is
   * the size of the same grouping the league table is ranked on — the list is its
   * top six, and this is the whole population.
   */
  uniqueSchools: number;
  /** Who referred the most STEM Fest entries; `reference` is `null` for nobody. */
  referenceLeaderboard: ReferenceCountRow[];
  /** How many distinct referrers exist, the "nobody referred them" bucket included. */
  uniqueReferences: number;
}

/**
 * The dashboard's secondary figures: the recent feed, event popularity, the school
 * league table and the reference leaderboard.
 *
 * One action rather than four, because the dashboard's concurrency budget is the
 * pool size: `src/db/index.ts` documents that more than four simultaneous sources
 * makes Supavisor lose responses. Its statements run sequentially here instead.
 *
 * Every figure is STEM Fest only. The volunteer and ambassador counts that used to
 * live here are gone with the other forms' chart series — those forms keep their
 * own table pages, and this panel stopped reporting them.
 */
export async function getDashboardBreakdown(): Promise<DashboardBreakdown> {
  await requireAdmin();
  const s = stemfestRegistrations;

  return withDbTimeout("getDashboardBreakdown", async (tx) => {
    const recent = await tx
      .select({
        id: s.id,
        name: s.name,
        class: s.class,
        school: s.school,
        reference: s.reference,
        createdAt: s.createdAt,
      })
      .from(s)
      .orderBy(desc(s.createdAt))
      .limit(RECENT_REGISTRATION_LIMIT);

    const events = await stemfestEventCounts(tx);

    // `count(*) over ()` is evaluated after `group by`, so it is the number of
    // distinct schools in the whole table — the ranking's ceiling — rather than
    // the six rows returned here. `min(label)` keeps a real school's casing
    // instead of the lower-cased key the grouping needs, and grouping by
    // `lower(label)` after a Manarat row has been normalised to
    // `manaratSchoolLabel` is what makes every host-school spelling one group.
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
              case
                when ${s.school} ilike ${manaratSchoolLikePattern} then ${manaratSchoolLabel}
                else btrim(${s.school})
              end as label
            from ${s}
          ) as schools
          group by lower(label)
        ) as ranked
        order by count desc, label asc
        limit ${TOP_SCHOOL_LIMIT}
      `),
    );

    // References belong to STEM Fest entries. NULL means "not referred by
    // anyone" rather than a missing answer, so it is kept as its own row and
    // sorts last rather than being dropped.
    const referenceRows = asRows<{
      reference: string | null;
      count: number;
      total: number;
    }>(
      await tx.execute(sql`
        select referrer as reference, cnt as count, total_groups as total
        from (
          select
            ${s.reference} as referrer,
            count(*)::int as cnt,
            (count(*) over ())::int as total_groups
          from ${s}
          group by ${s.reference}
        ) as ranked
        order by count desc, referrer asc nulls last
        limit ${REFERENCE_LEADERBOARD_LIMIT}
      `),
    );

    return {
      recent,
      events,
      topSchools: schoolRows.map((row) => ({
        school: row.label?.trim() ? row.label : "School not given",
        count: row.count,
      })),
      uniqueSchools: schoolRows[0]?.total ?? 0,
      referenceLeaderboard: referenceRows.map((row) => ({
        reference: row.reference,
        count: row.count,
      })),
      uniqueReferences: referenceRows[0]?.total ?? 0,
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
export interface RecentStemfestRegistration {
  id: string;
  name: string;
  class: string;
  school: string;
  /** Who referred the entry; `null` when nobody did. */
  reference: string | null;
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

/**
 * The three status tallies the section's stat cards print, normalised.
 *
 * The selection itself lives in `src/db/queries/admin-filters.ts`, beside the rest of
 * the SQL the parity harness has to read.
 */
function normalizeSmsTallies(row: {
  matched: number | null;
  unmatched: number | null;
  ignored: number | null;
} | undefined): SmsTallies {
  return {
    matched: row?.matched ?? 0,
    unmatched: row?.unmatched ?? 0,
    ignored: row?.ignored ?? 0,
  };
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
        ...orderFor(state.sort, { timestamp: t.receivedAt, id: t.id, amount: t.amount }),
      )
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const [statusCounts] = await tx.select(smsTallySelection()).from(t);
    const tallies = normalizeSmsTallies(statusCounts);

    return {
      rows,
      total,
      page,
      totalPages: pageCount(total),
      matchedCount: tallies.matched,
      unmatchedCount: tallies.unmatched,
      ignoredCount: tallies.ignored,
    };
  });
}

// ── Browser snapshots: SMS log ───────────────────────────────────────────────
//
// The same whole-list read as the STEM Fest one above, over the forwarded-payment
// log. The cursor here is `created_at` — when the webhook *stored* the message —
// rather than `received_at`, which is the message's own timestamp and can arrive out
// of order; a delta keyed on it would miss an older message stored after the cursor.

function smsProbeSelection() {
  const t = stemfestPaymentSms;

  return {
    count: sql<number>`count(*)::int`,
    cursor: sql<Date | null>`max(${t.createdAt})::timestamptz`,
  };
}

/**
 * The SMS log's probe. `decidedCursor` is always `null`: nothing an admin does to a
 * forwarded message — matching it, ignoring it — writes a timestamp, so those edits
 * are invisible to a delta and are only picked up by a manual refresh.
 */
function toSmsProbe(row: { count: number | null; cursor: Date | null } | undefined) {
  return { ...toProbe(row), decidedCursor: null };
}

export async function probeSmsSnapshot(): Promise<SnapshotProbe> {
  await requireAdmin();
  const t = stemfestPaymentSms;

  return withDbTimeout("probeSmsSnapshot", async (tx) => {
    const [row] = await tx.select(smsProbeSelection()).from(t);
    return toSmsProbe(row);
  });
}

export async function getSmsSnapshot(): Promise<SmsSnapshot> {
  const admin = await requireAdmin();
  const t = stemfestPaymentSms;

  return withDbTimeout("getSmsSnapshot", async (tx) => {
    const found = await tx
      .select()
      .from(t)
      .orderBy(desc(t.receivedAt))
      .limit(REPORT_ROW_LIMIT + 1);

    const [tallyRow] = await tx.select(smsTallySelection()).from(t);
    const [probeRow] = await tx.select(smsProbeSelection()).from(t);

    const truncated = found.length > REPORT_ROW_LIMIT;
    const rows = truncated ? found.slice(0, REPORT_ROW_LIMIT) : found;

    return {
      v: SNAPSHOT_VERSION,
      source: "sms",
      admin: admin.email,
      generatedAt: new Date().toISOString(),
      ...toSmsProbe(probeRow),
      truncated,
      tallies: normalizeSmsTallies(tallyRow),
      rows: rows.map(toSmsSnapshotRow),
    };
  });
}

/** Messages stored after `since`, oldest first so the cache can append them in order. */
export async function smsDeltaSince(
  since: Date,
): Promise<SnapshotDelta<SmsSnapshotRow>> {
  await requireAdmin();
  const t = stemfestPaymentSms;

  return withDbTimeout("smsDeltaSince", async (tx) => {
    const found = await tx
      .select()
      .from(t)
      .where(gt(t.createdAt, since))
      .orderBy(asc(t.createdAt))
      .limit(SNAPSHOT_DELTA_LIMIT + 1);

    const [probeRow] = await tx.select(smsProbeSelection()).from(t);
    const truncated = found.length > SNAPSHOT_DELTA_LIMIT;

    return {
      generatedAt: new Date().toISOString(),
      probe: toSmsProbe(probeRow),
      truncated,
      rows: (truncated ? found.slice(0, SNAPSHOT_DELTA_LIMIT) : found).map(
        toSmsSnapshotRow,
      ),
    };
  });
}

// ── Registration brief ───────────────────────────────────────────────────────
//
// The five figures the printable brief states, read as one document. Unlike the
// dashboard — which fans out across three actions because three sources render at
// three priorities — the brief has to be internally consistent: its trend total,
// its segment rows and its projection all describe the *same* seven days, so they
// are read in one transaction, sequentially, inside the pool's one-connection
// budget (`src/db/index.ts`).

/** Rows the brief's school league table and referrer leaderboard print. */
const BRIEF_SCHOOL_LIMIT = 6;
const BRIEF_REFERRER_LIMIT = 10;

/**
 * Everything the printed brief says, as one read.
 *
 * Every "last 7 days" here means the same seven **local** days the panel's chart
 * bars name, which is why the window bounds are `(now() at time zone …)::date - n`
 * rather than `now() - interval`: an interval window would cut the day at a UTC
 * boundary and let the brief report a week the admin cannot see on the screen
 * beside it.
 */
export async function getRegistrationBrief(): Promise<RegistrationBrief> {
  await requireAdmin();
  const s = stemfestRegistrations;
  const ca = campusAmbassadorRegistrations;

  /** A registration's calendar day in the admin's timezone. */
  const stemfestDay = sql`(${s.createdAt} at time zone ${ADMIN_TIME_ZONE})::date`;
  // `::int` on each offset is load-bearing for the same reason `getRegistrationTrend`
  // documents: `date - $1` otherwise resolves to the date-difference operator and
  // hands back a day *number*, which then gets compared against a date.
  const windowStart = sql`(now() at time zone ${ADMIN_TIME_ZONE})::date - ${BRIEF_WINDOW_DAYS - 1}::int`;
  const priorStart = sql`(now() at time zone ${ADMIN_TIME_ZONE})::date - ${BRIEF_WINDOW_DAYS * 2 - 1}::int`;
  const spanStart = sql`(now() at time zone ${ADMIN_TIME_ZONE})::date - ${BRIEF_TREND_DAYS - 1}::int`;

  return withDbTimeout("getRegistrationBrief", async (tx) => {
    const [totals] = await tx
      .select({
        allTime: sql<number>`count(*)::int`,
        verified: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'verified')::int`,
        pending: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'pending')::int`,
        rejected: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'rejected')::int`,
        referred: sql<number>`count(*) filter (where ${s.reference} is not null)::int`,
      })
      .from(s);

    // ── 1. Trend ─────────────────────────────────────────────────────────────
    const dayKeys = recentDayKeys(BRIEF_TREND_DAYS);
    const daily = await dailyCounts(tx, s, s.createdAt, spanStart);
    const points: RegistrationTrendPoint[] = dayKeys.map((day) => ({
      day,
      counts: [daily.get(day) ?? 0],
    }));

    // ── 2. Segments, booming and down ────────────────────────────────────────
    //
    // Counted from the stored `segments` prose the way `stemfestEventCounts` is —
    // the catalogue supplies both ids and names, so a new event appears the moment
    // it is added to registration — but once per event *per window*, in one
    // statement. A segment with no entries at all still gets a row: "nothing
    // happened here either" is part of the answer.
    const eventCatalogue = sql.join(
      stemfestEvents.map((event) => sql`(${event.id}::text, ${event.name}::text)`),
      sql`, `,
    );

    const eventRows = asRows<{ event_id: string; recent: number; prior: number }>(
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

    const events = toMovementRows(eventInputs);

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
        return {
          id: segment.id,
          label: segment.name,
          sublabel: segment.blurb,
          current,
          previous,
        } satisfies MovementInput;
      }),
    );

    // ── 3. Schools ───────────────────────────────────────────────────────────
    //
    // The same grouping the dashboard's league table uses — every Manarat spelling
    // collapsed to one name before counting — with the window's count alongside
    // the all-time one, so "who registers the most" and "who is registering right
    // now" are not confused for each other.
    const schoolRows = asRows<{
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
        limit ${BRIEF_SCHOOL_LIMIT}
      `),
    );

    const schools: BriefSchoolRow[] = schoolRows.map((row) => ({
      id: (row.label ?? "unknown").trim().toLowerCase(),
      school: row.label?.trim() ? row.label : "School not given",
      total: row.total,
      recent: row.recent,
    }));

    // ── 4. Who refers, and what they are ─────────────────────────────────────
    //
    // `reference` is a name, so its kind comes from the ambassador register rather
    // than from the roster the form offered: a name matches a register row on
    // lower-cased, trimmed text, and a referrer signed up under both kinds is
    // reported as `both` instead of silently choosing one.
    const referrerRows = asRows<{
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
        limit ${BRIEF_REFERRER_LIMIT}
      `),
    );

    const referrers: ReferrerRow[] = referrerRows.map((row, index) => ({
      id: row.name?.trim().toLowerCase() ?? `referrer-${index}`,
      name: row.name?.trim() ? row.name : "Name not given",
      total: row.total,
      recent: row.recent,
      kind: referrerKindOf({ isCampus: row.is_campus, isBatch: row.is_batch }),
    }));

    const referrerTallies = asRows<{
      kind: ReferrerKind;
      referrals: number;
    }>(
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
      trend: summarizeTrend(points),
      segments,
      events,
      schools,
      uniqueSchools: schoolRows[0]?.groups ?? 0,
      referrers,
      referrerTallies,
      referredTotal: totals?.referred ?? 0,
      estimate: estimateNextDay(points),
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
            ...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }),
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
            ...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.fullName }),
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
            ...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }),
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

      case "attendance": {
        const t = stemfestRegistrations;
        const where = attendanceWhere(state);
        const total = await countRows(tx, t, where);
        const rows = await tx
          .select(attendanceSelection())
          .from(t)
          .where(where)
          .orderBy(
            ...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }),
          )
          .limit(REPORT_ROW_LIMIT);

        return {
          total,
          truncated: total > rows.length,
          rows: rows.map((row) => ({
            registrationCode: reportText(row.registrationCode),
            name: reportText(row.name),
            // The label, not the stored id: this is the one export a volunteer
            // carries to a gate, and nobody decodes `class-9` off a sheet.
            class: reportText(getStemfestClassLabel(row.class)),
            school: reportText(row.school),
            // The same two words the switch and its filter menu read.
            attendance: attendanceOption(row.attendance).label,
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
            ...orderFor(state.sort, { timestamp: t.receivedAt, id: t.id, amount: t.amount }),
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
    // What the participant was told to pay, stored on the row as `total_fee`. This
    // is the authoritative per-participant amount and what the receipt should quote.
    totalFee: t.totalFee,
    // What a forwarded SMS reported arrived, as text; only a fallback for legacy
    // rows that predate `total_fee`.
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
  /** What the participant was told to pay, in BDT; `null` for legacy rows. */
  totalFee: number | null;
  amount: string | null;
}

/**
 * The amount the confirmation quotes.
 *
 * The authoritative figure is the registration's own `total_fee` — what the club
 * asked that participant to pay, computed server-side per insert, so it is
 * inherently per-participant. The forwarded-SMS amount (`amount`) is only a
 * fallback for legacy rows filed before `total_fee` existed: it is as good as
 * the SMS parser, and it has been known to report one uniform figure for many
 * rows, which is exactly why it is not trusted for a receipt.
 */
function confirmationAmount(
  totalFee: number | null,
  smsAmount: string | null,
): string | undefined {
  if (totalFee !== null && Number.isFinite(totalFee)) {
    return formatBdt(totalFee);
  }

  if (!smsAmount) return undefined;

  const value = Number(smsAmount);
  return Number.isFinite(value) ? formatBdt(value) : undefined;
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
    // The receipt prints the address it was sent to; the row's email wins
    // because an admin can correct it, with the send address as the fallback.
    email: target.email ?? to,
    transactionId: target.transactionId,
    paymentNumber: target.paymentNumber,
    segments: target.segments,
    amount: confirmationAmount(target.totalFee, target.amount),
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
 * A resend is only offered for a payment that reads `verified` — the receipt tells
 * the participant the club checked their payment, so there is nothing to send until
 * it has.
 */
export async function resendStemfestPaymentEmail(
  rowId: string,
): Promise<AdminStatusActionResult> {
  return statusAction(async () => {
    await requireAdmin();
    const id = parseInput(adminRowIdSchema, rowId);
    return deliverStemfestConfirmation(id);
  });
}

/**
 * The delivery behind a resend, with no auth check of its own.
 *
 * Split out because the bulk sender authenticates once for a whole batch and then
 * calls this per recipient — re-reading the session on every row of a forty-row
 * blast would be forty needless round trips. The public entry points still go
 * through `resendStemfestPaymentEmail`, which checks the admin first.
 */
async function deliverStemfestConfirmation(
  id: string,
): Promise<AdminStatusActionResult> {
  const t = stemfestRegistrations;

  const target = await withDbTimeout(
    "deliverStemfestConfirmation",
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

  const delivery = await deliverConfirmation(target, email);

  if (!delivery.sent) {
    return { ok: false, message: `No email went out — ${delivery.detail}` };
  }

  await recordConfirmationSent(id);

  return { ok: true, message: delivery.detail };
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
 * Marks a participant present at the fest desk, or puts the tick back.
 *
 * The value arrives as the filter's word (`present` / `absent`) rather than a
 * boolean, because a queued write is replayed verbatim out of IndexedDB and the
 * panel's whole write vocabulary is those two words.
 *
 * It is idempotent on purpose: the sheet fires this on every flick, so a double
 * submit and a retry after a lost response both land on the same bit. Nothing else
 * on the row moves — attendance says nothing about whether someone paid, and the
 * panel reads the two columns together rather than deriving one from the other.
 *
 * `attendance_marked_at` moves **either** way. It is not an audit column but the
 * browser cache's change cursor, and a mark taken *back* has to be as visible to
 * another desk's probe as one made.
 */
export async function setStemfestAttendance(
  rowId: string,
  attendance: string,
): Promise<AdminStatusActionResult> {
  return statusAction(async () => {
    await requireAdmin();
    const id = parseInput(adminRowIdSchema, rowId);
    const word = parseInput(z.string("That mark could not be read."), attendance).trim();

    if (!isStemfestAttendance(word)) {
      throw new StatusRefusal(
        "That is not an attendance mark this panel knows. Refresh the sheet and try again.",
      );
    }

    const present = word === ATTENDANCE_PRESENT_VALUE;
    const t = stemfestRegistrations;

    const updated = await withDbTimeout("setStemfestAttendance", async (tx) => {
      const [row] = await tx
        .update(t)
        .set({ attendance: present, attendanceMarkedAt: new Date() })
        .where(eq(t.id, id))
        .returning({ name: t.name });

      if (!row) {
        throw new StatusRefusal(
          "That registration is no longer there. Refresh the sheet and try again.",
        );
      }

      return row;
    });

    return {
      ok: true,
      message: `${updated.name} marked ${attendanceOption(present).label.toLowerCase()}.`,
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

// ── Bulk email ───────────────────────────────────────────────────────────────
//
// The audience behind `/admin/emails`. Both kinds of mail read the *same* filter
// set as the table and the printed report — `stemfestWhere`, the one builder — so
// "participants from Class 9" selects the same people whichever section of the
// page the admin uses, and can never drift from what the table shows.

/**
 * Who a send would reach: the filtered registrations it would actually write to.
 *
 * Both exclusions are in SQL rather than in the send loop, because the ceiling on
 * a blast counts *recipients*. Carrying the already-receipted rows along and
 * discounting them later means a club that has mailed 400 participants finds every
 * later send refused however few receipts are outstanding — the cap would be
 * measuring the size of the event, not the size of the work. So a confirmation
 * drops the rows holding a `paymentEmailSentAt` stamp, and a custom message keeps
 * one row per address — the earliest, so a family sharing an inbox is counted once
 * and cannot be reached twice by two different batches.
 *
 * `matched` is what the filters select and `sendable` what the send writes to; the
 * gap between them is reported to the panel as left alone.
 */
async function bulkEmailRecipients(
  state: AdminQueryState,
  kind: BulkEmailKind,
): Promise<BulkEmailAudience> {
  const t = stemfestRegistrations;

  const where = and(
    stemfestWhere(state),
    kind === "confirmation" ? stemfestPaymentFilter("verified") : undefined,
    sql`${t.email} is not null and btrim(${t.email}) <> ''`,
  );

  // One row per recipient, oldest registration first, and never more than the
  // ceiling plus one — that extra row is what says "there are more" without a
  // second pass over the table.
  const rowsSql = sql`
    with candidates as (
      select
        ${t.id} as id,
        ${t.name} as name,
        btrim(${t.email}) as email,
        ${t.createdAt} as created_at,
        ${
          kind === "confirmation"
            ? sql`${t.paymentEmailSentAt} is null`
            : sql`row_number() over (
                partition by lower(btrim(${t.email}))
                order by ${t.createdAt} asc, ${t.id} asc
              ) = 1`
        } as keep
      from ${t}
      where ${where}
    )
    select id, name, email
    from candidates
    where keep
    order by created_at asc, id asc
    limit ${BULK_EMAIL_MAX_RECIPIENTS + 1}
  `;

  // Counted over the whole filtered set, so the refusal does not depend on how
  // many rows the window above happened to carry.
  const tallySql = sql`
    select
      count(*)::int as matched,
      ${
        kind === "confirmation"
          ? sql`count(*) filter (where ${t.paymentEmailSentAt} is null)::int`
          : sql`count(distinct lower(btrim(${t.email})))::int`
      } as sendable
    from ${t}
    where ${where}
  `;

  return withDbTimeout("bulkEmailRecipients", async (tx) => {
    const rows = asRows<BulkEmailRecipient>(await tx.execute(rowsSql));
    const tally = asRows<{ matched: number; sendable: number }>(
      await tx.execute(tallySql),
    );

    const sendable = tally[0]?.sendable ?? 0;

    return {
      recipients: rows,
      truncated: sendable > BULK_EMAIL_MAX_RECIPIENTS,
      leftAlone: Math.max(0, (tally[0]?.matched ?? 0) - sendable),
    };
  });
}

/**
 * The audience for one kind of mail, for the page to show before anything is
 * sent — an admin should see who a blast would reach before pressing the button.
 */
export async function getBulkEmailAudience(
  state: AdminQueryState,
  kind: string,
): Promise<BulkEmailAudience> {
  await requireAdmin();
  const parsedKind = parseInput(z.enum(["custom", "confirmation"]), kind);
  return bulkEmailRecipients(state, parsedKind);
}

/** Resend's default plan accepts two requests a second; this spaces them out. */
function bulkEmailPause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A custom message, reported the same shape a receipt's send is. */
async function deliverCustomMessage(
  recipient: BulkEmailRecipient,
  subject: string,
  body: string,
  allowHtml: boolean,
): Promise<AdminStatusActionResult> {
  const result = await sendCustomEmail({
    to: recipient.email,
    name: recipient.name,
    subject,
    body,
    allowHtml,
  });

  if (result.success && !result.simulated) {
    return { ok: true, message: `Message sent to ${recipient.email}.` };
  }

  if (result.success) {
    return {
      ok: false,
      message:
        "this environment has no working Resend key, so the message was only written to the server log.",
    };
  }

  return {
    ok: false,
    message: `Resend refused it: ${result.error ?? "no reason given"}.`,
  };
}

/**
 * One recipient of a batch, with a refusal contained to that recipient.
 *
 * A single row that has stopped being verified (or lost its address under the
 * admin) is a failure to report, not a reason to abandon the forty rows behind
 * it. A genuine fault — a lost connection, a failed write — still throws, because
 * that is not the admin's to read and the batch should stop.
 */
async function deliverBulkRecipient(
  kind: BulkEmailKind,
  recipient: BulkEmailRecipient,
  subject: string,
  body: string,
  allowHtml: boolean,
): Promise<AdminStatusActionResult> {
  try {
    return kind === "confirmation"
      ? await deliverStemfestConfirmation(recipient.id)
      : await deliverCustomMessage(recipient, subject, body, allowHtml);
  } catch (error) {
    if (error instanceof StatusRefusal) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

/**
 * Sends one slice of a bulk blast.
 *
 * The audience is rebuilt here and the page's ids resolved against it: a client can
 * name a filter state and row ids, never an address, so a forged call can only ever
 * reach a registration an admin could already see. Rebuilding also re-checks the
 * ceiling on the server's own numbers, so a blast cannot be walked past it by
 * naming more rows than the panel offered.
 *
 * Ids rather than an offset, because the sendable audience moves while a blast runs:
 * every accepted receipt stamps its row and takes it out of the list a position was
 * counted against. A stale id — receipted from the row's own button since the page
 * rendered, or marked back to pending — is counted as skipped, not mailed again.
 *
 * The loop is deliberately sequential. Resend rate-limits by request, so parallel
 * sends would be throttled and reported as failures; one at a time with a pause is
 * slower and correct.
 */
export async function sendBulkEmailBatch(
  input: BulkEmailSendInput,
): Promise<BulkEmailBatchResult> {
  try {
    await requireAdmin();
    const state = parseInput(bulkEmailStateSchema, input.state);
    const send = parseInput(bulkEmailSendSchema, {
      kind: input.kind,
      ids: input.ids,
      subject: input.subject,
      body: input.body,
      allowHtml: input.allowHtml,
    });

    const audience = await bulkEmailRecipients(state, send.kind);

    if (audience.truncated) {
      throw new StatusRefusal(
        `More than ${BULK_EMAIL_MAX_RECIPIENTS} registrations in this audience are waiting to be written to. Narrow the filters and send again — nothing has been mailed yet.`,
      );
    }

    const eligible = new Map(
      audience.recipients.map((recipient) => [recipient.id, recipient]),
    );
    const batch: BulkEmailRecipient[] = [];

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const failures: BulkEmailFailure[] = [];

    for (const id of send.ids) {
      const recipient = eligible.get(id);
      if (recipient) batch.push(recipient);
      else skipped += 1;
    }

    for (const [index, recipient] of batch.entries()) {
      const result = await deliverBulkRecipient(
        send.kind,
        recipient,
        send.subject ?? "",
        send.body ?? "",
        send.allowHtml ?? false,
      );

      if (result.ok) {
        sent += 1;
      } else {
        failed += 1;
        failures.push({
          name: recipient.name,
          email: recipient.email,
          message: result.message,
        });
      }

      // Not after the last one: a batch hands back to the composer the moment it
      // is finished, so the progress bar moves as soon as there is news.
      if (index < batch.length - 1) await bulkEmailPause(BULK_EMAIL_DELAY_MS);
    }

    return { ok: true, sent, failed, skipped, failures };
  } catch (error) {
    if (error instanceof StatusRefusal) {
      return {
        ok: false,
        message: error.message,
        sent: 0,
        failed: 0,
        skipped: 0,
        failures: [],
      };
    }
    throw error;
  }
}

/**
 * Previews an email for the first recipient in the audience, without sending it.
 *
 * Renders the same HTML a recipient would see, using the same audience query the
 * send uses, so merge tags and per-row data are resolved against a real person.
 * The preview never leaves the building — no API key is consulted and no message
 * is queued.
 */
export async function previewBulkEmail(
  input: BulkEmailPreviewInput,
): Promise<BulkEmailPreview> {
  await requireAdmin();
  const state = parseInput(bulkEmailStateSchema, input.state);
  const kind = parseInput(
    z.enum(["custom", "confirmation"]),
    input.kind,
  ) as BulkEmailKind;

  const audience = await bulkEmailRecipients(state, kind);
  const first = audience.recipients[0];

  // The audience is already the set a send writes to — a confirmation has left the
  // receipted rows and a custom message the shared inboxes out of it — so the
  // preview lists it unchanged.
  const previewRecipients = audience.recipients.map((recipient) => ({
    name: recipient.name,
    email: recipient.email,
  }));

  if (!first || audience.truncated) {
    return {
      ok: false,
      subject: "",
      html: "",
      sample: { name: "", email: "" },
      recipients: [],
    };
  }

  if (kind === "custom") {
    const subject = input.subject?.trim() || "";
    const body = input.body?.trim() || "";

    if (!subject || !body) {
      return {
        ok: false,
        subject: "",
        html: "",
        sample: { name: "", email: "" },
        recipients: [],
      };
    }

    const html = getCustomEmailHtml({
      subject,
      body,
      name: first.name,
      allowHtml: input.allowHtml ?? false,
    });
    return {
      ok: true,
      subject,
      html,
      sample: { name: first.name, email: first.email },
      recipients: previewRecipients,
    };
  }

  // Confirmation preview — fetch the full row data for the first recipient.
  const t = stemfestRegistrations;
  const target = await withDbTimeout(
    "previewBulkEmail",
    async (tx) => {
      const [row] = await tx
        .select(stemfestDecisionSelection())
        .from(t)
        .where(eq(t.id, first.id));
      return row;
    },
  );

  if (!target) {
    return {
      ok: false,
      subject: "",
      html: "",
      sample: { name: "", email: "" },
      recipients: [],
    };
  }

  const subject = target.registrationCode
    ? `Registration confirmed - ${target.registrationCode} · STEM Fest '26-27`
    : `Registration confirmed - STEM Fest '26-27`;

  const html = getPaymentVerifiedEmailHtml({
    registrationCode: target.registrationCode || undefined,
    name: target.name,
    classLabel: getStemfestClassLabel(target.class),
    school: target.school,
    phone: target.paymentNumber,
    email: target.email ?? first.email,
    transactionId: target.transactionId,
    paymentNumber: target.paymentNumber,
    segments: target.segments,
    amount: confirmationAmount(target.totalFee, target.amount),
  });

  return {
    ok: true,
    subject,
    html,
    sample: { name: target.name, email: first.email },
    recipients: previewRecipients,
  };
}

