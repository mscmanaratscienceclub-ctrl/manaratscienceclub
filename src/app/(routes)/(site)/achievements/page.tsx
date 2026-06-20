import { Trophy, Medal, Star } from "lucide-react";

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
    color: "text-manara-yellow",
    bg: "bg-manara-yellow/10",
  },
  {
    id: 2,
    title: "Eco-Bot Innovation",
    event: "Inter-School Robotics Championship",
    year: "2024",
    tier: "First Runner-Up",
    category: "Robotics",
    icon: Medal,
    color: "text-manara-teal",
    bg: "bg-manara-teal/10",
  },
  {
    id: 3,
    title: "Quantum Materials Research",
    event: "National Science Fair",
    year: "2024",
    tier: "Best Project Award",
    category: "Research",
    icon: Star,
    color: "text-manara-purple",
    bg: "bg-manara-purple/10",
  },
  {
    id: 4,
    title: "Bio-Waste Management Model",
    event: "Green Earth Summit",
    year: "2023",
    tier: "Grand Prize",
    category: "Biology",
    icon: Trophy,
    color: "text-manara-pink",
    bg: "bg-manara-pink/10",
  },
];

export default function AchievementsPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-manara-teal/5 via-cream to-manara-yellow/5 px-4 py-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-manara-yellow to-orange-400 shadow-yellow">
            <Trophy className="h-8 w-8 text-white" />
          </div>
        </div>
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          Achievements & Accolades
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink/60">
          Celebrating our institutional victories, Olympiad successes, and innovative prototype exhibitions.
        </p>
      </section>

      {/* Grid Section */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {achievements.map((item) => (
            <div
              key={item.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-manara-teal/10 bg-white shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:shadow-academic p-6"
            >
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${item.bg} ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-ink group-hover:text-manara-teal transition-colors">
                {item.title}
              </h3>
              <p className="mt-2 text-sm font-semibold text-ink/70">
                {item.event}
              </p>
              
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-manara-teal/5">
                <span className="inline-flex rounded-full bg-cream px-2.5 py-1 text-xs font-bold text-ink/60">
                  {item.year}
                </span>
                <span className="font-display text-sm font-bold text-manara-yellow">
                  {item.tier}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
