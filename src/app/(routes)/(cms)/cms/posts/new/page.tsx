import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import PostForm from "@/components/cms/post-form";

export default function NewPostPage() {
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
        <h1 className="font-display text-3xl font-bold text-ink">New Post</h1>
        <p className="mt-1 font-body text-ink/60">
          Create a new blog post or article.
        </p>
      </div>

      {/* Form */}
      <PostForm />
    </div>
  );
}
