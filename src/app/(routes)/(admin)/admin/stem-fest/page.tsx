import { getAllStemFestRegistrations } from "@/lib/actions/registrations";
import StemFestRegistrationsTable from "./stem-fest-registrations-table";

export default async function StemFestAdminPage() {
  const rows = await getAllStemFestRegistrations();

  const registrations = rows.map((row) => ({
    id: row.id,
    name: row.name,
    class: row.class,
    school: row.school,
    segments: row.segments,
    transactionId: row.transactionId,
    paymentNumber: row.paymentNumber,
    createdAt: new Date(row.createdAt).toISOString(),
  }));

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <p className="mb-2 font-mono text-[0.6rem] font-medium uppercase tracking-[0.28em] text-ion">
          Form Responses
        </p>
        <h1 className="font-voyage text-3xl font-bold uppercase tracking-tight text-space-ivory">
          STEM Fest
        </h1>
        <p className="mt-2 font-space-body text-sm text-space-muted">
          All {registrations.length} {registrations.length === 1 ? "registration" : "registrations"} from the STEM Fest registration form.
        </p>
      </div>
      <StemFestRegistrationsTable registrations={registrations} />
    </div>
  );
}
