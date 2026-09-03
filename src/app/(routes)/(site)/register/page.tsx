import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { RegistrationForms } from "./registration-forms";

export const metadata: Metadata = {
  title: "Register — Ambassador & Volunteer Programmes",
  description:
    "Apply to become a Campus Ambassador, Batch Ambassador, or Volunteer for Manarat Science Club.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-space-deep">
      <section className="relative overflow-hidden border-b border-space-line-soft">
        <div aria-hidden="true" className="msc-atmosphere pointer-events-none absolute inset-0" />
        <div aria-hidden="true" className="space-grain pointer-events-none absolute inset-0" />

        <div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <span className="inline-flex items-center gap-2 border border-ion-line px-4 py-1.5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-ion">
            <Sparkles className="size-3.5" /> Open Applications
          </span>
          <h1 className="mt-5 max-w-[40rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            Ambassador & Volunteer Programmes
          </h1>
          <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-space-muted md:text-lg">
            Represent Manarat Science Club across your campus, lead your batch,
            or volunteer at our events — inspire fellow students and connect
            curiosity with discovery.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <RegistrationForms />
      </section>
    </main>
  );
}
