import Link from "next/link";
import { ArrowRight, GraduationCap, ArrowUpRight, Microscope, CalendarDays, Send } from "lucide-react";
import { getPublishedPosts } from "@/lib/actions/posts";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import RotatingText from "@/components/ui/rotating-text";
import { WobbleCard } from "@/components/ui/wobble-card";
export default async function HomePage() {
  const recentPosts = await getPublishedPosts(4, 0);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface to-cream">
        <div className="absolute inset-0 diagram-grid opacity-40" />
        <div className="absolute -top-48 -right-48 h-[500px] w-[500px] rounded-full bg-manara-teal/3 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[350px] w-[350px] rounded-full bg-manara-yellow/5 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 lg:px-8 lg:py-36">
          <div className="max-w-4xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-manara-teal/10 bg-surface px-4 py-2 font-display text-sm font-bold text-manara-teal shadow-subtle">
              <GraduationCap className="h-4 w-4 text-manara-yellow" />
              Evidence-based science learning for young innovators
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Opportunities on<br />
              <span className="text-manara-red">
                <RotatingText
                  texts={['what you dream', 'what you explore', 'what you build', 'what you discover']}
                  mainClassName=""
                  staggerFrom="last"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '-120%' }}
                  staggerDuration={0.025}
                  splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                  rotationInterval={2500}
                />
              </span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg font-medium leading-8 text-ink/60">
              A community where curious young minds explore science through research, discussion, and discovery — guided by mentors and driven by curiosity.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/opportunities"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-manara-teal px-8 py-4 font-display text-base font-bold text-white shadow-academic transition-all hover:-translate-y-1 hover:bg-manara-yellow hover:text-manara-teal hover:shadow-yellow"
              >
                View Academic Tracks
                <ArrowUpRight className="h-5 w-5" />
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-3 rounded-full border border-manara-teal/20 bg-surface px-8 py-4 font-display text-base font-bold text-manara-teal shadow-subtle transition-all hover:-translate-y-1 hover:border-manara-teal/40 hover:bg-manara-teal/5"
              >
                Join MSC
                <Microscope className="h-5 w-5" />
              </Link>
            </div>
            <div className="mt-16 flex flex-wrap items-center gap-x-12 gap-y-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-0.5 bg-manara-teal/15" />
                <div>
                  <p className="font-display text-3xl font-bold text-manara-red">450+</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">General Members</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-0.5 bg-manara-teal/15" />
                <div>
                  <p className="font-display text-3xl font-bold text-manara-yellow">30+</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Engineering Teams</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-0.5 bg-manara-teal/15" />
                <div>
                  <p className="font-display text-3xl font-bold text-manara-teal">61</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Accolades</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="bg-cream py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-8 grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-display text-base font-bold text-manara-red">Academic tracks</p>
              <h2 className="mt-3 font-display text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">Proven results at the highest level.</h2>
            </div>
            <p className="max-w-2xl text-lg font-medium leading-8 text-ink/65 lg:justify-self-end">Our members have consistently placed at national olympiads and international competitions. With weekly mentoring sessions and a track record of medalists, we turn ambitious students into champions.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 lg:grid-rows-2">
            {/* Left card - spans full height */}
            <WobbleCard
              containerClassName="lg:row-span-2 bg-gradient-to-br from-pink-500 to-rose-600"
              className="flex flex-col justify-center h-full"
            >
              <div className="flex flex-row items-center gap-6">
                <DotLottieReact
                  src="https://lottie.host/28b5853e-ed20-4d95-a0aa-0bfe8d2a5fa6/rHHhZUmMFO.lottie"
                  className="w-[140px] h-[140px] shrink-0"
                  loop={false}
                  autoplay
                />
                <div className="flex-1">
                  <h3 className="font-display text-3xl font-bold text-white leading-tight mb-3">
                    National Olympiad Success
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-white/90 max-w-sm">
                    Our students earn top distinctions at national science olympiads year after year through rigorous preparation and expert mentorship.
                  </p>
                </div>
              </div>
            </WobbleCard>

            {/* Right top card */}
            <WobbleCard
              containerClassName="bg-gradient-to-br from-purple-500 to-indigo-600"
              className="flex flex-col justify-center h-full"
            >
              <div className="flex flex-row items-center gap-4">
                <DotLottieReact
                  src="https://lottie.host/7296dff4-19f0-4692-a6fc-6fd27bc22280/GMbkMuCo3o.lottie"
                  className="w-[120px] h-[120px] shrink-0"
                  loop={false}
                  autoplay
                />
                <div className="flex-1">
                  <h3 className="font-display text-2xl font-bold text-white leading-tight mb-2">
                    International Medalists
                  </h3>
                  <p className="text-xs font-medium leading-relaxed text-white/85">
                    Multiple alumni represented on global stages, bringing home medals.
                  </p>
                </div>
              </div>
            </WobbleCard>

            {/* Right bottom card */}
            <WobbleCard
              containerClassName="bg-gradient-to-br from-blue-500 to-blue-600"
              className="flex flex-col justify-center h-full"
            >
              <div className="flex flex-row items-center gap-4">
                <DotLottieReact
                  src="https://lottie.host/d248abfd-3b2a-4f7d-8668-45b0bf9d7cad/fHawse3HuY.lottie"
                  className="w-[120px] h-[120px] shrink-0"
                  loop={false}
                  autoplay
                />
                <div className="flex-1">
                  <h3 className="font-display text-2xl font-bold text-white leading-tight mb-2">
                    Weekly mentoring sessions
                  </h3>
                  <p className="text-xs font-medium leading-relaxed text-white/85">
                    Structured weekly meetings covering concept mastery, problem-solving drills, mock competitions, and personalized feedback loops.
                  </p>
                </div>
              </div>
            </WobbleCard>
          </div>
        </div>
      </section>

      {/* Faculty Editorial */}
      <section className="py-12 md:py-16 relative overflow-hidden bg-surface">
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_30%,rgba(255,183,3,0.2)_0%,transparent_50%),radial-gradient(circle_at_80%_70%,rgba(220,38,38,0.15)_0%,transparent_50%),linear-gradient(135deg,rgba(0,95,107,0.1)_0%,rgba(255,183,3,0.1)_100%)]"></div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-manara-teal">Editorial</h2>
            <p className="text-sm sm:text-base max-w-2xl mx-auto font-semibold text-manara-teal">Words of wisdom from our faculty advisors</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="group relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,95,107,0.15)] hover:-translate-y-2 border-[3px] border-manara-yellow/40 bg-manara-teal/[0.04]">
              <div className="p-6 md:p-7 bg-surface/90 backdrop-blur-sm h-full flex flex-col justify-between">
                <div className="flex flex-col items-center text-center">
                  <img src="/memberimage/maksud.png" alt="Dr. Maksud Alam" className="h-40 w-40 rounded-full object-cover border-4 border-manara-yellow/30 shadow-xl mb-4" />
                  <h3 className="text-2xl md:text-3xl lg:text-4xl font-black mb-1 text-ink drop-shadow-lg">Dr. Maksud Alam</h3>
                  <p className="text-base md:text-lg font-bold text-manara-teal">MCCA Convener and Club In-Charge, MSC</p>
                  <p className="text-sm md:text-base leading-relaxed font-medium mt-6 text-ink/70">
                    The Manarat Science Club continues to shine as a vibrant center of creativity, curiosity, and scientific enthusiasm. This year, our students have achieved remarkable success, earning awards in science fairs, quiz competitions, and Olympiads. Their research projects and innovative models—ranging from environmental solutions to technological prototypes—have been widely appreciated for their originality and practical value.
                  </p>
                </div>
              </div>
            </div>
            <div className="group relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_20px_50px_rgba(255,183,3,0.15)] hover:-translate-y-2 border-[3px] border-manara-teal/40 bg-manara-yellow/[0.04]">
              <div className="p-6 md:p-7 bg-surface/90 backdrop-blur-sm h-full flex flex-col justify-between">
                <div className="flex flex-col items-center text-center">
                  <img src="/memberimage/roksana.png" alt="Roksana Khanam" className="h-40 w-40 rounded-full object-cover border-4 border-manara-teal/30 shadow-xl mb-4" />
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

                  className="group flex flex-col overflow-hidden rounded-2xl border border-manara-teal/10 bg-surface shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:shadow-academic"
                >
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-xl font-semibold text-ink transition-colors group-hover:text-manara-teal line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-ink/60 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-manara-teal/5 pt-4">
                      <p className="text-xs font-medium text-ink/80">{post.customAuthorName ?? post.authorName}</p>
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
      <section className="relative overflow-hidden bg-surface px-5 py-24 lg:px-8">
        <div className="absolute inset-0 dot-grid opacity-50"></div>
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[3rem] bg-cream p-8 shadow-academic md:p-12 lg:p-16 border border-manara-red/10">
          <div className="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center">
            <div>
              <p className="font-display text-base font-bold text-manara-red">Enrollment process</p>
              <h2 className="mt-3 font-display text-5xl font-bold leading-tight tracking-tight text-ink lg:text-6xl">Start with a structured pathway</h2>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-ink/65">You apply for the specific activity alongside your peers and you are assigned a mentor who will guide you</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/join" className="inline-flex items-center justify-center gap-3 rounded-full bg-manara-red px-8 py-4 font-display text-base font-bold text-white shadow-red transition hover:-translate-y-1 hover:bg-manara-yellow hover:text-manara-teal">
                  Apply Now <Send className="h-5 w-5" />
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] bg-manara-teal p-6 text-white shadow-xl">
              <h3 className="font-display text-2xl font-bold">How enrollment works</h3>
              <div className="mt-6 space-y-4">
                <div className="flex gap-4 rounded-2xl bg-surface/10 p-4"><span className="font-display text-2xl font-bold text-manara-yellow">1</span><div><p className="font-bold">Interest form</p><p className="text-sm text-white/65">Apply for a specific activity from a wide pool.</p></div></div>
                <div className="flex gap-4 rounded-2xl bg-surface/10 p-4"><span className="font-display text-2xl font-bold text-manara-yellow">2</span><div><p className="font-bold">Orientation</p><p className="text-sm text-white/65">Meet seniors who done it all..</p></div></div>
                <div className="flex gap-4 rounded-2xl bg-surface/10 p-4"><span className="font-display text-2xl font-bold text-manara-yellow">3</span><div><p className="font-bold">Project cycle</p><p className="text-sm text-white/65">Begin experiments, documentation, and review.</p></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
