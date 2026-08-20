import { CalendarDays } from "lucide-react";

export const metadata = {
  title: "Events Calendar | Manarat Science Club",
  description: "Upcoming academic sessions, labs, and science events.",
};

const sessions = [
  {
    date: "Sat, Jan 18",
    session: "Experimental Lab Sprint",
    focus: "Variables, measurement, controlled testing",
    status: "Open",
    statusClass: "border-ion-line text-ion",
  },
  {
    date: "Fri, Jan 24",
    session: "Robot Rescue Challenge",
    focus: "Sensors, logic, path optimization",
    status: "Few seats",
    statusClass: "border-space-amber/40 text-space-amber",
  },
  {
    date: "Thu, Jan 30",
    session: "Young Innovators Forum",
    focus: "Presentation, critique, project defense",
    status: "Register",
    statusClass: "border-space-amber-bright/40 text-space-amber-bright",
  },
];

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-space-deep">
      <section className="border-b border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-16">
          <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
            {"01 — Calendar"}
          </p>
          <h1 className="mt-4 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            Events & Sessions
          </h1>
          <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-space-muted">
            Our academic calendar featuring upcoming workshops, experimental labs, and project defenses.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
              Academic calendar
            </p>
            <h2 className="mt-3 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory lg:text-3xl">
              Upcoming sessions
            </h2>
          </div>
          <button type="button" className="msc-btn-ghost w-fit">
            Request calendar <CalendarDays className="size-4" />
          </button>
        </div>

        <div className="border border-space-line-soft">
          <div className="hidden grid-cols-[1fr_1fr_1.4fr_0.8fr] border-b border-space-line-soft bg-space-deep/60 px-6 py-4 font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-space-muted md:grid">
            <span>Date</span>
            <span>Session</span>
            <span>Learning focus</span>
            <span>Status</span>
          </div>

          <div className="flex flex-col gap-3 p-4 md:gap-0 md:divide-y md:divide-space-line-soft md:p-0">
            {sessions.map((row) => (
              <div
                key={row.session}
                className="grid items-center gap-3 border border-space-line-soft bg-space-deep/40 px-5 py-5 transition-colors hover:border-ion-line md:grid-cols-[1fr_1fr_1.4fr_0.8fr] md:border-none md:bg-transparent md:px-6 md:py-5 md:hover:bg-ion/5"
              >
                <span className="font-mono text-sm text-ion-bright">{row.date}</span>
                <span className="font-medium text-space-ivory">{row.session}</span>
                <span className="text-sm text-space-muted">{row.focus}</span>
                <span
                  className={`w-fit border px-3 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] ${row.statusClass}`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
