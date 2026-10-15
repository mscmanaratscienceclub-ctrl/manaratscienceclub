/**
 * Answering an admin query from the browser's cached rows.
 *
 * The two STEM Fest tables keep their whole list in IndexedDB so that a search, a
 * filter, a sort and a page change cost no round trip at all
 * (`obsidian/meta/decisions-log.md`, ADR-0044). This module is the other half of that
 * bargain: it has to return **the same rows, in the same order, on the same page**
 * that `src/lib/actions/registrations.ts` would have returned from Postgres for the
 * same `AdminQueryState`. Not "close" — the panel prints a row count and a page
 * number next to the list, and a cache that disagrees with the server by one row is a
 * cache an admin cannot trust on the morning it matters.
 *
 * `scripts/verify-local-query.ts` is what makes that a claim rather than a hope: it
 * runs both readers over the live database and fails the build on any divergence.
 *
 * ## The three places this is not obvious
 *
 * **A cached row carries the column, not the cell.** `class` is stored as `class-9`
 * and *rendered* as "Class 9". SQL searches, matches and equality-checks the stored
 * value, so a search for "Class 9" finds nothing on the server — and must find
 * nothing here, even though the label is sitting right there in the row. Every
 * comparison below reads `row.raw.*` where SQL reads a column, and the rendered field
 * only where SQL reads that same rendered field.
 *
 * **NULL is not the empty string.** Postgres' `WHERE` is three-valued: `NULL ILIKE
 * '%x%'` is NULL, and so is `NOT (NULL ILIKE '%x%')`, and a `WHERE` reads NULL as
 * false. A row whose `sender_number` is NULL is therefore excluded by "does not
 * contain" — the opposite of what a `!value.includes(needle)` in JavaScript would
 * say. Every comparator here checks for absence first and returns false.
 *
 * **Ordering has to be pinned down on both sides.** This database collates as
 * `en_US.UTF-8`, so a bare `ORDER BY name` asks glibc's collation table — which the
 * browser does not have. `Intl.Collator` answers from ICU's table instead, and the two
 * disagree about punctuation, case and diacritics often enough that a browser-sorted
 * page would not be the page the server returns. So `orderFor` in
 * `src/db/queries/admin-filters.ts` spells `lower(name) collate "C"` then `name collate
 * "C"` then the primary key, and the comparators below are the same four keys. Every
 * branch ends on `id`: an `ORDER BY` with ties leaves those rows in heap order, which
 * no cache can reproduce. `localeCompare` never appears here for the same reason.
 */

import {
  ADMIN_TIME_ZONE,
  attendanceSource,
  PAGE_SIZE,
  clampPage,
  filterMatches,
  pageCount,
  smsSource,
  stemfestSource,
  type AdminQueryState,
  type AdminSortId,
  type FilterMatch,
} from "@/lib/admin/filters";
import {
  ATTENDANCE_PRESENT_VALUE,
  isStemfestPaymentStatus,
  type StemfestPaymentStatus,
} from "@/lib/admin/statuses";
import type {
  AttendanceSnapshotRow,
  AttendanceTally,
  SmsSnapshotRow,
  SmsTallies,
  StemfestSnapshotRow,
} from "@/lib/admin/snapshot";
import type { StemfestStats } from "@/lib/actions/registrations";
import {
  getStemfestEvent,
  isManaratSchool,
  manaratSchoolLabel,
} from "@/lib/data/stemfest-registration";

/** One page of a list, in the shape the tables already receive from the server. */
export interface LocalPage<TRow> {
  rows: TRow[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Day ranges ───────────────────────────────────────────────────────────────
//
// A `from`/`to` pair is an inclusive range of *calendar days in the panel's
// timezone*, which is why SQL spells it
// `column >= (from::timestamp at time zone 'Asia/Dhaka')` and
// `column < ((to::date + 1)::timestamp at time zone 'Asia/Dhaka')`. Comparing a
// `timestamptz` against a bare date would use UTC and split the local day at 6am.

let zoneParts: Intl.DateTimeFormat | null = null;

/**
 * How far ahead of UTC the panel's timezone is at one instant, in milliseconds.
 *
 * Derived from `Intl` rather than written down as `+6`: the offset is a property of
 * the zone's rules, and hardcoding it would be a hardcoded value that is silently
 * wrong for any instant the rules do not cover.
 */
function zoneOffsetMs(instant: number): number {
  zoneParts ??= new Intl.DateTimeFormat("en-US", {
    timeZone: ADMIN_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts: Record<string, string> = {};
  for (const part of zoneParts.formatToParts(new Date(instant))) {
    parts[part.type] = part.value;
  }

  const wall = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // `hour12: false` reports midnight as "24" on some engines, which `Date.UTC`
    // would read as the next day's 00:00 and turn into a 24-hour error.
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return wall - instant;
}

/**
 * The epoch milliseconds of `YYYY-MM-DD` at midnight in the panel's timezone — the
 * instant `(day::timestamp at time zone …)` names in SQL.
 *
 * Two passes, because the offset has to be looked up at the instant being aimed for
 * and a first guess can land on the other side of a zone change.
 */
function zonedDayStart(day: string): number {
  const asUtc = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(asUtc)) return Number.NaN;
  return asUtc - zoneOffsetMs(asUtc - zoneOffsetMs(asUtc));
}

/** The calendar day after `YYYY-MM-DD`. */
function nextDay(day: string): string {
  const ms = Date.parse(`${day}T00:00:00Z`) + 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

interface DayWindow {
  /** Inclusive lower bound, or absent when the URL set no `from`. */
  start: number | null;
  /** Exclusive upper bound — midnight *after* `to`. */
  end: number | null;
}

function dayWindow(from: string | undefined, to: string | undefined): DayWindow {
  const startDay = from?.trim();
  const endDay = to?.trim();

  return {
    start: startDay ? zonedDayStart(startDay) : null,
    end: endDay ? zonedDayStart(nextDay(endDay)) : null,
  };
}

function withinDay(iso: string, window: DayWindow): boolean {
  if (window.start === null && window.end === null) return true;

  const at = Date.parse(iso);
  if (Number.isNaN(at)) return false;
  if (window.start !== null && at < window.start) return false;
  return window.end === null || at < window.end;
}

// ── Comparators ──────────────────────────────────────────────────────────────

function isAbsent(value: string | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * A `text` filter: contains (`similar`), case-insensitive equality (`is`), or the
 * negation of contains (`not`) — the three branches of SQL's `textMatch`.
 *
 * No wildcard handling is needed here. SQL escapes `%`, `_` and `\` in the needle
 * before matching so that a literal percent sign matches a literal percent sign;
 * `includes` never treats any character as a wildcard, which arrives at the same
 * answer by a different route.
 */
function textMatches(value: string | null | undefined, match: FilterMatch | undefined): boolean {
  if (!match) return true;
  // Three-valued logic: a comparison against NULL is NULL, and a `WHERE` reads
  // NULL as false — including under `not`. See the module header.
  if (isAbsent(value)) return false;

  const folded = value.toLowerCase();
  const needle = match.value.toLowerCase();

  switch (match.operator) {
    case "similar":
      return folded.includes(needle);
    case "is":
      return folded === needle;
    case "not":
      return !folded.includes(needle);
  }
}

/** A `select` filter: `lower(column) = value`, or `<>` for `not`. */
function selectMatches(
  value: string | null | undefined,
  match: FilterMatch | undefined,
): boolean {
  if (!match) return true;
  if (isAbsent(value)) return false;

  const same = value.toLowerCase() === match.value.toLowerCase();
  return match.operator === "not" ? !same : same;
}

/**
 * A `not null` boolean column chosen by a named word rather than `true`/`false`.
 *
 * `not` flips the *target*, not the result — `booleanMatch` asks Postgres for
 * `attendance = NOT chosen` — so "is not present" is a positive match on `false`
 * rather than an exclusion. The column is `not null`, so there is no third reading
 * for three-valued logic to trip over here.
 */
function booleanMatches(
  value: boolean,
  match: FilterMatch | undefined,
  trueValue: string,
): boolean {
  if (!match) return true;
  const chosen = match.value === trueValue;
  return value === (match.operator === "not" ? !chosen : chosen);
}

/**
 * The search box: one `OR` of case-insensitive substring matches, over exactly the
 * columns SQL sweeps.
 *
 * The whole trimmed term is the needle. SQL builds a single `%term%` pattern, so a
 * search for "ayesha rahman" matches only rows holding that phrase — it is *not*
 * split into words and matched in any order, and doing that here would return rows
 * the server does not.
 */
function searchMatches(
  columns: readonly (string | null | undefined)[],
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return columns.some(
    (value) => !isAbsent(value) && value.toLowerCase().includes(needle),
  );
}

/**
 * The `payment` filter, on the effective status SQL already resolved.
 *
 * The comparison is exact, not case-folded: `stemfestPaymentFilter` emits
 * `effective = $1` with no `lower()` around it, and both sides are lowercase option
 * ids. An unrecognised value drops the filter entirely, exactly as the query builder
 * does rather than comparing against something no option offers.
 */
function paymentMatches(
  status: StemfestPaymentStatus,
  match: FilterMatch | undefined,
): boolean {
  if (!match || !isStemfestPaymentStatus(match.value)) return true;

  const same = status === match.value;
  return match.operator === "not" ? !same : same;
}

/**
 * The `segment` filter: one event of the fest.
 *
 * A registration's `segments` column holds event *names*, while the option is an
 * event *id*, so the id is resolved through the same catalogue SQL resolves it
 * through. No two catalogue event names are a substring of another — `pnpm db:verify`
 * asserts it — so matching one name cannot pick up another event's rows.
 */
function segmentMatches(segments: string, match: FilterMatch | undefined): boolean {
  if (!match) return true;

  const name = getStemfestEvent(match.value)?.name;
  if (!name) return true;

  const entered = segments.toLowerCase().includes(name.toLowerCase());
  return match.operator === "not" ? !entered : entered;
}

/**
 * The `minAmount` / `maxAmount` pair, on a nullable `numeric`.
 *
 * Read as a double rather than as decimal text. Both sides are validated to at most
 * two decimal places and well under 2^53, so no two distinct amounts in this domain
 * share a double and no comparison can round the wrong way — which is the whole
 * reason a `numeric` column can be compared in JavaScript at all.
 */
function amountWithin(
  amount: string | null,
  min: string | undefined,
  max: string | undefined,
): boolean {
  if (min === undefined && max === undefined) return true;
  // `NULL >= 5` is NULL, so a message with no amount is excluded by either bound.
  if (amount === null) return false;

  const value = Number(amount);
  if (!Number.isFinite(value)) return false;
  if (min !== undefined && value < Number(min)) return false;
  return max === undefined || value <= Number(max);
}

// ── Ordering ─────────────────────────────────────────────────────────────────

type Direction = 1 | -1;

type Comparator<TRow> = (a: TRow, b: TRow) => number;

/** Apply comparators in turn, stopping at the first that separates two rows. */
function chain<TRow>(...comparators: Comparator<TRow>[]): Comparator<TRow> {
  return (a, b) => {
    for (const compare of comparators) {
      const result = compare(a, b);
      if (result !== 0) return result;
    }
    return 0;
  };
}

/**
 * Code-point text ordering — what `collate "C"` does, and what `<` on a JS string
 * does. Deliberately not `localeCompare`; see the module header.
 */
function byText<TRow>(
  read: (row: TRow) => string,
  direction: Direction,
): Comparator<TRow> {
  return (a, b) => {
    const left = read(a);
    const right = read(b);
    if (left === right) return 0;
    return left < right ? -direction : direction;
  };
}

/**
 * `nameOrder`: case-folded first, then the raw value, both under the C collation.
 *
 * Folding with `toLowerCase()` mirrors SQL's `lower()`. The two functions differ on a
 * handful of characters (Turkish dotted/dotless I, the Greek final sigma), none of
 * which can appear in a Bangladeshi student's name — and where they did differ, the
 * raw second key would still break the tie the same way on both sides.
 */
function byName<TRow>(
  read: (row: TRow) => string,
  direction: Direction,
): Comparator<TRow> {
  return chain(byText((row: TRow) => read(row).toLowerCase(), direction), byText(read, direction));
}

function byInstant<TRow>(
  read: (row: TRow) => string,
  direction: Direction,
): Comparator<TRow> {
  return (a, b) => {
    const left = Date.parse(read(a));
    const right = Date.parse(read(b));
    if (left === right) return 0;
    return left < right ? -direction : direction;
  };
}

/** The primary key every branch of `orderFor` ends on, which makes the order total. */
const byId: Comparator<{ id: string }> = (a, b) => (a.id === b.id ? 0 : a.id < b.id ? -1 : 1);

function stemfestComparator(sort: AdminSortId): Comparator<StemfestSnapshotRow> {
  const newestFirst = byInstant<StemfestSnapshotRow>((row) => row.createdAt, -1);

  switch (sort) {
    case "oldest":
      return chain(byInstant<StemfestSnapshotRow>((row) => row.createdAt, 1), byId);
    case "name-asc":
      return chain(byName<StemfestSnapshotRow>((row) => row.name, 1), newestFirst, byId);
    case "name-desc":
      return chain(byName<StemfestSnapshotRow>((row) => row.name, -1), newestFirst, byId);
    default:
      // "newest" — and the amount sorts, which this table offers no column for and
      // which `orderFor` therefore also answers with newest-first.
      return chain(newestFirst, byId);
  }
}

function smsComparator(sort: AdminSortId): Comparator<SmsSnapshotRow> {
  const newestFirst = byInstant<SmsSnapshotRow>((row) => row.receivedAt, -1);

  /**
   * `ORDER BY amount … NULLS LAST`, which SQL spells the same way in both
   * directions: a message with no amount is at the bottom of "high → low" too.
   */
  const byAmount = (direction: Direction): Comparator<SmsSnapshotRow> => (a, b) => {
    if (a.amount === null && b.amount === null) return 0;
    if (a.amount === null) return 1;
    if (b.amount === null) return -1;

    const left = Number(a.amount);
    const right = Number(b.amount);
    if (left === right) return 0;
    return left < right ? -direction : direction;
  };

  switch (sort) {
    case "oldest":
      return chain(byInstant<SmsSnapshotRow>((row) => row.receivedAt, 1), byId);
    case "amount-asc":
      return chain(byAmount(1), newestFirst, byId);
    case "amount-desc":
      return chain(byAmount(-1), newestFirst, byId);
    default:
      // "newest". The name sorts are not offered for this table, and `orderFor`
      // answers a sort with no column by falling back to newest-first.
      return chain(newestFirst, byId);
  }
}

/**
 * The sheet's order — the same four keys the registrations table's has, over a row
 * that carries only the submission moment they read.
 *
 * Written out again rather than shared because the two rows are different types with
 * different fields, and a generic comparator factory threaded through both would be
 * more machinery than the ten lines it saves. `orderFor` is the thing they must agree
 * with, and `pnpm verify:local-query` checks that they do.
 */
function attendanceComparator(
  sort: AdminSortId,
): Comparator<AttendanceSnapshotRow> {
  const newestFirst = byInstant<AttendanceSnapshotRow>((row) => row.createdAt, -1);

  switch (sort) {
    case "oldest":
      return chain(byInstant<AttendanceSnapshotRow>((row) => row.createdAt, 1), byId);
    case "name-asc":
      return chain(byName<AttendanceSnapshotRow>((row) => row.name, 1), newestFirst, byId);
    case "name-desc":
      return chain(byName<AttendanceSnapshotRow>((row) => row.name, -1), newestFirst, byId);
    default:
      return chain(newestFirst, byId);
  }
}

// ── The two queries ──────────────────────────────────────────────────────────

/**
 * One page of a matched list, paged exactly as the server pages it: clamp the
 * requested page, count the matches, then take `PAGE_SIZE` of them — so a
 * hand-edited `?page=99` lands on the last real page rather than an empty one.
 */
function pageOf<TRow>(
  matched: readonly TRow[],
  state: AdminQueryState,
  compare: Comparator<TRow>,
): LocalPage<TRow> {
  const sorted = [...matched].sort(compare);
  const total = sorted.length;
  const totalPages = pageCount(total);
  const page = Math.min(clampPage(state.page), totalPages);
  const start = (page - 1) * PAGE_SIZE;

  return { rows: sorted.slice(start, start + PAGE_SIZE), total, page, totalPages };
}

/**
 * The STEM Fest table, answered from the cache.
 *
 * Mirrors `stemfestWhere` predicate for predicate, in the same order, over the same
 * columns — including the ones whose stored value is not what the cell prints.
 */
export function queryStemfestLocally(
  rows: readonly StemfestSnapshotRow[],
  state: AdminQueryState,
): LocalPage<StemfestSnapshotRow> {
  const m = filterMatches(stemfestSource, state);
  const window = dayWindow(m.from?.value, m.to?.value);

  const matched = rows.filter(
    (row) =>
      // `t.class`, not the label beside it — see the module header.
      searchMatches(
        [
          row.registrationCode,
          row.name,
          row.raw.class,
          row.school,
          row.segments,
          row.transactionId,
          row.paymentNumber,
        ],
        state.query,
      ) &&
      paymentMatches(row.status, m.payment) &&
      selectMatches(row.raw.class, m.class) &&
      textMatches(row.school, m.school) &&
      withinDay(row.createdAt, window) &&
      segmentMatches(row.segments, m.segment) &&
      textMatches(row.transactionId, m.transactionId),
  );

  return pageOf(matched, state, stemfestComparator(state.sort));
}

/** The forwarded-SMS log, answered from the cache. Mirrors `smsWhere`. */
export function querySmsLocally(
  rows: readonly SmsSnapshotRow[],
  state: AdminQueryState,
): LocalPage<SmsSnapshotRow> {
  const m = filterMatches(smsSource, state);
  const window = dayWindow(m.from?.value, m.to?.value);

  const matched = rows.filter(
    (row) =>
      // `t.status` as stored, not the value narrowed for the `<select>`.
      searchMatches(
        [row.sender, row.rawMessage, row.transactionId, row.senderNumber, row.raw.status],
        state.query,
      ) &&
      selectMatches(row.raw.status, m.status) &&
      textMatches(row.sender, m.sender) &&
      withinDay(row.receivedAt, window) &&
      textMatches(row.senderNumber, m.senderNumber) &&
      amountWithin(row.amount, m.minAmount?.value, m.maxAmount?.value),
  );

  return pageOf(matched, state, smsComparator(state.sort));
}

/**
 * The attendance sheet, answered from the cache. Mirrors `attendanceWhere`
 * predicate for predicate — including the school the search sweeps and the sheet
 * never prints, which is why the cached row carries it.
 */
export function queryAttendanceLocally(
  rows: readonly AttendanceSnapshotRow[],
  state: AdminQueryState,
): LocalPage<AttendanceSnapshotRow> {
  const m = filterMatches(attendanceSource, state);

  const matched = rows.filter(
    (row) =>
      searchMatches(
        [row.registrationCode, row.name, row.raw.class, row.raw.school],
        state.query,
      ) &&
      booleanMatches(row.attendance, m.attendance, ATTENDANCE_PRESENT_VALUE) &&
      selectMatches(row.raw.class, m.class) &&
      textMatches(row.raw.school, m.school),
  );

  return pageOf(matched, state, attendanceComparator(state.sort));
}

// ── The figures beside the table ─────────────────────────────────────────────
//
// `stemfestStatsSelection` has no WHERE clause: all eight figures are whole-table
// aggregates, so a cache holding the whole table can recompute every one of them.
// It has to, rather than show the figures the snapshot arrived with — an admin
// marking a payment Verified moves that row between buckets and changes what the
// club has collected, and a card that still said the old number would contradict
// the pill beside it.

/**
 * SQL's `lower(btrim(school))`, which trims *spaces* only — not the tabs and
 * non-breaking spaces JavaScript's `trim()` also removes. Two spellings that differ
 * by a trailing tab are two schools to Postgres and must be two here.
 */
function btrimLower(value: string): string {
  return value.replace(/^ +/, "").replace(/ +$/, "").toLowerCase();
}

/**
 * `sum(numeric)` as text, or `null` when nothing was summed.
 *
 * `null` is not zero: it means no row carried a figure at all, which the panel draws
 * as an em dash. Two decimal places because `total_fee` is `numeric(10,2)` and
 * Postgres prints a sum of those with the same scale.
 */
function sumAsText(values: Iterable<number | null>): string | null {
  let total = 0;
  let any = false;

  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    total += value;
    any = true;
  }

  return any ? total.toFixed(2) : null;
}

/** The eight STEM Fest figures, recomputed from the cached rows. */
export function localStemfestStats(
  rows: readonly StemfestSnapshotRow[],
  generatedAt: string,
): StemfestStats {
  // `created_at >= now() - interval '7 days'` is a rolling window, not a Dhaka week,
  // and it is measured against the moment the rows were taken — recomputing it
  // against the wall clock would let a figure change while the admin watches a list
  // that has not moved.
  const weekStart = Date.parse(generatedAt) - 7 * 24 * 60 * 60 * 1000;

  const schools = new Set<string>();
  let thisWeek = 0;
  let verifiedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  for (const row of rows) {
    // `case when school ilike '%manarat%' then <label> else lower(btrim(school)) end`
    schools.add(isManaratSchool(row.school) ? manaratSchoolLabel : btrimLower(row.school));

    if (Date.parse(row.createdAt) >= weekStart) thisWeek += 1;
    if (row.status === "verified") verifiedCount += 1;
    else if (row.status === "rejected") rejectedCount += 1;
    else pendingCount += 1;
  }

  return {
    total: rows.length,
    thisWeek,
    uniqueSchools: schools.size,
    verifiedCount,
    pendingCount,
    rejectedCount,
    amountCollected: sumAsText(
      rows.map((row) => (row.status === "verified" ? row.totalFee : null)),
    ),
    amountToCollect: sumAsText(rows.map((row) => row.totalFee)),
  };
}

/**
 * The SMS log's three tallies, recomputed from the cached rows.
 *
 * They count the *stored* status text, which is what the server's `filter (where
 * status = 'matched')` counts — not the value narrowed for the `<select>`, which
 * reads an unrecognised status as Unmatched and would inflate that bucket.
 */
export function localSmsTallies(rows: readonly SmsSnapshotRow[]): SmsTallies {
  let matched = 0;
  let unmatched = 0;
  let ignored = 0;

  for (const row of rows) {
    if (row.raw.status === "matched") matched += 1;
    else if (row.raw.status === "unmatched") unmatched += 1;
    else if (row.raw.status === "ignored") ignored += 1;
    // A fourth value is counted by none of the three, exactly as the server's
    // `filter (where status = …)` counts it — the "Total messages" card is the sum
    // of these three and is therefore short by that row on both sides.
  }

  return { matched, unmatched, ignored };
}

/**
 * The sheet's two figures, recomputed from the cached rows.
 *
 * It has to be recomputed rather than left as the snapshot shipped it: the switch is
 * optimistic, so the moment an admin marks someone in, the row that the "marked
 * present" count is built from has moved — and a headline still printing the
 * downloaded number would contradict the tick beside it.
 */
export function localAttendanceTally(
  rows: readonly AttendanceSnapshotRow[],
): AttendanceTally {
  let present = 0;

  for (const row of rows) {
    if (row.attendance) present += 1;
  }

  return { present, total: rows.length };
}
