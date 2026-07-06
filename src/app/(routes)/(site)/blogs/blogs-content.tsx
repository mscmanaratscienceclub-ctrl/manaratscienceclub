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
  TrendingUp,
  Send,
  ArrowRight,
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

// Hoist formatter to avoid re-instantiation in loops
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

  // Memoize tag extraction and author count to avoid O(N) operations on every re-render
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

  // Filter posts based on tag selection
  const isPostVisible = (post: Post) => {
    if (selectedTag === "all") return true;
    if (!post.tags) return false;
    return post.tags.some((tag) => tag.trim().toLowerCase() === selectedTag);
  };

  const visiblePostsCount = posts.filter(isPostVisible).length;

  const trendingItems = [
    {
      id: "1",
      num: "01",
      title: "Mapping Sunspot Cycles with a Backyard Telescope",
      topic: "Astronomy",
      read: "8 min",
    },
    {
      id: "2",
      num: "02",
      title: "CRISPR Explained for High Schoolers",
      topic: "Biology",
      read: "5 min",
    },
    {
      id: "3",
      num: "03",
      title: "Building a Line-Following Robot in a Weekend",
      topic: "Robotics",
      read: "7 min",
    },
    {
      id: "4",
      num: "04",
      title: "The Chemistry of Color-Changing Reactions",
      topic: "Chemistry",
      read: "4 min",
    },
    {
      id: "5",
      num: "05",
      title: "Why Prime Numbers Never Stop",
      topic: "Mathematics",
      read: "6 min",
    },
  ];

  return (
    <div className="font-body min-h-screen bg-cream text-ink">
      {/* Hero Section */}
      <section className="bg-surface border-b border-manara-teal/10">
        <div className="max-w-7xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 bg-manara-teal/7">
              <Sparkles className="w-3.5 h-3.5 text-manara-teal" />
              <span className="font-display font-medium text-sm text-manara-teal">
                Student Research Hub
              </span>
            </div>
            <h1 className="font-display font-bold leading-[1.05] text-5xl lg:text-6xl text-ink">
              Research &amp; <span className="text-manara-teal">Articles</span>
            </h1>
            <p className="mt-6 text-lg max-w-xl leading-relaxed text-ink/60">
              Discover scientific publications, research findings, and insightful
              articles authored by Manarat Science Club members.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm font-display font-medium text-ink/55">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-manara-teal" /> {posts.length}{" "}
                Publications
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-manara-teal" /> {authorCount} Authors
              </span>
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-manara-teal" /> {sortedTags.length} Tags
              </span>
            </div>
          </div>

          <div className="relative rounded-[2rem] p-10 overflow-hidden bg-manara-teal/5 min-h-[320px] flex flex-col items-center justify-center">
            <div className="absolute inset-0 dot-grid opacity-60"></div>
            <div className="relative h-full flex flex-col items-center justify-center text-center gap-6 min-h-[240px]">
              <div className="w-24 h-24 rounded-3xl bg-surface shadow-subtle flex items-center justify-center">
                <Microscope className="w-12 h-12 text-manara-teal" />
              </div>
              <div className="flex flex-col items-center gap-2 max-w-xs">
                <div className="flex justify-center -space-x-3">
                  <span className="px-3.5 py-1.5 rounded-full bg-surface text-xs font-display font-medium shadow-subtle flex items-center gap-1.5 -rotate-3">
                    <span className="w-2 h-2 rounded-full bg-manara-purple"></span>
                    Astronomy
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-surface text-xs font-display font-medium shadow-subtle flex items-center gap-1.5 rotate-2 z-10">
                    <span className="w-2 h-2 rounded-full bg-manara-pink"></span>
                    Biology
                  </span>
                </div>
                <div className="flex justify-center -space-x-3">
                  <span className="px-3.5 py-1.5 rounded-full bg-surface text-xs font-display font-medium shadow-subtle flex items-center gap-1.5 rotate-3 z-10">
                    <span className="w-2 h-2 rounded-full bg-manara-blue"></span>
                    Physics
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-surface text-xs font-display font-medium shadow-subtle flex items-center gap-1.5 -rotate-2">
                    <span className="w-2 h-2 rounded-full bg-manara-yellow"></span>
                    Robotics
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid lg:grid-cols-[1fr_340px] gap-10 items-start">
          {/* Left Column: Filters and Posts */}
          <div className="space-y-10">
            {/* Filter Bar */}
            <div>
              <h2 className="font-display font-bold text-xl mb-6 flex items-center gap-2 text-ink">
                <Filter className="w-5 h-5 text-manara-teal" /> Filter by tags
              </h2>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => setSelectedTag("all")}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-display font-medium border transition-all cursor-pointer",
                    selectedTag === "all"
                      ? "bg-manara-teal border-manara-teal text-white shadow-subtle"
                      : "bg-surface border-manara-teal/15 text-ink/75 hover:border-manara-teal/40"
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
                        "rounded-full px-4 py-2 text-sm font-display font-medium border flex items-center gap-2 transition-all cursor-pointer",
                        isActive
                          ? "bg-manara-teal border-manara-teal text-white shadow-subtle"
                          : "bg-surface border-manara-teal/15 text-ink/75 hover:border-manara-teal/40"
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: isActive ? "#fff" : config.dot,
                        }}
                      ></span>
                      {config.name}{" "}
                      <span className="opacity-55">{tagObj.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Featured Post */}
            {featuredPost && (
              <div className={cn("transition-all duration-350", !isPostVisible(featuredPost) && "opacity-30 saturate-40")}>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-manara-yellow fill-manara-yellow" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider text-ink/50">
                    Featured Spotlight
                  </h3>
                </div>
                <Link
                  href={`/blogs/${featuredPost.slug}`}
                  className="group relative block rounded-2xl bg-surface border border-manara-teal/10 shadow-subtle hover:shadow-academic overflow-hidden transition-all duration-300"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{
                      background: getTagConfig(
                        featuredPost.tags && featuredPost.tags[0]
                          ? featuredPost.tags[0]
                          : "physics"
                      ).dot,
                    }}
                  ></div>
                  <div className="p-8 flex flex-col md:flex-row gap-6 items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        {featuredPost.tags &&
                          featuredPost.tags.slice(0, 3).map((tag) => {
                            const conf = getTagConfig(tag);
                            return (
                              <span
                                key={tag}
                                className="px-3 py-1 rounded-full text-xs font-display font-semibold flex items-center gap-1.5"
                                style={{ background: conf.bg, color: conf.text }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ background: conf.dot }}
                                ></span>
                                {conf.name}
                              </span>
                            );
                          })}
                      </div>
                      <h3 className="font-display font-bold text-2xl leading-snug text-ink transition-colors group-hover:text-manara-teal">
                        {featuredPost.title}
                      </h3>
                      <p className="leading-relaxed text-ink/65 font-body">
                        {featuredPost.excerpt}
                      </p>
                      <div className="pt-2 flex flex-wrap items-center gap-5 text-sm text-ink/45">
                        <span className="flex items-center gap-1.5">
                          <UserRound className="w-3.5 h-3.5 text-manara-teal" />{" "}
                          {featuredPost.customAuthorName ?? featuredPost.authorName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-manara-teal" />{" "}
                          {formatDate(featuredPost.publishedAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-manara-teal" />{" "}
                          {estimateReadingTime(featuredPost.excerpt)} min read
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center bg-manara-teal/10">
                      <BookOpen className="w-9 h-9 text-manara-teal" />
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* All Articles Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-bold text-2xl text-ink">
                  All Articles
                </h3>
                <span className="text-sm font-display text-ink/45">
                  Showing {visiblePostsCount} results
                </span>
              </div>

              {visiblePostsCount > 0 ? (
                <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
                  {posts.map((post) => {
                    const firstTag = post.tags && post.tags[0] ? post.tags[0] : "article";
                    const tagConf = getTagConfig(firstTag);
                    const isVisible = isPostVisible(post);

                    return (
                      <Link
                        key={post.id}
                        href={`/blogs/${post.slug}`}
                       
                        className={cn(
                          "group relative flex flex-col rounded-2xl bg-surface border border-manara-teal/10 shadow-subtle hover:shadow-academic p-6 overflow-hidden transition-all duration-300",
                          !isVisible && "opacity-30 saturate-40 pointer-events-none"
                        )}
                      >
                        <div
                          className="absolute top-0 left-0 right-0 h-1.5 transition-transform duration-300 scale-x-0 group-hover:scale-x-100 origin-left"
                          style={{ background: tagConf.dot }}
                        ></div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-semibold mb-3.5"
                              style={{
                                background: tagConf.bg,
                                color: tagConf.text,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ background: tagConf.dot }}
                              ></span>
                              {tagConf.name}
                            </span>
                            <h3 className="font-display font-bold text-xl leading-snug line-clamp-2 text-ink group-hover:text-manara-teal transition-colors duration-250">
                              {post.title}
                            </h3>
                            <p className="mt-2.5 text-sm leading-relaxed text-ink/60 line-clamp-3 font-body">
                              {post.excerpt}
                            </p>
                          </div>

                          <div className="mt-5 pt-4 border-t border-manara-teal/8 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 text-xs text-ink/45 flex-wrap font-body">
                              <span className="flex items-center gap-1">
                                <UserRound className="w-3.5 h-3.5 text-manara-teal" />{" "}
                                {post.customAuthorName ?? post.authorName}
                              </span>
                              <span>·</span>
                              <span>{formatDate(post.publishedAt)}</span>
                            </div>
                            <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-display font-medium bg-manara-teal/8 text-manara-teal">
                              {firstTag}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-surface rounded-2xl border border-manara-teal/10 shadow-subtle p-8">
                  <div className="w-16 h-16 rounded-2xl bg-manara-teal/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-manara-teal" />
                  </div>
                  <h3 className="font-display font-bold text-lg text-ink/70">
                    No articles found for this tag
                  </h3>
                  <p className="mt-2 text-sm text-ink/45 max-w-sm font-body">
                    Check out another tag or browse all publications to find
                    interesting read-ups.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <aside className="lg:sticky lg:top-24 space-y-6">
            {/* Browse Tags */}
            <div className="rounded-2xl bg-surface border border-manara-teal/10 shadow-subtle p-6">
              <h4 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-ink">
                <Hash className="w-4.5 h-4.5 text-manara-teal" /> Browse Tags
              </h4>
              <div className="max-h-[320px] overflow-y-auto pr-1 space-y-1">
                {sortedTags.map((tagObj) => {
                  const config = getTagConfig(tagObj.name);
                  const isCurrent = selectedTag === tagObj.name;
                  return (
                    <button
                      key={tagObj.name}
                      onClick={() => applyFilterFromSidebar(tagObj.name)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all hover:bg-manara-teal/5 cursor-pointer",
                        isCurrent && "bg-manara-teal/5"
                      )}
                    >
                      <span className="flex items-center gap-2.5 text-sm font-display font-medium text-ink/75">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ background: config.dot }}
                        ></span>
                        {config.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-display font-semibold bg-manara-teal/7 text-manara-teal">
                        {tagObj.count}
                      </span>
                    </button>
                  );
                })}
                {sortedTags.length === 0 && (
                  <p className="text-sm text-ink/40 py-2">No tags available.</p>
                )}
              </div>
            </div>

            {/* Trending Panel */}
            <div className="rounded-2xl bg-surface border border-manara-teal/10 shadow-subtle p-6">
              <h4 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-ink">
                <TrendingUp className="w-4.5 h-4.5 text-manara-teal" /> Trending
              </h4>
              <div className="space-y-4">
                {trendingItems.map((item) => (
                  <a
                    key={item.id}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="flex gap-3 group"
                  >
                    <span className="font-display font-bold text-lg text-manara-teal/40 group-hover:text-manara-teal transition-colors">
                      {item.num}
                    </span>
                    <div>
                      <div className="font-display font-semibold text-sm leading-snug text-ink group-hover:text-manara-teal transition-colors line-clamp-2">
                        {item.title}
                      </div>
                      <div className="text-xs mt-0.5 text-ink/40 font-body">
                        {item.topic} &middot; {item.read}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Submit CTA */}
            <div className="rounded-2xl p-6 relative overflow-hidden bg-manara-teal text-white">
              <div className="absolute inset-0 dot-grid opacity-20"></div>
              <div className="relative space-y-4">
                <div className="w-11 h-11 rounded-xl bg-surface/15 flex items-center justify-center">
                  <Send className="w-5.5 h-5.5 text-white" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-lg text-white">
                    Submit your research
                  </h4>
                  <p className="text-sm mt-1.5 text-white/75 leading-relaxed font-body">
                    Have a project or paper to share? Get featured in the club
                    journal.
                  </p>
                </div>
                <Link
                  href="/submit-research"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-display font-bold text-sm bg-manara-yellow text-manara-teal transition-all hover:translate-y-[-2px] hover:shadow-yellow"
                >
                  Submit now <ArrowRight className="w-4 h-4" />
                </Link>
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
