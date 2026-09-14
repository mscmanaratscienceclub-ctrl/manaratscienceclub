import { searchVolunteerRegistrations } from "@/lib/actions/registrations";
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
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">
          {source.reportTitle}
        </h1>
        <p className="mt-1 font-body text-ink/60">
          {describeList(source, state, registrations.length, total)}
        </p>
      </div>
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
