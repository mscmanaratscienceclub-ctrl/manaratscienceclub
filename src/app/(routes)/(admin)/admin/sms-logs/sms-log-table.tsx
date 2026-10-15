"use client";

import { useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  Mail,
  MessageSquareText,
  Trash2,
} from "lucide-react";

import AdminEmptyState from "@/components/admin/admin-empty-state";
import FilterBar from "@/components/admin/filter-bar";
import Pagination from "@/components/admin/pagination";
import PendingBadge from "@/components/admin/pending-badge";
import SessionExpiredNotice from "@/components/admin/session-expired-notice";
import {
  adminControl,
  adminDetailLabel,
  adminLabel,
  adminPanel,
  adminTableScroller,
  adminTag,
  adminTh,
} from "@/components/admin/styles";
import { activeFilterCount, emptyStateLabel } from "@/lib/admin/filters";
import { planSmsStatus } from "@/lib/admin/pending-writes";
import type { SmsSnapshotRow } from "@/lib/admin/snapshot";
import {
  isSmsLogStatus,
  smsLogStatusOptions,
  statusOption,
  type SmsLogStatus,
} from "@/lib/admin/statuses";
import { useSmsList } from "@/components/admin/sms-list";
import { cn } from "@/lib/utils";
import { adminRowDisclosure } from "@/components/admin/row-disclosure";

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/** A missing value, drawn as an em dash so an absent field is never a zero. */
function Absent() {
  return <span className="text-admin-muted">—</span>;
}

/** A pill's icon, chosen per status rather than by colour. */
const STATUS_ICONS: Record<SmsLogStatus, typeof Clock> = {
  matched: BadgeCheck,
  unmatched: Clock,
  ignored: Trash2,
};

const COLUMNS = [
  "Received",
  "Sender",
  "TrxID",
  "Amount",
  "Sender number",
  "Status",
  "Message",
];

/**
 * The forwarded-payment SMS log.
 *
 * Like the registrations table, it takes no props: the list, the pagination and the
 * empty-state sentence all read the one controller the provider above them owns, which
 * is what keeps a search answered from this browser from being described by the server's
 * row count.
 */
export default function SmsLogTable() {
  const { source, state, messages, total, page, totalPages, controls, cache, writes } =
    useSmsList();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filtering = activeFilterCount(source, state) > 0;

  return (
    <>
      {/* Outside the panel rather than inside it: the strip is about the session, not
          about this list's own chrome, and the page's flex gap spaces it correctly. */}
      {cache.signedOut && <SessionExpiredNotice unsaved={writes.unsaved.length} />}

      <div className={adminPanel}>
        <FilterBar source={source} state={state} controls={controls} />

        <div
          className={cn(
            "transition-opacity",
            controls.isPending && "pointer-events-none opacity-50",
          )}
        >
          {messages.length === 0 ? (
            <AdminEmptyState
              icon={MessageSquareText}
              label={emptyStateLabel(source, state)}
              onClearAll={filtering ? controls.clearAll : undefined}
            />
          ) : (
            <div className={adminTableScroller}>
              {/* `min-w` is what makes the container above scroll at all: a
                  `w-full` table shrinks to fit instead of overflowing. */}
              <table className="w-full min-w-[64rem]">
                <thead>
                  <tr className="border-b border-admin-line text-left">
                    <th className="w-8 bg-admin-accent-soft px-3 py-3" aria-label="Expand" />
                    {COLUMNS.map((label) => (
                      <th
                        key={label}
                        className={adminTh}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-line">
                  {messages.map((row) => {
                    const expanded = expandedId === row.id;
                    return (
                      <LogRow
                        key={row.id}
                        row={row}
                        expanded={expanded}
                        onToggle={() => setExpandedId(expanded ? null : row.id)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPage={controls.goToPage}
          />
        )}
      </div>
    </>
  );
}

function LogRow({
  row,
  expanded,
  onToggle,
}: {
  row: SmsSnapshotRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const details: { label: string; value: string | null }[] = [
    { label: "Transaction ID", value: row.transactionId },
    { label: "Amount", value: row.amount },
    { label: "Sender Number", value: row.senderNumber },
    { label: "Matched Registration", value: row.matchedRegistrationId },
  ];

  return (
    <>
      <tr
        {...adminRowDisclosure({
          expanded,
          onToggle,
          detailId: `${row.id}-detail`,
        })}
      >
        <td className="px-3 py-4">
          <ChevronDown
            className={cn(
              "size-4 text-admin-muted transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          <span className="block whitespace-nowrap">
            {dateTimeFormatter.format(new Date(row.receivedAt))}
          </span>
          <span className="block text-xs text-admin-muted">
            {timeFormatter.format(new Date(row.receivedAt))}
          </span>
        </td>
        <td className="px-4 py-4 font-space-body text-sm font-medium text-admin-ink">
          {row.sender}
        </td>
        <td className="px-4 py-4 font-mono text-sm text-admin-ink-soft">
          {row.transactionId ?? <Absent />}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.amount ? <>৳{row.amount}</> : <Absent />}
        </td>
        <td className="px-4 py-4 font-mono text-sm text-admin-ink-soft">
          {row.senderNumber ?? <Absent />}
        </td>
        <td className="px-4 py-4">
          <SmsStatusCell row={row} />
        </td>
        <td className="max-w-xs truncate px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.rawMessage}
        </td>
      </tr>

      {expanded && (
        <tr id={`${row.id}-detail`} className="bg-admin-accent-soft/60">
          <td />
          <td colSpan={7} className="px-4 pt-1 pb-6">
            <section className="mt-4">
              <h3 className={cn(adminLabel, "mb-3 flex items-center gap-2")}>
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Full Message
              </h3>
              <dl className="space-y-3">
                <div className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6">
                  <dt className={adminDetailLabel}>Raw SMS</dt>
                  <dd className="max-w-3xl font-mono text-sm leading-relaxed break-words text-admin-ink-soft">
                    {row.rawMessage}
                  </dd>
                </div>
                {details.map((field) => (
                  <div
                    key={field.label}
                    className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className={adminDetailLabel}>{field.label}</dt>
                    <dd className="font-mono text-sm text-admin-ink-soft">
                      {field.value ?? <Absent />}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * The reconciliation status of a forwarded message, and the picker that corrects it.
 *
 * Editing this is how an admin fixes the matcher: a message that arrived before its
 * registration, or a mistyped TrxID. Only `matched` keeps a link to a registration —
 * marking a message `ignored` or `unmatched` unlinks it, which un-verifies any
 * registration whose only evidence that message was. The toast says so rather than
 * leaving the admin to notice it in another table.
 *
 * That cross-table effect is why an confirmed change here drops the registrations
 * table's cached copy: the two lists are never on screen at once, so the honest answer
 * is to re-download the one that depends on this one rather than to leave it looking
 * right and reading stale.
 */
function SmsStatusCell({ row }: { row: SmsSnapshotRow }) {
  const { writes } = useSmsList();
  const option = statusOption(smsLogStatusOptions, row.status);
  const Icon = STATUS_ICONS[row.status];

  function apply(next: string) {
    if (!isSmsLogStatus(next) || next === row.status) return;
    writes.run({
      rowId: row.id,
      action: "setSmsLogStatus",
      args: [row.id, next],
      plan: planSmsStatus(row, next),
    });
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      // The row itself expands on click; a control inside it must not.
      onClick={(event) => event.stopPropagation()}
    >
      <span
        title={option?.description}
        className={cn(
          adminTag,
          option?.tone ?? "bg-admin-neutral-bg text-admin-neutral-ink",
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {option?.label ?? row.status}
      </span>

      <label className="sr-only" htmlFor={`sms-status-${row.id}`}>
        Status of the message from {row.sender}
      </label>
      <select
        id={`sms-status-${row.id}`}
        value={row.status}
        onChange={(event) => apply(event.target.value)}
        className={cn(adminControl, "w-auto px-2 py-1 text-xs")}
      >
        {smsLogStatusOptions.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>

      <PendingBadge write={writes.writeFor(row.id, "status")} onRetry={writes.retryNow} />
    </div>
  );
}
