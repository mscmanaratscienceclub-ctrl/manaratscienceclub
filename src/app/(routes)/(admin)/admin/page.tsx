import Link from "next/link";
import { GraduationCap, FlaskConical, Users, CalendarDays, CalendarRange, School, ArrowUpRight } from "lucide-react";
import { getAllAmbassadorRegistrations, getAllStemFestRegistrations } from "@/lib/actions/registrations";
import ScrollReveal from "@/components/animations/ScrollReveal";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AdminDashboardPage() {
  const registrations = await getAllAmbassadorRegistrations();
  const stemFest = await getAllStemFestRegistrations();
  const stemFestCount = stemFest.length;

  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const totalRegistrations = registrations.length;
  const thisWeek = registrations.filter(
    (r) => now - new Date(r.createdAt).getTime() <= WEEK_MS
  ).length;
  const thisMonth = registrations.filter(
    (r) => new Date(r.createdAt).getTime() >= monthStart
  ).length;
  const uniqueSchools = new Set(registrations.map((r) => r.school.trim().toLowerCase())).size;

  const recent = registrations.slice(0, 5);

  const stats = [
    { label: "Total Registrations", count: totalRegistrations, icon: Users },
    { label: "This Week", count: thisWeek, icon: CalendarDays },
    { label: "This Month", count: thisMonth, icon: CalendarRange },
    { label: "Unique Schools", count: uniqueSchools, icon: School },
  ];

  const forms = [
    {
      href: "/admin/campus-ambassador",
      label: "Campus Ambassador",
      count: totalRegistrations,
      icon: GraduationCap,
    },
    {
      href: "/admin/stem-fest",
      label: "STEM Fest",
      count: stemFestCount,
      icon: FlaskConical,
    },
  ];

  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-16 p-6 py-14 md:p-12 md:py-20 xl:px-20">
        {/* Attention — wide editorial header */}
        <header className="w-full max-w-6xl">
          <h1 className="font-voyage text-[clamp(2.4rem,4.5vw,4.5rem)] font-bold uppercase leading-none tracking-tight text-space-ivory">
            Grand Admin
          </h1>
          <p className="mt-5 max-w-xl font-space-body text-base leading-relaxed text-space-muted">
            Every registration across Manarat Science Club forms — live counts,
            recent activity, and full response viewers.
          </p>
        </header>

        {/* Interest — gapless bento stat band */}
        <ScrollReveal stagger={0.08} className="grid auto-flow-dense gap-px border border-space-line-soft bg-space-line-soft sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="group flex items-center gap-5 bg-space-deep/80 p-7 transition-colors duration-300 hover:bg-ion-deep/40">
              <span className="flex size-12 shrink-0 items-center justify-center border border-ion-line bg-ion-deep/40 transition-transform duration-500 ease-out group-hover:scale-105">
                <stat.icon className="size-5 text-ion" />
                </span>
              <div>
                <p className="font-voyage text-4xl font-bold leading-none text-space-ivory">{stat.count}</p>
                <p className="mt-2 font-mono text-[0.58rem] font-medium uppercase tracking-[0.22em] text-space-muted">{stat.label}</p>
              </div>
            </div>
          ))}
        </ScrollReveal>

        {/* Interest — form response cards */}
        <section className="flex flex-col gap-6">
          <h2 className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-space-muted">
            Form Responses
          </h2>
          <div className="grid auto-flow-dense gap-px border border-space-line-soft bg-space-line-soft md:grid-cols-2">
            {forms.map((form) => (
              <Link
                key={form.href}
                href={form.href}
                className="group relative flex flex-col gap-8 overflow-hidden bg-space-deep/80 p-8 transition-colors duration-300 hover:bg-ion-deep/30"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-25"
                  style={{ background: "radial-gradient(circle, var(--ion), transparent 70%)" }}
                />
                <div className="flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center border border-ion-line bg-ion-deep/40 transition-transform duration-500 ease-out group-hover:scale-105">
                    <form.icon className="size-5 text-ion" />
                  </span>
                  <ArrowUpRight className="size-5 text-space-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ion-bright" />
                </div>
                <div>
                  <p className="font-voyage text-lg font-semibold uppercase tracking-wide text-space-ivory transition-colors group-hover:text-ion-bright">
                    {form.label}
                  </p>
                  <p className="mt-2 font-space-body text-sm text-space-muted">
                    {form.count} {form.count === 1 ? "registration" : "registrations"} collected.
                    View every response.
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Desire — recent activity table */}
        <ScrollReveal className="border border-space-line-soft bg-space-deep/70">
          <div className="flex items-center justify-between border-b border-space-line-soft px-7 py-5">
            <h2 className="font-voyage text-sm font-semibold uppercase tracking-[0.18em] text-space-ivory">Recent Registrations</h2>
            <Link href="/admin/campus-ambassador" className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-ion transition-colors hover:text-ion-bright">
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
              <GraduationCap className="mb-4 size-10 text-space-line" />
              <p className="font-space-body text-sm text-space-muted">No ambassador registrations yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-space-line-soft text-left">
                    <th className="px-7 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Name</th>
                    <th className="px-7 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Class</th>
                    <th className="px-7 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">School</th>
                    <th className="px-7 py-3.5 font-mono text-[0.56rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-space-line-soft">
                  {recent.map((row) => (
                    <tr key={row.id} className="transition-colors duration-200 hover:bg-ion-deep/30">
                      <td className="px-7 py-4 font-space-body text-sm font-medium text-space-ivory">{row.name}</td>
                      <td className="px-7 py-4 font-space-body text-sm text-space-muted">{row.class}</td>
                      <td className="px-7 py-4 font-space-body text-sm text-space-muted">{row.school}</td>
                      <td className="px-7 py-4 font-mono text-xs text-space-muted">{dateFormatter.format(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ScrollReveal>
      </div>
    </main>
  );
}
