import { searchAmbassadorRegistrations } from "@/lib/actions/registrations";
import RegistrationsTable from "./registrations-table";

export default async function CampusAmbassadorAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
  const { rows, total, totalPages } = await searchAmbassadorRegistrations(q, pageNum);

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

  const trimmed = q.trim();

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Ambassador Registrations</h1>
        <p className="mt-1 font-body text-ink/60">
          {trimmed
            ? `${registrations.length} of ${total} ${total === 1 ? "response" : "responses"} match “${trimmed}”.`
            : `All ${total} ${total === 1 ? "response" : "responses"} from the Campus and Batch Ambassador forms.`}
        </p>
      </div>
      <RegistrationsTable
        registrations={registrations}
        query={q}
        total={total}
        page={pageNum}
        totalPages={totalPages}
      />
    </div>
  );
}
