import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import StemfestRegistrationForm from "./stemfest-registration-form";
import { stemfestFormCopy } from "@/lib/data/stemfest-registration";

export const metadata: Metadata = {
  title: "STEM Fest Registration — Olympiads, Robotics, Project Display & E-sports",
  description:
    "Register for Manarat Science Club STEM Fest. Pick your class, choose your events with your category filled in automatically, and confirm your bKash payment.",
};

export default function StemfestRegistrationPage() {
  return (
    <div className="min-h-screen bg-space-deep">
      <section className="relative overflow-hidden border-b border-space-line-soft">
        <div
          aria-hidden="true"
          className="msc-atmosphere pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="space-grain pointer-events-none absolute inset-0"
        />

        <div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <span className="inline-flex items-center gap-2 border border-ion-line px-4 py-1.5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-ion">
            <Trophy className="size-3.5" aria-hidden="true" />
            {stemfestFormCopy.eyebrow}
          </span>
          <h1 className="mt-5 max-w-[36rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {stemfestFormCopy.heading}
          </h1>
          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-space-muted md:text-lg">
            {stemfestFormCopy.subheading}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <StemfestRegistrationForm />
      </section>
    </div>
  );
}
