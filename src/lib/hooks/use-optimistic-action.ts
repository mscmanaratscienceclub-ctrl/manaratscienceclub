"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useAdminEmail } from "@/components/admin/admin-identity";
import {
  resendStemfestPaymentEmail,
  setSmsLogStatus,
  setStemfestAttendance,
  setStemfestContactEmail,
  setStemfestPaymentStatus,
} from "@/lib/actions/registrations";
import { deleteRecord, putRecord, readRecords } from "@/lib/admin/idb";
import {
  MAX_ATTEMPTS,
  isReplayable,
  isStale,
  nextDelayMs,
  pendingKey,
  type PendingAction,
  type PendingField,
  type PendingWrite,
  type WritePlan,
} from "@/lib/admin/pending-writes";
import type { SnapshotSource } from "@/lib/admin/snapshot";
import type { AdminStatusActionResult } from "@/lib/admin/statuses";

/**
 * Firing an admin write in the background, and telling the truth about it.
 *
 * The row is patched the moment the picker changes — that is what makes a fest desk
 * feel instant — and this hook owns everything after: the queue, the retries, the
 * badge, and the roll-back when the server refuses.
 *
 * ## What retries and what does not
 *
 * Only a *network-level* failure retries. A 200 with `ok: false` is a refusal — the row
 * is no longer there, there is no address on file — and re-sending it would only be
 * refused again, so the patch is rolled back and the server's own sentence is shown.
 * Retrying a refusal is how a badge ends up lying about a change nobody made.
 *
 * ## `onceOnly`, and why the mail write is kept apart
 *
 * A queued decision is idempotent: the actions early-return "already the decision on
 * record", so replaying one after a reload is harmless. `resendStemfestPaymentEmail`
 * sends an email, so it is never replayed on its own — after a reload it reads "Not
 * saved · retry manually" and waits for a second click. A participant who receives the
 * same receipt three times is the worse outcome.
 *
 * ## Why it sits above the rows
 *
 * A write must outlive whatever page it was made on: an admin who changes a status on
 * page three and then paginates away must still see it resolve. So the queue lives in
 * the table's provider, keyed by row rather than held by it.
 */

/** The five actions, addressed by name, so a queued write survives a reload. */
function dispatch(
  action: PendingAction,
  args: readonly [string, string],
): Promise<AdminStatusActionResult> {
  switch (action) {
    case "setStemfestPaymentStatus":
      return setStemfestPaymentStatus(args[0], args[1]);
    case "setStemfestContactEmail":
      return setStemfestContactEmail(args[0], args[1]);
    case "resendStemfestPaymentEmail":
      return resendStemfestPaymentEmail(args[0]);
    case "setStemfestAttendance":
      return setStemfestAttendance(args[0], args[1]);
    case "setSmsLogStatus":
      return setSmsLogStatus(args[0], args[1]);
    default:
      return Promise.reject(new Error(`Unknown admin write "${action}".`));
  }
}

export interface OptimisticWrites {
  /** The outstanding write for one row's field, or `null` when there is none. */
  writeFor: (rowId: string, field: PendingField) => PendingWrite | null;
  /** Writes not yet confirmed — what the "2 changes not saved" pill counts. */
  unsaved: PendingWrite[];
  /** Overlay `plan`, queue it, and start sending it. */
  run: (args: {
    rowId: string;
    action: PendingAction;
    args: [string, string];
    plan: WritePlan;
  }) => void;
  /** Send one now, ignoring its backoff — what "retry manually" does. */
  retryNow: (key: string) => void;
}

export function useOptimisticWrites<TRow extends { id: string }>({
  source,
  patchRow,
}: {
  source: SnapshotSource;
  patchRow: (rowId: string, patch: Partial<TRow>) => void;
}): OptimisticWrites {
  const [writes, setWrites] = useState<Record<string, PendingWrite>>({});

  // `null` means this is not a signed-in admin session — the design-preview route
  // renders these same tables against fixture rows. There the picker still visibly
  // works, because that is what a preview is for, but nothing is queued, filed or
  // sent: a preview must never replay a real write or rehydrate a real queue.
  const admin = useAdminEmail();
  const enabled = admin !== null;

  // Both read through refs, so one in-flight response can be checked against the queue
  // as it is *now* rather than as it was when the request left.
  const writesRef = useRef(writes);
  writesRef.current = writes;

  const timers = useRef(new Map<string, number>());

  const patch = useCallback(
    (rowId: string, values: Partial<TRow>) => patchRow(rowId, values),
    [patchRow],
  );

  const schedule = useCallback((key: string, delay: number, run: () => void) => {
    const existing = timers.current.get(key);
    if (existing !== undefined) window.clearTimeout(existing);
    timers.current.set(
      key,
      window.setTimeout(() => {
        timers.current.delete(key);
        run();
      }, delay),
    );
  }, []);

  /**
   * Change one write in place, if it is still the one the queue holds.
   *
   * `sent` is the write this response belongs to. A write replaced while its request
   * was in flight — the admin picked a different status a second later — must not be
   * answered into the replacement's state, and one that has already been dropped must
   * not come back.
   */
  const settle = useCallback((sent: PendingWrite, changes: Partial<PendingWrite>) => {
    setWrites((current) => {
      const write = current[sent.key];
      if (!write || write.createdAt !== sent.createdAt) return current;
      return { ...current, [write.key]: { ...write, ...changes } };
    });
  }, []);

  const forget = useCallback(
    (key: string) => {
      const existing = timers.current.get(key);
      if (existing !== undefined) window.clearTimeout(existing);
      timers.current.delete(key);
      void deleteRecord("pending", key);
      setWrites((current) => {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [],
  );

  /** Held in a ref so a timer, an `online` event and a rehydration all call the current version. */
  const attemptRef = useRef<(write: PendingWrite) => void>(() => {});

  attemptRef.current = (write: PendingWrite) => {
    if (!enabled) {
      forget(write.key);
      return;
    }

    if (!navigator.onLine) {
      // Offline is not a failure. The row stays patched, the badge stays "Saving…",
      // and the `online` listener below is what picks the queue up again.
      settle(write, { state: "queued" });
      return;
    }

    settle(write, { state: "in-flight", attempts: write.attempts + 1 });

    dispatch(write.action, write.args).then(
      (result) => {
        // Still ours to answer? A replaced write has moved on and will settle itself.
        const held = writesRef.current[write.key];
        if (!held || held.createdAt !== write.createdAt) return;

        if (!result.ok) {
          // A refusal: roll back to the last value the server was known to hold, say
          // what it said, and release the queue. The row is right; nothing is pending.
          patch(write.rowId, write.revert as Partial<TRow>);
          toast.error(result.message);
          forget(write.key);
          return;
        }

        if (write.successPatch) patch(write.rowId, write.successPatch as Partial<TRow>);
        toast.success(result.message);
        settle(write, { state: "saved" });

        // A message's status is the one thing in this table that changes the *other*
        // one's answer: marking a matched message `ignored` un-verifies the registration
        // that was verified from it. The two lists are never on screen together, so the
        // row over there is not patched — its cached copy is dropped instead, and the
        // next visit re-downloads one that the handoff guard can check against fresh
        // server rows. Leaving it would have made the guard fail on a cache that was
        // merely out of date.
        if (write.source === "sms" && write.field === "status") {
          void deleteRecord("snapshots", "stemfest");
        }

        // "Saved" is worth two seconds beside the pill the admin just changed; after
        // that the row needs no badge, because the value on it *is* the server's.
        schedule(write.key, 2_000, () => forget(write.key));
      },
      () => {
        const held = writesRef.current[write.key];
        if (!held || held.createdAt !== write.createdAt) return;

        const attempts = write.attempts + 1;

        if (!isReplayable(write) || attempts >= MAX_ATTEMPTS || isStale(write, Date.now())) {
          // Out of retries, out of patience, or it emails. The patch stands — the admin
          // made the call and may still be reachable — but it says so plainly.
          settle(write, { state: "failed", attempts });
          return;
        }

        settle(write, { state: "queued", attempts });
        schedule(held.key, nextDelayMs(attempts), () => {
          const current = writesRef.current[held.key];
          if (current) attemptRef.current(current);
        });
      },
    );
  };

  const run = useCallback<OptimisticWrites["run"]>(
    ({ rowId, action, args, plan }) => {
      const write: PendingWrite = {
        key: pendingKey(source, rowId, plan.field),
        source,
        rowId,
        field: plan.field,
        action,
        args,
        label: plan.label,
        patch: plan.patch,
        revert: plan.revert,
        successPatch: plan.successPatch,
        onceOnly: plan.onceOnly,
        createdAt: Date.now(),
        attempts: 0,
        state: "queued",
      };

      // Patch, queue, file — in that order. An admin who sees "Saving…" without the new
      // value, or the new value without it, has been shown neither.
      patch(rowId, plan.patch as Partial<TRow>);
      if (!enabled) return;

      setWrites((current) => ({ ...current, [write.key]: write }));
      void putRecord("pending", write, write.key);
      schedule(write.key, 0, () => attemptRef.current(write));
    },
    [enabled, patch, schedule, source],
  );

  const retryNow = useCallback(
    (key: string) => {
      const write = writesRef.current[key];
      if (!write) return;
      const fresh: PendingWrite = { ...write, attempts: 0, createdAt: Date.now() };
      setWrites((current) => ({ ...current, [key]: fresh }));
      void putRecord("pending", fresh, fresh.key);
      schedule(key, 0, () => attemptRef.current(fresh));
    },
    [schedule],
  );

  // Rehydrate once per mount. Writes are keyed by row, so a page change or a re-render
  // must not re-read the store and re-toast anything.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!enabled || hydrated.current) return;
    hydrated.current = true;

    void (async () => {
      const stored = (await readRecords<PendingWrite>("pending")).filter(
        (write) => write.source === source,
      );

      for (const write of stored) {
        const fresh: PendingWrite = { ...write, state: "queued" };
        patch(fresh.rowId, fresh.patch as Partial<TRow>);
        setWrites((current) => ({ ...current, [fresh.key]: fresh }));

        // It emails. So it does not fire on its own; it waits for a second click and
        // says that in the badge.
        if (!isReplayable(fresh)) settle(fresh, { state: "failed" });
        else attemptRef.current(fresh);
      }
    })();
  }, [enabled, source, patch, settle]);

  // A connection that comes back is an event worth acting on. Polling `navigator.onLine`
  // on a timer would spend the first second of it asleep.
  useEffect(() => {
    const flush = () => {
      for (const write of Object.values(writesRef.current)) {
        if (write.state === "in-flight" || write.state === "saved") continue;
        if (timers.current.has(write.key)) continue;
        if (!isReplayable(write) && write.attempts > 0) continue;
        attemptRef.current(write);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") flush();
    };

    window.addEventListener("online", flush);
    window.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("visibilitychange", onVisibility);
      for (const handle of timers.current.values()) window.clearTimeout(handle);
      timers.current.clear();
    };
  }, []);

  const list = useMemo(() => Object.values(writes), [writes]);

  const writeFor = useCallback(
    (rowId: string, field: PendingField) => writes[pendingKey(source, rowId, field)] ?? null,
    [source, writes],
  );

  return {
    writeFor,
    unsaved: list.filter((write) => write.state !== "saved"),
    run,
    retryNow,
  };
}
