import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  MessageSquareText,
  Radio,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import SmsStatCards from "@/components/admin/sms-stat-cards";
import {
  SmsHeaderStatus,
  SmsListDescription,
  SmsListProvider,
} from "@/components/admin/sms-list";
import { getSmsLogs } from "@/lib/actions/registrations";
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
import { formatCount, unwrap } from "@/lib/admin/source-status";
import { toSmsSnapshotRow } from "@/lib/admin/snapshot";
import {
  parseAdminQuery,
  smsSource,
  type RawSearchParams,
} from "@/lib/admin/filters";
import SmsLogTable from "./sms-log-table";

/**
 * The forwarded-payment SMS log.
 *
 * The query is the page's only source of truth for both the list and the three tallies,
 * so when it fails the whole section degrades together: the figures read as missing
 * rather than as zero, and the table is replaced by a sentence rather than by an empty
 * list that would look like a quiet morning.
 *
 * A log that did come back is wrapped in the provider that lets the browser answer a
 * search from a copy of itself — see ADR-0044.
 */
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

  return (
    <div
      style={adminAccentStyle(SECTION_ACCENT.smsLogs)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      {logs ? (
        <SmsListProvider
          source={source}
          state={state}
          // The same builder the snapshot route uses, so what the browser caches and
          // what the server renders are the same rows by construction.
          messages={logs.rows.map(toSmsSnapshotRow)}
          total={logs.total}
          page={logs.page}
          totalPages={logs.totalPages}
          tallies={{
            matched: logs.matchedCount,
            unmatched: logs.unmatchedCount,
            ignored: logs.ignoredCount,
          }}
        >
          <PageHeader
            eyebrow="Payment reconciliation"
            title={source.reportTitle}
            description={<SmsListDescription />}
            icon={Radio}
            action={<SmsHeaderStatus />}
          />

          <SmsStatCards />

          <SmsLogTable />
        </SmsListProvider>
      ) : (
        <>
          <PageHeader
            eyebrow="Payment reconciliation"
            title={source.reportTitle}
            description={source.reportNote}
            icon={Radio}
          />

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-admin-line border-t-2 border-t-admin-accent bg-admin-line lg:grid-cols-4">
            {[
              { label: "Matched", icon: BadgeCheck },
              { label: "Unmatched", icon: Clock },
              { label: "Ignored", icon: Trash2 },
              { label: "Total messages", icon: MessageSquareText },
            ].map((card) => (
              <div key={card.label} className="bg-admin-surface p-5">
                <dt className="flex items-center gap-2 font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-accent-ink uppercase">
                  <card.icon className="size-3.5 shrink-0" aria-hidden="true" />
                  {card.label}
                </dt>
                <dd className="mt-2.5 font-space-body text-2xl leading-none font-medium text-admin-ink tabular-nums">
                  {formatCount(undefined)}
                </dd>
              </div>
            ))}
          </dl>

          <p
            role="alert"
            className="flex items-start gap-3 rounded-[10px] border border-admin-line bg-admin-warn-bg p-4 font-space-body text-sm text-admin-warn-ink"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            The SMS log could not be read just now. The figures above are missing
            rather than zero, and the failure has been reported.
          </p>
        </>
      )}
    </div>
  );
}
