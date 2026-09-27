import { GraduationCap } from "lucide-react";

import PageHeader from "@/components/admin/page-header";
import { searchAmbassadorRegistrations } from "@/lib/actions/registrations";
import {
  ambassadorSource,
  describeList,
  parseAdminQuery,
  type RawSearchParams,
} from "@/lib/admin/filters";
import RegistrationsTable from "./registrations-table";

export default async function CampusAmbassadorAdminPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const source = ambassadorSource;
  // Validated against the source's own filter catalogue, so the table, its filter
  // bar and the report route all work from one state object.
  const state = parseAdminQuery(source, await searchParams);
  const { rows, total, totalPages, page } =
    await searchAmbassadorRegistrations(state);

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
      <PageHeader
        eyebrow="Form responses"
        title={source.reportTitle}
        description={describeList(source, state, registrations.length, total)}
        icon={GraduationCap}
      />
      <RegistrationsTable
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
