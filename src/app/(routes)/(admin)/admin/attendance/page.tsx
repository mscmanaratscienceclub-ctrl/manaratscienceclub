import { ClipboardCheck } from "lucide-react";

import PageHeader from "@/components/admin/page-header";
import {
  AttendanceHeaderStatus,
  AttendanceListDescription,
  AttendanceListProvider,
} from "@/components/admin/attendance-list";
import { searchAttendance } from "@/lib/actions/registrations";
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
import {
  attendanceSource,
  parseAdminQuery,
  type RawSearchParams,
} from "@/lib/admin/filters";
import { toAttendanceSnapshotRow } from "@/lib/admin/snapshot";
import AttendanceTable from "./attendance-table";

/**
 * The attendance sheet — the registrations table with four columns and a switch.
 *
 * It is a *second reading of the same rows*, not a second list: `/admin/attendance`
 * answers "is this person here" at the desk, and `/admin/science-competition` answers
 * everything else about them. That is why this page keeps the payment columns off it
 * and puts a link to the full row on every line.
 *
 * It renders page one and the two figures from the database, exactly as the panel
 * always has, so the first paint is right with JavaScript switched off. The provider
 * below is what lets the browser answer the next search, filter and page change on
 * its own — and, since the switch queues through it, keep marking names while the
 * connection is down. `obsidian/meta/decisions-log.md`, ADR-0044 and ADR-0045.
 *
 * The section wears the Science Competition's hue rather than a seventh one: the two
 * pages are the same roster seen from two angles, and the panel's hues are its brand
 * colours, all six of which are already spent.
 */
export default async function AttendanceAdminPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const source = attendanceSource;
  const state = parseAdminQuery(source, await searchParams);

  const { rows, total, tally, page, totalPages } = await searchAttendance(state);

  // The same builder the snapshot route uses, so what the browser caches and what
  // the server renders are the same rows by construction.
  const participants = rows.map(toAttendanceSnapshotRow);

  return (
    <div
      style={adminAccentStyle(SECTION_ACCENT.scienceCompetition)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <AttendanceListProvider
        source={source}
        state={state}
        participants={participants}
        total={total}
        page={page}
        totalPages={totalPages}
        tally={tally}
      >
        <PageHeader
          eyebrow="Form responses"
          title={source.reportTitle}
          description={<AttendanceListDescription />}
          icon={ClipboardCheck}
          action={<AttendanceHeaderStatus />}
        />

        <AttendanceTable />
      </AttendanceListProvider>
    </div>
  );
}
