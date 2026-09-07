import Link from "next/link";
import { GraduationCap, FlaskConical, Users, CalendarDays, CalendarRange, School, HandHeart } from "lucide-react";
import {
  getAmbassadorStats,
  getRecentAmbassadorRegistrations,
  getVolunteerCount,
} from "@/lib/actions/registrations";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminDashboardPage() {
  // Aggregate in SQL (counts + a 5-row recent feed) instead of pulling every
  // column of both tables into memory — the dashboard only renders numbers.
  const [ambassadorStats, volunteerCount, recent] = await Promise.all([
    getAmbassadorStats(),
    getVolunteerCount(),
    getRecentAmbassadorRegistrations(5),
  ]);

  const stats = [
    { label: "Ambassador Registrations", count: ambassadorStats.total, icon: Users, color: "text-manara-teal", bg: "bg-manara-teal/10" },
    { label: "This Week", count: ambassadorStats.thisWeek, icon: CalendarDays, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "This Month", count: ambassadorStats.thisMonth, icon: CalendarRange, color: "text-manara-yellow", bg: "bg-manara-yellow/15" },
    { label: "Unique Schools", count: ambassadorStats.uniqueSchools, icon: School, color: "text-manara-purple", bg: "bg-manara-purple/10" },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Grand Admin</h1>
        <p className="mt-1 font-body text-ink/60">
          Registration stats and responses across all Manarat forms.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-subtle">
            <div className={`rounded-xl ${stat.bg} p-3`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">{stat.count}</p>
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
              {ambassadorStats.total} {ambassadorStats.total === 1 ? "registration" : "registrations"} collected. View every response.
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

        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-ink/15 bg-surface/50 p-6">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-manara-purple/10 p-3">
              <FlaskConical className="h-6 w-6 text-manara-purple" />
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-body text-xs font-medium text-ink/50">
              Coming soon
            </span>
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Science Competition</h2>
            <p className="mt-1 font-body text-sm text-ink/60">
              Submissions for the upcoming science competition form will appear here once it launches.
            </p>
          </div>
        </div>
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
