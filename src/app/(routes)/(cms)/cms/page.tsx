import { getAllPostsCms } from "@/lib/actions/posts";
import { FileText, BookOpen, FilePenLine, Plus } from "lucide-react";
import Link from "next/link";

export default async function CmsDashboardPage() {
  const posts = await getAllPostsCms();

  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.status === "published").length;
  const draftPosts = posts.filter((p) => p.status === "draft").length;

  const recentPosts = posts
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const stats = [
    {
      label: "Total Posts",
      count: totalPosts,
      icon: FileText,
      color: "text-manara-teal",
      bg: "bg-manara-teal/10",
    },
    {
      label: "Published",
      count: publishedPosts,
      icon: BookOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Drafts",
      count: draftPosts,
      icon: FilePenLine,
      color: "text-manara-purple",
      bg: "bg-manara-purple/10",
    },
  ];

  return (
    <div className="flex flex-col gap-8 p-6 md:p-10">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            Dashboard
          </h1>
          <p className="mt-1 font-body text-ink/60">
            Overview of your content and recent activity.
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

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-2xl bg-surface p-6 shadow-subtle"
          >
            <div className={`rounded-xl ${stat.bg} p-3`}>
              <stat.icon className={`h-6 w-6 ${stat.color}`} />
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink">
                {stat.count}
              </p>
              <p className="font-body text-sm text-ink/60">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Posts */}
      <div className="rounded-2xl bg-surface shadow-subtle">
        <div className="flex items-center justify-between border-b border-ink/5 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            Recent Posts
          </h2>
          <Link
            href="/cms/posts"
            className="font-body text-sm font-medium text-manara-teal hover:underline"
          >
            View all
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <FileText className="mb-3 h-10 w-10 text-ink/20" />
            <p className="font-body text-ink/50">
              No posts yet. Create your first post to get started.
            </p>
          </div>
        ) : (
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
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {recentPosts.map((post) => (
                  <tr key={post.id} className="transition-colors hover:bg-cream/40">
                    <td className="px-6 py-4">
                      <Link
                        href={`/cms/posts/${post.id}`}
                        className="font-body font-medium text-ink hover:text-manara-teal"
                      >
                        {post.title}
                      </Link>
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
                      {new Date(post.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
