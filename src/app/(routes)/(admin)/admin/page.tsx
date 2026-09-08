import Link from "next/link";
import { AlertTriangle, GraduationCap, FlaskConical, Users, CalendarDays, CalendarRange, School, HandHeart } from "lucide-react";
import {
  getAmbassadorStats,
  getRecentAmbassadorRegistrations,
  getStemfestStats,
  getVolunteerCount,
} from "@/lib/actions/registrations";
import { captureException } from "@/lib/sentry-helpers";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const UNAVAILABLE = "—";

/**
 * The dashboard aggregates four independent sources. A single one failing —
 * a dropped pooler connection, a table that has not been migrated yet — used to
 * reject the whole `Promise.all` and blank the page, hiding the sources that
 * were perfectly healthy. Degrade that source instead and report it.
 */
function unwrap<T>(result: PromiseSettledResult<T>, source: string): T | null {
  if (result.status === "fulfilled") return result.value;
  captureException(result.reason, { adminDashboardSource: source });
  return null;
}

function formatCount(count: number | null | undefined): string {
  return typeof count === "number" ? String(count) : UNAVAILABLE;
}

function describeCollected(count: number | null | undefined, noun: string): string {
  if (typeof count !== "number") return "Count unavailable. View every response.";
  return `${count} ${count === 1 ? noun : `${noun}s`} collected. View every response.`;
}

export default async function AdminDashboardPage() {
  // Aggregate in SQL (counts + a 5-row recent feed) instead of pulling every
  // column of both tables into memory — the dashboard only renders numbers.
  const settled = await Promise.allSettled([
    getAmbassadorStats(),
    getVolunteerCount(),
    getRecentAmbassadorRegistrations(5),
    getStemfestStats(),
  ]);

  const ambassadorStats = unwrap(settled[0], "ambassadorStats");
  const volunteerCount = unwrap(settled[1], "volunteerCount");
  const recent = unwrap(settled[2], "recentAmbassadorRegistrations");
  const stemfestStats = unwrap(settled[3], "stemfestStats");

  const degraded = settled.some((result) => result.status === "rejected");

  const stats = [
    { label: "Ambassador Registrations", count: ambassadorStats?.total, icon: Users, color: "text-manara-teal", bg: "bg-manara-teal/10" },
    { label: "This Week", count: ambassadorStats?.thisWeek, icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "This Month", count: ambassadorStats?.thisMonth, icon: CalendarRange, color: "text-manara-yellow", bg: "bg-manara-yellow/15" },
    { label: "Unique Schools", count: ambassadorStats?.uniqueSchools, icon: School, color: "text-manara-purple", bg: "bg-manara-purple/10" },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Grand Admin</h1>
        <p className="mt-1 font-body text-ink/60">
          Registration stats and responses across all Manarat forms.
        </p>
      </div>

      {degraded && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="font-body text-sm">
            Some figures could not be loaded and show as “{UNAVAILABLE}”. The
            numbers below are incomplete — reload to retry.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-subtle">
            <div className={`rounded-xl ${stat.bg} p-3`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">{formatCount(stat.count)}</p>
              <p className="font-body text-sm text-ink/60">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form Cards */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/campus-ambassador"
          className="group flex flex-col gap-3 rounded-2xl bg-surface p-6 shadow-subtle transition-shadow hover:shadow-academic"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-manara-teal/10 p-3">
              <GraduationCap className="h-6 w-6 text-manara-teal" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-body text-xs font-medium text-emerald-700">
              Live
            </span>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink group-hover:text-manara-teal">
              Campus Ambassador
            </h2>
            <p className="mt-1 font-body text-sm text-ink/60">
              {describeCollected(ambassadorStats?.total, "registration")}
            </p>
          </div>
        </Link>

        <Link
          href="/admin/volunteer"
          className="group flex flex-col gap-3 rounded-2xl bg-surface p-6 shadow-subtle transition-shadow hover:shadow-academic"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-manara-yellow/15 p-3">
              <HandHeart className="h-6 w-6 text-manara-yellow" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-body text-xs font-medium text-emerald-700">
              Live
            </span>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink group-hover:text-manara-teal">
              STEM Fest Volunteer
            </h2>
            <p className="mt-1 font-body text-sm text-ink/60">
              {volunteerCount} {volunteerCount === 1 ? "application" : "applications"} collected. View every response.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/science-competition"
          className="group flex flex-col gap-3 rounded-2xl bg-surface p-6 shadow-subtle transition-shadow hover:shadow-academic"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-manara-purple/10 p-3">
              <FlaskConical className="h-6 w-6 text-manara-purple" />
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-body text-xs font-medium text-emerald-700">
              Live
            </span>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink group-hover:text-manara-teal">
              STEM Fest Events
            </h2>
            <p className="mt-1 font-body text-sm text-ink/60">
              {stemfestStats.total} {stemfestStats.total === 1 ? "registration" : "registrations"} collected. View every response.
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Registrations */}
      <div className="rounded-2xl bg-surface shadow-subtle">
        <div className="flex items-center justify-between border-b border-ink/5 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">Recent Registrations</h2>
          <Link href="/admin/campus-ambassador" className="font-body text-sm font-medium text-manara-teal hover:underline">
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <GraduationCap className="mb-3 h-10 w-10 text-ink/20" />
            <p className="font-body text-ink/50">No ambassador registrations yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink/5 text-left">
                  <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Name</th>
                  <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Class</th>
                  <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">School</th>
                  <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {recent.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-cream/40">
                    <td className="px-6 py-4 font-body font-medium text-ink">{row.name}</td>
                    <td className="px-6 py-4 font-body text-sm text-ink/60">{row.class}</td>
                    <td className="px-6 py-4 font-body text-sm text-ink/60">{row.school}</td>
                    <td className="px-6 py-4 font-body text-sm text-ink/60">{dateFormatter.format(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
