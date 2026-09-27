import { notFound } from "next/navigation";
import { BadgeCheck, Banknote, CalendarDays, Users } from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import { DonutChart, RankedBars, StackedBarChart } from "@/components/admin/charts";
import RecentRegistrationsTable from "@/components/admin/recent-registrations-table";
import { Panel, StatCard } from "@/components/admin/stat-card";
import RegistrationsTable, {
  type RegistrationRow,
} from "@/app/(routes)/(admin)/admin/campus-ambassador/registrations-table";
import ScienceCompetitionTable, {
  type StemfestRow,
} from "@/app/(routes)/(admin)/admin/science-competition/science-competition-table";
import SmsLogTable, {
  type SmsLogRow,
} from "@/app/(routes)/(admin)/admin/sms-logs/sms-log-table";
import VolunteerRegistrationsTable, {
  type VolunteerRow,
} from "@/app/(routes)/(admin)/admin/volunteer/volunteer-registrations-table";
import {
  ambassadorSource,
  smsSource,
  stemfestSource,
  volunteerSource,
} from "@/lib/admin/filters";
import {
  paymentMixSlices,
  stemfestTrendSeries,
  type PaymentMixId,
} from "@/lib/admin/dashboard";
import { stemfestNoReferenceLabel } from "@/lib/data/stemfest-registration";

/**
 * A local-only surface for checking the admin chrome at a real phone width.
 *
 * Every element below is the shipping component — the same `AdminShell` the
 * `(admin)` layout renders, and the same five data tables and two charts the pages
 * render — fed fixture rows instead of database ones. `/admin` itself cannot be
 * opened without an admin session, and the only database this checkout can reach is
 * production, so writing a session there to look at a layout is not an option. The
 * one thing this does not cover is each page's data wiring, which these fixes do not
 * touch.
 *
 * It 404s in a production build: it is a verification surface, not a feature.
 */
export const dynamic = "force-dynamic";

// Thirty days so the trend chart is drawn at its real width — the tick density
// only collides at the full 30 columns.
const TREND = Array.from({ length: 30 }, (_, index) => {
  const day = new Date(Date.UTC(2026, 8, 1) + index * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return { day, counts: [(index * 3) % 9] };
});

const PAYMENT_COUNTS: Record<PaymentMixId, number> = {
  verified: 42,
  pending: 11,
  rejected: 3,
};

const AMBASSADOR_ROWS: RegistrationRow[] = [
  "Ayesha Rahman",
  "Tanvir Hossain",
  "Nusrat Jahan",
].map((name, index) => ({
  id: `amb-${index}`,
  type: index === 1 ? "batch" : "campus",
  name,
  phone: "01711-000000",
  email: "participant@example.com",
  class: "Class 9",
  school: "Manarat Dhaka International School & College",
  gender: "female",
  facebook: "https://facebook.com/example",
  instagram: null,
  experience: "Led a science club project for two years.",
  firstTimeCa: index === 0,
  createdAt: new Date(Date.UTC(2026, 8, 18 + index)).toISOString(),
}));

const STEMFEST_ROWS: StemfestRow[] = [
  "M9014",
  "M9015",
  "F1016",
].map((registrationCode, index) => ({
  id: `sf-${index}`,
  registrationCode,
  name: "Ayesha Rahman",
  classLabel: "Class 9",
  school: "Manarat Dhaka International School & College",
  segments: 'Robotics Sprint · Team of 3 · Team "Circuit Breakers"',
  reference: index === 0 ? "Abrar Jawad" : null,
  totalFee: 1450,
  transactionId: "DIL9QJMSOF",
  paymentNumber: "01711-000000",
  email: "participant@example.com",
  status: index === 0 ? "verified" : index === 1 ? "pending" : "rejected",
  decision: index === 0 ? "verified" : null,
  decidedAt: index === 0 ? new Date(Date.UTC(2026, 8, 20)).toISOString() : null,
  decidedBy: index === 0 ? "admin@manaratscience.club" : null,
  emailSentAt: index === 0 ? new Date(Date.UTC(2026, 8, 20)).toISOString() : null,
  amount: index === 0 ? "৳1,450.00" : null,
  createdAt: new Date(Date.UTC(2026, 8, 17 + index)).toISOString(),
}));

const VOLUNTEER_ROWS: VolunteerRow[] = ["Volunteer One", "Volunteer Two"].map(
  (fullName, index) => ({
    id: `vol-${index}`,
    fullName,
    classSection: "10-A",
    roll: "12",
    shift: index === 0 ? "morning" : "day",
    studentCode: "MSC-2214",
    address: "Gulshan-2, Dhaka",
    personalPhone: "01711-000000",
    parentsPhone: "01811-000000",
    attendanceWeek: "yes",
    parentsComfort: "yes",
    campusHesitation: "no",
    scenarioTaskConflict: "I would ask the coordinator to decide.",
    scenarioPeerConduct: "I would raise it with the shift lead.",
    selectionReason: "I want to help run the fest and learn logistics.",
    createdAt: new Date(Date.UTC(2026, 8, 19 + index)).toISOString(),
  }),
);

const SMS_ROWS: SmsLogRow[] = ["DIL9QJMSOF", "DIM6QL9MSU"].map(
  (transactionId, index) => ({
    id: `sms-${index}`,
    sender: "bKash",
    rawMessage: `You have received Tk ${index === 0 ? "1,450.00" : "50.00"} from 01711000000. TrxID ${transactionId}.`,
    transactionId,
    amount: index === 0 ? "1450.00" : "50.00",
    senderNumber: "01711000000",
    status: index === 0 ? "matched" : "unmatched",
    matchedRegistrationId: index === 0 ? "sf-0" : null,
    receivedAt: new Date(Date.UTC(2026, 8, 20, 10, index)).toISOString(),
  }),
);

export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const emptyState = { query: "", values: {}, page: 1 };

  return (
    <AdminShell
      user={{
        name: "Preview Admin",
        email: "preview@manaratscience.club",
        role: "admin",
      }}
    >
      <div className="flex flex-col gap-8 p-6 md:p-10">
        <header>
          <p className="font-body text-xs font-semibold tracking-[0.18em] text-manara-teal uppercase">
            Overview
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink">
            Admin shell preview
          </h1>
          <p className="mt-1 max-w-2xl font-body text-ink/60">
            Fixture data, real components. Check the rail, the tables and the
            charts at 375px and on a desktop.
          </p>
        </header>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="STEM Fest registrations"
            value="1,284"
            note="Every entry from the STEM Fest event form, all time."
            icon={Users}
            tone="purple"
            spark={TREND.map((point) => point.counts[0])}
          />
          <StatCard
            label="Verified payments"
            value="42"
            note="of 56 STEM Fest registrations"
            icon={BadgeCheck}
            tone="green"
          />
          <StatCard
            label="Collected"
            value="৳61,250"
            note="Totals reported by the matched bKash messages."
            icon={Banknote}
            tone="teal"
          />
          <StatCard
            label="Last 7 days"
            value="63"
            note="New STEM Fest entries since this time last week."
            icon={CalendarDays}
            tone="yellow"
            spark={TREND.slice(-7).map((point) => point.counts[0])}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Registration activity"
            description="STEM Fest entries a day over the last 30 days."
          >
            <StackedBarChart
              points={TREND}
              series={stemfestTrendSeries}
              ariaLabel="Bar chart of STEM Fest entries per day over the last 30 days."
            />
          </Panel>

          <Panel
            title="Payment progress"
            description="STEM Fest registrations by payment status."
          >
            <DonutChart
              slices={paymentMixSlices.map((slice) => ({
                ...slice,
                value: PAYMENT_COUNTS[slice.id],
              }))}
              centerValue="56"
              centerCaption="entries"
              ariaLabel="Donut chart of STEM Fest payment status: 42 verified, 11 pending, 3 rejected."
            />
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel
            title="Most-entered events"
            description="STEM Fest events by number of registrations."
          >
            <RankedBars
              tone="purple"
              ariaLabel="Bar list of STEM Fest events by registration count."
              items={[
                { id: "robotics", label: "Robotics Sprint", value: 24, sublabel: "Robotics" },
                { id: "olympiad", label: "Science Olympiad", value: 19, sublabel: "Olympiad" },
                { id: "display", label: "Project Display", value: 11, sublabel: "Display" },
              ]}
            />
          </Panel>

          <Panel
            title="Schools represented"
            description="14 distinct schools across STEM Fest entries; every Manarat spelling counts as one."
          >
            <RankedBars
              tone="teal"
              ariaLabel="Bar list of the schools with the most STEM Fest registrations."
              items={[
                { id: "mdic", label: "Manarat Dhaka International School & College", value: 38 },
                { id: "adamjee", label: "Adamjee Cantonment College", value: 9 },
                { id: "dhaka", label: "Dhaka College", value: 7 },
              ]}
            />
          </Panel>

          <Panel
            title="Reference leaderboard"
            description="9 referrers, including entries nobody referred."
          >
            <RankedBars
              tone="yellow"
              ariaLabel="Bar list of the people who referred the most STEM Fest entries."
              items={[
                { id: "abrar", label: "Abrar Jawad", value: 14 },
                { id: "maria", label: "Maria Reza", value: 11 },
                { id: "faiyaz", label: "Faiyaz Khan", value: 8 },
                { id: stemfestNoReferenceLabel, label: stemfestNoReferenceLabel, value: 6 },
              ]}
            />
          </Panel>
        </div>

        <Panel
          title="Recent registrations"
          description="The latest STEM Fest entries."
        >
          <RecentRegistrationsTable
            rows={STEMFEST_ROWS.map((row) => ({
              id: row.id,
              name: row.name,
              class: row.classLabel,
              school: row.school,
              reference: row.reference,
              createdAt: new Date(row.createdAt),
            }))}
          />
        </Panel>

        <section className="flex flex-col gap-5">
          <h2 className="font-display text-xl font-semibold text-ink">
            The five data tables
          </h2>

          <RegistrationsTable
            source={ambassadorSource}
            state={{ ...emptyState, sort: ambassadorSource.defaultSort }}
            registrations={AMBASSADOR_ROWS}
            total={AMBASSADOR_ROWS.length}
            page={1}
            totalPages={3}
          />

          <ScienceCompetitionTable
            source={stemfestSource}
            state={{ ...emptyState, sort: stemfestSource.defaultSort }}
            registrations={STEMFEST_ROWS}
            total={STEMFEST_ROWS.length}
            page={1}
            totalPages={4}
          />

          <VolunteerRegistrationsTable
            source={volunteerSource}
            state={{ ...emptyState, sort: volunteerSource.defaultSort }}
            registrations={VOLUNTEER_ROWS}
            total={VOLUNTEER_ROWS.length}
            page={1}
            totalPages={2}
          />

          <SmsLogTable
            source={smsSource}
            state={{ ...emptyState, sort: smsSource.defaultSort }}
            rows={SMS_ROWS}
            total={SMS_ROWS.length}
            page={1}
            totalPages={2}
          />
        </section>
      </div>
    </AdminShell>
  );
}
