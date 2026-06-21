import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, Atom, Users, Trophy, GraduationCap, ArrowUpRight, Microscope, FlaskConical, Code2, Bot, Presentation, Medal, BadgeCheck, LineChart, CalendarDays, Send, FileText } from "lucide-react";
import { getPublishedPosts } from "@/lib/actions/posts";

export default async function HomePage() {
  const posts = await getPublishedPosts();
  const recentPosts = posts.slice(0, 4);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 diagram-grid opacity-80" />
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <div className="fade-up relative z-10 flex flex-col justify-center max-w-4xl">
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-manara-red/15 bg-cream px-4 py-2 font-display text-sm font-bold text-manara-red">
              <GraduationCap className="h-5 w-5 text-manara-yellow" />
              Evidence-based science learning for young innovators
            </div>
            <h1 className="max-w-4xl font-display text-5xl font-bold leading-[0.98] tracking-tight text-manara-teal sm:text-6xl lg:text-7xl">
              Opportunities on<br />
              <span className="">what you dream</span>
            </h1>
            <p className="mt-7 max-w-3xl text-lg font-medium leading-8 text-ink/70">
              What if black holes aren&apos;t just places where things vanish, but doorways to other dimensions? These are questions that sparked MSC – a club where curious young minds socialize, research, and discuss topics that intrigue them.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/opportunities"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-manara-teal px-8 py-4 font-display text-base font-bold text-white shadow-academic transition hover:-translate-y-1 hover:bg-manara-yellow hover:text-manara-teal"
              >
                View Academic Tracks
                <ArrowUpRight className="h-5 w-5" />
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-3 rounded-full border border-manara-teal/20 bg-white px-8 py-4 font-display text-base font-bold text-manara-teal shadow-subtle transition hover:-translate-y-1 hover:border-manara-yellow"
              >
                Join MSC
                <Microscope className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-12 grid max-w-2xl grid-cols-3 overflow-hidden rounded-[2rem] border border-manara-teal/10 bg-white shadow-subtle">
              <div className="p-5">
                <p className="font-display text-3xl font-bold text-manara-red">450+</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">General Members</p>
              </div>
              <div className="border-x border-manara-teal/10 p-5">
                <p className="font-display text-3xl font-bold text-manara-yellow">30+</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">Engineering Teams</p>
              </div>
              <div className="p-5">
                <p className="font-display text-3xl font-bold text-manara-teal">61</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink/50">Accolades</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="bg-cream py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-display text-base font-bold text-manara-red">Academic tracks</p>
              <h2 className="mt-3 font-display text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">Organized programs with measurable outcomes.</h2>
            </div>
            <p className="max-w-2xl text-lg font-medium leading-8 text-ink/65 lg:justify-self-end">Each track follows a structured progression: concept foundation, guided application, independent project, peer review, and final presentation.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-4">
            <article className="rounded-[2rem] border border-manara-teal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manara-yellow text-manara-teal"><FlaskConical className="h-7 w-7" /></div>
              <h3 className="font-display text-2xl font-bold text-ink">Experimental Science</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-ink/60">Observation, variables, measurement, safety, and lab reporting.</p>
              <ul className="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li className="flex gap-2">Hypothesis design</li>
                <li className="flex gap-2">Data recording</li>
                <li className="flex gap-2">Lab presentation</li>
              </ul>
            </article>
            <article className="rounded-[2rem] border border-manara-teal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manara-purple text-white"><Code2 className="h-7 w-7" /></div>
              <h3 className="font-display text-2xl font-bold text-ink">Creative Coding</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-ink/60">Computational logic, simulation, problem decomposition, and digital prototypes.</p>
              <ul className="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li className="flex gap-2">Algorithmic thinking</li>
                <li className="flex gap-2">Interactive models</li>
                <li className="flex gap-2">Debugging habits</li>
              </ul>
            </article>
            <article className="rounded-[2rem] border border-manara-teal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manara-teal text-white"><Bot className="h-7 w-7" /></div>
              <h3 className="font-display text-2xl font-bold text-ink">Robotics Systems</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-ink/60">Sensors, actuators, circuit basics, control logic, and iterative design.</p>
              <ul className="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li className="flex gap-2">Sensor calibration</li>
                <li className="flex gap-2">Prototype testing</li>
                <li className="flex gap-2">Team engineering</li>
              </ul>
            </article>
            <article className="rounded-[2rem] border border-manara-teal/10 bg-white p-6 shadow-subtle transition hover:-translate-y-1 hover:shadow-academic">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-manara-red text-white"><Presentation className="h-7 w-7" /></div>
              <h3 className="font-display text-2xl font-bold text-ink">Research Studio</h3>
              <p className="mt-3 text-sm font-medium leading-6 text-ink/60">Field notes, literature exploration, visual evidence, and academic communication.</p>
              <ul className="mt-5 space-y-2 text-sm font-semibold text-ink/70">
                <li className="flex gap-2">Research question</li>
                <li className="flex gap-2">Poster design</li>
                <li className="flex gap-2">Public defense</li>
              </ul>
            </article>
          </div>
        </div>
      </section>

      {/* Faculty Editorial */}
      <section className="py-12 md:py-16 relative overflow-hidden bg-white">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_30%,rgba(255,183,3,0.2)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(220,38,38,0.15)_0%,transparent_50%),linear-gradient(135deg,rgba(0,95,107,0.1)_0%,rgba(255,183,3,0.1)_100%)]"></div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-manara-teal">Editorial</h2>
            <p className="text-sm sm:text-base max-w-2xl mx-auto font-semibold text-manara-teal">Words of wisdom from our faculty advisors</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="group relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,95,107,0.15)] hover:-translate-y-2 border-[3px] border-manara-yellow/40 bg-manara-teal/[0.04]">
              <div className="p-6 md:p-7 bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black mb-1 text-ink drop-shadow-lg">Dr. Maksud Alam</h3>
                  <p className="text-base md:text-lg font-bold text-manara-teal">MCCA Convener and Club In-Charge, MSC</p>
                  <p className="text-sm md:text-base leading-relaxed font-medium mt-6 text-ink/70">
                    The Manarat Science Club continues to shine as a vibrant center of creativity, curiosity, and scientific enthusiasm. This year, our students have achieved remarkable success, earning awards in science fairs, quiz competitions, and Olympiads. Their research projects and innovative models—ranging from environmental solutions to technological prototypes—have been widely appreciated for their originality and practical value.
                  </p>
                </div>
              </div>
            </div>
            <div className="group relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(255,183,3,0.15)] hover:-translate-y-2 border-[3px] border-manara-teal/40 bg-manara-yellow/[0.04]">
              <div className="p-6 md:p-7 bg-white/90 backdrop-blur-sm h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black mb-1 text-ink drop-shadow-lg">Roksana Khanam</h3>
                  <p className="text-base md:text-lg font-bold text-manara-yellow">Club In-Charge, MSC</p>
                  <p className="text-sm md:text-base leading-relaxed font-medium mt-6 text-ink/70">
                    It gives me immense pleasure to share a few words on behalf of Manarat Science Club. Science is not just a subject learned in classrooms—it is a mindset of inquiry, observation, and discovery. Our club is committed to nurturing this curiosity and empowering our students to think critically and creatively about the world around them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts Section */}
      <section className="py-16 md:py-20 bg-cream">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl sm:text-4xl font-black text-manara-teal">Recent Research</h2>
            <Link
              href="/blogs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-lg text-sm bg-manara-yellow text-manara-teal hover:-translate-y-1 hover:bg-manara-red hover:text-white"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blogs/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-manara-teal/10 bg-white shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:shadow-academic"
                >
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl font-semibold text-ink transition-colors group-hover:text-manara-teal line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-ink/60 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-manara-teal/5 pt-4">
                      <p className="text-xs font-medium text-ink/80">{post.authorName}</p>
                      <span className="text-xs text-ink/40">
                        {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-ink/60 col-span-full">No articles published yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-white px-5 py-24 lg:px-8">
        <div className="absolute inset-0 dot-grid opacity-50"></div>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[3rem] bg-cream p-8 shadow-academic md:p-12 lg:p-16 border border-manara-red/10">
          <div className="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center">
            <div>
              <p className="font-display text-base font-bold text-manara-red">Enrollment process</p>
              <h2 className="mt-3 font-display text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">Start with a structured science pathway.</h2>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-ink/65">Submit interest, attend an orientation session, choose a track, and begin a mentor-guided project cycle.</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/join" className="inline-flex items-center justify-center gap-3 rounded-full bg-manara-red px-8 py-4 font-display text-base font-bold text-white shadow-red transition hover:-translate-y-1 hover:bg-manara-yellow hover:text-manara-teal">
                  Apply Now <Send className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] bg-manara-teal p-6 text-white shadow-xl">
              <h3 className="font-display text-2xl font-bold">How enrollment works</h3>
              <div className="mt-6 space-y-4">
                <div className="flex gap-4 rounded-2xl bg-white/10 p-4"><span className="font-display text-2xl font-bold text-manara-yellow">1</span><div><p className="font-bold">Interest form</p><p className="text-sm text-white/65">Tell us your goals and preferred track.</p></div></div>
                <div className="flex gap-4 rounded-2xl bg-white/10 p-4"><span className="font-display text-2xl font-bold text-manara-yellow">2</span><div><p className="font-bold">Orientation</p><p className="text-sm text-white/65">Meet mentors and review expectations.</p></div></div>
                <div className="flex gap-4 rounded-2xl bg-white/10 p-4"><span className="font-display text-2xl font-bold text-manara-yellow">3</span><div><p className="font-bold">Project cycle</p><p className="text-sm text-white/65">Begin experiments, documentation, and review.</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
