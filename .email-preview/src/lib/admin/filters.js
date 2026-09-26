"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSources = exports.smsSource = exports.stemfestSource = exports.volunteerSource = exports.ambassadorSource = exports.ADMIN_TIME_ZONE = exports.DEFAULT_SORT = exports.REPORT_ROW_LIMIT = exports.FILTER_PAGE_PARAM = exports.FILTER_SORT_PARAM = exports.FILTER_QUERY_PARAM = void 0;
exports.adminSourceById = adminSourceById;
exports.adminFilterFieldById = adminFilterFieldById;
exports.validateFilterValue = validateFilterValue;
exports.parseAdminQuery = parseAdminQuery;
exports.buildAdminHref = buildAdminHref;
exports.buildReportHref = buildReportHref;
exports.withoutFilter = withoutFilter;
exports.activeFilterList = activeFilterList;
exports.activeFilterCount = activeFilterCount;
exports.describeList = describeList;
exports.emptyStateLabel = emptyStateLabel;
exports.describeFilters = describeFilters;
exports.adminSortLabel = adminSortLabel;
const stemfest_registration_1 = require("@/lib/data/stemfest-registration");
const statuses_1 = require("@/lib/admin/statuses");
/** Reserved query-string keys — a field id may not be one of these. */
exports.FILTER_QUERY_PARAM = "q";
exports.FILTER_SORT_PARAM = "sort";
exports.FILTER_PAGE_PARAM = "page";
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
exports.REPORT_ROW_LIMIT = 2_000;
/**
 * Every source's default, and the sort value `buildAdminHref` leaves out of the
 * URL. One canonical default means a link is byte-identical however it was
 * reached, which is what stops the search box re-navigating forever.
 */
exports.DEFAULT_SORT = "newest";
/**
 * The timezone an admin's "from"/"to" dates are read in.
 *
 * The tables store `timestamptz`, so a bare date bound would be interpreted in
 * UTC and would split a Dhaka calendar day at 6am local — "registrations from
 * 14 September" would quietly mean 13 Sep 18:00 → 14 Sep 18:00. Every day range
 * in the query layer converts through this zone instead (see `dayRange` in
 * `src/lib/actions/registrations.ts`).
 */
exports.ADMIN_TIME_ZONE = "Asia/Dhaka";
const newestFirst = { value: "newest", label: "Newest first" };
const oldestFirst = { value: "oldest", label: "Oldest first" };
const nameAscending = { value: "name-asc", label: "Name A → Z" };
const nameDescending = { value: "name-desc", label: "Name Z → A" };
/** A submission-date pair; both bounds are always rendered together. */
const dateRangeFields = [
    { id: "from", label: "From", kind: "date" },
    { id: "to", label: "To", kind: "date" },
];
const sortNewestFirst = [
    newestFirst,
    oldestFirst,
    nameAscending,
    nameDescending,
];
exports.ambassadorSource = {
    id: "ambassador",
    path: "/admin/campus-ambassador",
    label: "Campus Ambassador",
    reportTitle: "Ambassador Registrations",
    reportNote: "Responses from the Campus Ambassador and Batch Ambassador forms.",
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
    defaultSort: exports.DEFAULT_SORT,
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
exports.volunteerSource = {
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
    defaultSort: exports.DEFAULT_SORT,
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
exports.stemfestSource = {
    id: "stemfest",
    path: "/admin/science-competition",
    label: "Science Competition",
    reportTitle: "STEM Fest Registrations",
    reportNote: "Registrations from the STEM Fest event form, with bKash payment status.",
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
            options: statuses_1.stemfestPaymentStatusOptions.map(({ value, label }) => ({
                value,
                label,
            })),
        },
        {
            id: "class",
            label: "Class",
            kind: "select",
            primary: true,
            options: stemfest_registration_1.stemfestClasses.map((entry) => ({
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
    defaultSort: exports.DEFAULT_SORT,
    reportColumns: [
        { id: "registrationCode", label: "ID" },
        { id: "name", label: "Student" },
        { id: "class", label: "Class" },
        { id: "school", label: "School / college" },
        { id: "segments", label: "Events" },
        { id: "amountToSend", label: "Amount" },
        { id: "transactionId", label: "TrxID" },
        { id: "paymentNumber", label: "Payment number" },
        { id: "payment", label: "Payment" },
        { id: "submitted", label: "Submitted" },
    ],
};
exports.smsSource = {
    id: "sms",
    path: "/admin/sms-logs",
    label: "SMS Logs",
    reportTitle: "Forwarded Payment SMS",
    reportNote: "Payment SMS forwarded from the bKash phone, with TrxID reconciliation status.",
    searchPlaceholder: "Search by sender, TrxID, status, or message…",
    empty: {
        filtered: "No SMS records match the active filters.",
        unfiltered: "No SMS records yet. Forward messages to the webhook to see them here.",
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
    defaultSort: exports.DEFAULT_SORT,
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
exports.adminSources = {
    ambassador: exports.ambassadorSource,
    volunteer: exports.volunteerSource,
    stemfest: exports.stemfestSource,
    sms: exports.smsSource,
};
/** Resolves a `/admin/reports/[kind]` segment, or `null` for an unknown one. */
function adminSourceById(kind) {
    return kind in exports.adminSources ? exports.adminSources[kind] : null;
}
/** Resolves a field by id — used to label a filter value. */
function adminFilterFieldById(source, id) {
    return source.filters.find((field) => field.id === id) ?? null;
}
const MAX_QUERY_LENGTH = 200;
const MAX_TEXT_LENGTH = 200;
const MAX_ABSOLUTE_AMOUNT = 1_000_000_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
function firstValue(raw) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === "string" ? value.trim() : "";
}
/**
 * A real calendar day. The regex alone would accept `2026-02-31`, which Postgres
 * rejects with an invalid-date error — a hand-edited URL would then take the
 * page down instead of being quietly ignored.
 */
function isCalendarDate(value) {
    if (!DATE_PATTERN.test(value))
        return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return (parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day);
}
function cleanNumber(value) {
    if (!/^\d+(\.\d{1,2})?$/.test(value))
        return "";
    const amount = Number(value);
    return Number.isFinite(amount) && amount <= MAX_ABSOLUTE_AMOUNT ? value : "";
}
/** Validates one raw value against its field. Returns "" when it is unusable. */
function validateFilterValue(field, raw) {
    const value = raw.trim();
    if (!value)
        return "";
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
function parseAdminQuery(source, raw) {
    const query = firstValue(raw[exports.FILTER_QUERY_PARAM]).slice(0, MAX_QUERY_LENGTH);
    const values = {};
    for (const field of source.filters) {
        const value = validateFilterValue(field, firstValue(raw[field.id]));
        if (value)
            values[field.id] = value;
    }
    const rawSort = firstValue(raw[exports.FILTER_SORT_PARAM]);
    const sort = source.sort.some((option) => option.value === rawSort)
        ? rawSort
        : source.defaultSort;
    const parsedPage = Number.parseInt(firstValue(raw[exports.FILTER_PAGE_PARAM]), 10);
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
function buildAdminHref(basePath, state, page = state.page) {
    const params = new URLSearchParams();
    if (state.query)
        params.set(exports.FILTER_QUERY_PARAM, state.query);
    for (const id of Object.keys(state.values).sort()) {
        const value = state.values[id];
        if (value)
            params.set(id, value);
    }
    if (state.sort !== exports.DEFAULT_SORT)
        params.set(exports.FILTER_SORT_PARAM, state.sort);
    if (page > 1)
        params.set(exports.FILTER_PAGE_PARAM, String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
}
/** Where the printable report for this exact filter state lives. */
function buildReportHref(sourceId, state) {
    return buildAdminHref(`/admin/reports/${sourceId}`, state, 1);
}
function withoutFilter(state, fieldId) {
    const values = { ...state.values };
    delete values[fieldId];
    return { ...state, values, page: 1 };
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
function displayValue(field, value) {
    if (field?.kind === "date") {
        const parsed = new Date(`${value}T00:00:00Z`);
        if (!Number.isNaN(parsed.getTime()))
            return dayFormatter.format(parsed);
    }
    const option = field?.options?.find((entry) => entry.value === value);
    return option?.label ?? value;
}
/** Every filter currently narrowing the list, in catalogue order. */
function activeFilterList(source, state) {
    const active = [];
    if (state.query) {
        active.push({ id: exports.FILTER_QUERY_PARAM, label: "Search", display: state.query });
    }
    for (const field of source.filters) {
        const value = state.values[field.id];
        if (!value)
            continue;
        active.push({
            id: field.id,
            label: field.label,
            display: displayValue(field, value),
        });
    }
    return active;
}
function activeFilterCount(source, state) {
    return activeFilterList(source, state).length;
}
/**
 * The sentence under a table page's heading: either the whole collection or,
 * once anything is narrowing it, how much of it is on screen.
 *
 * Built from the source's `noun` / `listNote` copy rather than written into each
 * page, so the table and its printed report describe the same query the same way.
 */
function describeList(source, state, shown, total) {
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
function emptyStateLabel(source, state) {
    return activeFilterCount(source, state) > 0
        ? source.empty.filtered
        : source.empty.unfiltered;
}
/** Human-readable summary of a filter state, printed at the top of a report. */
function describeFilters(source, state) {
    return activeFilterList(source, state).map(({ label, display }) => ({
        label,
        display,
    }));
}
/** The sort option currently applied. */
function adminSortLabel(source, sort) {
    return source.sort.find((option) => option.value === sort)?.label ?? sort;
}
