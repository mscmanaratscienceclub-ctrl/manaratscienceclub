"use server";

import { db } from "@/db";
import { posts } from "@/db/schema/posts";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";
import { eq, and, ne, desc, sql, count, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { trackEvent } from "@/lib/analytics";

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 80);
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const existingSlugs = await db
    .select({ slug: posts.slug, id: posts.id })
    .from(posts)
    .where(like(posts.slug, `${baseSlug}%`));

  const slugSet = new Set(existingSlugs.filter((p) => p.id !== excludeId).map((p) => p.slug));

  if (!slugSet.has(baseSlug)) return baseSlug;

  let counter = 1;
  while (slugSet.has(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

function assertCmsRole(role: string) {
  if (!["admin", "writer"].includes(role)) throw new Error("Unauthorized");
}

const postFields = {
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

export const getRelatedPosts = cache(async (currentSlug: string, limit = 3) => {
  return db.select(postFields).from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .where(and(eq(posts.status, "published"), ne(posts.slug, currentSlug)))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
});

export const getPostBySlug = cache(async (slug: string) => {
  const result = await db
    .select({ ...postFields, content: posts.content })
    .from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);
  return result[0] ?? null;
});

export async function getAllPostsCms(limit = 20, offset = 0) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);

  let q = db
    .select(postFields)
    .from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .$dynamic();

  if (role === "writer") {
    q = q.where(eq(posts.authorId, session.user.id));
  }

  return q.orderBy(desc(posts.updatedAt)).limit(limit).offset(offset);
}

export async function getPostByIdCms(id: string) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  const post = result[0] ?? null;
  if (post && role === "writer" && post.authorId !== session.user.id) throw new Error("Unauthorized");
  return post;
}

export async function createPost(data: { title: string; excerpt: string; content: string; tags?: string[]; status: "draft" | "published"; customAuthorName?: string; customAuthorAvatar?: string; customAuthorBio?: string }) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  if (!data.title.trim()) throw new Error("Title is required");
  const slug = await ensureUniqueSlug(generateSlug(data.title));
  const id = crypto.randomUUID();
  await db.insert(posts).values({ id, title: data.title, slug, excerpt: data.excerpt, content: data.content, tags: data.tags ?? [], authorId: session.user.id, status: data.status, publishedAt: data.status === "published" ? new Date() : null, customAuthorName: data.customAuthorName ?? null, customAuthorAvatar: data.customAuthorAvatar ?? null, customAuthorBio: data.customAuthorBio ?? null });
  revalidatePath("/cms/posts"); revalidatePath("/blogs");
  if (data.status === "published") {
    trackEvent("post_published", { postId: id });
  }
  return { id, slug };
}

export async function updatePost(id: string, data: { title: string; excerpt: string; content: string; tags?: string[]; status: "draft" | "published"; customAuthorName?: string; customAuthorAvatar?: string; customAuthorBio?: string }) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing[0]) throw new Error("Post not found");
  if (role === "writer" && existing[0].authorId !== session.user.id) throw new Error("Unauthorized");
  const slug = await ensureUniqueSlug(generateSlug(data.title), id);
  await db.update(posts).set({ title: data.title, slug, excerpt: data.excerpt, content: data.content, tags: data.tags ?? [], status: data.status, publishedAt: data.status === "published" && !existing[0].publishedAt ? new Date() : existing[0].publishedAt, updatedAt: new Date(), customAuthorName: data.customAuthorName ?? null, customAuthorAvatar: data.customAuthorAvatar ?? null, customAuthorBio: data.customAuthorBio ?? null }).where(eq(posts.id, id));
  revalidatePath("/cms/posts"); revalidatePath(`/cms/posts/${id}`); revalidatePath("/blogs"); revalidatePath(`/blogs/${slug}`);
  trackEvent("post_updated", { postId: existing[0].id });
  return { id, slug };
}

export async function deletePost(id: string) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing[0]) throw new Error("Post not found");
  if (role === "writer" && existing[0].authorId !== session.user.id) throw new Error("Unauthorized");
  const slug = existing[0].slug;
  await db.delete(posts).where(eq(posts.id, id));
  revalidatePath("/cms/posts"); revalidatePath("/blogs"); revalidatePath(`/blogs/${slug}`);
  trackEvent("post_deleted", { postId: id });
}

export async function togglePostStatus(id: string) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing[0]) throw new Error("Post not found");
  if (role === "writer" && existing[0].authorId !== session.user.id) throw new Error("Unauthorized");
  const newStatus = existing[0].status === "published" ? "draft" : "published";
  await db.update(posts).set({ status: newStatus, publishedAt: newStatus === "published" ? (existing[0].publishedAt ?? new Date()) : existing[0].publishedAt, updatedAt: new Date() }).where(eq(posts.id, id));
  revalidatePath("/cms/posts"); revalidatePath("/blogs"); revalidatePath(`/blogs/${existing[0].slug}`);
  return { status: newStatus };
}

export async function getAllTagsWithCounts() {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);

  const result = await db
    .select({
      name: sql<string>`trim(unnest(coalesce(${posts.tags}, ARRAY[]::text[])))`.as("tag_name"),
      count: count(),
    })
    .from(posts)
    .groupBy(sql`tag_name`)
    .orderBy(desc(count()));

  return result.filter((r) => r.name !== "");
}

