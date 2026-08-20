import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy, Users } from "lucide-react";

import ScrollReveal from "@/components/animations/ScrollReveal";
import { achievements, events, projects, teams, type Achievement } from "@/lib/data";

export const metadata = {
  title: "Robotics | Manarat Science Club",
  description:
    "The Robotics Division of Manarat Science Club — project displays, olympiad results, and competition history.",
};

const tierStyles: Record<Achievement["tier"], string> = {
  gold: "bg-manara-yellow/15 text-manara-yellow",
  silver: "bg-space-muted/20 text-space-muted",
  bronze: "bg-space-amber/15 text-space-amber",
  merit: "bg-space-sage/15 text-space-sage",
};

const tierLabels: Record<Achievement["tier"], string> = {
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  merit: "Merit",
};

function SectionHeading({ number, kicker, title }: { number: string; kicker: string; title: string }) {
  return (
    <div className="mb-10">
      <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
        {number} · {kicker}
      </p>
      <h2 className="mt-3 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory lg:text-3xl">
        {title}
      </h2>
    </div>
  );
}

export default function RoboticsPage() {
  const team = teams.find((t) => t.id === "team-robotics")!;
  const roboticsProjects = projects.filter((project) => project.team === team.name);
  const honors = achievements.filter((a) => /robot/i.test(`${a.title} ${a.description}`));
  const roboticsEvents = events.filter((event) => event.tags.includes("robotics"));

  const stats = [
    { label: "Active Members", value: String(team.memberCount) },
    { label: "Open Positions", value: String(team.openPositions) },
    { label: "Projects Built", value: String(roboticsProjects.length) },
    { label: "Honors Won", value: String(honors.length) },
  ];

  return (
    <div className="min-h-screen bg-space-deep">
      {/* Hero */}
      <section className="border-b border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-16">
          <ScrollReveal>
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
              MSC · Robotics Division
            </p>
            <h1 className="mt-3 font-voyage text-4xl font-bold uppercase tracking-tight text-space-ivory lg:text-6xl">
              Robotics
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-space-muted sm:text-base">
              {team.description} From line-followers that train new members to
              autonomous machines that win national honors, this is everything
              the division has built and where it competes next.
            </p>
          </ScrollReveal>

          <ScrollReveal stagger={0.08} className="mt-12 grid gap-px border border-space-line-soft bg-space-line-soft sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-space-deep p-6">
                <p className="font-voyage text-3xl font-bold text-space-ivory">{stat.value}</p>
                <p className="mt-1 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-space-muted">
                  {stat.label}
                </p>
              </div>
            ))}
          </ScrollReveal>

          <ScrollReveal className="mt-8 flex flex-wrap gap-2.5">
            {team.focus.map((area) => (
              <span
                key={area}
                className="border border-ion-line px-3 py-1.5 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-ion"
              >
                {area}
              </span>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* Project display */}
      <section className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <SectionHeading number="01" kicker="Builds" title="Project Display" />
        <ScrollReveal stagger={0.08} className="grid gap-6 md:grid-cols-2">
          {roboticsProjects.map((project) => (
            <article key={project.id} className="flex flex-col border border-space-line-soft bg-space-deep/60 p-6 transition-colors hover:border-ion-line">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] ${
                    project.status === "completed"
                      ? "bg-space-sage/15 text-space-sage"
                      : "bg-ion/10 text-ion"
                  }`}
                >
                  {project.status}
                </span>
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-space-muted/70">
                  {project.id}
                </span>
              </div>

              <h3 className="mt-4 font-voyage text-lg font-bold uppercase leading-snug tracking-tight text-space-ivory">
                {project.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-space-muted">{project.description}</p>

              <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-ion">Objectives</p>
              <ul className="mt-2 space-y-1.5">
                {project.goals.map((goal) => (
                  <li key={goal} className="flex gap-3 text-sm leading-relaxed text-space-muted">
                    <span aria-hidden="true" className="mt-[0.55em] size-1 shrink-0 bg-ion" />
                    {goal}
                  </li>
                ))}
              </ul>

              <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-ion">Hardware</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.materials.map((material) => (
                  <span key={material} className="border border-space-line-soft px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-wide text-space-muted">
                    {material}
                  </span>
                ))}
              </div>

              <p className="mt-5 flex items-center gap-2 border-t border-space-line-soft pt-4 text-xs text-space-muted">
                <Users className="size-3.5 text-ion" aria-hidden="true" />
                {project.members.join(" · ")}
              </p>
            </article>
          ))}
        </ScrollReveal>
      </section>

      {/* Olympiads & competitions */}
      <section className="border-t border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <SectionHeading number="02" kicker="Competitions" title="Olympiads & Honors" />
          <ScrollReveal stagger={0.08} className="grid gap-6 lg:grid-cols-2">
            {honors.map((honor) => (
              <article key={honor.id} className="border border-space-line-soft bg-space-deep/60 p-6 transition-colors hover:border-ion-line">
                <div className="flex items-center gap-3">
                  <Trophy className="size-4 text-ion" aria-hidden="true" />
                  <span className={`rounded-full px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] ${tierStyles[honor.tier]}`}>
                    {tierLabels[honor.tier]}
                  </span>
                  <span className="ml-auto font-mono text-xs text-space-muted">{honor.year}</span>
                </div>
                <h3 className="mt-4 font-voyage text-lg font-bold uppercase leading-snug tracking-tight text-space-ivory">
                  {honor.title}
                </h3>
                <p className="mt-1 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-ion">
                  {honor.eventName}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-space-muted">{honor.description}</p>
              </article>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* Upcoming + CTA */}
      <section className="border-t border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <SectionHeading number="03" kicker="Next Mission" title="Where to See Us" />
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              {roboticsEvents.map((event) => (
                <div key={event.id} className="flex flex-wrap items-center gap-4 border border-space-line-soft bg-space-deep/60 p-5">
                  <CalendarDays className="size-5 shrink-0 text-ion" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-voyage text-base font-bold uppercase tracking-tight text-space-ivory">{event.title}</p>
                    <p className="mt-0.5 font-mono text-[0.64rem] uppercase tracking-[0.18em] text-space-muted">
                      {event.date} · {event.time} · {event.location}
                    </p>
                  </div>
                  <span className="rounded-full bg-ion/10 px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ion">
                    {event.status}
                  </span>
                </div>
              ))}
              <Link href="/events" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.24em] text-ion transition-colors hover:text-ion-bright">
                Full events calendar
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="flex flex-col justify-center border border-ion-line bg-ion-deep/30 p-8">
              <h3 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">
                Want to build with us?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-space-muted">
                The division has {team.openPositions} open positions. No prior
                robotics experience required — every build doubles as training.
              </p>
              <Link
                href="/join"
                className="mt-6 inline-flex h-11 w-fit items-center gap-2 bg-ion px-6 font-mono text-xs font-bold uppercase tracking-[0.24em] text-space-deep transition-colors hover:bg-ion-bright"
              >
                Join MSC
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
