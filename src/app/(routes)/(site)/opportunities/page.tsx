import { Code2, Bot, FlaskConical, Presentation, Users } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Opportunities & Teams | Manarat Science Club",
  description: "Active engineering teams, project repositories, and specialized divisions.",
};

export default function OpportunitiesPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero Section */}
      <section className="bg-cream px-4 py-20 text-center border-b border-manara-teal/10">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          Opportunities & Teams
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink/60">
          Discover our specialized active engineering divisions, ongoing innovative prototypes, and opening positions.
        </p>
      </section>

      {/* Teams Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-bold text-ink mb-2">Active Engineering Teams</h2>
          <p className="font-body text-ink/60">Join a specialized division focused on hands-on building and research.</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-[2rem] border border-manara-red/10 bg-white p-6 shadow-subtle flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-manara-red/10 text-manara-red">
              <FlaskConical className="h-8 w-8" />
            </div>
            <h3 className="font-display text-xl font-bold text-ink">Experimental Lab</h3>
            <p className="mt-3 text-sm text-ink/60 flex-1">
              Focused on chemistry, biology experiments, and scientific modeling.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-cream px-3 py-1 text-xs font-bold text-ink/50">
              12 Members
            </span>
          </article>
          
          <article className="rounded-[2rem] border border-manara-yellow/10 bg-white p-6 shadow-subtle flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-manara-yellow/10 text-manara-yellow">
              <Code2 className="h-8 w-8" />
            </div>
            <h3 className="font-display text-xl font-bold text-ink">Software Division</h3>
            <p className="mt-3 text-sm text-ink/60 flex-1">
              Building apps, simulations, and data analysis pipelines.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-cream px-3 py-1 text-xs font-bold text-ink/50">
              8 Members
            </span>
          </article>

          <article className="rounded-[2rem] border border-manara-teal/10 bg-white p-6 shadow-subtle flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-manara-teal/10 text-manara-teal">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="font-display text-xl font-bold text-ink">Robotics Core</h3>
            <p className="mt-3 text-sm text-ink/60 flex-1">
              Developing hardware prototypes, sensor systems, and drones.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-cream px-3 py-1 text-xs font-bold text-ink/50">
              15 Members
            </span>
          </article>

          <article className="rounded-[2rem] border border-manara-red/10 bg-white p-6 shadow-subtle flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-manara-red/10 text-manara-red">
              <Presentation className="h-8 w-8" />
            </div>
            <h3 className="font-display text-xl font-bold text-ink">Research Studio</h3>
            <p className="mt-3 text-sm text-ink/60 flex-1">
              Drafting publications, gathering literature, and organizing talks.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-cream px-3 py-1 text-xs font-bold text-ink/50">
              10 Members
            </span>
          </article>
        </div>
      </section>

      {/* Projects Repository Preview */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl font-bold text-ink mb-6">Open Positions</h2>
          <p className="font-body text-ink/60 max-w-2xl mx-auto mb-10">
            We are constantly looking for enthusiastic individuals to join our core operations. Whether you are interested in hardware, software, or editorial work, there is a place for you.
          </p>
          <Link
            href="/join"
            className="inline-flex items-center gap-2 rounded-full bg-manara-red px-8 py-4 font-display text-base font-bold text-white shadow-red transition hover:-translate-y-1 hover:bg-manara-yellow hover:text-manara-teal"
          >
            Apply to Join <Users className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
