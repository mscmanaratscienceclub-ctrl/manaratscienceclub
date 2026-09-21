import { AlertTriangle, BadgeCheck, Clock, MessageSquareText, Trash2 } from "lucide-react";
import { getSmsLogs } from "@/lib/actions/registrations";
import { smsLogStatusOptions, statusValue } from "@/lib/admin/statuses";
import { formatCount, unwrap } from "@/lib/admin/source-status";
import {
  describeList,
  parseAdminQuery,
  smsSource,
  type RawSearchParams,
} from "@/lib/admin/filters";
import SmsLogTable from "./sms-log-table";

export default async function SmsLogsAdminPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const source = smsSource;
  const state = parseAdminQuery(source, await searchParams);

  // Settled, not `all`: a failing SMS query must not blank the page, and a
  // genuinely unavailable log is reported rather than rendered as an empty one.
  const [logResult] = await Promise.allSettled([getSmsLogs(state)]);
  const logs = unwrap(logResult, "smsLogs");

  const statCards = [
    {
      label: "Matched",
      value: formatCount(logs?.matchedCount),
      icon: BadgeCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Unmatched",
      value: formatCount(logs?.unmatchedCount),
      icon: Clock,
      color: "text-manara-yellow",
      bg: "bg-manara-yellow/15",
    },
    {
      label: "Ignored",
      value: formatCount(logs?.ignoredCount),
      icon: Trash2,
      color: "text-ink/60",
      bg: "bg-ink/5",
    },
    {
      label: "Total messages",
      value: formatCount(
        logs
          ? logs.matchedCount + logs.unmatchedCount + logs.ignoredCount
          : undefined,
      ),
      icon: MessageSquareText,
      color: "text-manara-teal",
      bg: "bg-manara-teal/10",
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">
          {source.reportTitle}
        </h1>
        <p className="mt-1 font-body text-ink/60">
          {logs
            ? describeList(source, state, logs.rows.length, logs.total)
            : source.reportNote}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-subtle"
          >
            <div className={`rounded-xl ${stat.bg} p-3`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                {stat.value}
              </p>
              <p className="font-body text-sm text-ink/60">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {logs ? (
        <SmsLogTable
          source={source}
          state={state}
          rows={logs.rows.map((row) => ({
            id: row.id,
            sender: row.sender,
            rawMessage: row.rawMessage,
            transactionId: row.transactionId,
            amount: row.amount,
            senderNumber: row.senderNumber,
            // `status` is a free `text` column, so it is narrowed before it reaches
            // the `<select>`, whose value must be one of its options. A value this
            // build does not know reads as Unmatched — the row it would have matched
            // nothing — rather than rendering a blank control.
            status: statusValue(smsLogStatusOptions, row.status, "unmatched"),
            matchedRegistrationId: row.matchedRegistrationId,
            receivedAt: new Date(row.receivedAt).toISOString(),
          }))}
          total={logs.total}
          page={logs.page}
          totalPages={logs.totalPages}
        />
      ) : (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 font-body text-sm text-amber-900"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          The SMS log could not be read just now. The figures above are missing
          rather than zero, and the failure has been reported.
        </p>
      )}
    </div>
  );
}
