import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarDays,
  Clock,
  FlaskConical,
  ListFilter,
  PieChart,
  School,
  Share2,
  Trophy,
  Users,
} from "lucide-react";

import AdminShell from "@/components/admin/admin-shell";
import PageHeader from "@/components/admin/page-header";
import ActivityChart from "@/components/admin/activity-chart";
import DonutChart from "@/components/admin/donut-chart";
import { RankedBars } from "@/components/admin/charts";
import RecentRegistrationsTable from "@/components/admin/recent-registrations-table";
import { Panel, StatCard } from "@/components/admin/stat-card";
import RangeSegments, { TREND_RANGE_PARAM } from "@/components/admin/range-segments";
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
import { SECTION_ACCENT, adminAccentStyle } from "@/lib/admin/accents";
import {
  ambassadorSource,
  buildAdminHref,
  describeFilters,
  filterOperatorLabel,
  filterOperatorOptions,
  parseAdminQuery,
  smsSource,
  stemfestSource,
  volunteerSource,
  type RawSearchParams,
} from "@/lib/admin/filters";
import {
  TREND_RANGES,
  parseTrendRange,
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

// The longest span the chart offers, so `?days=` can be checked at every value —
// tick density and the plot's own width only collide at 90 columns.
const TREND = Array.from({ length: Math.max(...TREND_RANGES) }, (_, index) => {
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
  segments:
    'LFR (Line Following Robot) · Team of 4 · Team “Circuit Breakers”, Mathematics · Category D',
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

/**
 * A filter state spelled the way a URL spells one, including the two operator
 * prefixes — `!` for a negation, `=` for an exact match on a text field.
 *
 * `/admin` cannot be opened without an admin session and the only reachable
 * database is production, so this is where the filter contract itself is checked:
 * the panel below reads this through `parseAdminQuery` and shows what the chips,
 * the report's scope strip and the export's scope sheet would say.
 */
const FILTER_FIXTURE: RawSearchParams = {
  q: "ayesha",
  segment: "!lfr",
  school: "=Manarat Dhaka International School & College",
  class: "class-9",
  payment: "verified",
  from: "2026-09-14",
  to: "2026-09-20",
  transactionId: "8N7A2B1C2D",
};

const fixtureState = parseAdminQuery(stemfestSource, FILTER_FIXTURE);
const fixtureFilters = describeFilters(stemfestSource, fixtureState);
const fixtureHref = buildAdminHref(stemfestSource.path, fixtureState);

/** Every operator each source's fields offer, as the menus render them. */
const operatorMenus = stemfestSource.filters.map((field) => ({
  id: field.id,
  label: field.label,
  kind: field.kind,
  operators: filterOperatorOptions(field).map(
    (operator) => filterOperatorLabel(field, operator).menu,
  ),
}));

export default async function AdminPreviewPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const emptyState = { query: "", values: {}, page: 1 };

  // The same read `/admin` performs, so the control's selected state and the
  // plot's long-span geometry are checked against the real code path.
  const days = parseTrendRange((await searchParams)[TREND_RANGE_PARAM]);
  const trend = TREND.slice(-days);

  return (
    <AdminShell
      user={{
        name: "Preview Admin",
        email: "preview@manaratscience.club",
        role: "admin",
      }}
    >
      <div
        style={adminAccentStyle(SECTION_ACCENT.dashboard)}
        className="flex flex-col gap-8 px-6 py-8 md:px-10 md:py-12"
      >
        <PageHeader
          eyebrow="Overview"
          title="Admin shell preview"
          description="Fixture data, real components. Check the rail, the tables and the charts at 375px and on a desktop."
          icon={FlaskConical}
        />

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="STEM Fest registrations"
            value="1,284"
            note="Every entry from the STEM Fest event form, all time."
            icon={Users}
            tone="purple"
            spark={trend.map((point) => point.counts[0])}
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
            spark={trend.slice(-7).map((point) => point.counts[0])}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel
            className="xl:col-span-2"
            title="Registration activity"
            description={`STEM Fest entries a day over the last ${days} days.`}
            icon={BarChart3}
            action={<RangeSegments value={days} basePath="/admin-preview" />}
          >
            <ActivityChart
              points={trend}
              series={stemfestTrendSeries}
              ariaLabel={`Bar chart of STEM Fest entries per day over the last ${days} days.`}
            />
          </Panel>

          <Panel
            title="Payment progress"
            icon={PieChart}
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
            icon={Trophy}
            description="STEM Fest events by number of registrations."
          >
            <RankedBars
              tone="purple"
              ariaLabel="Bar list of STEM Fest events by registration count."
              items={[
                { id: "mathematics", label: "Mathematics", value: 24, sublabel: "Olympiads" },
                { id: "lfr", label: "LFR (Line Following Robot)", value: 19, sublabel: "Robotics" },
                {
                  id: "project-display",
                  label: "Project Display",
                  value: 11,
                  sublabel: "Project Display",
                },
              ]}
            />
          </Panel>

          <Panel
            title="Schools represented"
            icon={School}
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
            icon={Share2}
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
          icon={Clock}
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

        <Panel
          title="Filter contract"
          icon={ListFilter}
          description="One query string, read back through src/lib/admin/filters.ts. Nothing here touches the database — it is the contract, not a query."
        >
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-muted uppercase">
                In the URL
              </dt>
              <dd className="mt-1 font-mono text-xs break-all text-admin-ink-soft">
                {fixtureHref}
              </dd>
            </div>

            {fixtureFilters.map((filter) => (
              <div key={filter.label}>
                <dt className="font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-muted uppercase">
                  {filter.label}
                </dt>
                <dd className="mt-1 font-space-body text-sm text-admin-ink">
                  {filter.display}
                </dd>
              </div>
            ))}

            <div className="sm:col-span-2">
              <dt className="font-space-body text-2xs font-semibold tracking-[0.08em] text-admin-muted uppercase">
                Comparisons offered
              </dt>
              <dd className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-space-body text-xs text-admin-ink-soft">
                {operatorMenus.map((field) => (
                  <span key={field.id}>
                    {field.label}:{" "}
                    {field.operators.length > 0
                      ? field.operators.join(" / ")
                      : `${field.kind} — no comparison`}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </Panel>

        <section className="flex flex-col gap-5">
          <h2 className="font-space-display text-2xl leading-tight font-medium tracking-tight text-admin-ink">
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
