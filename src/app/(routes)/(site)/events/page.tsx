import { Wrench } from "lucide-react";

export const metadata = {
  title: "Events Calendar | Manarat Science Club",
  description: "Upcoming academic sessions, labs, and science events.",
};

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

      <section className="mx-auto w-full max-w-[1440px] flex flex-col items-center justify-center px-5 py-32 sm:px-8 lg:px-16">
        <Wrench className="mb-6 size-10 text-ion" />
        <h2 className="font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory lg:text-3xl">
          Under Construction
        </h2>
        <p className="mt-4 max-w-md text-center text-space-muted">
          We are working on something exciting. Check back at a later date for upcoming events and sessions.
        </p>
      </section>
    </div>
  );
}
