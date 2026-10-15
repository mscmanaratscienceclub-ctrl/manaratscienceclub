/**
 * What an admin write looks like before the server has agreed to it.
 *
 * The fest-day tables answer from a browser cache, so a write cannot simply be
 * "call the action, then re-read the page": on a bad connection the re-read is the
 * slow part, and on a dead one it never comes. Instead the cached row is patched the
 * instant the picker changes, the action is fired in the background and retried with
 * backoff, and the row carries a badge saying which of those states it is in.
 *
 * This module is the pure half — the patch, the key, the schedule, the copy. It has no
 * React and no network so `pendingKey`, `nextDelayMs` and the patch rules can be read
 * and reasoned about on their own, and so the hook that drives them
 * (`src/lib/hooks/use-optimistic-action.ts`) stays about state rather than arithmetic.
 *
 * ## One key per visible field
 *
 * `key` is `source:rowId:field`, so choosing Verified and then Rejected on the same row
 * *replaces* the queued write rather than queueing two. Two writes to one field cannot
 * be ordered by anything the browser knows: only the server could say which landed
 * last, and by then the second one is what the admin is looking at.
 *
 * ## The one write that must not be replayed
 *
 * `setStemfestPaymentStatus`, `setStemfestContactEmail` and `setSmsLogStatus` are
 * idempotent — the actions early-return "already the decision on record" — so a tab
 * closed with a queued write can replay it on next open and the database ends up the
 * same either way. `resendStemfestPaymentEmail` is not: it sends an email. `onceOnly`
 * says so, and the driver refuses to fire it again after a reload, because a participant
 * receiving the same receipt three times is worse than an admin pressing the button
 * twice.
 */

import type {
  AttendanceRow,
  SmsSnapshotRow,
  StemfestRow,
} from "@/lib/admin/snapshot";
import {
  attendanceOption,
  type SmsLogStatus,
  type StemfestPaymentStatus,
} from "@/lib/admin/statuses";
import type { SnapshotSource } from "@/lib/admin/snapshot";

/** What a write changes, and what a badge hangs on. */
export type PendingField = "status" | "email" | "emailSentAt" | "attendance";

/** The five actions these tables fire. */
export type PendingAction =
  | "setStemfestPaymentStatus"
  | "setStemfestContactEmail"
  | "resendStemfestPaymentEmail"
  | "setStemfestAttendance"
  | "setSmsLogStatus";

/** `queued` waiting its turn · `in-flight` sent · `failed` sent and refused or lost · `saved` confirmed. */
export type WriteState = "queued" | "in-flight" | "failed" | "saved";

/**
 * A field overlay, as a plain object rather than a row type.
 *
 * `useSnapshotCache.patchRow` accepts a `Partial` of whichever row the table holds, and
 * a plan cannot name both row types. The values are the ones those fields actually
 * hold — a status, an ISO timestamp, an email, `null`, or the SMS row's `raw` block —
 * so the widening is a convenience of typing, not a place where anything unchecked can
 * enter.
 */
export type FieldPatchValue =
  | string
  | boolean
  | null
  | { status: string };

export type FieldPatch = Record<string, FieldPatchValue>;

export interface PendingWrite {
  key: string;
  source: SnapshotSource;
  rowId: string;
  field: PendingField;
  action: PendingAction;
  /** `[rowId, value]`, exactly as the server action is called with it. */
  args: [string, string];
  label: string;
  /** Overlaid the moment the admin chooses, before anything is sent. */
  patch: FieldPatch;
  /** The same fields as they were in the download, to go back to if the server refuses. */
  revert: FieldPatch;
  /** Overlaid only once the action answers `ok` — the mail-sending write's whole patch. */
  successPatch?: FieldPatch;
  /** `true` for the action that emails: never replayed after a reload. */
  onceOnly: boolean;
  createdAt: number;
  attempts: number;
  state: WriteState;
}

/** What a plan decided, before it knows the row it belongs to. */
export interface WritePlan {
  field: PendingField;
  patch: FieldPatch;
  revert: FieldPatch;
  label: string;
  successPatch?: FieldPatch;
  onceOnly: boolean;
}

export function pendingKey(source: SnapshotSource, rowId: string, field: PendingField): string {
  return `${source}:${rowId}:${field}`;
}

/**
 * A patch's previous value, read from the cached row rather than from the server.
 *
 * The cached row already reflects the download's truth, so rolling back to it is
 * rolling back to the last value the server was known to hold.
 */
function current(row: object, fields: readonly string[]): FieldPatch {
  const values: FieldPatch = {};
  for (const field of fields) {
    const value = (row as Record<string, unknown>)[field];
    values[field] = (value as FieldPatchValue) ?? null;
  }
  return values;
}

/** An admin's payment decision, which outranks the forwarded-SMS log from then on. */
export function planStemfestStatus(
  row: StemfestRow,
  next: StemfestPaymentStatus,
  admin: string,
  now: string,
): WritePlan {
  // A decision always outranks the log, including a deliberate `pending`
  // (`src/db/queries/stemfest-payment.ts`), so `status` becomes the decision verbatim
  // while the row's SMS-derived reading is left alone to be reconciled by a refresh.
  return {
    field: "status",
    patch: { status: next, decision: next, decidedAt: now, decidedBy: admin },
    revert: current(row, ["status", "decision", "decidedAt", "decidedBy"]),
    label: `Payment status → ${next}`,
    onceOnly: false,
  };
}

/**
 * The desk's tick, in either direction.
 *
 * The only overlay in the panel that writes a boolean, which is what `FieldPatchValue`
 * allows one for. `attendance` is idempotent at the server — a replay of "present" on a
 * row already present changes the cursor and nothing else — so it replays freely, which
 * is the property a queue of marks made at a gate on bad wifi needs.
 */
export function planStemfestAttendance(
  row: AttendanceRow,
  next: boolean,
): WritePlan {
  return {
    field: "attendance",
    patch: { attendance: next },
    revert: current(row, ["attendance"]),
    label: `Attendance → ${attendanceOption(next).label}`,
    onceOnly: false,
  };
}

/** The participant's contact address. Empty clears it, which is what the server does. */
export function planStemfestEmail(row: StemfestRow, value: string): WritePlan {
  const email = value === "" ? null : value;
  return {
    field: "email",
    patch: { email },
    revert: current(row, ["email"]),
    label: email ? "Contact email saved" : "Contact email cleared",
    onceOnly: false,
  };
}

/**
 * Send the confirmation again.
 *
 * Nothing is overlaid up front: `emailSentAt` is a fact about a message that has not
 * gone out yet, and printing it before the post is what would make an admin believe a
 * receipt reached a participant who never got one. It arrives as `successPatch` the
 * moment the action says it did.
 */
export function planStemfestResend(row: StemfestRow, now: string): WritePlan {
  return {
    field: "emailSentAt",
    patch: {},
    revert: current(row, ["emailSentAt"]),
    successPatch: { emailSentAt: now },
    label: "Confirmation sent",
    onceOnly: true,
  };
}

/**
 * Correct a forwarded message's reconciliation status.
 *
 * Both the narrowed value the `<select>` holds and the stored text are patched: SQL
 * compares the column, and a local `status` filter that read the narrowed one would
 * disagree with the server's row set.
 *
 * The registration link is cleared for anything but `matched`, which is what the action
 * does — an `ignored` or `unmatched` message holds no link. It cannot be *set* from
 * here: the registration a newly-matched message belongs to lives in the other table,
 * which is not on screen, so that one field waits for the next refresh rather than
 * being guessed at. The badge says saving until the server has answered.
 */
export function planSmsStatus(row: SmsSnapshotRow, next: SmsLogStatus): WritePlan {
  return {
    field: "status",
    patch: {
      status: next,
      raw: { ...row.raw, status: next },
      matchedRegistrationId: next === "matched" ? row.matchedRegistrationId : null,
    },
    revert: {
      status: row.status,
      raw: row.raw,
      matchedRegistrationId: row.matchedRegistrationId,
    },
    label: `Message status → ${next}`,
    onceOnly: false,
  };
}

/**
 * How long to wait before attempt *n*.
 *
 * Five steps from one second to one minute: enough to ride out a wifi blip and a
 * pooler timeout, few enough that an admin is not left watching a badge that will
 * never clear. The last step repeats for as long as the write is held, which the
 * fifteen-minute rule below cuts off.
 */
const BACKOFF_MS = [1_000, 4_000, 12_000, 30_000, 60_000] as const;

export const MAX_ATTEMPTS = BACKOFF_MS.length;

/** A patch that has gone this long unacknowledged is not "saving" any more. */
const GIVE_UP_AFTER_MS = 15 * 60 * 1000;

/**
 * The wait before the next attempt, jittered ±20 %.
 *
 * Jittered because two desks at the venue will both lose the connection at the same
 * moment and both come back at the same moment; two requests landing on the pooler
 * together after that are a self-inflicted version of the problem this feature solves.
 */
export function nextDelayMs(attempts: number, random: () => number = Math.random): number {
  const step = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)] ?? 60_000;
  return Math.round(step * (0.8 + random() * 0.4));
}

/** Whether a write has been held so long that only a human should finish it. */
export function isStale(write: PendingWrite, now: number): boolean {
  return now - write.createdAt > GIVE_UP_AFTER_MS;
}

/** Whether an unacknowledged write may be fired again on its own. */
export function isReplayable(write: PendingWrite): boolean {
  return !write.onceOnly;
}

/** The badge an admin reads beside the pill. */
export function describeWrite(write: PendingWrite): string | null {
  switch (write.state) {
    case "queued":
    case "in-flight":
      return "Saving…";
    case "saved":
      return "Saved";
    case "failed":
      return isStale(write, Date.now())
        ? "Not saved · retry manually"
        : `Not saved · retrying ${write.attempts}/${MAX_ATTEMPTS}`;
    default:
      return null;
  }
}
