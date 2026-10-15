import { FlaskConical } from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import StemfestStatCards from "@/components/admin/stemfest-stat-cards";
import {
  StemfestHeaderStatus,
  StemfestListDescription,
  StemfestListProvider,
} from "@/components/admin/stemfest-list";
import { getStemfestStats, searchStemfestRegistrations } from "@/lib/actions/registrations";
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
import {
  parseAdminQuery,
  stemfestSource,
  type RawSearchParams,
} from "@/lib/admin/filters";
import { toStemfestSnapshotRow } from "@/lib/admin/snapshot";
import ScienceCompetitionTable from "./science-competition-table";

/**
 * The STEM Fest registrations table.
 *
 * It renders page one and the whole-table figures from the database, exactly as it
 * always has — so the first paint is correct with JavaScript switched off, and a cached
 * copy is something the page gains a moment later rather than depends on. The provider
 * around the three parts below it is what keeps them agreeing once the browser starts
 * answering on its own (`obsidian/meta/decisions-log.md`, ADR-0044).
 */
export default async function ScienceCompetitionAdminPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const source = stemfestSource;
  const state = parseAdminQuery(source, await searchParams);

  const [{ rows, total, totalPages, page }, stats] = await Promise.all([
    searchStemfestRegistrations(state),
    getStemfestStats(),
  ]);

  // The same builder the snapshot route uses, so what the browser caches and what
  // the server renders are the same rows by construction.
  const registrations = rows.map(toStemfestSnapshotRow);

  return (
    <div
      style={adminAccentStyle(SECTION_ACCENT.scienceCompetition)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <StemfestListProvider
        source={source}
        state={state}
        registrations={registrations}
        total={total}
        page={page}
        totalPages={totalPages}
        stats={stats}
      >
        <PageHeader
          eyebrow="Form responses"
          title={source.reportTitle}
          description={<StemfestListDescription />}
          icon={FlaskConical}
          action={<StemfestHeaderStatus />}
        />

        {/*
          One strip rather than seven cards: the figures answer one question —
          "how is this fest going" — and a single hairline-divided board reads as one
          answer, where seven floating boxes read as seven.
        */}
        <StemfestStatCards />

        <ScienceCompetitionTable />
      </StemfestListProvider>
    </div>
  );
}
