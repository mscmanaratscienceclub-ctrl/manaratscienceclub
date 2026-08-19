import { getPublishedPosts } from "@/lib/actions/posts";
import DivisionsPan from "@/components/home/divisions-pan";
import JournalConsole, { type JournalPost } from "@/components/home/journal-console";
import ManifestoLines from "@/components/home/manifesto-lines";
import SignalHero from "@/components/home/signal-hero";
import Telemetry from "@/components/home/telemetry";

// Force dynamic rendering — prevents Next.js prerendering in parallel
// which would exhaust the Supabase free-tier connection pool
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function HomePage() {
  let transmissions: JournalPost[] = [];

  try {
    const posts = await getPublishedPosts(3, 0);
    transmissions = posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      author: post.customAuthorName ?? post.authorName ?? "MSC Member",
      date: post.publishedAt ? dateFormatter.format(new Date(post.publishedAt)) : "",
      tag: post.tags?.[0]?.trim() ?? "research",
    }));
  } catch {
    transmissions = [];
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-space-deep text-space-ivory">
      <SignalHero />
      <ManifestoLines />
      <DivisionsPan />
      <Telemetry />
      <JournalConsole posts={transmissions} />
    </div>
  );
}
