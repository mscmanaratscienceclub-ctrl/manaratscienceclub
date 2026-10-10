import { getPublishedPosts } from "@/db/queries/posts";
import CompetitionCarousel from "@/components/home/competition-carousel";
import EditorialVoices from "@/components/home/editorial-voices";
import JournalConsole, { type JournalPost } from "@/components/home/journal-console";
import ManifestoLines from "@/components/home/manifesto-lines";
import MscHero from "@/components/home/msc-hero";

// ISR: this page renders one query (`getPublishedPosts`) over static metrics, so a
// cache HIT replaces a per-visit DB render — an hour of staleness is the cheaper bill.
export const revalidate = 3600;

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
      <MscHero />
      <ManifestoLines />
      <CompetitionCarousel />
      <EditorialVoices />
      <JournalConsole posts={transmissions} />
    </div>
  );
}
