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
  return <span className="text-ink/35">—</span>;
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
          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
          option?.tone ?? "bg-slate-100 text-slate-600",
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
          "rounded-lg border border-manara-teal/15 bg-surface px-2 py-1 font-body text-xs text-ink/70 outline-none focus:border-manara-teal focus:ring-1 focus:ring-manara-teal/30",
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
    sourceId: source.id,
    basePath: source.path,
    state,
  });
  const filtering = activeFilterCount(source, state) > 0;

  return (
    <div className="rounded-2xl bg-surface shadow-subtle">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/5 text-left">
                  <th className="w-8 px-3 py-3" aria-label="Expand" />
                  {COLUMNS.map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
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
        onClick={onToggle}
        className={cn(
          "cursor-pointer transition-colors",
          expanded ? "bg-cream/60" : "hover:bg-cream/40",
        )}
      >
        <td className="px-3 py-4">
          <ChevronDown
            className={cn(
              "h-4 w-4 text-ink/40 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/70">
          <span className="block whitespace-nowrap">
            {dateTimeFormatter.format(new Date(row.receivedAt))}
          </span>
          <span className="block text-xs text-ink/40">
            {timeFormatter.format(new Date(row.receivedAt))}
          </span>
        </td>
        <td className="px-4 py-4 font-body text-sm font-medium text-ink">
          {row.sender}
        </td>
        <td className="px-4 py-4 font-mono text-sm text-ink/70">
          {row.transactionId ?? <Absent />}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.amount ? <>৳{row.amount}</> : <Absent />}
        </td>
        <td className="px-4 py-4 font-mono text-sm text-ink/60">
          {row.senderNumber ?? <Absent />}
        </td>
        <td className="px-4 py-4">
          <SmsStatusCell row={row} />
        </td>
        <td className="max-w-xs truncate px-4 py-4 font-body text-sm text-ink/60">
          {row.rawMessage}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={7} className="px-4 pt-1 pb-6">
            <section className="mt-4">
              <h3 className="mb-3 flex items-center gap-2 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Full Message
              </h3>
              <dl className="space-y-3">
                <div className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-body text-sm text-ink/50">Raw SMS</dt>
                  <dd className="max-w-3xl font-mono text-sm leading-relaxed break-words text-ink/80">
                    {row.rawMessage}
                  </dd>
                </div>
                {details.map((field) => (
                  <div
                    key={field.label}
                    className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className="font-body text-sm text-ink/50">
                      {field.label}
                    </dt>
                    <dd className="font-mono text-sm text-ink/80">
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
