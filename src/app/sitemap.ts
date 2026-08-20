import type { MetadataRoute } from "next";
import { db } from "@/db";
import { posts } from "@/db/schema/posts";
import { eq } from "drizzle-orm";

// Always fetch fresh so newly published CMS posts appear without redeploy
export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://manaratscience.club";

const staticRoutes: MetadataRoute.Sitemap = [
  { url: baseUrl, changeFrequency: "weekly", priority: 1 },
  { url: `${baseUrl}/achievements`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/events`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${baseUrl}/robotics`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/blogs`, changeFrequency: "daily", priority: 0.8 },
  { url: `${baseUrl}/opportunities`, changeFrequency: "weekly", priority: 0.7 },
  { url: `${baseUrl}/join`, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/register`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${baseUrl}/legacy`, changeFrequency: "yearly", priority: 0.5 },
  { url: `${baseUrl}/privacy-policy`, changeFrequency: "yearly", priority: 0.2 },
  { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publishedPosts = await db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.status, "published"));

  const postRoutes: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
    url: `${baseUrl}/blogs/${post.slug}`,
    lastModified: post.updatedAt ?? new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes];
}
