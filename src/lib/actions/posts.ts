"use server";

import { db } from "@/db";
import { posts } from "@/db/schema/posts";
import { user } from "@/db/schema/auth/user";
import { getServerSession } from "@/lib/auth/get-session";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cache } from "react";

function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 80);
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug; let counter = 1;
  while (true) {
    const existing = await db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).limit(1);
    if (existing.length === 0 || existing[0].id === excludeId) break;
    slug = `${baseSlug}-${counter}`; counter++;
  }
  return slug;
}

function assertCmsRole(role: string) {
  if (!["admin", "writer"].includes(role)) throw new Error("Unauthorized");
}

const postFields = {
  id: posts.id, title: posts.title, slug: posts.slug, excerpt: posts.excerpt,
  status: posts.status, authorId: posts.authorId, publishedAt: posts.publishedAt,
  createdAt: posts.createdAt, updatedAt: posts.updatedAt, authorName: user.name,
};

export const getPublishedPosts = cache(async (limit?: number) => {
  const query = db
    .select(postFields)
    .from(posts)
    .leftJoin(user, eq(posts.authorId, user.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt));

  if (limit) {
    query.limit(limit);
  }

  return query;
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

export async function getAllPostsCms() {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  const q = db.select(postFields).from(posts).leftJoin(user, eq(posts.authorId, user.id)).orderBy(desc(posts.updatedAt));
  if (role === "writer") return q.where(eq(posts.authorId, session.user.id));
  return q;
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

export async function createPost(data: { title: string; excerpt: string; content: string; status: "draft" | "published" }) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  if (!data.title.trim()) throw new Error("Title is required");
  const slug = await ensureUniqueSlug(generateSlug(data.title));
  const id = crypto.randomUUID();
  await db.insert(posts).values({ id, title: data.title, slug, excerpt: data.excerpt, content: data.content, authorId: session.user.id, status: data.status, publishedAt: data.status === "published" ? new Date() : null });
  revalidatePath("/cms/posts"); revalidatePath("/blogs");
  return { id, slug };
}

export async function updatePost(id: string, data: { title: string; excerpt: string; content: string; status: "draft" | "published" }) {
  const session = await getServerSession();
  if (!session) throw new Error("Unauthorized");
  const role = (session.user as { role: string }).role ?? "member";
  assertCmsRole(role);
  const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!existing[0]) throw new Error("Post not found");
  if (role === "writer" && existing[0].authorId !== session.user.id) throw new Error("Unauthorized");
  const slug = await ensureUniqueSlug(generateSlug(data.title), id);
  await db.update(posts).set({ title: data.title, slug, excerpt: data.excerpt, content: data.content, status: data.status, publishedAt: data.status === "published" && !existing[0].publishedAt ? new Date() : existing[0].publishedAt, updatedAt: new Date() }).where(eq(posts.id, id));
  revalidatePath("/cms/posts"); revalidatePath(`/cms/posts/${id}`); revalidatePath("/blogs"); revalidatePath(`/blogs/${slug}`);
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
