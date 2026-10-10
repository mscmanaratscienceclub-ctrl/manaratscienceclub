import type { Metadata } from "next";
import { Info } from "lucide-react";

import ScrollReveal from "@/components/animations/ScrollReveal";
import {
  stemfestDetailSections,
  stemfestDetailsCopy,
} from "@/lib/data/stemfest-details";

export const metadata: Metadata = {
  title: "STEM Fest Details — Schedule, Venue & Segment Briefs",
  description:
    "Everything about STEM Fest at Manarat Science Club in one place: the schedule across both days, venue and directions, and the brief for each segment. Published here as the club finalises it.",
};

export default function StemfestDetailsPage() {
  const hasSections = stemfestDetailSections.length > 0;

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
          <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.34em] text-ion">
            {stemfestDetailsCopy.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {stemfestDetailsCopy.heading}
          </h1>
          <p className="mt-5 max-w-[42rem] text-base leading-relaxed text-space-muted md:text-lg">
            {stemfestDetailsCopy.subheading}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {hasSections ? (
          <div className="mx-auto max-w-[46rem] space-y-12">
            {stemfestDetailSections.map((section) => (
              <ScrollReveal key={section.id}>
                <article>
                  <h2 className="font-space-body text-lg font-semibold text-space-ivory sm:text-xl">
                    {section.heading}
                  </h2>
                  {section.body.length > 0 ? (
                    <div className="mt-4 space-y-4">
                      {section.body.map((paragraph, index) => (
                        <p
                          key={`${section.id}-${index}`}
                          className="text-sm leading-relaxed text-space-muted sm:text-[0.95rem]"
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
                      {stemfestDetailsCopy.pendingNote}
                    </p>
                  )}
                </article>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <ScrollReveal>
            <div className="mx-auto max-w-[46rem] border border-space-line-soft px-6 py-12 text-center">
              <Info
                className="mx-auto size-8 text-space-amber"
                aria-hidden="true"
              />
              <h2 className="mt-5 font-space-body text-base font-semibold uppercase tracking-[0.18em] text-space-ivory sm:text-lg">
                {stemfestDetailsCopy.pendingLabel}
              </h2>
              <p className="mx-auto mt-3 max-w-[34rem] text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
                {stemfestDetailsCopy.pendingNote}
              </p>
            </div>
          </ScrollReveal>
        )}
      </section>
    </div>
  );
}
