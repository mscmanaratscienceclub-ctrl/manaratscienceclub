"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  Mail,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import { setSmsLogStatus } from "@/lib/actions/registrations";
import {
  smsLogStatusOptions,
  statusOption,
  type AdminStatusActionResult,
  type SmsLogStatus,
} from "@/lib/admin/statuses";
import {
  activeFilterCount,
  emptyStateLabel,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import { useAdminFilters } from "@/lib/hooks/use-admin-filters";
import { cn } from "@/lib/utils";
import AdminEmptyState from "@/components/admin/admin-empty-state";
import FilterBar from "@/components/admin/filter-bar";
import Pagination from "@/components/admin/pagination";
import {
  adminControl,
  adminDetailLabel,
  adminLabel,
  adminPanel,
  adminTableScroller,
  adminTag,
  adminTh,
} from "@/components/admin/styles";
import { adminRowDisclosure } from "@/components/admin/row-disclosure";

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

/**
 * Shows a status action's answer, and keeps a genuine fault from vanishing.
 *
 * The actions answer with a sentence for anything the admin can act on (a row that
 * has gone, an unknown value), so reaching the `catch` means the database or the
 * session broke — which React would otherwise swallow into an unexplained failed
 * transition.
 */
async function runAction(
  action: () => Promise<AdminStatusActionResult>,
): Promise<void> {
  try {
    const result = await action();
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  } catch {
    toast.error("That change could not be saved. Refresh the table and try again.");
  }
}

/**
 * The reconciliation status of a forwarded message, and the picker that corrects it.
 *
 * Editing this is how an admin fixes the matcher: a message that arrived before its
 * registration, or a mistyped TrxID. Only `matched` keeps a link to a registration —
 * marking a message `ignored` or `unmatched` unlinks it, which un-verifies any
 * registration whose only evidence that message was. The toast says so rather than
 * leaving the admin to notice it in another table.
 */
function SmsStatusCell({ row }: { row: SmsLogRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const option = statusOption(smsLogStatusOptions, row.status);
  const Icon = STATUS_ICONS[row.status];

  function apply(next: string) {
    if (next === row.status) return;

    startTransition(() =>
      runAction(async () => {
        const result = await setSmsLogStatus(row.id, next);
        if (result.ok) router.refresh();
        return result;
      }),
    );
  }

  return (
    <div
      className="flex items-center gap-2"
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
        disabled={isPending}
        onChange={(event) => apply(event.target.value)}
        className={cn(
          cn(adminControl, "w-auto px-2 py-1 text-xs"),
          isPending && "cursor-not-allowed opacity-50",
        )}
      >
        {smsLogStatusOptions.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const COLUMNS = [
  "Received",
  "Sender",
  "TrxID",
  "Amount",
  "Sender number",
  "Status",
  "Message",
];

interface SmsLogTableProps {
  source: AdminSourceConfig;
  state: AdminQueryState;
  rows: SmsLogRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function SmsLogTable({
  source,
  state,
  rows,
  total,
  page,
  totalPages,
}: SmsLogTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const controls = useAdminFilters({
    basePath: source.path,
    state,
  });
  const filtering = activeFilterCount(source, state) > 0;

  return (
    <div className={adminPanel}>
      <FilterBar source={source} state={state} controls={controls} />

      <div
        className={cn(
          "transition-opacity",
          controls.isPending && "pointer-events-none opacity-50",
        )}
      >
        {rows.length === 0 ? (
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
                {rows.map((row) => {
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
  );
}

function LogRow({
  row,
  expanded,
  onToggle,
}: {
  row: SmsLogRow;
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
