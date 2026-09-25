"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  Mail,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  resendStemfestPaymentEmail,
  setStemfestContactEmail,
  setStemfestPaymentStatus,
} from "@/lib/actions/registrations";
import {
  activeFilterCount,
  emptyStateLabel,
  type AdminQueryState,
  type AdminSourceConfig,
} from "@/lib/admin/filters";
import {
  stemfestPaymentStatusOptions,
  statusOption,
  type AdminStatusActionResult,
  type StemfestPaymentStatus,
} from "@/lib/admin/statuses";
import {
  CURRENCY_SYMBOL,
  formatBdt,
} from "@/lib/data/stemfest-registration";
import { useAdminFilters } from "@/lib/hooks/use-admin-filters";
import { cn } from "@/lib/utils";
import AdminEmptyState from "@/components/admin/admin-empty-state";
import FilterBar from "@/components/admin/filter-bar";
import Pagination from "@/components/admin/pagination";

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

/** A pill's icon, chosen per status rather than by colour. */
const STATUS_ICONS: Record<StemfestPaymentStatus, typeof Clock> = {
  pending: Clock,
  verified: BadgeCheck,
  rejected: XCircle,
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** A missing value, drawn as an em dash so an absent field is never a zero. */
function Absent() {
  return <span className="text-ink/35">—</span>;
}

/**
 * Shows a status action's answer, and keeps a genuine fault from vanishing.
 *
 * The actions answer with a sentence for anything the admin can act on (a missing
 * email, a row that has gone), so reaching the `catch` means the database or the
 * session broke — which React would otherwise swallow into an unexplained failed
 * transition. Nothing here is logged to the console: the action has already
 * reported the detail server-side.
 */
async function runAction(
  action: () => Promise<AdminStatusActionResult>,
): Promise<void> {
  try {
    const result = await action();
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  } catch {
    toast.error("That change could not be saved. Refresh the page and try again.");
  }
}

const COLUMNS = [
  "ID",
  "Name",
  "Class",
  "School",
  "Segments",
  "Payment No.",
  "TrxID",
  // What the club asked for, beside the status it got. The amount a forwarded SMS
  // reported lives in the expanded row, next to this one, so the two can be read
  // against each other without leaving the page.
  "Amount",
  "Status",
  "Submitted",
];

interface ScienceCompetitionTableProps {
  source: AdminSourceConfig;
  state: AdminQueryState;
  registrations: StemfestRow[];
  total: number;
  page: number;
  totalPages: number;
}

export default function ScienceCompetitionTable({
  source,
  state,
  registrations,
  total,
  page,
  totalPages,
}: ScienceCompetitionTableProps) {
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
        {registrations.length === 0 ? (
          <AdminEmptyState
            icon={Trophy}
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
                {registrations.map((row) => {
                  const expanded = expandedId === row.id;
                  return (
                    <RegistrationRow
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

function RegistrationRow({
  row,
  expanded,
  onToggle,
}: {
  row: StemfestRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const fields = [
    { label: "Registration ID", value: row.registrationCode },
    { label: "Full Name", value: row.name },
    { label: "Class", value: row.classLabel },
    { label: "School / College", value: row.school },
    // Who the club credits for this registration. Null covers both "nobody" and
    // "filed before the question existed", so it renders as an em dash.
    { label: "Reference", value: row.reference },
    { label: "Segments / Events", value: row.segments },
    {
      label: "Amount to send",
      value: row.totalFee === null ? null : formatBdt(row.totalFee),
    },
    { label: "Payment Number", value: row.paymentNumber },
    { label: "Transaction ID", value: row.transactionId },
    { label: "Amount forwarded", value: forwardedAmount(row.amount) },
    { label: "How this status was reached", value: decisionNote(row) },
    { label: "Decided", value: formatMoment(row.decidedAt) },
    { label: "Decided by", value: row.decidedBy },
    {
      label: "Confirmation sent",
      value: formatMoment(row.emailSentAt),
    },
    { label: "Submitted", value: formatMoment(row.createdAt) },
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
        <td className="px-4 py-4 font-mono text-sm font-medium text-ink">
          {row.registrationCode}
        </td>
        <td className="px-4 py-4 font-body font-medium text-ink">{row.name}</td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.classLabel}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.school}
        </td>
        <td className="max-w-xs truncate px-4 py-4 font-body text-sm text-ink/60">
          {row.segments}
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {row.paymentNumber}
        </td>
        <td className="px-4 py-4 font-mono text-sm font-medium text-ink">
          {row.transactionId}
        </td>
        <td className="px-4 py-4 font-body text-sm font-medium text-ink tabular-nums">
          {row.totalFee === null ? <Absent /> : formatBdt(row.totalFee)}
        </td>
        <td className="px-4 py-4">
          <PaymentStatusCell row={row} />
        </td>
        <td className="px-4 py-4 font-body text-sm text-ink/60">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-cream/60">
          <td />
          <td colSpan={10} className="px-4 pt-1 pb-6">
            <section className="mt-4">
              <h3 className="mb-3 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
                Registration Details
              </h3>
              <dl className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.label}
                    className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className="font-body text-sm text-ink/50">
                      {field.label}
                    </dt>
                    <dd className="max-w-3xl font-body text-sm leading-relaxed break-words text-ink/80">
                      {field.value ?? <Absent />}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <ConfirmationSettings row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

/** A moment as the admin reads it, or `null` for \"never happened\". */
function formatMoment(value: string | null): string | null {
  return value ? dateTimeFormatter.format(new Date(value)) : null;
}

/**
 * The amount a forwarded SMS reported, printed the same way as the amount the
 * club asked for — the two sit beside each other in the expanded row, so `৳1,500`
 * next to `৳1500.00` would read as two different quantities.
 *
 * Falls back to the raw text for a value that isn't a number, rather than putting
 * `৳NaN` in front of an admin.
 */
function forwardedAmount(amount: string | null): string | null {
  if (!amount) return null;
  const value = Number(amount);
  // `numeric` arrives as text, so the unparseable branch is the driver's shape
  // changing rather than anything an admin did — show what was stored.
  return Number.isFinite(value)
    ? formatBdt(value)
    : `${CURRENCY_SYMBOL}${amount}`;
}

/**
 * What the status shown rests on — the question an admin actually asks when a
 * payment reads Verified and nobody remembers approving it.
 */
function decisionNote(row: StemfestRow): string {
  if (row.decision === null) {
    return row.status === "verified"
      ? "Verified from the forwarded SMS log: a matched bKash message carries this TrxID. No admin decision on record yet."
      : "Read from the forwarded SMS log: nothing there carries this TrxID. No admin decision on record yet.";
  }

  const label =
    statusOption(stemfestPaymentStatusOptions, row.decision)?.label ??
    row.decision;

  return `Recorded by an admin as ${label}. An admin decision outranks the SMS log, so a late or re-read message cannot change it.`;
}

/**
 * The status pill, and the picker that sets it.
 *
 * The picker shows the **effective** status, because that is what the row is: a
 * payment the forwarded SMS verified reads Verified before any admin has touched it.
 * Choosing a value records an admin decision on top, which from then on outranks the
 * log — including a deliberate Pending. A status that came from the log therefore
 * still needs the confirmation sent by hand, which is why that button sits with the
 * address rather than here.
 */
function PaymentStatusCell({ row }: { row: StemfestRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const option = statusOption(stemfestPaymentStatusOptions, row.status);
  const Icon = STATUS_ICONS[row.status];

  function apply(next: string) {
    if (next === row.status) return;

    startTransition(() =>
      runAction(async () => {
        const result = await setStemfestPaymentStatus(row.id, next);
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

      <label className="sr-only" htmlFor={`payment-status-${row.id}`}>
        Payment status for {row.name}
      </label>
      <select
        id={`payment-status-${row.id}`}
        value={row.status}
        disabled={isPending}
        onChange={(event) => apply(event.target.value)}
        className={cn(
          "rounded-lg border border-manara-teal/15 bg-surface px-2 py-1 font-body text-xs text-ink/70 outline-none focus:border-manara-teal focus:ring-1 focus:ring-manara-teal/30",
          isPending && "cursor-not-allowed opacity-50",
        )}
      >
        {stemfestPaymentStatusOptions.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>
    </div>
  );
}


/** One line saying what the confirmation's state actually is, and why. */
function describeConfirmation(row: StemfestRow): string {
  if (row.status !== "verified") {
    return "A confirmation is only sent for a verified payment — mark this one Verified first.";
  }
  if (!row.email) {
    return "No address on file, so no receipt has been sent. Save one above and send it.";
  }
  return row.emailSentAt
    ? `Last sent ${dateTimeFormatter.format(new Date(row.emailSentAt))}.`
    : "Not sent yet. Nothing is emailed automatically — the button above is what sends the receipt.";
}

/**
 * Where the confirmation goes, and the button that sends it again.
 *
 * The address is editable because rows collected before the form asked for one have
 * none, and an address taken over the phone is wrong often enough to matter. The
 * resend exists because a first message bounces: an admin should not have to ask a
 * participant to register again to receive their receipt.
 */
function ConfirmationSettings({ row }: { row: StemfestRow }) {
  const router = useRouter();
  const [email, setEmail] = useState(row.email ?? "");
  const [isSaving, startSaving] = useTransition();
  const [isSending, startSending] = useTransition();
  const canSend = row.status === "verified";

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(() =>
      runAction(async () => {
        const result = await setStemfestContactEmail(row.id, email.trim());
        if (result.ok) router.refresh();
        return result;
      }),
    );
  }

  function resend() {
    startSending(() =>
      runAction(async () => {
        const result = await resendStemfestPaymentEmail(row.id);
        if (result.ok) router.refresh();
        return result;
      }),
    );
  }

  return (
    <section
      className="mt-6 border-t border-ink/5 pt-5"
      // Typing here or pressing a button must not collapse the row.
      onClick={(event) => event.stopPropagation()}
    >
      <h3 className="mb-3 flex items-center gap-2 font-body text-xs font-semibold tracking-wider text-ink/40 uppercase">
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        Payment confirmation
      </h3>

      <form onSubmit={save} className="flex flex-wrap items-end gap-2">
        <div className="flex w-72 max-w-full flex-col gap-1">
          <label
            htmlFor={`payment-email-${row.id}`}
            className="font-body text-sm text-ink/50"
          >
            Contact email
          </label>
          <input
            id={`payment-email-${row.id}`}
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="participant@example.com"
            autoComplete="off"
            spellCheck={false}
            disabled={isSaving}
            className={cn(
              "rounded-lg border border-manara-teal/15 bg-surface px-3 py-2 font-body text-sm text-ink outline-none placeholder:text-ink/30 focus:border-manara-teal focus:ring-1 focus:ring-manara-teal/30",
              isSaving && "cursor-not-allowed opacity-50",
            )}
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border border-manara-teal/15 bg-surface px-4 py-2 font-body text-sm font-semibold text-ink/70 transition-colors hover:bg-cream/60 focus-visible:ring-2 focus-visible:ring-manara-teal/40 focus-visible:outline-none",
            isSaving && "cursor-not-allowed opacity-50",
          )}
        >
          Save address
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={isSending || !canSend}
          title={canSend ? undefined : "Only a verified payment has a confirmation to send."}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-manara-teal px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-manara-teal/90 focus-visible:ring-2 focus-visible:ring-manara-teal/40 focus-visible:outline-none",
            (isSending || !canSend) && "cursor-not-allowed opacity-50",
          )}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {isSending ? "Sending…" : "Send confirmation"}
        </button>
      </form>

      <p className="mt-2 font-body text-xs text-ink/45">
        {describeConfirmation(row)}
      </p>
    </section>
  );
}

