/**
 * The contract between the panel's server reads and the browser's cache.
 *
 * Three fest tables — registrations, the forwarded SMS log and the attendance
 * sheet — keep a copy of their whole list in IndexedDB so that searching,
 * filtering, sorting and paging over a few hundred rows costs no round trip at all
 * (`obsidian/meta/decisions-log.md`, ADR-0044). This module is what the cached copy
 * is made of: the row shapes, the builders that turn a database row into one, and
 * the version stamp that invalidates an old copy.
 *
 * Everything here is plain data and pure functions — imported by the snapshot route
 * handler, by the Server Components that render the tables, and by the client leaves
 * that read the cache back. It must never read `env`, the database or `next/headers`.
 *
 * ## Why a cached row carries more than a rendered one
 *
 * A table renders what an admin should read; a filter compares what the *column*
 * holds, and the two are not the same value. `class` is stored as `class-9` and read
 * as "Class 9", so SQL's `containsAny` sweep and its `selectMatch(t.class, …)`
 * compare the stored id while the cell prints the label — a cache holding only the
 * label could not reproduce either query. The same applies to the SMS `status`, which
 * is a free `text` column narrowed to one of three options before it reaches a
 * `<select>`, so a value this build does not know would read as Unmatched on screen
 * but as itself to SQL.
 *
 * Hence `raw`: the columns the comparisons read, never displayed. It is the only
 * difference between a rendered row and a cached one, and the reason a local answer
 * can be byte-identical to the server's.
 */

import { getStemfestClassLabel } from "@/lib/data/stemfest-registration";
import {
  smsLogStatusOptions,
  statusValue,
  type StemfestPaymentStatus,
  type SmsLogStatus,
} from "@/lib/admin/statuses";
import type {
  SmsLogRow as SmsLogDbRow,
  StemfestAdminRow,
  StemfestAttendanceRow,
  StemfestStats,
} from "@/lib/actions/registrations";

/**
 * Bumped whenever a cached row's shape or the local matcher's semantics change.
 *
 * A record whose stamp does not match is dropped on read rather than interpreted —
 * an older shape would silently narrow the wrong column, and a stale matcher would
 * answer from a cache nobody can see. Cheap insurance for a cache nobody watches.
 */
export const SNAPSHOT_VERSION = 1;

/**
 * How long a cached list stays usable before it is dropped outright.
 *
 * Twelve hours is one fest shift: a copy taken the evening before still answers the
 * morning's first search, and nothing survives into a second day. The rows are
 * participants' names, schools, email addresses, phone numbers and transaction IDs,
 * so the bound is about the browser holding PII as much as about freshness.
 */
export const SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * How long the browser waits for a snapshot before giving up.
 *
 * Longer than the server's own client-side watchdog (`CLIENT_TIMEOUT_MS`, 12s) plus
 * a margin for the flight itself, so a request the server abandoned is not one this
 * side waits on forever. A dead connection then surfaces as a failed cache rather
 * than as a chip that never stops spinning.
 */
export const SNAPSHOT_FETCH_TIMEOUT_MS = 20_000;

/**
 * Rows a delta fetch may append in one go.
 *
 * A delta is the cheap path for "new registrations arrived while we were watching".
 * Past this many, a full refetch is both simpler and no more expensive — the whole
 * list is only a few hundred rows — so the caller stops trying to patch and reloads.
 */
export const SNAPSHOT_DELTA_LIMIT = 500;

/** Timestamps cross to the client as ISO strings, never as `Date`. */
export function toIso(value: Date): string {
  return new Date(value).toISOString();
}

/** Timestamps that may be absent cross as `null`, which the panel draws as an em dash. */
function toIsoOrNull(value: Date | null): string | null {
  return value ? toIso(value) : null;
}

// ── Rendered rows ────────────────────────────────────────────────────────────
//
// What a table receives. These live here rather than in the components so that the
// server, the cache and the two client tables all name the same row — a shape
// declared three times drifts.

export interface StemfestRow {
  id: string;
  /** `<GENDER><CLASS><NNN>`, minted by the insert trigger — the participant-facing ID. */
  registrationCode: string;
  name: string;
  classLabel: string;
  school: string;
  segments: string;
  /**
   * Who referred the participant. `null` for a row filed before the question
   * existed, and for "not referred by anyone" — both render as an em dash.
   */
  reference: string | null;
  /**
   * What the participant was told to send, in BDT. `null` for a row filed before
   * the column existed — the amount cannot be recovered from `segments`, so those
   * read as an em dash rather than a guess.
   */
  totalFee: number | null;
  transactionId: string;
  paymentNumber: string;
  /** Nullable: rows collected before the form asked for an address have none. */
  email: string | null;
  /** The effective status — the stored decision, else the forwarded-SMS match. */
  status: StemfestPaymentStatus;
  /** The stored decision, or `null` while the status is still SMS-derived. */
  decision: StemfestPaymentStatus | null;
  decidedAt: string | null;
  /** Admin email that decided, or `null` for an SMS-derived status. */
  decidedBy: string | null;
  emailSentAt: string | null;
  /** Amount a forwarded SMS reported, as text; `null` when no message carried one. */
  amount: string | null;
  createdAt: string;
}

export interface SmsLogRow {
  id: string;
  sender: string;
  rawMessage: string;
  transactionId: string | null;
  amount: string | null;
  senderNumber: string | null;
  status: SmsLogStatus;
  matchedRegistrationId: string | null;
  receivedAt: string;
}

/**
 * One line of the attendance sheet: enough to identify a participant and the bit
 * the desk exists to set.
 *
 * `createdAt` is on the row but printed nowhere — it is the key `orderFor` sorts
 * and pages by, so a cache that lacks it cannot reproduce the server's page.
 */
export interface AttendanceRow {
  id: string;
  /** `<GENDER><CLASS><NNN>` — what the participant was told, and what the desk reads. */
  registrationCode: string;
  name: string;
  classLabel: string;
  /** The stored bit: marked present at the desk, or not. */
  attendance: boolean;
  createdAt: string;
}

// ── Cached rows ──────────────────────────────────────────────────────────────

export interface StemfestSnapshotRow extends StemfestRow {
  /** Compared, never rendered — see the module header. */
  raw: { class: string };
}

export interface SmsSnapshotRow extends SmsLogRow {
  /** The `status` column as stored, before it was narrowed to one of three options. */
  raw: { status: string };
}

export interface AttendanceSnapshotRow extends AttendanceRow {
  /**
   * Compared, never rendered — see the module header. `school` is on the sweep the
   * search box makes and the value the school filter checks, and the sheet prints
   * neither; a cache without it would answer a search differently to Postgres.
   */
  raw: { class: string; school: string };
}

/** The one builder both the server render and the cache use — they cannot disagree. */
export function toStemfestSnapshotRow(row: StemfestAdminRow): StemfestSnapshotRow {
  return {
    id: row.id,
    registrationCode: row.registrationCode,
    name: row.name,
    classLabel: getStemfestClassLabel(row.class) || row.class,
    school: row.school,
    segments: row.segments,
    reference: row.reference,
    totalFee: row.totalFee,
    transactionId: row.transactionId,
    paymentNumber: row.paymentNumber,
    email: row.email,
    // Resolved in SQL by `stemfestEffectivePaymentStatus`, so the pill, the filter,
    // the stat cards and the printed report cannot disagree about this row.
    status: row.status,
    decision: row.decision,
    decidedAt: toIsoOrNull(row.decidedAt),
    decidedBy: row.decidedBy,
    emailSentAt: toIsoOrNull(row.emailSentAt),
    amount: row.amount,
    createdAt: toIso(row.createdAt),
    raw: { class: row.class },
  };
}

export function toSmsSnapshotRow(row: SmsLogDbRow): SmsSnapshotRow {
  return {
    id: row.id,
    sender: row.sender,
    rawMessage: row.rawMessage,
    transactionId: row.transactionId,
    amount: row.amount,
    senderNumber: row.senderNumber,
    // A free `text` column, so it is narrowed before it reaches a `<select>`, whose
    // value must be one of its options. A value this build does not know reads as
    // Unmatched — the row it would have matched nothing — and SQL still compares the
    // stored text, which `raw` keeps.
    status: statusValue(smsLogStatusOptions, row.status, "unmatched"),
    matchedRegistrationId: row.matchedRegistrationId,
    receivedAt: toIso(row.receivedAt),
    raw: { status: row.status },
  };
}

/**
 * The one builder both the sheet's server render and its cached copy use, so the
 * page the Server Component painted and the list the browser answers from are the
 * same rows by construction rather than two mappings that happen to agree.
 */
export function toAttendanceSnapshotRow(
  row: StemfestAttendanceRow,
): AttendanceSnapshotRow {
  return {
    id: row.id,
    registrationCode: row.registrationCode,
    name: row.name,
    classLabel: getStemfestClassLabel(row.class) || row.class,
    attendance: row.attendance,
    createdAt: toIso(row.createdAt),
    raw: { class: row.class, school: row.school },
  };
}

// ── Cached payloads ──────────────────────────────────────────────────────────

/**
 * The three figures a freshness probe answers with, and the cursors a delta reads.
 *
 * None of the three tables has an `updated_at`, so `cursor` — the newest
 * `created_at` — detects *appends*: a registration filed during the fest, an SMS the
 * webhook just stored. `decidedCursor` covers the edits that must not be missed: an
 * admin's payment decision or a confirmation sent on the registrations table, and on
 * the sheet the moment the attendance switch last moved, either way. An SMS row
 * edited by hand has no timestamp at all and is only caught by a manual refresh.
 */
export interface SnapshotProbe {
  count: number;
  cursor: string | null;
  decidedCursor: string | null;
}

export interface StemfestSnapshot {
  v: number;
  source: "stemfest";
  /**
   * The admin whose session produced this copy.
   *
   * A fest laptop is shared, and the cache is one browser's storage: without this a
   * second admin signing in on the same machine would read the first one's list
   * before their own download landed. A mismatch is dropped on read, not shown.
   */
  admin: string;
  generatedAt: string;
  cursor: string | null;
  decidedCursor: string | null;
  count: number;
  /** `true` when the table outran the row ceiling and this is the newest slice. */
  truncated: boolean;
  /** The section's stat cards as SQL computed them, for the whole table. */
  stats: StemfestStats;
  rows: StemfestSnapshotRow[];
}

/** The SMS log's three status tallies, over the whole log. */
export interface SmsTallies {
  matched: number;
  unmatched: number;
  ignored: number;
}

export interface SmsSnapshot {
  v: number;
  source: "sms";
  admin: string;
  generatedAt: string;
  cursor: string | null;
  decidedCursor: string | null;
  count: number;
  truncated: boolean;
  /** Whole-log tallies, deliberately not narrowed by whatever the table is showing. */
  tallies: SmsTallies;
  rows: SmsSnapshotRow[];
}

export type CachedSnapshot =
  | StemfestSnapshot
  | SmsSnapshot
  | AttendanceSnapshot;

/** The two figures above the sheet: how many are marked, out of how many there are. */
export interface AttendanceTally {
  present: number;
  total: number;
}

export interface AttendanceSnapshot {
  v: number;
  source: "attendance";
  admin: string;
  generatedAt: string;
  cursor: string | null;
  decidedCursor: string | null;
  count: number;
  truncated: boolean;
  /** Whole-table figures, not narrowed by whatever the sheet is showing. */
  tally: AttendanceTally;
  rows: AttendanceSnapshotRow[];
}

/**
 * What arrived since a cursor: the new rows, oldest first, and where the table now
 * stands. The figures are left out on purpose — a cached panel recomputes them from
 * its own rows, because it has to anyway the moment an admin changes a status.
 *
 * `truncated` means more than `SNAPSHOT_DELTA_LIMIT` rows arrived, so patching the
 * cache would mean guessing what came in between: the caller refetches the whole
 * list instead.
 */
export interface SnapshotDelta<TRow> {
  generatedAt: string;
  probe: SnapshotProbe;
  truncated: boolean;
  rows: TRow[];
}

/** The three sources that keep a browser cache. The other tables always query. */
export const SNAPSHOT_SOURCES = ["stemfest", "sms", "attendance"] as const;

export type SnapshotSource = (typeof SNAPSHOT_SOURCES)[number];

export function isSnapshotSource(value: string): value is SnapshotSource {
  return (SNAPSHOT_SOURCES as readonly string[]).includes(value);
}

/** Where one source's snapshot is fetched from — full, probe or delta. */
export function snapshotUrl(source: SnapshotSource): string {
  return `/api/admin/snapshot/${source}`;
}
