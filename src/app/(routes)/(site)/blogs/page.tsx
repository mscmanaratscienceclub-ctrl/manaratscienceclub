import { getPublishedPosts } from "@/db/queries/posts";
import BlogsContent from "./blogs-content";

// Cached list; the CMS actions revalidate this path the moment a post is published.
export const revalidate = 1800;

export const metadata = {
  title: "Research & Articles | Manarat Science Club",
  description:
    "Explore scientific research, articles, and publications from Manarat Science Club members.",
};

export default async function BlogsPage() {
  const posts = await getPublishedPosts(50, 0);

  return <BlogsContent posts={posts} />;
}
