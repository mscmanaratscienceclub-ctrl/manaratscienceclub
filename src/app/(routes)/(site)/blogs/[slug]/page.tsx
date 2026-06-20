import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug } from "@/lib/actions/posts";
import { ArrowLeft, Calendar, Clock, UserRound } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `${post.title} | Manarat Science Club`,
    description: post.excerpt ?? `Read "${post.title}" on Manarat Science Club.`,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const readingTime = estimateReadingTime(post.content ?? "");

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream/50 to-white">
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        {/* Back Link */}
        <Link
          href="/blogs"
          className="group mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-manara-teal transition-colors hover:text-manara-teal/80"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to articles
        </Link>

        {/* Title */}
        <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>

        {/* Metadata Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-manara-teal/10 pb-6 text-sm text-ink/50">
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-4 w-4" />
            {post.authorName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatDate(post.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {readingTime} min read
          </span>
        </div>

        {/* Content Body */}
        <div
          className="blog-content mt-10"
          dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
        />
      </article>
    </div>
  );
}
