import { db } from "@/db";
import { posts } from "@/db/schema/posts";
import { user } from "@/db/schema/auth/user";
import { and, desc, eq, ne } from "drizzle-orm";
import { cache } from "react";

/**
 * Reads for the public site (home, /blogs, /blogs/[slug], sitemap).
 *
 * These live here rather than in `src/lib/actions/posts.ts` because that module is
 * `"use server"`: every export becomes a publicly POSTable Server Action endpoint.
 * A read belonging to a cached page has no business being an endpoint anyone can hit
 * to run an uncached query, so it is served from this module instead — never
 * importable from a client component.
 */

export const postFields = {
  id: posts.id, title: posts.title, slug: posts.slug, excerpt: posts.excerpt,
  tags: posts.tags, status: posts.status, authorId: posts.authorId,
  publishedAt: posts.publishedAt, createdAt: posts.createdAt, updatedAt: posts.updatedAt,
  authorName: user.name,
  customAuthorName: posts.customAuthorName,
  customAuthorAvatar: posts.customAuthorAvatar,
  customAuthorBio: posts.customAuthorBio,
};

export const getPublishedPosts = cache(async (limit = 10, offset = 0) => {
  return db
    .select(postFields)
    .from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset);
});

export async function getRelatedPosts(currentSlug: string, limit = 3) {
  return db.select(postFields).from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .where(and(eq(posts.status, "published"), ne(posts.slug, currentSlug)))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export const getPostBySlug = cache(async (slug: string) => {
  const result = await db
    .select({ ...postFields, content: posts.content })
    .from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);
  return result[0] ?? null;
});

/**
 * Slugs to prerender at build time.
 *
 * `next build` renders these with at most `experimental.staticGenerationMaxConcurrency`
 * workers (see `next.config.ts`), which keeps the query pressure inside the pool size in
 * `src/db/index.ts` — the failure this used to guard against was concurrent renders
 * pipelining queries onto a busy Supavisor connection, not the renders themselves.
 */
export async function getPublishedSlugs(): Promise<string[]> {
  const rows = await db.select({ slug: posts.slug }).from(posts).where(eq(posts.status, "published"));
  return rows.map((row) => row.slug);
}
