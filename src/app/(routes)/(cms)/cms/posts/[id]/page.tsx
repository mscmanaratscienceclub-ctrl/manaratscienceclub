import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getPostByIdCms } from "@/lib/actions/posts";
import PostForm from "@/components/cms/post-form";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPostByIdCms(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-10">
      {/* Header */}
      <div>
        <Link
          href="/cms/posts"
          className="mb-3 inline-flex items-center gap-1.5 font-body text-sm text-ink/50 transition-colors hover:text-manara-teal"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Posts
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink">Edit Post</h1>
        <p className="mt-1 font-body text-ink/60">
          Update the content and settings for this post.
        </p>
      </div>

      {/* Form */}
      <PostForm post={post} />
    </div>
  );
}
