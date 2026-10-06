import { AlertTriangle, BadgeCheck, Clock, MessageSquareText, Radio, Trash2 } from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import { getSmsLogs } from "@/lib/actions/registrations";
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
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
    },
    {
      label: "Unmatched",
      value: formatCount(logs?.unmatchedCount),
      icon: Clock,
    },
    {
      label: "Ignored",
      value: formatCount(logs?.ignoredCount),
      icon: Trash2,
    },
    {
      label: "Total messages",
      value: formatCount(
        logs
          ? logs.matchedCount + logs.unmatchedCount + logs.ignoredCount
          : undefined,
      ),
      icon: MessageSquareText,
    },
  ];

  return (
    <div
      style={adminAccentStyle(SECTION_ACCENT.smsLogs)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <PageHeader
        eyebrow="Payment reconciliation"
        title={source.reportTitle}
        description={
          logs
            ? describeList(source, state, logs.rows.length, logs.total)
            : source.reportNote
        }
        icon={Radio}
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-admin-line border-t-2 border-t-admin-accent bg-admin-line lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-admin-surface p-5">
            <dt className="flex items-center gap-2 font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-accent-ink uppercase">
              <stat.icon className="size-3.5 shrink-0" aria-hidden="true" />
              {stat.label}
            </dt>
            <dd className="mt-2.5 font-space-body text-2xl leading-none font-medium text-admin-ink tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

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
          className="flex items-start gap-3 rounded-[10px] border border-admin-line bg-admin-warn-bg p-4 font-space-body text-sm text-admin-warn-ink"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          The SMS log could not be read just now. The figures above are missing
          rather than zero, and the failure has been reported.
        </p>
      )}
    </div>
  );
}
