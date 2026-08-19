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
    <div className="min-h-screen bg-space-deep">
      {/* Header */}
      <section className="border-b border-space-line-soft px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/blogs"
            className="group mb-6 inline-flex items-center gap-1.5 border border-ion-line px-4 py-2 font-mono text-[0.64rem] font-medium uppercase tracking-[0.2em] text-ion transition-colors hover:border-ion hover:text-ion-bright"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Back to articles
          </Link>
          <h1 className="mt-4 font-voyage text-3xl font-bold uppercase leading-[1.12] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-space-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4 text-ion" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-ion" />
              {readingTime} min read
            </span>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <span key={tag} className="border border-ion-line bg-ion/10 px-3 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-ion">
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
              <div className="border border-space-line-soft bg-space-deep/60">
                <div className="border-b border-space-line-soft px-5 py-3">
                  <h3 className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-muted">Author</h3>
                </div>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden border border-ion-line bg-ion-deep font-mono text-sm font-bold text-ion-bright">
                      {displayAvatar ? (
                        <Image src={displayAvatar} alt={displayName ?? ""} width={40} height={40} className="h-full w-full object-cover" />
                      ) : (
                        displayName?.charAt(0)?.toUpperCase() ?? "A"
                      )}
                    </div>
                    <div>
                      <p className="font-voyage text-sm font-bold uppercase tracking-tight text-space-ivory">{displayName}</p>
                      <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-ion">Author, MSC</p>
                      {post.customAuthorBio && (
                        <p className="mt-0.5 text-[11px] leading-tight text-space-muted">{post.customAuthorBio}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="border-t border-space-line-soft">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-space-line-soft">
                        <td className="px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted">Published</td>
                        <td className="px-5 py-2.5 text-space-ivory/75">{formatDate(post.publishedAt)}</td>
                      </tr>
                      <tr className="border-b border-space-line-soft">
                        <td className="px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted">Read time</td>
                        <td className="px-5 py-2.5 text-space-ivory/75">{readingTime} min</td>
                      </tr>
                      <tr>
                        <td className="px-5 py-2.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted">Type</td>
                        <td className="px-5 py-2.5 text-space-ivory/75">Research Article</td>
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
        <section className="border-t border-space-line-soft bg-space-ink/60 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">Related Articles</h2>
              <Link href="/blogs" className="signal-btn-ghost !px-4 !py-2">
                View All <ArrowLeft className="size-4 rotate-180" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/blogs/${related.slug}`}
                  className="group border border-space-line-soft bg-space-deep/60 p-6 transition-colors hover:border-ion-line"
                >
                  <h3 className="line-clamp-2 font-voyage text-base font-bold uppercase leading-snug tracking-tight text-space-ivory transition-colors group-hover:text-ion-bright">
                    {related.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-space-muted">
                    {related.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-space-muted">
                    <span>{related.customAuthorName ?? related.authorName}</span>
                    <span className="text-space-line">&middot;</span>
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
