import { getAllAmbassadorRegistrations } from "@/lib/actions/registrations";
import RegistrationsTable from "./registrations-table";

export default async function CampusAmbassadorAdminPage() {
  const rows = await getAllAmbassadorRegistrations();

  const registrations = rows.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    class: row.class,
    school: row.school,
    gender: row.gender ?? null,
    facebook: row.facebook ?? null,
    instagram: row.instagram ?? null,
    experience: row.experience,
    firstTimeCa: row.firstTimeCa,
    createdAt: new Date(row.createdAt).toISOString(),
  }));

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Ambassador Registrations</h1>
        <p className="mt-1 font-body text-ink/60">
          All {registrations.length} {registrations.length === 1 ? "response" : "responses"} from the Campus and Batch Ambassador forms.
        </p>
      </div>
      <RegistrationsTable registrations={registrations} />
    </div>
  );
}
