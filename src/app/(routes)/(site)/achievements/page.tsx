import { Trophy, Medal, Star } from "lucide-react";
import ScrollReveal from "@/components/animations/ScrollReveal";

export const metadata = {
  title: "Achievements & Accolades | Manarat Science Club",
  description: "A catalog of institutional science fair victories, quiz competition records, and Olympiad successes.",
};

const achievements = [
  {
    id: 1,
    title: "National Science Olympiad",
    event: "Bangladesh Science Olympiad 2025",
    year: "2025",
    tier: "Gold Medalist",
    category: "Physics",
    icon: Trophy,
    iconClass: "text-space-amber border-space-amber/30",
  },
  {
    id: 2,
    title: "Eco-Bot Innovation",
    event: "Inter-School Robotics Championship",
    year: "2024",
    tier: "First Runner-Up",
    category: "Robotics",
    icon: Medal,
    iconClass: "text-ion border-ion-line",
  },
  {
    id: 3,
    title: "Quantum Materials Research",
    event: "National Science Fair",
    year: "2024",
    tier: "Best Project Award",
    category: "Research",
    icon: Star,
    iconClass: "text-space-sage border-space-sage/30",
  },
  {
    id: 4,
    title: "Bio-Waste Management Model",
    event: "Green Earth Summit",
    year: "2023",
    tier: "Grand Prize",
    category: "Biology",
    icon: Trophy,
    iconClass: "text-space-amber border-space-amber/30",
  },
];

export default function AchievementsPage() {
  return (
    <div className="min-h-screen bg-space-deep">
      <section className="border-b border-space-line-soft">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-16">
          <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
            {"01 — Honors log"}
          </p>
          <h1 className="mt-4 max-w-[46rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            Achievements & Accolades
          </h1>
          <p className="mt-5 max-w-[38rem] text-lg leading-relaxed text-space-muted">
            Celebrating our institutional victories, Olympiad successes, and innovative prototype exhibitions.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
        <ScrollReveal stagger={0.08} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {achievements.map((item) => (
              <article
                key={item.id}
                className="group flex flex-col border border-space-line-soft bg-space-deep/60 p-6 transition-colors hover:border-ion-line"
              >
                <div className={`mb-5 flex size-12 items-center justify-center border ${item.iconClass}`}>
                  <item.icon className="size-6" />
                </div>
                <h3 className="font-voyage text-lg font-bold uppercase leading-snug tracking-tight text-space-ivory transition-colors group-hover:text-ion-bright">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-space-muted">{item.event}</p>

                <div className="mt-auto flex items-center justify-between border-t border-space-line-soft pt-6">
                  <span className="border border-space-line-soft px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-space-muted">
                    {item.year}
                  </span>
                  <span className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-space-amber">
                    {item.tier}
                  </span>
                </div>
              </article>
            ))}
        </ScrollReveal>
      </section>
    </div>
  );
}
