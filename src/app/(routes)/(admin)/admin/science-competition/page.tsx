import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Clock,
  School,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  getStemfestStats,
  searchStemfestRegistrations,
  type StemfestStats,
} from "@/lib/actions/registrations";
import {
  formatBdt,
  getStemfestClassLabel,
} from "@/lib/data/stemfest-registration";
import {
  describeList,
  parseAdminQuery,
  stemfestSource,
  type RawSearchParams,
} from "@/lib/admin/filters";
import ScienceCompetitionTable from "./science-competition-table";

/** Timestamps cross to the client as ISO strings, as `createdAt` already does. */
function toIso(value: Date | null): string | null {
  return value ? new Date(value).toISOString() : null;
}

/** A figure the panel could not obtain, drawn as an em dash rather than as zero. */
const UNAVAILABLE = "—";

/**
 * What the club asked every registration to send, added up.
 *
 * `null` is not zero and must not be shown as one: it means no row carries a
 * figure, because all of them were filed before `total_fee` existed. `৳0` there
 * would read as a fest that asked for no money at all.
 */
function toCollectLabel(stats: StemfestStats): string {
  if (stats.amountToCollect === null) {
    return stats.total === 0 ? formatBdt(0) : UNAVAILABLE;
  }
  const amount = Number(stats.amountToCollect);
  return Number.isFinite(amount) ? formatBdt(amount) : UNAVAILABLE;
}

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

  const registrations = rows.map((row) => ({
    id: row.id,
    registrationCode: row.registrationCode,
    name: row.name,
    classLabel: getStemfestClassLabel(row.class) || row.class,
    school: row.school,
    segments: row.segments,
    totalFee: row.totalFee,
    transactionId: row.transactionId,
    paymentNumber: row.paymentNumber,
    email: row.email,
    // Resolved in SQL by `stemfestEffectivePaymentStatus`, so the pill, the filter,
    // the stat cards and the printed report cannot disagree about this row.
    status: row.status,
    decision: row.decision,
    decidedAt: toIso(row.decidedAt),
    decidedBy: row.decidedBy,
    emailSentAt: toIso(row.emailSentAt),
    amount: row.amount,
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
    // Pending and Rejected are printed beside Verified because they are what an
    // admin works through: all three count the same effective status the pill and
    // the `payment` filter use, so a card can never contradict the table below it.
    // What the club asked for, summed over every row — the number `Collected` on the
    // dashboard answers, and the one a payment can be reconciled against.
    {
      label: "Amount to Collect",
      value: toCollectLabel(stats),
      icon: Banknote,
      color: "text-manara-teal",
      bg: "bg-manara-teal/10",
    },
    {
      label: "Pending Payments",
      value: String(stats.pendingCount),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Rejected Payments",
      value: String(stats.rejectedCount),
      icon: XCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
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

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-subtle"
          >
            <div className={`rounded-xl ${stat.bg} p-3`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} aria-hidden="true" />
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
