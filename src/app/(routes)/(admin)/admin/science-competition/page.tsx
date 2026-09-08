import { CalendarDays, Trophy, Wallet } from "lucide-react";
import {
  getStemfestStats,
  searchStemfestRegistrations,
} from "@/lib/actions/registrations";
import {
  describeEntry,
  formatBdt,
  getStemfestClassLabel,
} from "@/lib/data/stemfest-registration";
import ScienceCompetitionTable from "./science-competition-table";

export default async function ScienceCompetitionAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);

  const [{ rows, total, totalPages }, stats] = await Promise.all([
    searchStemfestRegistrations(q, pageNum),
    getStemfestStats(),
  ]);

  const registrations = rows.map((row) => ({
    id: row.id,
    name: row.name,
    classLabel: getStemfestClassLabel(row.class),
    phone: row.phone,
    bkashNumber: row.bkashNumber,
    bkashTrxId: row.bkashTrxId,
    entries: row.entries.map((entry) => ({
      label: describeEntry(entry),
      teammates: entry.teammates,
    })),
    totalFee: row.totalFee,
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
      label: "This Week",
      value: String(stats.thisWeek),
      icon: CalendarDays,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Expected via bKash",
      value: formatBdt(stats.expectedRevenue),
      icon: Wallet,
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

      <div className="grid gap-5 sm:grid-cols-3">
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
