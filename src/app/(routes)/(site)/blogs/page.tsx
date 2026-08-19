import { getPublishedPosts } from "@/lib/actions/posts";
import BlogsContent from "./blogs-content";

// Force dynamic rendering — prevents Next.js prerendering in parallel
// which would exhaust the Supabase free-tier connection pool
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Research & Articles | Manarat Science Club",
  description:
    "Explore scientific research, articles, and publications from Manarat Science Club members.",
};

export default async function BlogsPage() {
  const posts = await getPublishedPosts(50, 0);

  return <BlogsContent posts={posts} />;
}
