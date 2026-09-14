/**
 * Filter catalogue and URL contract for the admin panel.
 *
 * One module decides what an admin can filter by, how a filter is written into
 * the query string, and what counts as a valid value. The filter bar renders
 * from it, the pages parse from it and the PDF report route honours it, so
 * adding a filter here carries it the whole way without touching a component.
 *
 * Everything in here is plain data and pure functions — it is imported by both
 * Server Components and client leaves, so it must never read `env`, the
 * database, or `next/headers`.
 *
 * ## How a kind is compared in SQL
 *
 * The action layer (`src/lib/actions/registrations.ts`) implements exactly these
 * four comparisons, so a field's `kind` fully describes its behaviour:
 *
 * | kind      | SQL                                                |
 * |-----------|----------------------------------------------------|
 * | `text`    | `ILIKE '%value%'` on one column                     |
 * | `select`  | case-insensitive equality, so `Morning` = `morning`  |
 * | `date`    | inclusive day range — a `to` date covers that day    |
 * | `number`  | numeric bound — `min` is `>=`, `max` is `<=`         |
 *
 * `q`, `sort` and `page` are reserved parameter names and may not be a field id.
 */

import { stemfestClasses } from "@/lib/data/stemfest-registration";
import { stemfestPaymentStatusOptions } from "@/lib/admin/statuses";

// ── Sources ──────────────────────────────────────────────────────────────────

export type AdminSourceId = "ambassador" | "volunteer" | "stemfest" | "sms";

export type AdminFilterKind = "select" | "text" | "date" | "number";

export interface AdminFilterOption {
  value: string;
  label: string;
}

export interface AdminFilterField {
  /** Query-string key. Must not collide with `q`, `sort` or `page`. */
  id: string;
  label: string;
  kind: AdminFilterKind;
  /** Placeholder for `text` / `number` fields. */
  placeholder?: string;
  /** Allowed values for a `select`; also its validation whitelist. */
  options?: AdminFilterOption[];
  /**
   * Rendered in the always-visible row. Everything else sits behind "More
   * filters" — eleven controls at once is a wall, not a tool.
   */
  primary?: boolean;
}

export type AdminSortId =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "amount-asc"
  | "amount-desc";

export interface AdminSortOption {
  value: AdminSortId;
  label: string;
}

/** One column of the printed report. */
export interface AdminReportColumn {
  /**
   * Key in the row objects `getAdminReportRows` returns. Typed as a plain string
   * because the query layer builds those rows as `Record<string, string>` — the
   * two are kept in step by "Report columns" in `obsidian/admin/filters-reports.md`.
   */
  id: string;
  label: string;
  /** Amounts and other figures print right-aligned so they line up. */
  align?: "left" | "right";
}

export interface AdminSourceConfig {
  id: AdminSourceId;
  /** The table page this report is exported from. */
  path: string;
  /** Sidebar / table label. */
  label: string;
  /** `<h1>` on the table page and on its printed report. */
  reportTitle: string;
  /** Sentence under the report heading explaining what was exported. */
  reportNote: string;
  /** Placeholder for the table's search box. */
  searchPlaceholder: string;
  /** Empty-table copy, which differs once a filter is narrowing the list. */
  empty: { filtered: string; unfiltered: string };
  /** Singular and plural nouns for the row-count sentence. */
  noun: { one: string; many: string };
  /** Trailing clause of the row-count sentence, e.g. "from the volunteer form." */
  listNote: string;
  filters: AdminFilterField[];
  sort: AdminSortOption[];
  /** Must be one of the declared `sort` values. */
  defaultSort: AdminSortId;
  /** Printed report columns, in order. */
  reportColumns: AdminReportColumn[];
}

/** Reserved query-string keys — a field id may not be one of these. */
export const FILTER_QUERY_PARAM = "q";
export const FILTER_SORT_PARAM = "sort";
export const FILTER_PAGE_PARAM = "page";

/**
 * Hard ceiling on a printed report.
 *
 * A report reads every matching row rather than one page, so it needs a bound the
 * paged table does not have: without one, an unfiltered export of a table that
 * grew unexpectedly would pin a pooled connection until the statement timeout.
 * 2 000 rows is far more than any list this panel has produced; beyond it the
 * report says so instead of truncating silently.
 *
 * It lives here, beside the rest of the filter contract, because
 * `src/lib/actions/registrations.ts` is a `"use server"` module and such a module
 * may only export async functions.
 */
export const REPORT_ROW_LIMIT = 2_000;

/**
 * Every source's default, and the sort value `buildAdminHref` leaves out of the
 * URL. One canonical default means a link is byte-identical however it was
 * reached, which is what stops the search box re-navigating forever.
 */
export const DEFAULT_SORT: AdminSortId = "newest";

/**
 * The timezone an admin's "from"/"to" dates are read in.
 *
 * The tables store `timestamptz`, so a bare date bound would be interpreted in
 * UTC and would split a Dhaka calendar day at 6am local — "registrations from
 * 14 September" would quietly mean 13 Sep 18:00 → 14 Sep 18:00. Every day range
 * in the query layer converts through this zone instead (see `dayRange` in
 * `src/lib/actions/registrations.ts`).
 */
export const ADMIN_TIME_ZONE = "Asia/Dhaka";

const newestFirst: AdminSortOption = { value: "newest", label: "Newest first" };
const oldestFirst: AdminSortOption = { value: "oldest", label: "Oldest first" };
const nameAscending: AdminSortOption = { value: "name-asc", label: "Name A → Z" };
const nameDescending: AdminSortOption = { value: "name-desc", label: "Name Z → A" };

/** A submission-date pair; both bounds are always rendered together. */
const dateRangeFields: AdminFilterField[] = [
  { id: "from", label: "From", kind: "date" },
  { id: "to", label: "To", kind: "date" },
];

const sortNewestFirst: AdminSortOption[] = [
  newestFirst,
  oldestFirst,
  nameAscending,
  nameDescending,
];

export const ambassadorSource: AdminSourceConfig = {
  id: "ambassador",
  path: "/admin/campus-ambassador",
  label: "Campus Ambassador",
  reportTitle: "Ambassador Registrations",
  reportNote:
    "Responses from the Campus Ambassador and Batch Ambassador forms.",
  searchPlaceholder: "Search by name, school, or class…",
  empty: {
    filtered: "No responses match the active filters.",
    unfiltered: "No ambassador responses yet.",
  },
  noun: { one: "response", many: "responses" },
  listNote: "from the Campus and Batch Ambassador forms.",
  filters: [
    {
      id: "type",
      label: "Ambassador type",
      kind: "select",
      primary: true,
      options: [
        { value: "campus", label: "Campus Ambassador" },
        { value: "batch", label: "Batch Ambassador" },
      ],
    },
    {
      id: "gender",
      label: "Gender",
      kind: "select",
      primary: true,
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
      ],
    },
    {
      id: "firstTime",
      label: "Ambassador history",
      kind: "select",
      primary: true,
      options: [
        { value: "first-time", label: "First-time CA" },
        { value: "returning", label: "Returning CA" },
      ],
    },
    ...dateRangeFields.map((field) => ({ ...field, primary: true })),
    { id: "class", label: "Class / grade", kind: "text", placeholder: "e.g. 9, A2" },
    { id: "school", label: "School", kind: "text", placeholder: "Contains…" },
  ],
  sort: sortNewestFirst,
  defaultSort: DEFAULT_SORT,
  reportColumns: [
    { id: "type", label: "Type" },
    { id: "name", label: "Name" },
    { id: "class", label: "Class" },
    { id: "school", label: "School" },
    { id: "phone", label: "Phone" },
    { id: "email", label: "Email" },
    { id: "gender", label: "Gender" },
    { id: "firstTime", label: "First-time CA" },
    { id: "facebook", label: "Facebook" },
    { id: "instagram", label: "Instagram" },
    { id: "submitted", label: "Submitted" },
  ],
};

export const volunteerSource: AdminSourceConfig = {
  id: "volunteer",
  path: "/admin/volunteer",
  label: "Volunteer",
  reportTitle: "Volunteer Applications",
  reportNote: "Applications from the STEM Fest volunteer form.",
  searchPlaceholder: "Search by name, roll, class, shift, or code…",
  empty: {
    filtered: "No applications match the active filters.",
    unfiltered: "No volunteer applications yet.",
  },
  noun: { one: "application", many: "applications" },
  listNote: "from the STEM Fest volunteer form.",
  filters: [
    {
      id: "shift",
      label: "Shift",
      kind: "select",
      primary: true,
      options: [
        { value: "morning", label: "Morning" },
        { value: "day", label: "Day" },
      ],
    },
    ...dateRangeFields.map((field) => ({ ...field, primary: true })),
    { id: "classSection", label: "Class section", kind: "text", placeholder: "e.g. 10-A" },
    { id: "roll", label: "Roll", kind: "text", placeholder: "Contains…" },
    { id: "studentCode", label: "Student code", kind: "text", placeholder: "Contains…" },
    {
      id: "attendanceWeek",
      label: "Follow-up week answer",
      kind: "text",
      placeholder: "e.g. yes, clash",
    },
    {
      id: "parentsComfort",
      label: "Parents' consent answer",
      kind: "text",
      placeholder: "e.g. yes, no",
    },
    {
      id: "campusHesitation",
      label: "Campus hesitation answer",
      kind: "text",
      placeholder: "e.g. no, sometimes",
    },
  ],
  sort: sortNewestFirst,
  defaultSort: DEFAULT_SORT,
  reportColumns: [
    { id: "name", label: "Name" },
    { id: "classSection", label: "Class section" },
    { id: "roll", label: "Roll" },
    { id: "shift", label: "Shift" },
    { id: "studentCode", label: "Student code" },
    { id: "personalPhone", label: "Personal phone" },
    { id: "parentsPhone", label: "Parents phone" },
    { id: "submitted", label: "Submitted" },
  ],
};



export const stemfestSource: AdminSourceConfig = {
  id: "stemfest",
  path: "/admin/science-competition",
  label: "Science Competition",
  reportTitle: "STEM Fest Registrations",
  reportNote:
    "Registrations from the STEM Fest event form, with bKash payment status.",
  searchPlaceholder: "Search by name, class, school, segments, or TrxID…",
  empty: {
    filtered: "No registrations match the active filters.",
    unfiltered: "No STEM Fest registrations yet.",
  },
  noun: { one: "registration", many: "registrations" },
  listNote: "from the STEM Fest event form at /stemfestreg.",
  filters: [
    {
      id: "payment",
      label: "Payment",
      kind: "select",
      primary: true,
      // Matches the **effective** status: an admin's stored decision where there is
      // one, and the forwarded-SMS match where there is not — the same definition as
      // the pill in the table (`src/db/queries/stemfest-payment.ts`). The labels come
      // from the option table the pill and the row's `<select>` read, so "Verified"
      // in the filter bar is the "Verified" pill beside it.
      options: stemfestPaymentStatusOptions.map(({ value, label }) => ({
        value,
        label,
      })),
    },
    {
      id: "class",
      label: "Class",
      kind: "select",
      primary: true,
      options: stemfestClasses.map((entry) => ({
        value: entry.id,
        label: entry.label,
      })),
    },
    {
      id: "school",
      label: "School / college",
      kind: "text",
      placeholder: "Contains…",
      primary: true,
    },
    ...dateRangeFields.map((field) => ({ ...field, primary: true })),
    {
      id: "segment",
      label: "Event / segment",
      kind: "text",
      placeholder: "e.g. Robotics, Olympiad",
    },
    {
      id: "transactionId",
      label: "Transaction ID",
      kind: "text",
      placeholder: "e.g. 8N7A2B1C2D",
    },
  ],
  sort: sortNewestFirst,
  defaultSort: DEFAULT_SORT,
  reportColumns: [
    { id: "name", label: "Student" },
    { id: "class", label: "Class" },
    { id: "school", label: "School / college" },
    { id: "segments", label: "Events" },
    { id: "transactionId", label: "TrxID" },
    { id: "paymentNumber", label: "Payment number" },
    { id: "payment", label: "Payment" },
    { id: "submitted", label: "Submitted" },
  ],
};

export const smsSource: AdminSourceConfig = {
  id: "sms",
  path: "/admin/sms-logs",
  label: "SMS Logs",
  reportTitle: "Forwarded Payment SMS",
  reportNote:
    "Payment SMS forwarded from the bKash phone, with TrxID reconciliation status.",
  searchPlaceholder: "Search by sender, TrxID, status, or message…",
  empty: {
    filtered: "No SMS records match the active filters.",
    unfiltered:
      "No SMS records yet. Forward messages to the webhook to see them here.",
  },
  noun: { one: "message", many: "messages" },
  listNote: "forwarded from the bKash payment phone.",
  filters: [
    {
      id: "status",
      label: "Status",
      kind: "select",
      primary: true,
      options: [
        { value: "matched", label: "Matched" },
        { value: "unmatched", label: "Unmatched" },
        { value: "ignored", label: "Ignored" },
      ],
    },
    { id: "sender", label: "Sender", kind: "text", placeholder: "e.g. bKash", primary: true },
    ...dateRangeFields.map((field) => ({ ...field, primary: true })),
    { id: "senderNumber", label: "Sender number", kind: "text", placeholder: "Contains…" },
    { id: "minAmount", label: "Amount at least", kind: "number", placeholder: "0" },
    { id: "maxAmount", label: "Amount at most", kind: "number", placeholder: "5000" },
  ],
  sort: [
    newestFirst,
    oldestFirst,
    { value: "amount-desc", label: "Amount high → low" },
    { value: "amount-asc", label: "Amount low → high" },
  ],
  defaultSort: DEFAULT_SORT,
  reportColumns: [
    { id: "receivedAt", label: "Received" },
    { id: "sender", label: "Sender" },
    { id: "transactionId", label: "TrxID" },
    { id: "amount", label: "Amount", align: "right" },
    { id: "senderNumber", label: "Sender number" },
    { id: "status", label: "Status" },
    { id: "message", label: "Message" },
  ],
};

export const adminSources: Record<AdminSourceId, AdminSourceConfig> = {
  ambassador: ambassadorSource,
  volunteer: volunteerSource,
  stemfest: stemfestSource,
  sms: smsSource,
};

/** Resolves a `/admin/reports/[kind]` segment, or `null` for an unknown one. */
export function adminSourceById(kind: string): AdminSourceConfig | null {
  return kind in adminSources ? adminSources[kind as AdminSourceId] : null;
}

/** Resolves a field by id — used to label a filter value. */
export function adminFilterFieldById(
  source: AdminSourceConfig,
  id: string,
): AdminFilterField | null {
  return source.filters.find((field) => field.id === id) ?? null;
}

// ── Parsed query state ───────────────────────────────────────────────────────

/** Validated, non-empty filter values keyed by field id. */
export type AdminFilterValues = Record<string, string>;

export interface AdminQueryState {
  /** Free-text search box, shared by every source. */
  query: string;
  values: AdminFilterValues;
  sort: AdminSortId;
  page: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const MAX_QUERY_LENGTH = 200;
const MAX_TEXT_LENGTH = 200;
const MAX_ABSOLUTE_AMOUNT = 1_000_000_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" ? value.trim() : "";
}

/**
 * A real calendar day. The regex alone would accept `2026-02-31`, which Postgres
 * rejects with an invalid-date error — a hand-edited URL would then take the
 * page down instead of being quietly ignored.
 */
function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function cleanNumber(value: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return "";
  const amount = Number(value);
  return Number.isFinite(amount) && amount <= MAX_ABSOLUTE_AMOUNT ? value : "";
}

/** Validates one raw value against its field. Returns "" when it is unusable. */
export function validateFilterValue(field: AdminFilterField, raw: string): string {
  const value = raw.trim();
  if (!value) return "";

  switch (field.kind) {
    case "select":
      return field.options?.some((option) => option.value === value) ? value : "";
    case "date":
      return isCalendarDate(value) ? value : "";
    case "number":
      return cleanNumber(value);
    case "text":
      return value.slice(0, MAX_TEXT_LENGTH);
  }
}

/**
 * Turns Next's `searchParams` into validated state. Anything malformed is
 * dropped rather than rejected: an admin following a stale bookmark should land
 * on a slightly different list, not on an error page.
 */
export function parseAdminQuery(
  source: AdminSourceConfig,
  raw: RawSearchParams,
): AdminQueryState {
  const query = firstValue(raw[FILTER_QUERY_PARAM]).slice(0, MAX_QUERY_LENGTH);

  const values: AdminFilterValues = {};
  for (const field of source.filters) {
    const value = validateFilterValue(field, firstValue(raw[field.id]));
    if (value) values[field.id] = value;
  }

  const rawSort = firstValue(raw[FILTER_SORT_PARAM]);
  const sort = source.sort.some((option) => option.value === rawSort)
    ? (rawSort as AdminSortId)
    : source.defaultSort;

  const parsedPage = Number.parseInt(firstValue(raw[FILTER_PAGE_PARAM]), 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 1 ? parsedPage : 1;

  return { query, values, sort, page };
}

/**
 * The canonical URL for a state. Values equal to their default are omitted, so
 * two ways of reaching the same list produce the same href — which is what lets
 * the hook decide "nothing changed" by string comparison.
 *
 * The filter values are written in sorted order rather than in the order the
 * caller's object happens to hold them: the hook appends a newly-set filter to
 * the end of its values object, so an unsorted builder would serialise the same
 * filter *set* two ways (`?school=x&type=campus` from the hook, and the
 * catalogue-ordered `?type=campus&school=x` once the page parses it back). The
 * href is a function of the state, not of how the state was assembled.
 */
export function buildAdminHref(
  basePath: string,
  state: AdminQueryState,
  page: number = state.page,
): string {
  const params = new URLSearchParams();
  if (state.query) params.set(FILTER_QUERY_PARAM, state.query);
  for (const id of Object.keys(state.values).sort()) {
    const value = state.values[id];
    if (value) params.set(id, value);
  }
  if (state.sort !== DEFAULT_SORT) params.set(FILTER_SORT_PARAM, state.sort);
  if (page > 1) params.set(FILTER_PAGE_PARAM, String(page));

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Where the printable report for this exact filter state lives. */
export function buildReportHref(
  sourceId: AdminSourceId,
  state: AdminQueryState,
): string {
  return buildAdminHref(`/admin/reports/${sourceId}`, state, 1);
}

export function withoutFilter(
  state: AdminQueryState,
  fieldId: string,
): AdminQueryState {
  const values = { ...state.values };
  delete values[fieldId];
  return { ...state, values, page: 1 };
}


// ── Describing the active filters ────────────────────────────────────────────

export interface ActiveFilter {
  /** Field id, or `FILTER_QUERY_PARAM` for the search box. */
  id: string;
  label: string;
  /** Human-readable value — the option label for a select. */
  display: string;
}

/**
 * Pinned to UTC so the server and the browser render the same string. Without
 * it a chip renders one day apart on each side and React reports a hydration
 * mismatch.
 */
const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function displayValue(field: AdminFilterField | null, value: string): string {
  if (field?.kind === "date") {
    const parsed = new Date(`${value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return dayFormatter.format(parsed);
  }
  const option = field?.options?.find((entry) => entry.value === value);
  return option?.label ?? value;
}

/** Every filter currently narrowing the list, in catalogue order. */
export function activeFilterList(
  source: AdminSourceConfig,
  state: AdminQueryState,
): ActiveFilter[] {
  const active: ActiveFilter[] = [];

  if (state.query) {
    active.push({ id: FILTER_QUERY_PARAM, label: "Search", display: state.query });
  }

  for (const field of source.filters) {
    const value = state.values[field.id];
    if (!value) continue;
    active.push({
      id: field.id,
      label: field.label,
      display: displayValue(field, value),
    });
  }

  return active;
}

export function activeFilterCount(
  source: AdminSourceConfig,
  state: AdminQueryState,
): number {
  return activeFilterList(source, state).length;
}

/**
 * The sentence under a table page's heading: either the whole collection or,
 * once anything is narrowing it, how much of it is on screen.
 *
 * Built from the source's `noun` / `listNote` copy rather than written into each
 * page, so the table and its printed report describe the same query the same way.
 */
export function describeList(
  source: AdminSourceConfig,
  state: AdminQueryState,
  shown: number,
  total: number,
): string {
  const noun = total === 1 ? source.noun.one : source.noun.many;
  if (activeFilterCount(source, state) === 0) {
    return `All ${total} ${noun} ${source.listNote}`;
  }
  const match = state.query
    ? `match “${state.query}”`
    : "match the active filters";
  return `${shown} of ${total} ${noun} ${match}.`;
}

/** Empty-table copy, which says "no matches" only when something is filtering. */
export function emptyStateLabel(
  source: AdminSourceConfig,
  state: AdminQueryState,
): string {
  return activeFilterCount(source, state) > 0
    ? source.empty.filtered
    : source.empty.unfiltered;
}

/** Human-readable summary of a filter state, printed at the top of a report. */
export function describeFilters(
  source: AdminSourceConfig,
  state: AdminQueryState,
): { label: string; display: string }[] {
  return activeFilterList(source, state).map(({ label, display }) => ({
    label,
    display,
  }));
}

/** The sort option currently applied. */
export function adminSortLabel(
  source: AdminSourceConfig,
  sort: AdminSortId,
): string {
  return source.sort.find((option) => option.value === sort)?.label ?? sort;
}

