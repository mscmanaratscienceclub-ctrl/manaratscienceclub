/**
 * Parity harness for the admin panel's browser cache.
 *
 * Since ADR-0044 the STEM Fest, SMS-log and attendance tables can answer a search, a
 * filter, a sort and a page change from a copy of the list held in IndexedDB
 * (`src/lib/admin/local-query.ts`). That is only safe if the copy answers *exactly*
 * as Postgres does — same rows, same order, same page, same total. This script is
 * what turns that from an intention into a checked property.
 *
 * It is deliberately not a mocked unit test. For every case it runs the **real**
 * query builders from `src/db/queries/admin-filters.ts` against the live database and
 * compares the result with the local matcher over the rows the snapshot endpoint
 * would have cached. A fixture-based test would prove the matcher agrees with a
 * picture of the database taken when the test was written; this proves it agrees with
 * the database.
 *
 * Three classes of divergence are worth knowing about, and each has a case below:
 *
 *   - a comparison reading the rendered cell instead of the stored column
 *     (`class-9` versus "Class 9", the raw `status` text versus the narrowed option);
 *   - JavaScript's two-valued logic where SQL has three (`NULL NOT ILIKE '%x%'` is
 *     NULL, so a `not` filter *excludes* an absent column);
 *   - `localeCompare`, or the database's own collation, where `orderFor` orders names
 *     by code point under `collate "C"`.
 *
 * Both sides end every ordering on the primary key, so the answer is total and the
 * page never depends on heap order. Should a branch of `orderFor` ever lose that
 * tiebreak, the server would start answering an `ORDER BY amount` with ties in
 * whatever order it liked; the run below detects that by asking twice and downgrades
 * the case to a warning, because there is then no answer for the matcher to match.
 *
 * Bundled with esbuild (the repo has no tsx), as `verify-admin-db.ts` is:
 *   pnpm verify:local-query
 */
import { desc, sql } from "drizzle-orm";

import { withDbTimeout } from "../src/db/query";
import { stemfestRegistrations } from "../src/db/schema/stemfest-registrations";
import { stemfestPaymentSms } from "../src/db/schema/stemfest-payment-sms";
import {
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
} from "../src/db/queries/admin-filters";
import {
  ADMIN_TIME_ZONE,
  attendanceSource,
  PAGE_SIZE,
  REPORT_ROW_LIMIT,
  adminFilterFieldById,
  clampPage,
  defaultFilterOperator,
  encodeFilterValue,
  pageCount,
  smsSource,
  stemfestSource,
  type AdminFilterOperator,
  type AdminQueryState,
  type AdminSortId,
  type AdminSourceConfig,
} from "../src/lib/admin/filters";
import {
  localAttendanceTally,
  localSmsTallies,
  localStemfestStats,
  queryAttendanceLocally,
  querySmsLocally,
  queryStemfestLocally,
} from "../src/lib/admin/local-query";
import {
  toAttendanceSnapshotRow,
  toSmsSnapshotRow,
  toStemfestSnapshotRow,
  type AttendanceSnapshotRow,
  type SmsSnapshotRow,
  type StemfestSnapshotRow,
} from "../src/lib/admin/snapshot";
import { stemfestEvents } from "../src/lib/data/stemfest-registration";

let failures = 0;
let warnings = 0;
let checks = 0;

setTimeout(() => {
  console.log("\n[HANG] watchdog fired — a parity query never came back");
  process.exit(1);
}, 600_000).unref();

// ── Reporting ────────────────────────────────────────────────────────────────

function pass(label: string, detail: string): void {
  checks += 1;
  console.log(`  PASS  ${label} — ${detail}`);
}

function warn(label: string, detail: string): void {
  checks += 1;
  warnings += 1;
  console.log(`  WARN  ${label} — ${detail}`);
}

function fail(label: string, detail: string): void {
  checks += 1;
  failures += 1;
  console.log(`  FAIL  ${label} — ${detail}`);
}

/** Where two ordered id lists first part company, for a message worth reading. */
function firstDifference(left: string[], right: string[]): string {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) {
      return `position ${index}: sql=${left[index] ?? "—"} local=${right[index] ?? "—"}`;
    }
  }
  return "no difference";
}

function sameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const remaining = new Map<string, number>();
  for (const id of left) remaining.set(id, (remaining.get(id) ?? 0) + 1);
  for (const id of right) {
    const count = remaining.get(id) ?? 0;
    if (count === 0) return false;
    remaining.set(id, count - 1);
  }
  return true;
}

// ── Reading the database ─────────────────────────────────────────────────────

interface SqlPage {
  ids: string[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * One page, read the way `searchStemfestRegistrations` reads it: the real
 * `stemfestWhere`, the real `orderFor`, the real count-then-page arithmetic.
 */
async function sqlStemfestPage(state: AdminQueryState): Promise<SqlPage> {
  const t = stemfestRegistrations;
  const requested = clampPage(state.page);
  const where = stemfestWhere(state);

  return withDbTimeout("parity:stemfestPage", async (tx) => {
    const total = await countRows(tx, t, where);
    const page = Math.min(requested, pageCount(total));
    const rows = await tx
      .select({ id: t.id })
      .from(t)
      .where(where)
      .orderBy(...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return {
      ids: rows.map((row) => row.id),
      total,
      page,
      totalPages: pageCount(total),
    };
  });
}

/** One page, read the way `getSmsLogs` reads it. */
async function sqlSmsPage(state: AdminQueryState): Promise<SqlPage> {
  const t = stemfestPaymentSms;
  const requested = clampPage(state.page);
  const where = smsWhere(state);

  return withDbTimeout("parity:smsPage", async (tx) => {
    const total = await countRows(tx, t, where);
    const page = Math.min(requested, pageCount(total));
    const rows = await tx
      .select({ id: t.id })
      .from(t)
      .where(where)
      .orderBy(...orderFor(state.sort, { timestamp: t.receivedAt, id: t.id, amount: t.amount }))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return {
      ids: rows.map((row) => row.id),
      total,
      page,
      totalPages: pageCount(total),
    };
  });
}

/**
 * The rows the snapshot endpoint would have handed the browser, in the shape it
 * would have handed them: the same selection, the same ceiling, the same builders.
 */
async function readStemfestCache(): Promise<StemfestSnapshotRow[]> {
  const t = stemfestRegistrations;

  return withDbTimeout("parity:stemfestCache", async (tx) => {
    const rows = await tx
      .select(stemfestAdminSelection())
      .from(t)
      .orderBy(desc(t.createdAt))
      .limit(REPORT_ROW_LIMIT);

    return rows.map(toStemfestSnapshotRow);
  });
}

async function readSmsCache(): Promise<SmsSnapshotRow[]> {
  const t = stemfestPaymentSms;

  return withDbTimeout("parity:smsCache", async (tx) => {
    const rows = await tx
      .select()
      .from(t)
      .orderBy(desc(t.receivedAt))
      .limit(REPORT_ROW_LIMIT);

    return rows.map(toSmsSnapshotRow);
  });
}

/** One page, read the way `searchAttendance` reads it. */
async function sqlAttendancePage(state: AdminQueryState): Promise<SqlPage> {
  const t = stemfestRegistrations;
  const requested = clampPage(state.page);
  const where = attendanceWhere(state);

  return withDbTimeout("parity:attendancePage", async (tx) => {
    const total = await countRows(tx, t, where);
    const page = Math.min(requested, pageCount(total));
    const rows = await tx
      .select({ id: t.id })
      .from(t)
      .where(where)
      .orderBy(...orderFor(state.sort, { timestamp: t.createdAt, id: t.id, name: t.name }))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    return {
      ids: rows.map((row) => row.id),
      total,
      page,
      totalPages: pageCount(total),
    };
  });
}

/**
 * The rows the sheet's snapshot would have handed the browser.
 *
 * Note what this is *not*: the same table `sqlStemfestPage` reads. The two caches
 * hold different projections of one table, and this is the case that keeps the
 * sheet's narrower selection honest — a row missing the school its search box sweeps
 * would answer a query the server cannot.
 */
async function readAttendanceCache(): Promise<AttendanceSnapshotRow[]> {
  const t = stemfestRegistrations;

  return withDbTimeout("parity:attendanceCache", async (tx) => {
    const rows = await tx
      .select(attendanceSelection())
      .from(t)
      .orderBy(desc(t.createdAt))
      .limit(REPORT_ROW_LIMIT);

    return rows.map(toAttendanceSnapshotRow);
  });
}

/** The collation the database would use if `orderFor` did not pin one. */
async function readCollation(): Promise<string> {
  return withDbTimeout("parity:collation", async (tx) => {
    const [row] = await tx
      .select({
        collate: sql<string>`datcollate`,
        ctype: sql<string>`datctype`,
      })
      .from(sql`pg_database`)
      .where(sql`datname = current_database()`);

    return `${row?.collate ?? "?"} / ${row?.ctype ?? "?"}`;
  });
}

/**
 * That the server's name ordering *is* the browser's.
 *
 * `orderFor` pins `lower(name) collate "C"` rather than leaving `ORDER BY name` to
 * the database's own collation, because this database collates as `en_US.UTF-8`
 * (glibc) and the browser only has ICU — and the two disagree about punctuation,
 * case and diacritics often enough to hand back a different page. Drop the pin and
 * every name sort below diverges quietly; this check names the reason instead.
 *
 * Read straight off one page of SQL rather than inferred from the cases that follow,
 * so it fails even if the sample data ever stops containing a name that separates the
 * two collations.
 */
async function checkNameOrderIsCodePoint(collation: string): Promise<void> {
  const t = stemfestRegistrations;

  const rows = await withDbTimeout("parity:nameOrder", async (tx) =>
    tx
      .select({ name: t.name })
      .from(t)
      .orderBy(...orderFor("name-asc", { timestamp: t.createdAt, id: t.id, name: t.name }))
      .limit(PAGE_SIZE),
  );

  const names = rows.map((row) => row.name);
  for (let index = 1; index < names.length; index += 1) {
    const left = names[index - 1];
    const right = names[index];
    const folded = left.toLowerCase() < right.toLowerCase() ? -1 : left.toLowerCase() > right.toLowerCase() ? 1 : 0;
    const raw = left < right ? -1 : left > right ? 1 : 0;
    if (folded > 0 || (folded === 0 && raw > 0)) {
      fail(
        "name ordering is code-point order",
        `SQL returned ${JSON.stringify(left)} before ${JSON.stringify(right)} at position ${index}. ` +
          `This database collates as ${collation}; \`orderFor\` must pin \`collate "C"\` or the ` +
          "browser cannot reproduce the order.",
      );
      return;
    }
  }

  pass(
    "name ordering is code-point order",
    `${names.length} name(s) come back from SQL in the order JavaScript's \`<\` gives, ` +
      `despite the database collating as ${collation}`,
  );
}

// ── Building query states ────────────────────────────────────────────────────

type FilterSpec =
  | string
  | { operator: AdminFilterOperator; value: string; raw?: boolean };

interface StateSpec {
  q?: string;
  sort?: AdminSortId;
  page?: number;
  filters?: Record<string, FilterSpec>;
}

/**
 * A state assembled through the panel's own encoder.
 *
 * Values are written with `encodeFilterValue` and read back by `filterMatches`, so
 * the harness exercises the URL contract end to end rather than constructing an
 * `AdminQueryState` the panel could never have produced.
 *
 * `raw` bypasses the encoder for the one case that has to test a value the encoder
 * would never write — a hand-edited URL holding something no option offers.
 */
function buildState(source: AdminSourceConfig, spec: StateSpec): AdminQueryState {
  const values: Record<string, string> = {};

  for (const [id, entry] of Object.entries(spec.filters ?? {})) {
    const field = adminFilterFieldById(source, id);
    if (!field) throw new Error(`No filter called "${id}" on ${source.id}.`);

    if (typeof entry === "string") {
      const encoded = encodeFilterValue(field, defaultFilterOperator(field), entry);
      if (encoded) values[id] = encoded;
      continue;
    }

    if (entry.raw) {
      values[id] = entry.value;
      continue;
    }

    const encoded = encodeFilterValue(field, entry.operator, entry.value);
    if (encoded) values[id] = encoded;
  }

  return {
    query: spec.q ?? "",
    values,
    sort: spec.sort ?? source.defaultSort,
    page: spec.page ?? 1,
  };
}

/** How a case reads in the output: the query string an admin would have produced. */
function describeState(source: AdminSourceConfig, state: AdminQueryState): string {
  const parts: string[] = [];
  if (state.query) parts.push(`q=${JSON.stringify(state.query)}`);
  for (const id of Object.keys(state.values).sort()) parts.push(`${id}=${state.values[id]}`);
  if (state.sort !== source.defaultSort) parts.push(`sort=${state.sort}`);
  if (state.page > 1) parts.push(`page=${state.page}`);
  return parts.length === 0 ? "(no filters)" : parts.join(" ");
}

// ── Comparing one case ───────────────────────────────────────────────────────

interface LocalPageShape {
  rows: { id: string }[];
  total: number;
  page: number;
  totalPages: number;
}

async function compare(
  label: string,
  source: AdminSourceConfig,
  state: AdminQueryState,
  fromSql: (state: AdminQueryState) => Promise<SqlPage>,
  fromLocal: () => LocalPageShape,
): Promise<void> {
  const expected = await fromSql(state);
  const actual = fromLocal();
  const actualIds = actual.rows.map((row) => row.id);
  const where = describeState(source, state);

  if (
    expected.total !== actual.total ||
    expected.page !== actual.page ||
    expected.totalPages !== actual.totalPages
  ) {
    fail(
      label,
      `${where} → counts differ: sql total=${expected.total} page=${expected.page}/${expected.totalPages}, ` +
        `local total=${actual.total} page=${actual.page}/${actual.totalPages}`,
    );
    return;
  }

  if (!sameMembers(expected.ids, actualIds)) {
    fail(
      label,
      `${where} → different rows (total ${expected.total}): ${firstDifference(expected.ids, actualIds)}`,
    );
    return;
  }

  if (expected.ids.join() === actualIds.join()) {
    pass(label, `${where} → ${expected.total} row(s), page ${expected.page}/${expected.totalPages}`);
    return;
  }

  // Same rows, different order. Either the matcher sorted them wrongly, or SQL
  // never said. Ask SQL again: an answer that moves is an answer that was never
  // pinned down, and there is nothing for the local order to agree with.
  const again = await fromSql(state);
  if (again.ids.join() !== expected.ids.join()) {
    warn(
      label,
      `${where} → same ${expected.total} row(s), but SQL itself returned them in two ` +
        `different orders (${firstDifference(expected.ids, again.ids)}), so the order is unspecified`,
    );
    return;
  }

  fail(label, `${where} → same rows, different order: ${firstDifference(expected.ids, actualIds)}`);
}

// ── Values taken from the real data ──────────────────────────────────────────
//
// A case whose filter matches nothing passes vacuously — both sides return an empty
// page and agree. Every value below is lifted from a row that exists, so each case
// has to get a non-trivial answer right.

interface StemfestSamples {
  name: string;
  registrationCode: string;
  school: string;
  classId: string;
  transactionId: string;
  paymentNumber: string;
  eventId: string;
  eventName: string;
  verifiedStatus: StemfestSnapshotRow["status"];
  day: string;
  earlierDay: string;
  laterDay: string;
  wildcardTerm: string | null;
  phrase: string;
}

/** A row's calendar day in the panel's timezone, as `YYYY-MM-DD`. */
function dhakaDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ADMIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * A substring of `value` that is neither the whole thing nor a single character, so
 * a `similar` filter has to do real work rather than match on an exact copy.
 */
function middleOf(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return trimmed;
  const start = Math.floor(trimmed.length / 4);
  return trimmed.slice(start, start + Math.max(3, Math.floor(trimmed.length / 2)));
}

function sampleStemfest(rows: StemfestSnapshotRow[]): StemfestSamples {
  const withSchool = rows.find((row) => row.school.trim().length > 6) ?? rows[0];
  const withName = rows.find((row) => row.name.trim().length > 4) ?? rows[0];
  const withTrx = rows.find((row) => row.transactionId.trim().length > 3) ?? rows[0];

  // An event whose name some row actually carries — otherwise the `segment` filter
  // would be tested only against rows it cannot match.
  const event =
    stemfestEvents.find((candidate) =>
      rows.some((row) => row.segments.toLowerCase().includes(candidate.name.toLowerCase())),
    ) ?? stemfestEvents[0];

  const days = rows.map((row) => dhakaDay(row.createdAt)).sort();

  // A literal wildcard character, if any row holds one: SQL escapes `%`, `_` and `\`
  // in the needle, and JavaScript's `includes` has no wildcards to escape, so the
  // two agree only if neither treats the character specially.
  const wildcardRow = rows.find((row) =>
    [row.name, row.school, row.segments, row.transactionId, row.paymentNumber].some(
      (value) => value.includes("%") || value.includes("_") || value.includes("\\"),
    ),
  );
  const wildcardSource = wildcardRow
    ? [wildcardRow.name, wildcardRow.school, wildcardRow.segments, wildcardRow.transactionId, wildcardRow.paymentNumber].find(
        (value) => value.includes("%") || value.includes("_") || value.includes("\\"),
      ) ?? ""
    : "";
  const wildcardAt = /[\\%_]/.exec(wildcardSource)?.index ?? -1;

  return {
    // Uppercased on purpose: `ILIKE` folds case, `includes` on two lowercased
    // strings folds it too, and a matcher that compared raw would pass every other
    // case and fail this one.
    name: withName.name.trim().toUpperCase(),
    // The participant-facing ID, as the row holds it. `registrationCode` is stored
    // mixed-case (`M9014`), so the lower-cased twin below is the case that proves both
    // sides fold case rather than comparing the text as-is.
    registrationCode: withName.registrationCode.trim(),
    school: middleOf(withSchool.school),
    classId: rows.find((row) => row.raw.class.trim().length > 0)?.raw.class ?? "",
    transactionId: withTrx.transactionId.trim(),
    paymentNumber: withTrx.paymentNumber.trim(),
    eventId: event?.id ?? "",
    eventName: event?.name ?? "",
    verifiedStatus: rows.find((row) => row.status === "verified")?.status ?? "verified",
    day: days[Math.floor(days.length / 2)] ?? "",
    earlierDay: days[0] ?? "",
    laterDay: days[days.length - 1] ?? "",
    wildcardTerm:
      wildcardAt >= 0 ? wildcardSource.slice(Math.max(0, wildcardAt - 2), wildcardAt + 3) : null,
    phrase: withName.name.trim(),
  };
}

interface SmsSamples {
  sender: string;
  rawStatus: string;
  senderNumber: string | null;
  amount: string | null;
  transactionId: string | null;
  messageFragment: string;
  day: string;
  hasNullSenderNumber: boolean;
}

function sampleSms(rows: SmsSnapshotRow[]): SmsSamples {
  const withNumber = rows.find((row) => row.senderNumber && row.senderNumber.trim().length > 3);
  const withAmount = rows.find((row) => row.amount !== null);
  const withTrx = rows.find((row) => row.transactionId && row.transactionId.trim().length > 3);
  const withMessage = rows.find((row) => row.rawMessage.trim().length > 12) ?? rows[0];

  const days = rows.map((row) => dhakaDay(row.receivedAt)).sort();

  return {
    sender: middleOf(rows[0]?.sender ?? ""),
    // The *stored* text, not the value narrowed for the `<select>`: SQL compares the
    // column, so a status this build does not recognise has to behave the same way
    // here as it does there.
    rawStatus: rows[0]?.raw.status ?? "",
    senderNumber: withNumber?.senderNumber?.trim() ?? null,
    amount: withAmount?.amount ?? null,
    transactionId: withTrx?.transactionId?.trim() ?? null,
    messageFragment: middleOf(withMessage?.rawMessage ?? ""),
    day: days[Math.floor(days.length / 2)] ?? "",
    hasNullSenderNumber: rows.some((row) => row.senderNumber === null),
  };
}

// ── The run ──────────────────────────────────────────────────────────────────

interface AttendanceSamples {
  registrationCode: string;
  name: string;
  school: string;
  /** The stored class id, which the sheet prints as a label and SQL compares as this. */
  classId: string;
  anyonePresent: boolean;
}

function sampleAttendance(rows: AttendanceSnapshotRow[]): AttendanceSamples {
  const withSchool =
    rows.find((row) => row.raw.school.trim().length > 6) ?? rows[0];

  return {
    registrationCode: rows[0]?.registrationCode ?? "",
    name: rows[0]?.name ?? "",
    school: withSchool?.raw.school ?? "",
    classId: rows[0]?.raw.class ?? "",
    anyonePresent: rows.some((row) => row.attendance),
  };
}

async function attendanceCases(rows: AttendanceSnapshotRow[]): Promise<void> {
  console.log(`\nAttendance sheet — ${rows.length} cached row(s)`);
  if (rows.length === 0) {
    warn("attendance:cache", "the table is empty, so every case below is vacuous");
    return;
  }

  const s = sampleAttendance(rows);
  const run = (label: string, spec: StateSpec) => {
    const state = buildState(attendanceSource, spec);
    return compare(
      label,
      attendanceSource,
      state,
      sqlAttendancePage,
      () => queryAttendanceLocally(rows, state),
    );
  };

  await run("unfiltered, newest first", {});
  await run("search box: a registration ID, as printed", { q: s.registrationCode });
  await run("search box: the middle of a registration ID", {
    q: middleOf(s.registrationCode),
  });
  await run("search box: a participant's name", { q: s.name });
  await run("search box: a school the sheet never prints", { q: s.school });
  await run("search box: a stored class id, not its label", { q: s.classId });
  await run("search box: something nobody is called", {
    q: "zzzz-no-such-participant-zzzz",
  });

  await run("attendance: is present", {
    filters: { attendance: { operator: "is", value: "present" } },
  });
  await run("attendance: is absent", {
    filters: { attendance: { operator: "is", value: "absent" } },
  });
  // `not` flips the target rather than the result, so this is a positive match on
  // `false` — the one comparator in the file that is not "the same, inverted".
  await run("attendance: is NOT present", {
    filters: { attendance: { operator: "not", value: "present" } },
  });
  await run("attendance: is NOT absent", {
    filters: { attendance: { operator: "not", value: "absent" } },
  });

  if (!s.anyonePresent) {
    warn(
      "attendance:present",
      "no row is marked present yet, so the two present cases above are vacuous",
    );
  }

  await run("class: an exact stored id", {
    filters: { class: { operator: "is", value: s.classId } },
  });
  await run("class: is NOT that id", {
    filters: { class: { operator: "not", value: s.classId } },
  });
  await run("school: contains", {
    filters: { school: { operator: "similar", value: middleOf(s.school) } },
  });
  await run("school: is exactly", { filters: { school: s.school } });
  await run("school: does not contain", {
    filters: { school: { operator: "not", value: middleOf(s.school) } },
  });
  await run("a hand-edited value no option offers narrows nothing", {
    filters: { attendance: { operator: "is", value: "maybe", raw: true } },
  });

  await run("oldest first", { sort: "oldest" });
  await run("name A → Z", { sort: "name-asc" });
  await run("name Z → A", { sort: "name-desc" });
  await run("page 2", { page: 2 });
  await run("a page past the end clamps to the last one", { page: 999 });

  await run("everything at once: search + attendance + class + page 2", {
    q: middleOf(s.school),
    sort: "name-asc",
    page: 2,
    filters: {
      attendance: { operator: "is", value: "absent" },
      class: { operator: "not", value: s.classId },
    },
  });
}

async function attendanceTallyCase(rows: AttendanceSnapshotRow[]): Promise<void> {
  const t = stemfestRegistrations;

  const expected = await withDbTimeout("parity:attendanceTally", async (tx) => {
    const [row] = await tx.select(attendanceProbeSelection()).from(t);
    return { present: row?.present ?? 0, total: row?.count ?? 0 };
  });

  if (rows.length >= REPORT_ROW_LIMIT) {
    warn(
      "stats: attendance",
      `the cache holds ${rows.length} row(s), at its ceiling, so the recomputed tally ` +
        "would be a slice's — not compared",
    );
    return;
  }

  const actual = localAttendanceTally(rows);

  if (
    expected.present !== actual.present ||
    expected.total !== actual.total
  ) {
    fail(
      "stats: attendance tally",
      `sql present=${expected.present}/${expected.total} local=${actual.present}/${actual.total}`,
    );
  } else {
    pass(
      "stats: attendance tally",
      `present=${actual.present} of ${actual.total}`,
    );
  }
}

async function stemfestCases(rows: StemfestSnapshotRow[]): Promise<void> {
  console.log(`\nSTEM Fest — ${rows.length} cached row(s)`);
  if (rows.length === 0) {
    warn("stemfest:cache", "the table is empty, so every case below is vacuous");
    return;
  }

  const s = sampleStemfest(rows);
  const run = (label: string, spec: StateSpec) => {
    const state = buildState(stemfestSource, spec);
    return compare(
      label,
      stemfestSource,
      state,
      sqlStemfestPage,
      () => queryStemfestLocally(rows, state),
    );
  };

  await run("unfiltered, newest first", {});
  await run("search box: a registration ID, as printed", { q: s.registrationCode });
  await run("search box: a registration ID, lower-cased", { q: s.registrationCode.toLowerCase() });
  await run("search box: the middle of a registration ID", { q: middleOf(s.registrationCode) });
  await run("search box: a participant's name, uppercased", { q: s.name });
  await run("search box: a school substring", { q: s.school });
  await run("search box: a transaction id", { q: s.transactionId });
  await run("search box: a payment number", { q: s.paymentNumber });
  await run("search box: a two-word phrase is a phrase, not two terms", { q: s.phrase });
  await run("search box: surrounding whitespace is trimmed", { q: `  ${s.school}  ` });
  await run("search box: something nobody is called", { q: "zzzz-no-such-participant-zzzz" });

  if (s.wildcardTerm) {
    await run(`search box: a literal wildcard (${JSON.stringify(s.wildcardTerm)})`, {
      q: s.wildcardTerm,
    });
  } else {
    warn("stemfest:wildcards", "no row holds a %, _ or \\, so wildcard escaping is untested");
  }

  await run("payment: is verified", {
    filters: { payment: { operator: "is", value: s.verifiedStatus } },
  });
  await run("payment: is NOT verified", {
    filters: { payment: { operator: "not", value: s.verifiedStatus } },
  });
  await run("class: an exact stored id", {
    filters: { class: { operator: "is", value: s.classId } },
  });
  await run("class: is NOT that id", {
    filters: { class: { operator: "not", value: s.classId } },
  });
  await run("school: contains", { filters: { school: { operator: "similar", value: s.school } } });
  await run("school: is exactly", { filters: { school: { operator: "is", value: s.school } } });
  await run("school: does not contain", {
    filters: { school: { operator: "not", value: s.school } },
  });
  await run("transaction id: is exactly", {
    filters: { transactionId: { operator: "is", value: s.transactionId } },
  });
  await run("event: one catalogued event", {
    filters: { segment: { operator: "is", value: s.eventId } },
  });
  await run("event: NOT that event", {
    filters: { segment: { operator: "not", value: s.eventId } },
  });

  await run("submitted on one day", {
    filters: { from: s.day, to: s.day },
  });
  await run("submitted from the first day onward", { filters: { from: s.earlierDay } });
  await run("submitted up to the last day", { filters: { to: s.laterDay } });
  await run("submitted in a window that ends before the table starts", {
    filters: { from: "2001-01-01", to: "2001-01-02" },
  });

  await run("a hand-edited value no option offers narrows nothing", {
    filters: { payment: { operator: "is", value: "not-a-status", raw: true } },
  });

  await run("oldest first", { sort: "oldest" });
  await run("name A → Z", { sort: "name-asc" });
  await run("name Z → A", { sort: "name-desc" });
  await run("an amount sort this table has no column for falls back to newest", {
    sort: "amount-desc",
  });

  await run("page 2", { page: 2 });
  await run("a page past the end clamps to the last one", { page: 999 });

  await run(
    "everything at once: search + three filters + a day range + name sort + page 2",
    {
      q: s.school,
      sort: "name-asc",
      page: 2,
      filters: {
        payment: { operator: "not", value: "rejected" },
        segment: { operator: "is", value: s.eventId },
        from: s.earlierDay,
        to: s.laterDay,
      },
    },
  );
}

async function smsCases(rows: SmsSnapshotRow[]): Promise<void> {
  console.log(`\nSMS log — ${rows.length} cached row(s)`);
  if (rows.length === 0) {
    warn("sms:cache", "the log is empty, so every case below is vacuous");
    return;
  }

  const s = sampleSms(rows);
  const run = (label: string, spec: StateSpec) => {
    const state = buildState(smsSource, spec);
    return compare(
      label,
      smsSource,
      state,
      sqlSmsPage,
      () => querySmsLocally(rows, state),
    );
  };

  await run("unfiltered, newest first", {});
  await run("search box: a sender substring", { q: s.sender });
  await run("search box: a message fragment", { q: s.messageFragment });
  if (s.transactionId) {
    await run("search box: a transaction id", { q: s.transactionId });
  }
  if (s.senderNumber) {
    await run("search box: a sender number", { q: s.senderNumber });
  }
  await run("search box: the stored status text", { q: s.rawStatus });

  await run("status: is", { filters: { status: { operator: "is", value: s.rawStatus } } });
  await run("status: is NOT", { filters: { status: { operator: "not", value: s.rawStatus } } });
  await run("sender: contains", { filters: { sender: { operator: "similar", value: s.sender } } });
  await run("sender: does not contain", {
    filters: { sender: { operator: "not", value: s.sender } },
  });

  if (s.senderNumber) {
    await run("sender number: contains", {
      filters: { senderNumber: { operator: "similar", value: s.senderNumber } },
    });
    // The NULL case. `NOT (NULL ILIKE '%x%')` is NULL and a WHERE reads NULL as
    // false, so a message with no sender number is *excluded* by "does not contain".
    // JavaScript's `!value.includes(needle)` would include it, which is the single
    // easiest way for this cache to return rows the panel does not.
    await run("sender number: does NOT contain — NULL is excluded, not included", {
      filters: { senderNumber: { operator: "not", value: s.senderNumber } },
    });
  } else {
    warn("sms:sender-number", "no row carries a sender number, so the NULL case is untested");
  }

  if (!s.hasNullSenderNumber) {
    warn(
      "sms:null-columns",
      "every row has a sender number, so three-valued logic is only exercised if another column is NULL",
    );
  }

  if (s.amount) {
    await run("amount at least the smallest real amount", {
      filters: { minAmount: s.amount },
    });
    await run("amount at most the smallest real amount", {
      filters: { maxAmount: s.amount },
    });
    await run("amount pinned to one value from both sides", {
      filters: { minAmount: s.amount, maxAmount: s.amount },
    });
    await run("amount in a band nothing falls in", {
      filters: { minAmount: "999999", maxAmount: "999999" },
    });
  } else {
    warn("sms:amounts", "no row carries an amount, so the numeric bounds are untested");
  }

  await run("received on one day", { filters: { from: s.day, to: s.day } });
  await run("received in a window that ends before the log starts", {
    filters: { from: "2001-01-01", to: "2001-01-02" },
  });

  await run("oldest first", { sort: "oldest" });
  await run("amount high → low", { sort: "amount-desc" });
  await run("amount low → high", { sort: "amount-asc" });
  await run("a name sort this table has no column for falls back to newest", {
    sort: "name-asc",
  });

  await run("page 2", { page: 2 });
  await run("a page past the end clamps to the last one", { page: 999 });

  await run("everything at once", {
    q: s.sender,
    sort: "amount-desc",
    page: 2,
    filters: {
      status: { operator: "not", value: "ignored" },
      ...(s.amount ? { minAmount: "0" } : {}),
    },
  });
}

// ── The figures beside the table ─────────────────────────────────────────────
//
// Neither selection carries a WHERE clause, so a cache holding the whole table can
// recompute every figure — and must, because an optimistic status write moves a row
// between buckets and a card that still showed the shipped figure would contradict
// the pill the admin just clicked. These two cases pin the recomputation to the SQL.
//
// `uniqueSchools` is the one worth the round trip on its own: its predicate is
// spelled twice, `school ILIKE '%manarat%'` in SQL and `isManaratSchool` in
// JavaScript, and the two have to agree over every real school value or the host
// school is counted once per way a participant typed it.

async function stemfestStatsCase(rows: StemfestSnapshotRow[]): Promise<void> {
  const t = stemfestRegistrations;
  const generatedAt = new Date().toISOString();

  const expected = await withDbTimeout("parity:stemfestStats", async (tx) => {
    const [row] = await tx.select(stemfestStatsSelection()).from(t);
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

  // The cache is capped at REPORT_ROW_LIMIT rows. Past that the browser holds a
  // slice, the figures it would recompute are a slice's, and comparing them to the
  // whole table's proves nothing about the matcher.
  if (expected.total !== rows.length) {
    warn(
      "stats: stemfest",
      `the table holds ${expected.total} row(s) and the cache ceiling admits ${rows.length}, ` +
        "so the recomputed figures would be a slice's — not compared",
    );
    return;
  }

  const actual = localStemfestStats(rows, generatedAt);
  const counts = [
    "total",
    "thisWeek",
    "uniqueSchools",
    "verifiedCount",
    "pendingCount",
    "rejectedCount",
  ] as const;

  const wrong = counts.filter((key) => expected[key] !== actual[key]);
  if (wrong.length > 0) {
    fail(
      "stats: stemfest counts",
      wrong.map((key) => `${key} sql=${expected[key]} local=${actual[key]}`).join(", "),
    );
  } else {
    pass(
      "stats: stemfest counts",
      counts.map((key) => `${key}=${actual[key]}`).join(" "),
    );
  }

  // Compared as numbers rather than as text: `sum(numeric)` prints the scale its
  // inputs carried, and the local sum is a JavaScript double. What an admin reads is
  // `formatBdt(Number(…))`, so that is what has to agree.
  for (const key of ["amountCollected", "amountToCollect"] as const) {
    const left = expected[key];
    const right = actual[key];

    if ((left === null) !== (right === null)) {
      fail("stats: stemfest sums", `${key} sql=${left ?? "null"} local=${right ?? "null"}`);
      continue;
    }
    if (left === null || right === null) {
      pass("stats: stemfest sums", `${key} is null on both sides`);
      continue;
    }
    if (Math.abs(Number(left) - Number(right)) > 0.005) {
      fail("stats: stemfest sums", `${key} sql=${left} local=${right}`);
    } else {
      pass("stats: stemfest sums", `${key}=${right}`);
    }
  }
}

async function smsTalliesCase(rows: SmsSnapshotRow[]): Promise<void> {
  const t = stemfestPaymentSms;

  const expected = await withDbTimeout("parity:smsTallies", async (tx) => {
    const [row] = await tx.select(smsTallySelection()).from(t);
    return {
      matched: row?.matched ?? 0,
      unmatched: row?.unmatched ?? 0,
      ignored: row?.ignored ?? 0,
    };
  });

  // The tallies count three exact status values, so their sum can legitimately be
  // short of the row count — a status this build does not recognise is counted by
  // none of them, on both sides. The only reason not to compare is the cache ceiling.
  if (rows.length >= REPORT_ROW_LIMIT) {
    warn(
      "stats: sms",
      `the cache holds ${rows.length} row(s), at its ceiling, so the recomputed tallies ` +
        "would be a slice's — not compared",
    );
    return;
  }

  const actual = localSmsTallies(rows);
  const wrong = (["matched", "unmatched", "ignored"] as const).filter(
    (key) => expected[key] !== actual[key],
  );

  if (wrong.length > 0) {
    fail(
      "stats: sms tallies",
      wrong.map((key) => `${key} sql=${expected[key]} local=${actual[key]}`).join(", "),
    );
  } else {
    pass(
      "stats: sms tallies",
      `matched=${actual.matched} unmatched=${actual.unmatched} ignored=${actual.ignored}`,
    );
  }
}

async function main(): Promise<void> {
  const collation = await readCollation();
  console.log(`Database collation: ${collation}`);

  await checkNameOrderIsCodePoint(collation);

  const [stemfestRows, smsRows, attendanceRows] = [
    await readStemfestCache(),
    await readSmsCache(),
    await readAttendanceCache(),
  ];

  await stemfestCases(stemfestRows);
  await smsCases(smsRows);
  await attendanceCases(attendanceRows);
  await stemfestStatsCase(stemfestRows);
  await smsTalliesCase(smsRows);
  await attendanceTallyCase(attendanceRows);

  console.log(
    `\n${checks} check(s): ${failures} failed, ${warnings} warning(s)` +
      (failures === 0 ? " — the cache answers as the database does" : ""),
  );
  process.exit(failures === 0 ? 0 : 1);
}

await main();
