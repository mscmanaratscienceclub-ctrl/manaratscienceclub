"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Eye, EyeOff, FileText } from "lucide-react";
import { toast } from "sonner";
import { togglePostStatus, deletePost } from "@/lib/actions/posts";

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  authorName: string | null;
  customAuthorName: string | null;
  updatedAt: Date;
  publishedAt: Date | null;
}

// Hoist formatter to avoid re-instantiation in loops
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default function PostsTable({ posts }: { posts: Post[] }) {
  const router = useRouter();

  async function handleToggleStatus(id: string, currentStatus: string) {
    try {
      await togglePostStatus(id);
      toast.success(
        currentStatus === "published"
          ? "Post unpublished"
          : "Post published"
      );
      router.refresh();
    } catch {
      toast.error("Failed to update post status.");
    }
  }

  async function handleDelete(id: string, title: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deletePost(id);
      toast.success("Post deleted successfully.");
      router.refresh();
    } catch {
      toast.error("Failed to delete post.");
    }
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-surface px-6 py-20 shadow-subtle">
        <FileText className="mb-3 h-12 w-12 text-ink/20" />
        <p className="font-display text-lg font-semibold text-ink/70">
          No posts found
        </p>
        <p className="mt-1 font-body text-sm text-ink/50">
          Create your first post to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-subtle">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink/5 text-left">
              <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
                Title
              </th>
              <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
                Status
              </th>
              <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
                Author
              </th>
              <th className="px-6 py-3 font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
                Last Updated
              </th>
              <th className="px-6 py-3 text-right font-body text-xs font-semibold uppercase tracking-wider text-ink/40">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {posts.map((post) => (
              <tr
                key={post.id}
                className="transition-colors hover:bg-cream/40"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/cms/posts/${post.id}`}
                    className="font-body font-medium text-ink hover:text-manara-teal"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-0.5 font-body text-xs text-ink/40">
                    /{post.slug}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 font-body text-xs font-medium ${
                      post.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {post.status === "published" ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-6 py-4 font-body text-sm text-ink/60">
                  {post.customAuthorName ?? post.authorName ?? "Unknown"}
                </td>
                <td className="px-6 py-4 font-body text-sm text-ink/60">
                  {dateFormatter.format(new Date(post.updatedAt))}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/cms/posts/${post.id}`}
                      className="rounded-lg p-2 text-ink/50 transition-colors hover:bg-manara-teal/10 hover:text-manara-teal"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleToggleStatus(post.id, post.status)}
                      className="rounded-lg p-2 text-ink/50 transition-colors hover:bg-manara-purple/10 hover:text-manara-purple"
                      title={
                        post.status === "published" ? "Unpublish" : "Publish"
                      }
                    >
                      {post.status === "published" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      className="rounded-lg p-2 text-ink/50 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
