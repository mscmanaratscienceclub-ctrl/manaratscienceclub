import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import CampusAmbassadorForm from "./campus-ambassador-form";

export const metadata: Metadata = {
  title: "Register — Campus Ambassador",
  description:
    "Apply to become a Campus Ambassador for Manarat Science Club. Represent science, innovation, and curiosity at your school.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-space-deep">
      <section className="relative overflow-hidden border-b border-space-line-soft">
        <div aria-hidden="true" className="signal-atmosphere pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="space-grain pointer-events-none absolute inset-0" />

        <div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <span className="inline-flex items-center gap-2 border border-ion-line px-4 py-1.5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-ion">
            <Sparkles className="size-3.5" /> Open Applications
          </span>
          <h1 className="mt-5 max-w-[40rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            Campus Ambassador
          </h1>
          <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-space-muted md:text-lg">
            Represent Manarat Science Club at your school — inspire fellow
            students, organise activities, and be the bridge between curiosity
            and discovery.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
        <CampusAmbassadorForm />
      </section>
    </main>
  );
}
