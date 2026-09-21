import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ScrollReveal from "@/components/animations/ScrollReveal";
import { dressCodeGroups, eventRulesCopy } from "@/lib/data/event-rules";

export const metadata: Metadata = {
  title: "Dress Code & Identification Guidelines — STEM Fest 2026",
  description:
    "Dress code and identification guidelines for STEM Fest 2026 at Manarat Dhaka International School and College (MDIC): uniforms and ID cards for MDIC students and participants, other schools' participants, private candidates, and parents and visitors.",
};

export default function RulesPage() {
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
            {eventRulesCopy.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {eventRulesCopy.heading}
          </h1>
          <p className="mt-5 max-w-[42rem] text-base leading-relaxed text-space-muted md:text-lg">
            {eventRulesCopy.intro}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[46rem] space-y-6">
          {dressCodeGroups.map((group) => (
            <ScrollReveal key={group.id}>
              <article>
                <h2 className="font-space-body text-base font-semibold text-space-ivory sm:text-lg">
                  {group.heading}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
                  {group.text}
                </p>
              </article>
            </ScrollReveal>
          ))}

          <ScrollReveal>
            <div className="space-y-5 pt-8">
              <p className="text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
                {eventRulesCopy.closing}
              </p>
              <p className="text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
                {eventRulesCopy.thanks}
              </p>
              <p className="font-space-body text-sm font-semibold text-space-ivory">
                {eventRulesCopy.signOff.committee}
              </p>
              <p className="font-space-body text-sm text-space-muted">
                {eventRulesCopy.signOff.institution}
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mt-10 border-t border-space-line-soft pt-8">
              <Link href="/register" className="msc-btn-pill">
                Register for STEM Fest
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
