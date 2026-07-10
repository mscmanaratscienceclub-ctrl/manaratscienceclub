import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getRelatedPosts } from "@/lib/actions/posts";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import TocSidebar from "../_components/toc-sidebar";
import sanitizeHtml from "sanitize-html";
import Image from "next/image";

// Force dynamic rendering — prevents Next.js from prerenderering all slugs
// in parallel at build time (would exhaust the Supabase free-tier pool)
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface TocItem {
  level: number;
  text: string;
  id: string;
}

// Reuse formatter instance to improve performance
const postDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: Date | null): string {
  if (!date) return "";
  return postDateFormatter.format(new Date(date));
}

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

function extractToc(html: string): TocItem[] {
  const items: TocItem[] = [];
  const re = /<h([123])[^>]*>([\s\S]*?)<\/h[123]>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]*>/g, "").trim();
    if (!text) continue;
    const id = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
    items.push({ level: Number(m[1]), text, id });
  }
  return items;
}

function injectHeadingIds(html: string): string {
  return html.replace(/<(h[123])([^>]*)>([\s\S]*?)<\/\1>/gi, (_, tag, attrs, content) => {
    const text = content.replace(/<[^>]*>/g, "").trim();
    const id = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
    return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
  });
}

function sanitizeAndInjectHeadingIds(html: string): string {
  // Use sanitize-html (already in dependencies) instead of fragile regexes.
  // This properly strips <script>, <iframe>, <object>, <embed>, event handlers, etc.
  const clean = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img", "h1", "h2", "h3", "figure", "figcaption", "video", "source",
      "details", "summary", "mark", "abbr", "sub", "sup",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      a: ["href", "target", "rel", "title"],
      "*": ["class"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        if (attribs.target === "_blank") {
          const currentRel = attribs.rel ? attribs.rel.split(/\s+/) : [];
          if (!currentRel.includes("noopener")) currentRel.push("noopener");
          if (!currentRel.includes("noreferrer")) currentRel.push("noreferrer");
          return {
            tagName,
            attribs: {
              ...attribs,
              rel: currentRel.join(" "),
            },
          };
        }
        return { tagName, attribs };
      },
    },
    disallowedTagsMode: "discard",
  });

  return injectHeadingIds(clean);
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  return {
    title: `${post.title} | Manarat Science Club`,
    description: post.excerpt ?? `Read "${post.title}" on Manarat Science Club.`,
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const readingTime = estimateReadingTime(post.content ?? "");
  const toc = extractToc(post.content ?? "");
  const relatedPosts = await getRelatedPosts(slug);
  const displayName = post.customAuthorName ?? post.authorName;
  const displayAvatar = post.customAuthorAvatar ?? null;

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <section className="bg-surface px-4 py-8 sm:py-12 sm:px-6 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/blogs"
            className="group mb-6 inline-flex items-center gap-1.5 rounded-full border border-manara-teal/10 bg-cream px-4 py-2 text-sm font-medium text-manara-teal transition-all hover:bg-manara-teal hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to articles
          </Link>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink/50">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {readingTime} min read
            </span>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <span key={tag} className="rounded-full bg-manara-teal/10 px-3 py-1 font-display text-xs font-bold text-manara-teal">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Content + Sidebar */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
          {/* Main Content */}
          <div className="min-w-0 flex-1">
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: sanitizeAndInjectHeadingIds(post.content ?? "") }}
            />
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-72 xl:w-80">
            <div className="space-y-6 lg:sticky lg:top-24">
              {/* Author card — table style */}
              <div className="rounded-2xl border border-manara-teal/10 bg-surface shadow-subtle">
                <div className="border-b border-manara-teal/10 px-5 py-3">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink/50">Author</h3>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-manara-teal text-sm font-bold text-white">
                      {displayAvatar ? (
                        <Image src={displayAvatar} alt={displayName ?? ""} width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        displayName?.charAt(0)?.toUpperCase() ?? "A"
                      )}
                    </div>
                    <div>
                      <p className="font-display text-base font-bold text-ink">{displayName}</p>
                      <p className="text-xs text-manara-teal">Author, MSC</p>
                      {post.customAuthorBio && (
                        <p className="mt-0.5 text-[11px] leading-tight text-ink/50">{post.customAuthorBio}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t border-manara-teal/10">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-manara-teal/5">
                        <td className="px-5 py-2.5 font-medium text-ink/50">Published</td>
                        <td className="px-5 py-2.5 text-ink/70">{formatDate(post.publishedAt)}</td>
                      </tr>
                      <tr className="border-b border-manara-teal/5">
                        <td className="px-5 py-2.5 font-medium text-ink/50">Read time</td>
                        <td className="px-5 py-2.5 text-ink/70">{readingTime} min</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5 font-medium text-ink/50">Type</td>
                        <td className="px-5 py-2.5 text-ink/70">Research Article</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table of Contents with scroll-spy */}
              <TocSidebar items={toc} />
            </div>
          </aside>
        </div>
      </div>

      {/* Related */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-manara-teal/10 bg-surface py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink">Related Articles</h2>
              <Link
                href="/blogs"
                className="inline-flex items-center gap-1.5 rounded-full bg-manara-teal px-4 py-2 font-display text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-academic"
              >
                View All <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/blogs/${related.slug}`}
                  className="group rounded-2xl border border-manara-teal/10 bg-cream p-6 transition-all hover:-translate-y-1 hover:shadow-academic"
                >
                  <h3 className="font-display text-lg font-bold text-ink transition-colors group-hover:text-manara-teal line-clamp-2">
                    {related.title}
                  </h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-ink/60 line-clamp-2">
                    {related.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-ink/40">
                    <span>{related.customAuthorName ?? related.authorName}</span>
                    <span className="text-ink/20">&middot;</span>
                    <span>{related.publishedAt ? formatDate(related.publishedAt) : ""}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="h-12" />
    </div>
  );
}
