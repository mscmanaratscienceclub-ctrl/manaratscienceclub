import { BadgeCheck, CalendarDays, School, Trophy } from "lucide-react";
import {
  getStemfestStats,
  searchStemfestRegistrations,
} from "@/lib/actions/registrations";
import { getStemfestClassLabel } from "@/lib/data/stemfest-registration";
import ScienceCompetitionTable from "./science-competition-table";

export default async function ScienceCompetitionAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);

  const [{ rows, verifiedTrxIds, total, totalPages }, stats] = await Promise.all([
    searchStemfestRegistrations(q, pageNum),
    getStemfestStats(),
  ]);

  const verifiedSet = new Set(verifiedTrxIds.map((id) => id.toUpperCase()));

  const registrations = rows.map((row) => ({
    id: row.id,
    name: row.name,
    classLabel: getStemfestClassLabel(row.class) || row.class,
    school: row.school,
    segments: row.segments,
    transactionId: row.transactionId,
    paymentNumber: row.paymentNumber,
    isVerified: verifiedSet.has(row.transactionId.toUpperCase()),
    createdAt: new Date(row.createdAt).toISOString(),
  }));

  const statCards = [
    {
      label: "Registrations",
      value: String(stats.total),
      icon: Trophy,
      color: "text-manara-teal",
      bg: "bg-manara-teal/10",
    },
    {
      label: "Verified Payments",
      value: String(stats.verifiedCount),
      icon: BadgeCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "This Week",
      value: String(stats.thisWeek),
      icon: CalendarDays,
      color: "text-manara-yellow",
      bg: "bg-manara-yellow/15",
    },
    {
      label: "Unique Schools",
      value: String(stats.uniqueSchools),
      icon: School,
      color: "text-manara-purple",
      bg: "bg-manara-purple/10",
    },
  ];

  const trimmed = q.trim();

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">
          STEM Fest Registrations
        </h1>
        <p className="mt-1 font-body text-ink/60">
          {trimmed
            ? `${registrations.length} of ${total} ${total === 1 ? "registration" : "registrations"} match “${trimmed}”.`
            : `All ${total} ${total === 1 ? "registration" : "registrations"} from the STEM Fest event form at /stemfestreg.`}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-subtle"
          >
            <div className={`rounded-xl ${stat.bg} p-3`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                {stat.value}
              </p>
              <p className="font-body text-sm text-ink/60">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <ScienceCompetitionTable
        registrations={registrations}
        query={q}
        total={total}
        page={pageNum}
        totalPages={totalPages}
      />
    </div>
  );
}
