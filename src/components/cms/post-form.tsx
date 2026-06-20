"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { createPost, updatePost, deletePost } from "@/lib/actions/posts";
import type { Post } from "@/db/schema/posts";
import { CalendarDays, Clock, Globe, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RichTextEditor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-white text-sm text-ink/40">Loading editor...</div>,
});

export default function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [status, setStatus] = useState<"draft" | "published">((post?.status as "draft" | "published") ?? "draft");

  function handleSave(targetStatus: "draft" | "published") {
    if (!title.trim()) { toast.error("A title is required"); return; }
    startTransition(async () => {
      try {
        if (post) {
          await updatePost(post.id, { title, excerpt, content, status: targetStatus });
          toast.success(targetStatus === "published" ? "Post published!" : "Draft saved");
          setStatus(targetStatus);
        } else {
          const result = await createPost({ title, excerpt, content, status: targetStatus });
          toast.success(targetStatus === "published" ? "Post published!" : "Draft saved");
          router.push(`/cms/posts/${result.id}`);
        }
      } catch (err) { toast.error(err instanceof Error ? err.message : "Something went wrong"); }
    });
  }

  function handleDelete() {
    if (!post) return;
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    startDeleteTransition(async () => {
      try { await deletePost(post.id); toast.success("Post deleted"); router.push("/cms/posts"); }
      catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
      <div className="space-y-4">
        <input type="text" placeholder="Post title..." value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 font-display text-2xl font-bold text-ink placeholder:text-ink/25 focus:border-manara-teal focus:outline-none focus:ring-2 focus:ring-manara-teal/20" />
        <input type="text" placeholder="Short excerpt or summary..." value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-5 py-3 text-ink/80 placeholder:text-ink/30 focus:border-manara-teal focus:outline-none focus:ring-2 focus:ring-manara-teal/20" />
        <RichTextEditor content={content} onChange={setContent} />
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Status</p>
          <div className="mt-3 flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(["draft", "published"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={cn("flex-1 rounded-md py-2 text-sm font-semibold capitalize transition-all", status === s ? (s === "published" ? "bg-white text-manara-teal shadow-sm" : "bg-white text-ink shadow-sm") : "text-ink/40 hover:text-ink/70")}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <button type="button" onClick={() => handleSave("published")} disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-manara-teal py-3 font-display font-bold text-white transition hover:bg-manara-yellow hover:text-manara-teal disabled:opacity-50">
            <Globe className="size-4" />{isPending ? "Saving..." : "Publish"}
          </button>
          <button type="button" onClick={() => handleSave("draft")} disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 font-display font-semibold text-ink/70 transition hover:bg-gray-50 disabled:opacity-50">
            <FileText className="size-4" />{isPending ? "Saving..." : "Save Draft"}
          </button>
        </div>

        {post && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 text-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Post Info</p>
            <div className="flex items-start gap-2 text-ink/60"><Globe className="mt-0.5 size-3.5 shrink-0" /><span className="break-all font-mono text-xs">/{post.slug}</span></div>
            <div className="flex items-center gap-2 text-ink/60"><CalendarDays className="size-3.5 shrink-0" /><span>Created {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
            {post.publishedAt && <div className="flex items-center gap-2 text-ink/60"><Clock className="size-3.5 shrink-0" /><span>Published {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>}
            <div className="border-t border-gray-100 pt-3">
              <button type="button" onClick={handleDelete} disabled={isDeleting}
                className="flex items-center gap-2 text-xs font-semibold text-red-400 transition-colors hover:text-red-600 disabled:opacity-50">
                <Trash2 className="size-3.5" />{isDeleting ? "Deleting..." : "Delete post"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
