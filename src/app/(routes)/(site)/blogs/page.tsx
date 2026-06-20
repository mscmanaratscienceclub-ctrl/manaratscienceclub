import Link from "next/link";
import { getPublishedPosts } from "@/lib/actions/posts";
import { ArrowRight, BookOpen } from "lucide-react";

export const metadata = {
  title: "Research & Articles | Manarat Science Club",
  description:
    "Explore scientific research, articles, and publications from Manarat Science Club members.",
};

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function truncateExcerpt(text: string | null, maxLength = 120): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export default async function BlogsPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-manara-teal/5 via-cream to-manara-purple/5 px-4 py-20 text-center">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          Research &amp; Articles
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-ink/60">
          Discover scientific publications, research findings, and insightful
          articles authored by Manarat Science Club members.
        </p>
      </section>

      {/* Posts Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {posts.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blogs/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-manara-teal/10 bg-white shadow-subtle transition-all duration-300 hover:-translate-y-1 hover:shadow-academic"
              >
                {/* Card Body */}
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="font-display text-xl font-semibold text-ink transition-colors group-hover:text-manara-teal">
                    {post.title}
                  </h2>

                  <p className="mt-3 flex-1 font-body text-sm leading-relaxed text-ink/60">
                    {truncateExcerpt(post.excerpt)}
                  </p>

                  {/* Meta */}
                  <div className="mt-5 flex items-center justify-between border-t border-manara-teal/5 pt-4">
                    <div>
                      <p className="text-sm font-medium text-ink/80">
                        {post.authorName}
                      </p>
                      <p className="text-xs text-ink/40">
                        {formatDate(post.publishedAt)}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 text-sm font-medium text-manara-teal opacity-0 transition-opacity group-hover:opacity-100">
                      Read more
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen className="mb-4 h-12 w-12 text-ink/20" />
            <h2 className="font-display text-xl font-semibold text-ink/50">
              No articles published yet
            </h2>
            <p className="mt-2 font-body text-sm text-ink/40">
              Check back soon for new research and publications.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
