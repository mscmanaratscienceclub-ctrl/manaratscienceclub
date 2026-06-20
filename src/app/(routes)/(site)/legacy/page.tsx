import { History, BookOpen, Quote } from "lucide-react";

export const metadata = {
  title: "Institutional Legacy | Manarat Science Club",
  description: "The history, founding, and progression of the Manarat Science Club over time.",
};

export default function LegacyPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-manara-teal/5 via-cream to-manara-purple/5 px-4 py-20 text-center border-b border-manara-teal/10">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          Institutional Legacy
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink/60">
          The history, founding year, and structural progression of the club over time.
        </p>
      </section>

      {/* Content Section */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <article className="prose prose-lg prose-ink mx-auto font-body text-ink/75">
          <p className="lead text-xl text-ink/80 font-medium">
            Since its inception, the Manarat Science Club has been a beacon of curiosity and innovation. It started as a small gathering of enthusiastic students and has grown into a structured organization dedicated to fostering scientific temper.
          </p>
          
          <h2 className="font-display text-3xl font-bold text-ink mt-12 mb-6 flex items-center gap-3">
            <History className="h-8 w-8 text-manara-yellow" />
            The Genesis
          </h2>
          <p>
            The club was founded with a simple mission: to take science beyond the textbook. Early activities were primarily focused on simple lab experiments and participating in inter-school science fairs. However, as the student body grew more ambitious, so did the club.
          </p>

          <blockquote className="border-l-4 border-manara-teal pl-6 my-8 italic text-ink/60 relative">
            <Quote className="absolute -left-3 -top-3 h-8 w-8 text-manara-teal/20" />
            Science is not just a subject learned in classrooms—it is a mindset of inquiry, observation, and discovery.
          </blockquote>

          <h2 className="font-display text-3xl font-bold text-ink mt-12 mb-6 flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-manara-purple" />
            Structural Progression
          </h2>
          <p>
            Over the years, the club expanded into specialized divisions. What was once a general science club is now structured into engineering teams, experimental labs, and a dedicated research studio. 
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-4 marker:text-manara-teal">
            <li><strong>Phase I:</strong> Formation of the general science assembly.</li>
            <li><strong>Phase II:</strong> Introduction of competitive Olympiad training.</li>
            <li><strong>Phase III:</strong> The launch of specialized tracks: Robotics, Creative Coding, and Biology.</li>
            <li><strong>Phase IV:</strong> The establishment of the Research Hub and bimonthly student-led science journals.</li>
          </ul>

          <p className="mt-8">
            Today, the Manarat Science Club stands as a testament to what young minds can achieve when given the right platform, mentorship, and resources. Our legacy is not just in the accolades we win, but in the curiosity we spark in every new generation of students.
          </p>
        </article>
      </section>
    </div>
  );
}
