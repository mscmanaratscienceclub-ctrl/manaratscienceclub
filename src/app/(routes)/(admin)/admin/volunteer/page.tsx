import { HandHeart } from "lucide-react";

import PageHeader from "@/components/admin/page-header";
import { searchVolunteerRegistrations } from "@/lib/actions/registrations";
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
import {
  describeList,
  parseAdminQuery,
  volunteerSource,
  type RawSearchParams,
} from "@/lib/admin/filters";
import VolunteerRegistrationsTable from "./volunteer-registrations-table";

export default async function VolunteerAdminPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const source = volunteerSource;
  const state = parseAdminQuery(source, await searchParams);
  const { rows, total, totalPages, page } =
    await searchVolunteerRegistrations(state);

  const registrations = rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    classSection: row.classSection,
    roll: row.roll,
    shift: row.shift,
    studentCode: row.studentCode,
    address: row.address,
    personalPhone: row.personalPhone,
    parentsPhone: row.parentsPhone,
    attendanceWeek: row.attendanceWeek,
    parentsComfort: row.parentsComfort,
    campusHesitation: row.campusHesitation,
    scenarioTaskConflict: row.scenarioTaskConflict,
    scenarioPeerConduct: row.scenarioPeerConduct,
    selectionReason: row.selectionReason,
    createdAt: new Date(row.createdAt).toISOString(),
  }));

  return (
    <div
      style={adminAccentStyle(SECTION_ACCENT.volunteer)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <PageHeader
        eyebrow="Form responses"
        title={source.reportTitle}
        description={describeList(source, state, registrations.length, total)}
        icon={HandHeart}
      />
      <VolunteerRegistrationsTable
        source={source}
        state={state}
        registrations={registrations}
        total={total}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
