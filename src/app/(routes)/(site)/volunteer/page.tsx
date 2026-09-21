import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, HandHeart } from "lucide-react";
import VolunteerForm from "./volunteer-form";
import { volunteerFormCopy } from "@/lib/data/volunteer-form";

export const metadata: Metadata = {
  title: "Volunteer — STEM Fest",
  description:
    "Apply to volunteer at Manarat Science Club's STEM Fest. Open to Manarat students only.",
};

export default function VolunteerPage() {
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
          <Link
            href="/register"
            className="inline-flex items-center gap-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.24em] text-space-muted transition-colors hover:text-ion-bright"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Registration options
          </Link>

          <span className="mt-6 inline-flex items-center gap-2 border border-ion-line px-4 py-1.5 font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-ion">
            <HandHeart className="size-3.5" aria-hidden="true" />
            {volunteerFormCopy.eyebrow}
          </span>
          <h1 className="mt-5 max-w-[36rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            Volunteer for STEM Fest
          </h1>
          <p className="mt-5 max-w-[40rem] text-base leading-relaxed text-space-muted md:text-lg">
            Help run the fest on the ground. Open to Manarat students only —
            applications from other schools are not considered.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <VolunteerForm />
      </section>
    </div>
  );
}
