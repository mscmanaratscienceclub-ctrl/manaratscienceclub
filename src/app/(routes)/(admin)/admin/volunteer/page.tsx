import { searchVolunteerRegistrations } from "@/lib/actions/registrations";
import VolunteerRegistrationsTable from "./volunteer-registrations-table";

export default async function VolunteerAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const { rows, total, totalPages } = await searchVolunteerRegistrations(q, pageNum);

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

  const trimmed = q.trim();

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Volunteer Registrations</h1>
        <p className="mt-1 font-body text-ink/60">
          {trimmed
            ? `${registrations.length} of ${total} ${total === 1 ? "application" : "applications"} match “${trimmed}”.`
            : `All ${total} ${total === 1 ? "application" : "applications"} from the STEM Fest volunteer form.`}
        </p>
      </div>
      <VolunteerRegistrationsTable
        registrations={registrations}
        query={q}
        total={total}
        page={pageNum}
        totalPages={totalPages}
      />
    </div>
  );
}
