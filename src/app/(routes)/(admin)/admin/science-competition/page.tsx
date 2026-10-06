import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  Clock,
  FlaskConical,
  School,
  Trophy,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/admin/page-header";
import {
  getStemfestStats,
  searchStemfestRegistrations,
  type StemfestStats,
} from "@/lib/actions/registrations";
import {
  formatBdt,
  getStemfestClassLabel,
} from "@/lib/data/stemfest-registration";
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
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
    reference: row.reference,
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
    },
    {
      label: "Verified Payments",
      value: String(stats.verifiedCount),
      icon: BadgeCheck,
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
    },
    {
      label: "Pending Payments",
      value: String(stats.pendingCount),
      icon: Clock,
    },
    {
      label: "Rejected Payments",
      value: String(stats.rejectedCount),
      icon: XCircle,
    },
    {
      label: "This Week",
      value: String(stats.thisWeek),
      icon: CalendarDays,
    },
    {
      label: "Unique Schools",
      value: String(stats.uniqueSchools),
      icon: School,
    },
  ];

  return (
    <div
      style={adminAccentStyle(SECTION_ACCENT.scienceCompetition)}
      className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
    >
      <PageHeader
        eyebrow="Form responses"
        title={source.reportTitle}
        description={describeList(source, state, registrations.length, total)}
        icon={FlaskConical}
      />

      {/*
        One strip rather than seven cards: the figures answer one question —
        "how is this fest going" — and a single hairline-divided board reads as one
        answer, where seven floating boxes read as seven.
      */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-admin-line border-t-2 border-t-admin-accent bg-admin-line sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-admin-surface p-5">
            <dt className="flex items-center gap-2 font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-accent-ink uppercase">
              <stat.icon className="size-3.5 shrink-0" aria-hidden="true" />
              {stat.label}
            </dt>
            <dd className="mt-2.5 font-space-body text-2xl leading-none font-medium text-admin-ink tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

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
