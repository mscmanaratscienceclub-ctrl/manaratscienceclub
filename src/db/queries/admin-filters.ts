/**
 * The SQL the admin panel's tables are built from: what narrows a list, what order
 * it comes back in, and — for the one table whose rows are assembled from several
 * columns — what a row selects.
 *
 * One builder per source, shared by the paged list and the printed report, so a
 * filter can never mean one thing on screen and another in the export.
 *
 * It lives here, outside `src/lib/actions/registrations.ts`, for the same reason
 * `stemfest-payment.ts` does: a `"use server"` module may only export async
 * functions, and these builders are synchronous. Two copies of "what `!verified`
 * means in SQL" is exactly the drift that makes a table disagree with its own export
 * — and, since ADR-0044, with the copy of itself a browser holds in IndexedDB.
 * `scripts/verify-local-query.ts` imports these builders to check the cached answer
 * against the real query, which it could not do if they were private to an action.
 *
 * Shared by: the paged tables, the printed reports, the spreadsheet export and the
 * local-query parity harness.
 */

import { and, asc, desc, eq, ilike, not, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { campusAmbassadorRegistrations } from "@/db/schema/registrations";
import { volunteerRegistrations } from "@/db/schema/volunteer-registrations";
import { stemfestRegistrations } from "@/db/schema/stemfest-registrations";
import { stemfestPaymentSms } from "@/db/schema/stemfest-payment-sms";
import {
  stemfestEffectivePaymentStatus,
  stemfestPaymentAmount,
  stemfestPaymentFilter,
} from "@/db/queries/stemfest-payment";
import {
  ATTENDANCE_PRESENT_VALUE,
  isStemfestPaymentStatus,
} from "@/lib/admin/statuses";
import { getStemfestEvent, manaratSchoolLabel, manaratSchoolLikePattern } from "@/lib/data/stemfest-registration";
import type { DbTransaction } from "@/db";
import {
  ADMIN_TIME_ZONE,
  ambassadorSource,
  attendanceSource,
  filterMatches,
  smsSource,
  stemfestSource,
  volunteerSource,
  type AdminQueryState,
  type AdminSortId,
  type FilterMatch,
} from "@/lib/admin/filters";

/**
 * Escapes LIKE/ILIKE wildcards so a literal `%`, `_`, or `\` typed in the search
 * box matches itself instead of acting as a wildcard. Postgres' default LIKE
 * escape character is the backslash.
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/** Trims a filter value, treating a whitespace-only value as absent. */
export function term(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The `kind: "text"` comparisons — contains (`similar`), exactly (`is`) and the
 * negation of the field's default (`not`).
 *
 * Wildcards are escaped on every branch, so a literal `%`, `_` or `\` typed into a
 * filter matches itself. `is` passes the value with no wildcards at all, which is
 * `ILIKE`'s case-insensitive equality — the same comparison a `select` makes.
 */
export function textMatch(
  column: AnyColumn,
  match: FilterMatch | undefined,
): SQL | undefined {
  if (!match) return undefined;
  const needle = escapeLike(match.value);

  switch (match.operator) {
    case "similar":
      return ilike(column, `%${needle}%`);
    case "is":
      return ilike(column, needle);
    case "not":
      return sql`${column} not ilike ${`%${needle}%`}`;
  }
}

/** The `kind: "select"` comparisons — case-insensitive equality, or its negation. */
export function selectMatch(
  column: AnyColumn,
  match: FilterMatch | undefined,
): SQL | undefined {
  if (!match) return undefined;
  const needle = match.value.toLowerCase();
  return match.operator === "not"
    ? sql`lower(${column}) <> ${needle}`
    : sql`lower(${column}) = ${needle}`;
}

/** The search box: one `OR` across every column that form's search should reach. */
export function containsAny(columns: AnyColumn[], query: string): SQL | undefined {
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
export function dayRange(
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
export function amountBound(
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
export function booleanMatch(
  column: AnyColumn,
  match: FilterMatch | undefined,
  trueValue: string,
): SQL | undefined {
  if (!match) return undefined;
  const chosen = match.value === trueValue;
  // "Is not first-time CA" is "returning", not a missing answer — the column is
  // `not null`, so the negated choice is the other option.
  return eq(column, match.operator === "not" ? !chosen : chosen);
}

/**
 * The `segment` filter: one event of the fest.
 *
 * A registration's `segments` column holds the event names its entries describe
 * (`describeEntry`), never a segment name, so the option — an event id — is
 * resolved to its name and the row text is searched for it. `not` keeps the rows
 * that entered something else. No two catalogue event names are a substring of
 * another, which `pnpm db:verify` asserts, so matching one name cannot pick up
 * another event's rows.
 */
export function segmentMatch(
  column: AnyColumn,
  match: FilterMatch | undefined,
): SQL | undefined {
  if (!match) return undefined;
  const name = getStemfestEvent(match.value)?.name;
  if (!name) return undefined;
  const entered = ilike(column, `%${escapeLike(name)}%`);
  return match.operator === "not" ? not(entered) : entered;
}

/**
 * Sort vocabulary → `ORDER BY`. An unrecognised combination falls back to
 * newest-first, so a hand-edited `?sort=` can never reach the database as
 * anything but a supported order.
 *
 * Every branch ends on the primary key, which makes the order **total**: two rows
 * can never tie. That is not tidiness. An `ORDER BY` with ties leaves the tied rows
 * in whatever order the heap happens to yield, which is stable enough to look
 * deliberate and unstable enough to reshuffle after a vacuum — so a row could appear
 * on two consecutive pages, or on neither. And since ADR-0044 a browser holds a copy
 * of these lists and has to reproduce their order exactly, which an order the
 * database never specified cannot be.
 */
export interface SortColumns {
  timestamp: AnyColumn;
  /** The row's primary key — the trailing tiebreak that makes the order total. */
  id: AnyColumn;
  name?: AnyColumn;
  amount?: AnyColumn;
}

/**
 * Alphabetical ordering, spelled so that JavaScript can reproduce it byte for byte.
 *
 * This database collates as `en_US.UTF-8`, so a bare `ORDER BY name` asks glibc's
 * collation table — which the browser does not have. `Intl.Collator` is ICU's table,
 * and ICU and glibc disagree about punctuation, case and diacritics often enough
 * that a page of names sorted in the browser would not be the page the server
 * returns. Pinning the comparison to `"C"` makes it code-point ordering, which is
 * exactly what `<` on a JavaScript string does, and folding the case first keeps the
 * result reading as "A → Z" to an admin rather than as "every capital before every
 * small letter".
 */
function nameOrder(column: AnyColumn, direction: "asc" | "desc"): SQL[] {
  return direction === "asc"
    ? [sql`lower(${column}) collate "C" asc`, sql`${column} collate "C" asc`]
    : [sql`lower(${column}) collate "C" desc`, sql`${column} collate "C" desc`];
}

export function orderFor(sort: AdminSortId, columns: SortColumns): SQL[] {
  /** The tail every non-timestamp branch ends on: newest first, then by id. */
  const tail = [desc(columns.timestamp), asc(columns.id)];

  switch (sort) {
    case "oldest":
      return [asc(columns.timestamp), asc(columns.id)];
    case "name-asc":
      if (columns.name) return [...nameOrder(columns.name, "asc"), ...tail];
      break;
    case "name-desc":
      if (columns.name) return [...nameOrder(columns.name, "desc"), ...tail];
      break;
    case "amount-asc":
      if (columns.amount) return [sql`${columns.amount} asc nulls last`, ...tail];
      break;
    case "amount-desc":
      if (columns.amount) return [sql`${columns.amount} desc nulls last`, ...tail];
      break;
    case "newest":
      break;
  }

  return tail;
}

// ── Per-source filters ───────────────────────────────────────────────────────

export function ambassadorWhere(state: AdminQueryState): SQL | undefined {
  const t = campusAmbassadorRegistrations;
  const m = filterMatches(ambassadorSource, state);

  return and(
    containsAny(
      [t.name, t.school, t.class, t.phone, t.email, t.type, t.experience],
      state.query,
    ),
    selectMatch(t.type, m.type),
    selectMatch(t.gender, m.gender),
    booleanMatch(t.firstTimeCa, m.firstTime, "first-time"),
    ...dayRange(t.createdAt, m.from?.value, m.to?.value),
    textMatch(t.class, m.class),
    textMatch(t.school, m.school),
  );
}

export function volunteerWhere(state: AdminQueryState): SQL | undefined {
  const t = volunteerRegistrations;
  const m = filterMatches(volunteerSource, state);

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
    selectMatch(t.shift, m.shift),
    ...dayRange(t.createdAt, m.from?.value, m.to?.value),
    textMatch(t.classSection, m.classSection),
    textMatch(t.roll, m.roll),
    textMatch(t.studentCode, m.studentCode),
    textMatch(t.attendanceWeek, m.attendanceWeek),
    textMatch(t.parentsComfort, m.parentsComfort),
    textMatch(t.campusHesitation, m.campusHesitation),
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
export function stemfestWhere(state: AdminQueryState): SQL | undefined {
  const t = stemfestRegistrations;
  const m = filterMatches(stemfestSource, state);

  // Narrowed before it reaches SQL, so a hand-edited `?payment=` cannot reach the
  // database as a comparison against a value no option offers.
  const paymentValue = m.payment?.value;
  const paymentFilter =
    paymentValue && isStemfestPaymentStatus(paymentValue)
      ? stemfestPaymentFilter(paymentValue)
      : undefined;
  const payment =
    paymentFilter && m.payment?.operator === "not"
      ? not(paymentFilter)
      : paymentFilter;

  return and(
    containsAny(
      [
        t.registrationCode,
        t.name,
        t.class,
        t.school,
        t.segments,
        t.transactionId,
        t.paymentNumber,
      ],
      state.query,
    ),
    payment,
    selectMatch(t.class, m.class),
    textMatch(t.school, m.school),
    ...dayRange(t.createdAt, m.from?.value, m.to?.value),
    segmentMatch(t.segments, m.segment),
    textMatch(t.transactionId, m.transactionId),
  );
}

/**
 * The attendance sheet's filter set — three criteria rather than the registrations
 * table's six, because a desk answers "is this person here" without reading a
 * payment.
 *
 * `attendance` is a `not null` boolean, so `booleanMatch`'s two branches cover
 * every row and there is no third "never marked" state to write a predicate for:
 * an unmarked row is the Absent one, which is what a roll-call sheet means by an
 * empty box.
 */
export function attendanceWhere(state: AdminQueryState): SQL | undefined {
  const t = stemfestRegistrations;
  const m = filterMatches(attendanceSource, state);

  return and(
    containsAny([t.registrationCode, t.name, t.class, t.school], state.query),
    booleanMatch(t.attendance, m.attendance, ATTENDANCE_PRESENT_VALUE),
    selectMatch(t.class, m.class),
    textMatch(t.school, m.school),
  );
}

export function smsWhere(state: AdminQueryState): SQL | undefined {  const t = stemfestPaymentSms;
  const m = filterMatches(smsSource, state);

  return and(
    containsAny(
      [t.sender, t.rawMessage, t.transactionId, t.senderNumber, t.status],
      state.query,
    ),
    selectMatch(t.status, m.status),
    textMatch(t.sender, m.sender),
    ...dayRange(t.receivedAt, m.from?.value, m.to?.value),
    textMatch(t.senderNumber, m.senderNumber),
    amountBound(t.amount, m.minAmount?.value, "min"),
    amountBound(t.amount, m.maxAmount?.value, "max"),
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
export async function countRows(
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

// ── Row selections ───────────────────────────────────────────────────────────

/**
 * The columns one STEM Fest row carries into the panel.
 *
 * One selection, read by the paged table, by the whole-list snapshot the browser
 * caches (`getStemfestSnapshot`) and by the parity harness that compares the two —
 * so a cached row and a rendered row are the same row rather than two selections
 * that happen to agree today.
 *
 * The forwarded-SMS log needs no equivalent: its table selects the whole row, and
 * `toSmsSnapshotRow` narrows the one free-text column that reaches a `<select>`.
 */
export function stemfestAdminSelection() {
  const t = stemfestRegistrations;

  return {
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
    // Resolved in SQL rather than in JavaScript, by the fragments the `payment`
    // filter, the stat cards, the printed report and the verify action also read —
    // so the pill on a row can never disagree with what filtering for it returns.
    status: stemfestEffectivePaymentStatus(),
    decision: t.paymentDecision,
    decidedAt: t.paymentDecidedAt,
    decidedBy: t.paymentDecidedBy,
    emailSentAt: t.paymentEmailSentAt,
    amount: stemfestPaymentAmount(),
  };
}

/**
 * The columns the attendance sheet reads: enough to identify a participant, plus
 * the one bit the desk exists to set.
 *
 * Deliberately narrower than `stemfestAdminSelection`, and this source is not one
 * the browser caches — the sheet queries, so it never holds a second copy of a
 * participant list in IndexedDB. Payment, TrxID and email stay on the other table.
 */
export function attendanceSelection() {
  const t = stemfestRegistrations;

  return {
    id: t.id,
    registrationCode: t.registrationCode,
    name: t.name,
    class: t.class,
    school: t.school,
    attendance: t.attendance,
    // Sorted and paged by, printed nowhere on the sheet — and a cache without it
    // could not reproduce the server's page order.
    createdAt: t.createdAt,
  };
}

/**
 * How many rows a query matches, and how many of those are marked present.
 *
 * Read **with** the sheet's WHERE clause, so the sentence under its heading counts
 * the rows the table below it shows. One statement rather than two, so the headline
 * cannot tally a different moment than the total it sits beside; `count(*) filter`
 * costs the same scan a plain count would.
 */
export function attendanceCountSelection() {
  const t = stemfestRegistrations;

  return {
    total: sql<number>`count(*)::int`,
    present: sql<number>`count(*) filter (where ${t.attendance})::int`,
  };
}

/**
 * The sheet's freshness probe: the two cursors, plus the whole-table tally its
 * snapshot ships with.
 *
 * `decidedCursor` is `max(attendance_marked_at)` — the moment the switch last moved,
 * in either direction. Without it a tick moves no timestamp the probe could read:
 * the row count and the newest `created_at` both stay put, and a browser holding a
 * copy of the sheet would never learn the other desk had been working it.
 */
export function attendanceProbeSelection() {
  const t = stemfestRegistrations;

  return {
    count: sql<number>`count(*)::int`,
    cursor: sql<Date | null>`max(${t.createdAt})::timestamptz`,
    decidedCursor: sql<Date | null>`max(${t.attendanceMarkedAt})::timestamptz`,
    present: sql<number>`count(*) filter (where ${t.attendance})::int`,
  };
}

/**
 * The eight figures behind the STEM Fest stat cards, as one statement.
 *
 * Shared by `getStemfestStats` and the whole-list snapshot the browser caches, so
 * the cards a cached panel recomputes against are defined once — and checked against
 * that recomputation by `scripts/verify-local-query.ts`. It is a selection rather
 * than a nested action call for the usual reason: a second `withDbTimeout` would open
 * a second pooled connection.
 */
export function stemfestStatsSelection() {
  const t = stemfestRegistrations;

  return {
    total: sql<number>`count(*)::int`,
    thisWeek: sql<number>`count(*) filter (where ${t.createdAt} >= now() - interval '7 days')::int`,
    // Manarat spellings collapse to one name (see `manaratSchoolLabel`), so the
    // host school counts once rather than once per way a participant typed it.
    uniqueSchools: sql<number>`count(distinct case when ${t.school} ilike ${manaratSchoolLikePattern} then ${manaratSchoolLabel} else lower(btrim(${t.school})) end)::int`,
    // The same definition the status pill and the `payment=verified` filter
    // use, so the card cannot promise a number the table below it contradicts.
    // It counted matched SMS messages before, which drifted from both as soon
    // as an admin verified a payment by hand (audit: card vs. pill mismatch).
    verifiedCount: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'verified')::int`,
    pendingCount: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'pending')::int`,
    rejectedCount: sql<number>`count(*) filter (where ${stemfestEffectivePaymentStatus()} = 'rejected')::int`,
    // What the club collected, summed over verified rows. This uses the
    // registration's own `total_fee` — the amount the club asked for and
    // accepted — rather than the forwarded-SMS amount, which has been known to
    // parse to one uniform figure. Same source the receipt quotes.
    amountCollected: sql<string | null>`sum(${t.totalFee}) filter (where ${stemfestEffectivePaymentStatus()} = 'verified')::text`,
    // Every row, verified or not: the club asked for this money, so it is what
    // the panel compares `amountCollected` against.
    amountToCollect: sql<string | null>`sum(${t.totalFee})::text`,
  };
}

/**
 * The SMS log's three status tallies, as one statement.
 *
 * Shared by `getSmsLogs` and the log's snapshot for the same reason as above. Each
 * counts one exact value of the stored column, so a status this build does not
 * recognise is counted by none of them — and `localSmsTallies` has to leave it out
 * too, or the "Total messages" card, which is their sum, would disagree.
 */
export function smsTallySelection() {
  const t = stemfestPaymentSms;

  return {
    matched: sql<number>`count(*) filter (where ${t.status} = 'matched')::int`,
    unmatched: sql<number>`count(*) filter (where ${t.status} = 'unmatched')::int`,
    ignored: sql<number>`count(*) filter (where ${t.status} = 'ignored')::int`,
  };
}
