import { getAllPostsCms } from "@/lib/actions/posts";
import { Plus } from "lucide-react";
import Link from "next/link";
import PostsTable from "./posts-table";

export default async function PostsPage() {
  const posts = await getAllPostsCms();

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Posts</h1>
          <p className="mt-1 font-body text-ink/60">
            Manage all your blog posts and articles.
          </p>
        </div>
        <Link
          href="/cms/posts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-manara-teal px-5 py-2.5 font-body text-sm font-medium text-white shadow-subtle transition-colors hover:bg-manara-teal/90"
        >
          <Plus className="h-4 w-4" />
          New Post
        </Link>
      </div>

      {/* Table */}
      <PostsTable posts={posts} />
    </div>
  );
}
