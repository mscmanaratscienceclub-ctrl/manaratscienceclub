"use client";

import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  Clock,
  Mail,
  Send,
  Trophy,
  XCircle,
} from "lucide-react";

import { useAdminEmail } from "@/components/admin/admin-identity";
import AdminEmptyState from "@/components/admin/admin-empty-state";
import FilterBar from "@/components/admin/filter-bar";
import Pagination from "@/components/admin/pagination";
import PendingBadge from "@/components/admin/pending-badge";
import SessionExpiredNotice from "@/components/admin/session-expired-notice";
import {
  adminButton,
  adminButtonPrimary,
  adminControl,
  adminDetailLabel,
  adminDetailValue,
  adminLabel,
  adminPanel,
  adminTableScroller,
  adminTag,
  adminTh,
} from "@/components/admin/styles";
import { activeFilterCount, emptyStateLabel } from "@/lib/admin/filters";
import {
  planStemfestEmail,
  planStemfestResend,
  planStemfestStatus,
} from "@/lib/admin/pending-writes";
import type { StemfestRow } from "@/lib/admin/snapshot";
import {
  isStemfestPaymentStatus,
  stemfestPaymentStatusOptions,
  statusOption,
  type StemfestPaymentStatus,
} from "@/lib/admin/statuses";
import { CURRENCY_SYMBOL, formatBdt } from "@/lib/data/stemfest-registration";
import { useStemfestList } from "@/components/admin/stemfest-list";
import { cn } from "@/lib/utils";
import { adminRowDisclosure } from "@/components/admin/row-disclosure";

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
  return <span className="text-admin-muted">—</span>;
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
  "Verify email",
  "Submitted",
];

/**
 * The registrations table.
 *
 * It takes no props. The list it shows is answered either by the Server Component's
 * page or by this browser's cached copy of the whole table, and only the provider above
 * it knows which — so everything here, down to the empty-state sentence and the page
 * number, reads that one state rather than a set of props that could be describing the
 * list from before the last filter was picked.
 */
export default function ScienceCompetitionTable() {
  const { source, state, registrations, total, page, totalPages, controls, cache, writes } =
    useStemfestList();
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
          {registrations.length === 0 ? (
            <AdminEmptyState
              icon={Trophy}
              label={emptyStateLabel(source, state)}
              onClearAll={filtering ? controls.clearAll : undefined}
            />
          ) : (
            <div className={adminTableScroller}>
              {/* Twelve columns: `min-w` is what makes the container above scroll at
                  all, since a `w-full` table shrinks rather than overflowing. */}
              <table className="w-full min-w-[78rem]">
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
    </>
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
  const admin = useAdminEmail();
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
    { label: "How this status was reached", value: decisionNote(row, admin) },
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
        <td className="px-4 py-4 font-mono text-sm font-medium text-admin-ink">
          {row.registrationCode}
        </td>
        <td className="px-4 py-4 font-space-body text-base font-medium text-admin-ink">{row.name}</td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.classLabel}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.school}
        </td>
        <td className="max-w-xs truncate px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.segments}
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {row.paymentNumber}
        </td>
        <td className="px-4 py-4 font-mono text-sm font-medium text-admin-ink">
          {row.transactionId}
        </td>
        <td className="px-4 py-4 font-space-body text-sm font-medium text-admin-ink tabular-nums">
          {row.totalFee === null ? <Absent /> : formatBdt(row.totalFee)}
        </td>
        <td className="px-4 py-4">
          <PaymentStatusCell row={row} />
        </td>
        <td className="px-4 py-4">
          <VerifyEmailCell row={row} />
        </td>
        <td className="px-4 py-4 font-space-body text-sm text-admin-ink-soft">
          {dateFormatter.format(new Date(row.createdAt))}
        </td>
      </tr>

      {expanded && (
        <tr id={`${row.id}-detail`} className="bg-admin-accent-soft/60">
          <td />
          <td colSpan={11} className="px-4 pt-1 pb-6">
            <section className="mt-4">
              <h3 className={cn(adminLabel, "mb-3")}>
                Registration Details
              </h3>
              <dl className="space-y-3">
                {fields.map((field) => (
                  <div
                    key={field.label}
                    className="grid gap-1 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className={adminDetailLabel}>
                      {field.label}
                    </dt>
                    <dd className={adminDetailValue}>
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

/** A moment as the admin reads it, or `null` for "never happened". */
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
 *
 * Naming who decided matters on a fest day more than usual: two desks work the same
 * list, and a status that flips under one of them without a name beside it reads as
 * the other desk losing their change.
 */
function decisionNote(row: StemfestRow, admin: string | null): string {
  if (row.decision === null) {
    return row.status === "verified"
      ? "Verified from the forwarded SMS log: a matched bKash message carries this TrxID. No admin decision on record yet."
      : "Read from the forwarded SMS log: nothing there carries this TrxID. No admin decision on record yet.";
  }

  const label =
    statusOption(stemfestPaymentStatusOptions, row.decision)?.label ??
    row.decision;

  if (row.decidedBy && admin && row.decidedBy !== admin) {
    return `Recorded as ${label} by ${row.decidedBy}. An admin decision outranks the SMS log, so a late or re-read message cannot change it.`;
  }

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
 *
 * The write is optimistic: the pill changes with the click, and the badge beside it
 * says whether the server has agreed yet. The picker stays enabled through it, because
 * an admin who changes their mind mid-fest is normal and a second choice simply
 * replaces the first in the queue.
 */
function PaymentStatusCell({ row }: { row: StemfestRow }) {
  const { writes } = useStemfestList();
  const admin = useAdminEmail();
  const option = statusOption(stemfestPaymentStatusOptions, row.status);
  const Icon = STATUS_ICONS[row.status];

  function apply(next: string) {
    if (!isStemfestPaymentStatus(next) || next === row.status) return;

    writes.run({
      rowId: row.id,
      action: "setStemfestPaymentStatus",
      args: [row.id, next],
      plan: planStemfestStatus(row, next, admin ?? "", new Date().toISOString()),
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

      <label className="sr-only" htmlFor={`payment-status-${row.id}`}>
        Payment status for {row.name}
      </label>
      <select
        id={`payment-status-${row.id}`}
        value={row.status}
        onChange={(event) => apply(event.target.value)}
        className={cn(adminControl, "w-auto px-2 py-1 text-xs")}
      >
        {stemfestPaymentStatusOptions.map((entry) => (
          <option key={entry.value} value={entry.value}>
            {entry.label}
          </option>
        ))}
      </select>

      <PendingBadge write={writes.writeFor(row.id, "status")} onRetry={writes.retryNow} />
    </div>
  );
}

/**
 * Whether the participant's verification (payment confirmation) email has gone out.
 *
 * Reading a whole table of who has and has not received their receipt used to mean
 * expanding every row and looking at the "Confirmation sent" line; this cell puts the
 * answer on the row itself so an admin can scan the column at a glance. It shows an
 * em dash (not "not sent") when the email cannot go out yet because the payment is
 * not verified or no address is on file — a missing capability is never a failure.
 */
function VerifyEmailCell({ row }: { row: StemfestRow }) {
  // The receipt only ever goes to a verified payment with an address on file.
  if (row.status !== "verified" || !row.email) {
    return (
      <span className={cn(adminTag, "bg-admin-neutral-bg text-admin-muted")}>
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        N/A
      </span>
    );
  }

  const sent = row.emailSentAt !== null;

  return sent ? (
    <span
      title={`Sent ${dateTimeFormatter.format(new Date(row.emailSentAt!))}`}
      className={cn(adminTag, "cursor-help bg-admin-positive-bg text-admin-positive-ink")}
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Sent
    </span>
  ) : (
    <span
      title="Payment verified but no receipt sent yet — open the row and press Send confirmation."
      className={cn(adminTag, "cursor-help bg-admin-warn-bg text-admin-warn-ink")}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
      Not sent
    </span>
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
 *
 * The address is optimistic like the status. The *sending* is not: nothing is claimed
 * about a receipt until the server says it went out, and after a reload the queued
 * send waits for a second click rather than mailing again by itself.
 */
function ConfirmationSettings({ row }: { row: StemfestRow }) {
  const { writes } = useStemfestList();
  const [email, setEmail] = useState(row.email ?? "");
  const canSend = row.status === "verified";

  // The draft follows the row when the row moves under it — a save that the server
  // refused rolls the value back, and the field should show that rather than keep
  // showing the address it was told to save.
  useEffect(() => {
    setEmail(row.email ?? "");
  }, [row.email]);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    if (value === (row.email ?? "")) return;

    writes.run({
      rowId: row.id,
      action: "setStemfestContactEmail",
      args: [row.id, value],
      plan: planStemfestEmail(row, value),
    });
  }

  function resend() {
    writes.run({
      rowId: row.id,
      action: "resendStemfestPaymentEmail",
      args: [row.id, ""],
      plan: planStemfestResend(row, new Date().toISOString()),
    });
  }

  return (
    <section
      className="mt-6 border-t border-admin-line pt-5"
      // Typing here or pressing a button must not collapse the row.
      onClick={(event) => event.stopPropagation()}
    >
      <h3 className={cn(adminLabel, "mb-3 flex items-center gap-2")}>
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
        Payment confirmation
      </h3>

      <form onSubmit={save} className="flex flex-wrap items-end gap-2">
        <div className="flex w-72 max-w-full flex-col gap-1">
          <label
            htmlFor={`payment-email-${row.id}`}
            className="font-space-body text-sm text-admin-muted"
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
            className={adminControl}
          />
          <PendingBadge write={writes.writeFor(row.id, "email")} onRetry={writes.retryNow} />
        </div>

        <button type="submit" className={adminButton}>
          Save address
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={!canSend}
          title={
            canSend
              ? "Sends the receipt again. A change that is not saved yet waits for you to press this twice."
              : "Only a verified payment has a confirmation to send."
          }
          className={cn(
            adminButtonPrimary,
            !canSend && "cursor-not-allowed opacity-50",
          )}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          Send confirmation
        </button>

        <PendingBadge
          write={writes.writeFor(row.id, "emailSentAt")}
          onRetry={writes.retryNow}
        />
      </form>

      <p className="mt-2 font-space-body text-xs text-admin-muted">
        {describeConfirmation(row)}
      </p>
    </section>
  );
}
