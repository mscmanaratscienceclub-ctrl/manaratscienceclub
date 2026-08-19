import { Code2, Bot, FlaskConical, Presentation, Users } from "lucide-react";
import Link from "next/link";
import ScrollReveal from "@/components/animations/ScrollReveal";

export const metadata = {
  title: "Opportunities & Teams | Manarat Science Club",
  description: "Active engineering teams, project repositories, and specialized divisions.",
};

const teams = [
  {
    icon: FlaskConical,
    title: "Experimental Lab",
    description: "Focused on chemistry, biology experiments, and scientific modeling.",
    members: "12 Members",
    iconClass: "text-space-amber border-space-amber/30",
  },
  {
    icon: Code2,
    title: "Software Division",
    description: "Building apps, simulations, and data analysis pipelines.",
    members: "8 Members",
    iconClass: "text-ion border-ion-line",
  },
  {
    icon: Bot,
    title: "Robotics Core",
    description: "Developing hardware prototypes, sensor systems, and drones.",
    members: "15 Members",
    iconClass: "text-ion-bright border-ion-line",
  },
  {
    icon: Presentation,
    title: "Research Studio",
    description: "Drafting publications, gathering literature, and organizing talks.",
    members: "10 Members",
    iconClass: "text-space-amber-bright border-space-amber/30",
  },
];

export default function OpportunitiesPage() {
  return (
    <div className="min-h-screen bg-space-deep">
      <section className="border-b border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-16">
          <ScrollReveal>
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
              {"// 01 — Crew"}
            </p>
            <h1 className="mt-4 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
              Opportunities & Teams
            </h1>
            <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-space-muted">
              Discover our specialized active engineering divisions, ongoing innovative prototypes, and opening positions.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <div className="mb-12">
          <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
            Active divisions
          </p>
          <h2 className="mt-3 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory lg:text-3xl">
            Active Engineering Teams
          </h2>
          <p className="mt-3 max-w-[36rem] text-space-muted">
            Join a specialized division focused on hands-on building and research.
          </p>
        </div>

        <ScrollReveal stagger={0.08} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <article
              key={team.title}
              className="flex flex-col border border-space-line-soft bg-space-deep/60 p-6 transition-colors hover:border-ion-line"
            >
              <div className={`mb-5 flex size-14 items-center justify-center border ${team.iconClass}`}>
                <team.icon className="size-7" />
              </div>
              <h3 className="font-voyage text-lg font-bold uppercase leading-snug tracking-tight text-space-ivory">
                {team.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-space-muted">{team.description}</p>
              <span className="mt-5 w-fit border border-space-line-soft px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-space-muted">
                {team.members}
              </span>
            </article>
          ))}
        </ScrollReveal>
      </section>

      <section className="border-t border-space-line-soft bg-space-ink/60 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-16">
          <ScrollReveal className="max-w-[40rem]">
            <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
              {"// Recruiting"}
            </p>
            <h2 className="mt-3 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory lg:text-3xl">
              Open Positions
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-space-muted">
              We are constantly looking for enthusiastic individuals to join our core operations. Whether you are interested in hardware, software, or editorial work, there is a place for you.
            </p>
            <Link href="/join" className="signal-btn-primary mt-8">
              Apply to Join <Users className="size-4" />
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
