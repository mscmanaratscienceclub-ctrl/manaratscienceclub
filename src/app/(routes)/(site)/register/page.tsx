import type { Metadata } from "next";
import CampusAmbassadorForm from "./campus-ambassador-form";

export const metadata: Metadata = {
  title: "Register — Campus Ambassador",
  description:
    "Apply to become a Campus Ambassador for Manarat Science Club. Represent science, innovation, and curiosity at your school.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-manara-teal/10 bg-cream px-4 py-16 text-center">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-40" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-manara-teal/5 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-manara-teal/10 px-4 py-1.5 font-display text-sm font-semibold text-manara-teal">
            🌟 Open Applications
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold text-ink md:text-5xl lg:text-6xl">
            Campus Ambassador
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-relaxed text-ink/60 md:text-lg">
            Represent Manarat Science Club at your school — inspire fellow
            students, organise activities, and be the bridge between curiosity
            and discovery.
          </p>
        </div>
      </section>

      {/* Form section */}
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <CampusAmbassadorForm />
      </section>
    </main>
  );
}
