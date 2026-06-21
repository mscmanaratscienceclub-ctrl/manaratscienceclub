import { CalendarDays } from "lucide-react";

export const metadata = {
  title: "Events Calendar | Manarat Science Club",
  description: "Upcoming academic sessions, labs, and science events.",
};

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-cream px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          Events & Sessions
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink/60">
          Our academic calendar featuring upcoming workshops, experimental labs, and project defenses.
        </p>
      </section>

      {/* Events Table Section */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="font-display text-base font-bold text-manara-pink">Academic calendar</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink lg:text-4xl">
              Upcoming sessions
            </h2>
          </div>
          <button className="inline-flex w-fit items-center gap-2 rounded-full bg-manara-yellow px-6 py-3 font-display text-sm font-bold text-manara-teal transition hover:-translate-y-1 hover:bg-manara-red hover:text-white">
            Request calendar <CalendarDays className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-manara-teal/10 bg-white shadow-subtle">
          <div className="hidden grid-cols-[1fr_1fr_1.2fr_.8fr] bg-manara-teal px-6 py-4 text-sm font-bold uppercase tracking-wide text-white md:grid">
            <span>Date</span>
            <span>Session</span>
            <span>Learning focus</span>
            <span>Status</span>
          </div>
          
          <div className="divide-y divide-manara-teal/10">
            <div className="grid gap-3 px-6 py-5 md:grid-cols-[1fr_1fr_1.2fr_.8fr] items-center hover:bg-cream/40 transition-colors">
              <span className="font-bold text-ink">Sat, Jan 18</span>
              <span className="font-semibold text-ink">Experimental Lab Sprint</span>
              <span className="text-sm text-ink/60">Variables, measurement, controlled testing</span>
              <span className="w-fit rounded-full bg-manara-yellow/20 px-3 py-1 text-xs font-bold text-manara-teal">Open</span>
            </div>
            
            <div className="grid gap-3 px-6 py-5 md:grid-cols-[1fr_1fr_1.2fr_.8fr] items-center hover:bg-cream/40 transition-colors">
              <span className="font-bold text-ink">Fri, Jan 24</span>
              <span className="font-semibold text-ink">Robot Rescue Challenge</span>
              <span className="text-sm text-ink/60">Sensors, logic, path optimization</span>
              <span className="w-fit rounded-full bg-manara-red/10 px-3 py-1 text-xs font-bold text-manara-red">Few seats</span>
            </div>
            
            <div className="grid gap-3 px-6 py-5 md:grid-cols-[1fr_1fr_1.2fr_.8fr] items-center hover:bg-cream/40 transition-colors">
              <span className="font-bold text-ink">Thu, Jan 30</span>
              <span className="font-semibold text-ink">Young Innovators Forum</span>
              <span className="text-sm text-ink/60">Presentation, critique, project defense</span>
              <span className="w-fit rounded-full bg-manara-yellow/10 px-3 py-1 text-xs font-bold text-manara-yellow">Register</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
