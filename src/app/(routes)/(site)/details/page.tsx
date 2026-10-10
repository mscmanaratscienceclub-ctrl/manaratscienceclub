import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Info,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";

import ScrollReveal from "@/components/animations/ScrollReveal";
import {
  categorySchemes,
  festBasics,
  festSocials,
  formatTaka,
  olympiadFormat,
  prizePoolTotal,
  scheduleBody,
  segmentRows,
  stemfestDetailLinks,
  stemfestDetailsCopy,
  type StemfestCategoryScheme,
  type StemfestEventRow,
} from "@/lib/data/stemfest-details";

export const metadata: Metadata = {
  title: "STEM Fest 2026-27 Details — Segments, Prize Pools, Categories & Venue",
  description:
    "The full MDIC STEM-FEST 2026-27 brief: 16th–17th October 2026 at Manarat Dhaka International School and College, with prize pools for Olympiads, Robotics, Project Display and E-sports, who each event is open to, how the Olympiad papers are set, and the registration, rules and syllabus pages.",
};

function EventRow({ event }: { event: StemfestEventRow }) {
  return (
    <li className="border border-space-line-soft bg-space-black/20 px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h4 className="font-voyage text-sm font-bold uppercase tracking-tight text-space-ivory">
          {event.name}
        </h4>
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-ion">
            {event.eligibility}
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted">
            {event.teamBased ? (
              <Users className="size-3.5" aria-hidden="true" />
            ) : null}
            {event.entryMode}
          </span>
        </p>
      </div>

      {event.detail ? (
        <p className="mt-3 text-sm leading-relaxed text-pretty text-space-muted sm:text-[0.95rem]">
          {event.detail}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
          {stemfestDetailsCopy.detailPendingLead}{" "}
          <Link
            href="/resources"
            className="text-ion underline decoration-ion-line underline-offset-4 transition-colors hover:text-ion-bright"
          >
            {stemfestDetailsCopy.detailPendingLink}
          </Link>
          .
        </p>
      )}

      {event.points.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-l border-ion-line pl-4">
          {event.points.map((point) => (
            <li
              key={point}
              className="text-sm leading-relaxed text-space-muted sm:text-[0.95rem]"
            >
              {point}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CategoryBlock({ scheme }: { scheme: StemfestCategoryScheme }) {
  return (
    <div>
      <h3 className="font-voyage text-sm font-bold uppercase tracking-tight text-space-ivory">
        {scheme.heading}
      </h3>
      <p className="mt-2 max-w-[44rem] text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
        {scheme.note}
      </p>

      <ul className="mt-4 divide-y divide-space-line-soft border border-space-line-soft">
        {scheme.rows.map((row) => (
          <li key={row.id} className="px-4 py-3">
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-space-body text-sm font-semibold text-space-ivory">
                {row.title}
              </span>
              <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-ion">
                {row.classes}
              </span>
            </p>
            {row.placements.length > 0 ? (
              <p className="mt-1.5 font-mono text-[0.6rem] uppercase leading-relaxed tracking-[0.12em] text-space-muted/80">
                {row.placements.join(" · ")}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StemfestDetailsPage() {
  const facts = [
    {
      id: "dates",
      label: stemfestDetailsCopy.datesLabel,
      value: festBasics.dates,
      Icon: CalendarDays,
    },
    {
      id: "venue",
      label: stemfestDetailsCopy.venueLabel,
      value: `${festBasics.venue.name}, ${festBasics.venue.address}`,
      Icon: MapPin,
    },
    {
      id: "prize",
      label: stemfestDetailsCopy.prizeLabel,
      value: formatTaka(prizePoolTotal),
      Icon: Trophy,
    },
  ];

  return (
    <main className="min-h-screen bg-space-deep">
      <section
        aria-labelledby="fest-heading"
        className="relative overflow-hidden border-b border-space-line-soft"
      >
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
          <h1
            id="fest-heading"
            className="mt-5 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl"
          >
            {festBasics.name}
          </h1>
          <p className="mt-5 max-w-[42rem] text-base leading-relaxed text-space-muted md:text-lg">
            {stemfestDetailsCopy.subheading}
          </p>

          <dl className="mt-10 grid gap-6 border-t border-space-line-soft pt-6 sm:grid-cols-2 lg:grid-cols-3">
            {facts.map(({ id, label, value, Icon }) => (
              <div key={id}>
                <dt className="flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted">
                  <Icon className="size-3.5 text-ion" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-2 font-space-body text-sm leading-snug text-space-ivory sm:text-base">
                  {value}
                  {id === "prize" ? (
                    <span className="mt-1 block font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted/80">
                      {stemfestDetailsCopy.prizeNote}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="segments-heading"
        className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <h2
          id="segments-heading"
          className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl"
        >
          {stemfestDetailsCopy.segmentsHeading}
        </h2>
        <p className="mt-3 max-w-[42rem] text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
          {stemfestDetailsCopy.segmentsLead}
        </p>

        <div className="mt-10 space-y-12">
          {segmentRows.map((segment) => (
            <ScrollReveal key={segment.id}>
              <article className="grid gap-6 border-t border-space-line-soft pt-6 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-4">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-xs font-medium tracking-[0.2em] text-ion">
                      {segment.index}
                    </span>
                    <h3 className="font-voyage text-lg font-bold uppercase tracking-tight text-space-ivory">
                      {segment.name}
                    </h3>
                  </div>
                  <p className="mt-2 font-space-body text-sm font-semibold text-space-amber">
                    {stemfestDetailsCopy.prizePoolLabel}{" "}
                    {formatTaka(segment.prizePool)}
                  </p>
                  <p className="mt-4 max-w-[32rem] font-space-body text-sm leading-relaxed text-pretty text-space-muted">
                    {segment.blurb}
                  </p>
                </div>

                <ul className="space-y-3 lg:col-span-8">
                  {segment.events.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </ul>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="format-heading"
        className="mx-auto w-full max-w-[1440px] border-t border-space-line-soft px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2
              id="format-heading"
              className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl"
            >
              {stemfestDetailsCopy.formatHeading}
            </h2>
            <p className="mt-3 max-w-[32rem] text-sm leading-relaxed text-pretty text-space-muted sm:text-[0.95rem]">
              {stemfestDetailsCopy.formatLead}
            </p>
          </div>

          <ScrollReveal className="lg:col-span-8">
            <ul className="divide-y divide-space-line-soft border border-space-line-soft">
              {olympiadFormat.map((point) => (
                <li
                  key={point}
                  className="flex gap-4 px-5 py-4 text-sm leading-relaxed text-space-muted sm:text-[0.95rem]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 bg-ion"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      <section
        aria-labelledby="categories-heading"
        className="mx-auto w-full max-w-[1440px] border-t border-space-line-soft px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <h2
          id="categories-heading"
          className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl"
        >
          {stemfestDetailsCopy.categoriesHeading}
        </h2>
        <p className="mt-3 max-w-[42rem] text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
          {stemfestDetailsCopy.categoriesLead}
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          {categorySchemes.map((scheme) => (
            <ScrollReveal key={scheme.id}>
              <CategoryBlock scheme={scheme} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="schedule-heading"
        className="mx-auto w-full max-w-[1440px] border-t border-space-line-soft px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <h2
          id="schedule-heading"
          className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl"
        >
          {stemfestDetailsCopy.scheduleHeading}
        </h2>

        <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-6">
            {scheduleBody.length > 0 ? (
              <div className="space-y-4">
                {scheduleBody.map((paragraph, index) => (
                  <p
                    key={`${stemfestDetailsCopy.scheduleHeading}-${index}`}
                    className="text-sm leading-relaxed text-space-muted sm:text-[0.95rem]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-space-line-soft px-5 py-6">
                <Info className="size-5 text-space-amber" aria-hidden="true" />
                <p className="mt-3 font-space-body text-xs font-semibold uppercase tracking-[0.18em] text-space-ivory">
                  {stemfestDetailsCopy.pendingLabel}
                </p>
                <p className="mt-2 max-w-[34rem] text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
                  {stemfestDetailsCopy.pendingNote}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            <h3 className="font-space-body text-base font-semibold text-space-ivory sm:text-lg">
              {stemfestDetailsCopy.socialHeading}
            </h3>
            <p className="mt-3 max-w-[34rem] text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
              {stemfestDetailsCopy.socialLead}
            </p>

            <ul className="mt-5 space-y-3">
              {festSocials.map((social) => (
                <li key={social.id}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-4 border border-space-line-soft px-5 py-4 transition-colors hover:border-ion-line"
                  >
                    <span>
                      <span className="block font-space-body text-sm font-semibold text-space-ivory">
                        {social.label}
                      </span>
                      <span className="mt-0.5 block font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted">
                        {social.handle}
                      </span>
                    </span>
                    <ExternalLink
                      className="size-4 shrink-0 text-space-muted transition-colors group-hover:text-ion-bright"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Opens in a new tab</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="links-heading"
        className="mx-auto w-full max-w-[1440px] border-t border-space-line-soft px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
      >
        <h2
          id="links-heading"
          className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory sm:text-2xl"
        >
          {stemfestDetailsCopy.linksHeading}
        </h2>
        <p className="mt-3 max-w-[42rem] text-sm leading-relaxed text-space-muted sm:text-[0.95rem]">
          {stemfestDetailsCopy.linksLead}
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stemfestDetailLinks.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex h-full flex-col justify-between gap-6 border border-space-line-soft bg-space-black/20 px-5 py-5 transition-colors hover:border-ion-line"
              >
                <span>
                  <span className="block font-voyage text-sm font-bold uppercase tracking-tight text-space-ivory">
                    {item.label}
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-pretty text-space-muted">
                    {item.description}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ion">
                  Open
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap items-center gap-6 border-t border-space-line-soft pt-8">
          <Link href="/stemfestreg" className="msc-btn-pill">
            Register for STEM Fest
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
