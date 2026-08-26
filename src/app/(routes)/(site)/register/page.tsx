import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import RegisterForms from "./register-forms";
import { getFormFields } from "@/lib/actions/form-config";

export const metadata: Metadata = {
  title: "Register — STEM Fest & Campus Ambassador",
  description:
    "Register for the Manarat Science Club STEM Fest or apply to become a Campus Ambassador. Represent science, innovation, and curiosity at your school.",
};

export default async function RegisterPage() {
  const [stemFest, campusAmbassador] = await Promise.all([
    getFormFields("stem-fest"),
    getFormFields("campus-ambassador"),
  ]);

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
            Registrations
          </h1>
          <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-space-muted md:text-lg">
            Sign up for STEM Fest or become a Campus Ambassador — inspire fellow
            students, organise activities, and be the bridge between curiosity
            and discovery.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
        <RegisterForms fields={{ "stem-fest": stemFest, "campus-ambassador": campusAmbassador }} />
      </section>
    </main>
  );
}
