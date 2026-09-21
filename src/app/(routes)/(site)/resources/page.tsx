import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  FileText,
  MapPin,
  ScrollText,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import ScrollReveal from "@/components/animations/ScrollReveal";
import {
  generalResources,
  resourceEntries,
  resourcesCopy,
} from "@/lib/data/resources";

export const metadata: Metadata = {
  title: "Resources — Rulebooks & Segment Briefs | STEM Fest",
  description:
    "Rulebooks and practical information for every STEM Fest segment at Manarat Science Club — Olympiads, Robotics, Project Display, E-sports and the Fun Segment.",
};

const GENERAL_ICONS: Record<string, LucideIcon> = {
  rules: ScrollText,
  registration: Ticket,
  schedule: CalendarClock,
  venue: MapPin,
};

export default function ResourcesPage() {
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
            {resourcesCopy.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[40rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {resourcesCopy.heading}
          </h1>
          <p className="mt-5 max-w-[42rem] text-base leading-relaxed text-space-muted md:text-lg">
            {resourcesCopy.subheading}
          </p>
        </div>
      </section>

      {/* ── General information ─────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <ScrollReveal>
          <header className="max-w-[46rem] border-t border-space-line-soft pt-6">
            <h2 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl">
              {resourcesCopy.generalHeading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-space-muted sm:text-base">
              {resourcesCopy.generalLead}
            </p>
          </header>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {generalResources.map((resource) => {
              const Icon = GENERAL_ICONS[resource.id] ?? BookOpen;

              return (
                <li
                  key={resource.id}
                  className="flex flex-col border border-space-line-soft bg-space-black/20 p-6"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center border border-ion-line text-ion">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-voyage text-sm font-bold uppercase tracking-tight text-space-ivory">
                    {resource.label}
                  </h3>
                  <p className="mt-3 font-space-body text-sm leading-relaxed text-pretty text-space-muted">
                    {resource.description}
                  </p>

                  {resource.href ? (
                    <Link
                      href={resource.href}
                      className="mt-auto inline-flex items-center gap-2 pt-6 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ion transition-colors hover:text-ion-bright"
                    >
                      Open
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <p className="mt-auto pt-6 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted/70">
                      {resourcesCopy.pendingLabel}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollReveal>
      </section>

      {/* ── Segment index ───────────────────────────────────────────────────── */}
      <section className="border-t border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <ScrollReveal>
            <header className="max-w-[46rem]">
              <h2 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl">
                {resourcesCopy.segmentsHeading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-space-muted sm:text-base">
                {resourcesCopy.segmentsLead}
              </p>
            </header>
          </ScrollReveal>

          <div className="mt-10 space-y-12">
            {resourceEntries.map((entry) => (
              <ScrollReveal key={entry.segmentId}>
                <article className="grid gap-6 border-t border-space-line-soft pt-6 lg:grid-cols-12 lg:gap-10">
                  {/* Segment identity — names straight from the catalogue */}
                  <div className="lg:col-span-4">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-xs font-medium tracking-[0.2em] text-ion">
                        {entry.index}
                      </span>
                      <h3 className="font-voyage text-lg font-bold uppercase tracking-tight text-space-ivory">
                        {entry.heading}
                      </h3>
                    </div>

                    {entry.items.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-2">
                        {entry.items.map((item) => (
                          <li
                            key={item}
                            className="border border-space-line-soft px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 font-space-body text-sm text-space-muted">
                        {resourcesCopy.emptyItemsNote}
                      </p>
                    )}
                  </div>

                  {/* Reserved space for the published detail */}
                  <div className="lg:col-span-8">
                    <div className="border border-dashed border-space-line-soft bg-space-black/20 p-6">
                      <p className="flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted/80">
                        <FileText className="size-3.5" aria-hidden="true" />
                        {resourcesCopy.rulebookLabel} — {resourcesCopy.pendingLabel}
                      </p>
                      <p className="mt-3 max-w-[42rem] font-space-body text-sm leading-relaxed text-space-muted">
                        {entry.details ?? resourcesCopy.pendingNote}
                      </p>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
