"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  Users,
  Layers,
  Microscope,
  Filter,
  Star,
  BookOpen,
  UserRound,
  CalendarDays,
  Clock,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTagConfig } from "@/lib/tag-styles";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  authorId: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  authorName: string | null;
  customAuthorName: string | null;
  tags: string[] | null;
}

interface BlogsContentProps {
  posts: Post[];
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(date: Date | null): string {
  if (!date) return "";
  return dateFormatter.format(new Date(date));
}

function estimateReadingTime(text: string | null): number {
  if (!text) return 1;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export default function BlogsContent({ posts }: BlogsContentProps) {
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const { sortedTags, authorCount } = useMemo(() => {
    const tagsMap: Record<string, number> = {};
    const authorIds = new Set<string>();

    posts.forEach((post) => {
      authorIds.add(post.authorId);
      if (post.tags) {
        post.tags.forEach((tag) => {
          if (tag) {
            const lowerTag = tag.trim().toLowerCase();
            tagsMap[lowerTag] = (tagsMap[lowerTag] || 0) + 1;
          }
        });
      }
    });

    const sorted = Object.entries(tagsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { sortedTags: sorted, authorCount: authorIds.size };
  }, [posts]);

  const featuredPost = posts[0];

  const isPostVisible = (post: Post) => {
    if (selectedTag === "all") return true;
    if (!post.tags) return false;
    return post.tags.some((tag) => tag.trim().toLowerCase() === selectedTag);
  };

  const visiblePostsCount = posts.filter(isPostVisible).length;

  return (
    <div className="min-h-screen bg-space-deep font-space-body text-space-ivory">
      {/* Hero Section */}
      <section className="border-b border-space-line-soft">
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-16 lg:py-20">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 border border-ion-line px-4 py-1.5">
              <Sparkles className="size-3.5 text-ion" />
              <span className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
                Student Research Hub
              </span>
            </div>
            <h1 className="font-voyage text-4xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory lg:text-5xl">
              Research & <span className="text-ion-bright">Articles</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-space-muted">
              Discover scientific publications, research findings, and insightful
              articles authored by Manarat Science Club members.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6 font-mono text-[0.64rem] uppercase tracking-[0.2em] text-space-muted">
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-ion" /> {posts.length} Publications
              </span>
              <span className="flex items-center gap-2">
                <Users className="size-4 text-ion" /> {authorCount} Authors
              </span>
              <span className="flex items-center gap-2">
                <Layers className="size-4 text-ion" /> {sortedTags.length} Tags
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[320px] flex-col items-center justify-center overflow-hidden border border-space-line-soft bg-space-deep/60 p-10">
            <div aria-hidden="true" className="space-grain absolute inset-0" />
            <div aria-hidden="true" className="msc-atmosphere absolute inset-0 opacity-60" />
            <div className="relative flex h-full min-h-[240px] flex-col items-center justify-center gap-6 text-center">
              <div className="flex size-24 items-center justify-center border border-ion-line bg-space-deep">
                <Microscope className="size-12 text-ion" />
              </div>
              <div className="flex max-w-xs flex-col items-center gap-2">
                <div className="flex justify-center -space-x-3">
                  <span className="flex -rotate-3 items-center gap-1.5 border border-space-line-soft bg-space-deep px-3.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-space-ivory/80">
                    <span className="size-1.5 bg-space-amber" />
                    Astronomy
                  </span>
                  <span className="z-10 flex rotate-2 items-center gap-1.5 border border-space-line-soft bg-space-deep px-3.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-space-ivory/80">
                    <span className="size-1.5 bg-ion" />
                    Biology
                  </span>
                </div>
                <div className="flex justify-center -space-x-3">
                  <span className="z-10 flex rotate-3 items-center gap-1.5 border border-space-line-soft bg-space-deep px-3.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-space-ivory/80">
                    <span className="size-1.5 bg-ion-bright" />
                    Physics
                  </span>
                  <span className="flex -rotate-2 items-center gap-1.5 border border-space-line-soft bg-space-deep px-3.5 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-space-ivory/80">
                    <span className="size-1.5 bg-space-amber-bright" />
                    Robotics
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="mx-auto w-full max-w-[1440px] px-5 py-14 sm:px-8 lg:px-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_340px]">
          {/* Left Column: Filters and Posts */}
          <div className="space-y-10">
            {/* Filter Bar */}
            <div>
              <h2 className="mb-6 flex items-center gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-space-ivory">
                <Filter className="size-4 text-ion" /> Filter by tags
              </h2>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setSelectedTag("all")}
                  className={cn(
                    "cursor-pointer border px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] transition-all",
                    selectedTag === "all"
                      ? "border-ion bg-ion/10 text-ion-bright"
                      : "border-space-line-soft text-space-muted hover:border-ion-line hover:text-space-ivory",
                  )}
                >
                  All <span className="opacity-70">{posts.length}</span>
                </button>
                {sortedTags.slice(0, 10).map((tagObj) => {
                  const config = getTagConfig(tagObj.name);
                  const isActive = selectedTag === tagObj.name;
                  return (
                    <button
                      key={tagObj.name}
                      onClick={() => setSelectedTag(tagObj.name)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 border px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] transition-all",
                        isActive
                          ? "border-ion bg-ion/10 text-ion-bright"
                          : "border-space-line-soft text-space-muted hover:border-ion-line hover:text-space-ivory",
                      )}
                    >
                      <span
                        className="size-1.5"
                        style={{ background: isActive ? "var(--ion-bright)" : config.dot }}
                      />
                      {config.name} <span className="opacity-55">{tagObj.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Featured Post */}
            {featuredPost && (
              <div className={cn("transition-all duration-300", !isPostVisible(featuredPost) && "opacity-30 saturate-50")}>
                <div className="mb-4 flex items-center gap-2">
                  <Star className="size-4 fill-space-amber text-space-amber" />
                  <h3 className="font-mono text-[0.64rem] font-semibold uppercase tracking-[0.24em] text-space-muted">
                    Featured Spotlight
                  </h3>
                </div>
                <Link
                  href={`/blogs/${featuredPost.slug}`}
                  className="group relative block overflow-hidden border border-space-line-soft bg-space-deep/60 transition-colors duration-300 hover:border-ion-line"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-0.5"
                    style={{
                      background: getTagConfig(
                        featuredPost.tags && featuredPost.tags[0]
                          ? featuredPost.tags[0]
                          : "physics",
                      ).dot,
                    }}
                  />
                  <div className="flex flex-col items-start justify-between gap-6 p-5 sm:p-8 md:flex-row">
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        {featuredPost.tags &&
                          featuredPost.tags.slice(0, 3).map((tag) => {
                            const conf = getTagConfig(tag);
                            return (
                              <span
                                key={tag}
                                className="flex items-center gap-1.5 border border-space-line-soft px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em]"
                                style={{ background: conf.bg, color: conf.text }}
                              >
                                <span className="size-1" style={{ background: conf.dot }} />
                                {conf.name}
                              </span>
                            );
                          })}
                      </div>
                      <h3 className="font-voyage text-2xl font-bold uppercase leading-snug tracking-tight text-space-ivory transition-colors group-hover:text-ion-bright">
                        {featuredPost.title}
                      </h3>
                      <p className="leading-relaxed text-space-muted">{featuredPost.excerpt}</p>
                      <div className="flex flex-wrap items-center gap-5 pt-2 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-space-muted">
                        <span className="flex items-center gap-1.5">
                          <UserRound className="size-3.5 text-ion" />
                          {featuredPost.customAuthorName ?? featuredPost.authorName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-3.5 text-ion" />
                          {formatDate(featuredPost.publishedAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5 text-ion" />
                          {estimateReadingTime(featuredPost.excerpt)} min read
                        </span>
                      </div>
                    </div>
                    <div className="flex size-20 shrink-0 items-center justify-center border border-ion-line">
                      <BookOpen className="size-9 text-ion" />
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* All Articles Section */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">
                  All Articles
                </h3>
                <span className="font-mono text-[0.64rem] uppercase tracking-[0.18em] text-space-muted">
                  Showing {visiblePostsCount} results
                </span>
              </div>

              {visiblePostsCount > 0 ? (
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                  {posts.map((post) => {
                    const firstTag = post.tags && post.tags[0] ? post.tags[0] : "article";
                    const tagConf = getTagConfig(firstTag);
                    const isVisible = isPostVisible(post);

                    return (
                      <Link
                        key={post.id}
                        href={`/blogs/${post.slug}`}
                        className={cn(
                          "group relative flex flex-col overflow-hidden border border-space-line-soft bg-space-deep/60 p-6 transition-all duration-300 hover:border-ion-line",
                          !isVisible && "pointer-events-none opacity-30 saturate-50",
                        )}
                      >
                        <div
                          className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                          style={{ background: tagConf.dot }}
                        />
                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <span
                              className="mb-3.5 inline-flex items-center gap-1.5 border border-space-line-soft px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.14em]"
                              style={{ background: tagConf.bg, color: tagConf.text }}
                            >
                              <span className="size-1" style={{ background: tagConf.dot }} />
                              {tagConf.name}
                            </span>
                            <h3 className="line-clamp-2 font-voyage text-lg font-bold uppercase leading-snug tracking-tight text-space-ivory transition-colors duration-200 group-hover:text-ion-bright">
                              {post.title}
                            </h3>
                            <p className="mt-2.5 line-clamp-3 text-sm leading-relaxed text-space-muted">
                              {post.excerpt}
                            </p>
                          </div>

                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-space-line-soft pt-4">
                            <div className="flex flex-wrap items-center gap-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-space-muted">
                              <span className="flex items-center gap-1">
                                <UserRound className="size-3.5 text-ion" />
                                {post.customAuthorName ?? post.authorName}
                              </span>
                              <span>·</span>
                              <span>{formatDate(post.publishedAt)}</span>
                            </div>
                            <span
                              className="shrink-0 border border-space-line-soft px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em]"
                              style={{ background: tagConf.bg, color: tagConf.text }}
                            >
                              {firstTag}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center border border-space-line-soft bg-space-deep/60 p-8 py-20 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center border border-ion-line">
                    <BookOpen className="size-8 text-ion" />
                  </div>
                  <h3 className="font-voyage text-lg font-bold uppercase tracking-tight text-space-ivory/80">
                    No articles found for this tag
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-space-muted">
                    Check out another tag or browse all publications to find
                    interesting read-ups.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="border border-space-line-soft bg-space-deep/60 p-6">
              <h4 className="mb-4 flex items-center gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-space-ivory">
                <Hash className="size-4 text-ion" /> Browse Tags
              </h4>
              <div className="max-h-[320px] space-y-1 overflow-y-auto pr-1">
                {sortedTags.map((tagObj) => {
                  const config = getTagConfig(tagObj.name);
                  const isCurrent = selectedTag === tagObj.name;
                  return (
                    <button
                      key={tagObj.name}
                      onClick={() => applyFilterFromSidebar(tagObj.name)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-ion/5",
                        isCurrent && "bg-ion/5",
                      )}
                    >
                      <span className="flex items-center gap-2.5 text-sm font-medium text-space-ivory/80">
                        <span className="size-2" style={{ background: config.dot }} />
                        {config.name}
                      </span>
                      <span className="border border-space-line-soft px-2 py-0.5 font-mono text-[0.6rem] text-space-muted">
                        {tagObj.count}
                      </span>
                    </button>
                  );
                })}
                {sortedTags.length === 0 && (
                  <p className="py-2 text-sm text-space-muted">No tags available.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );

  function applyFilterFromSidebar(topicKey: string) {
    if (selectedTag === topicKey) {
      setSelectedTag("all");
    } else {
      setSelectedTag(topicKey);
    }
  }
}
