"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { createPost, updatePost, deletePost } from "@/lib/actions/posts";
import type { Post } from "@/db/schema/posts";
import { CalendarDays, Clock, Globe, FileText, Trash2, ListTree, X, Tag, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const RichTextEditor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-gray-200 bg-surface text-sm text-ink/40">Loading editor...</div>,
});

function extractHeadings(html: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const re = /<h([123])[^>]*>([\s\S]*?)<\/h[123]>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    headings.push({ level: Number(m[1]), text: m[2].replace(/<[^>]*>/g, "") });
  }
  return headings;
}

export default function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [status, setStatus] = useState<"draft" | "published">((post?.status as "draft" | "published") ?? "draft");
  const [useCustomAuthor, setUseCustomAuthor] = useState(!!(post?.customAuthorName));
  const [customAuthorName, setCustomAuthorName] = useState(post?.customAuthorName ?? "");
  const [customAuthorAvatar, setCustomAuthorAvatar] = useState(post?.customAuthorAvatar ?? "");
  const [customAuthorBio, setCustomAuthorBio] = useState(post?.customAuthorBio ?? "");

  const tocHeadings = useMemo(() => extractHeadings(content), [content]);

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  }

  function handleSave(targetStatus: "draft" | "published") {
    if (!title.trim()) { toast.error("A title is required"); return; }
    const authorData = useCustomAuthor ? {
      customAuthorName: customAuthorName.trim() || undefined,
      customAuthorAvatar: customAuthorAvatar.trim() || undefined,
      customAuthorBio: customAuthorBio.trim() || undefined,
    } : { customAuthorName: undefined, customAuthorAvatar: undefined, customAuthorBio: undefined };
    startTransition(async () => {
      try {
        if (post) {
          await updatePost(post.id, { title, excerpt, content, tags, status: targetStatus, ...authorData });
          toast.success(targetStatus === "published" ? "Post published!" : "Draft saved");
          setStatus(targetStatus);
        } else {
          const result = await createPost({ title, excerpt, content, tags, status: targetStatus, ...authorData });
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
      <div className="min-w-0 space-y-4">
        <input type="text" placeholder="Post title..." value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-surface px-5 py-4 font-display text-2xl font-bold text-ink placeholder:text-ink/25 focus:border-manara-teal focus:outline-none focus:ring-2 focus:ring-manara-teal/20" />
        <input type="text" placeholder="Short excerpt or summary..." value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-surface px-5 py-3 text-ink/80 placeholder:text-ink/30 focus:border-manara-teal focus:outline-none focus:ring-2 focus:ring-manara-teal/20" />
        <RichTextEditor content={content} onChange={setContent} />
      </div>

      <aside className="space-y-4">
        {/* Tags */}
        <div className="rounded-xl border border-gray-200 bg-surface p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink/40">
            <Tag className="size-3" /> Tags
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-manara-teal/10 px-2.5 py-1 font-display text-xs font-bold text-manara-teal">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-manara-teal/60"><X className="size-3" /></button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <input type="text" placeholder="Add tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-ink placeholder:text-ink/30 focus:border-manara-teal focus:outline-none" />
            <button type="button" onClick={addTag} className="rounded-lg bg-manara-teal px-3 py-1.5 text-xs font-bold text-white transition hover:bg-manara-teal/80">Add</button>
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-gray-200 bg-surface p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-ink/40">Status</p>
          <div className="mt-3 flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            {(["draft", "published"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={cn("flex-1 rounded-md py-2 text-sm font-semibold capitalize transition-all", status === s ? (s === "published" ? "bg-surface text-manara-teal shadow-sm" : "bg-surface text-ink shadow-sm") : "text-ink/40 hover:text-ink/70")}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Author */}
        <div className="rounded-xl border border-gray-200 bg-surface p-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={useCustomAuthor} onChange={(e) => setUseCustomAuthor(e.target.checked)}
              className="rounded border-gray-300 text-manara-teal focus:ring-manara-teal/20" />
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink/40">
              <UserRound className="size-3" /> Custom Author
            </span>
          </label>
          <p className="mt-1 text-[10px] text-ink/30">Override the logged-in author with a custom name</p>
          {useCustomAuthor && (
            <div className="mt-3 space-y-2">
              <input type="text" placeholder="Author name *" value={customAuthorName} onChange={(e) => setCustomAuthorName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-ink placeholder:text-ink/30 focus:border-manara-teal focus:outline-none" />
              <input type="text" placeholder="Avatar URL (optional)" value={customAuthorAvatar} onChange={(e) => setCustomAuthorAvatar(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-ink placeholder:text-ink/30 focus:border-manara-teal focus:outline-none" />
              <textarea placeholder="Short bio (optional)" value={customAuthorBio} onChange={(e) => setCustomAuthorBio(e.target.value)} rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-ink placeholder:text-ink/30 focus:border-manara-teal focus:outline-none resize-none" />
            </div>
          )}
        </div>

        {/* Table of Contents Preview */}
        {tocHeadings.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-surface p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-ink/40">
              <ListTree className="size-3" /> Table of Contents
            </p>
            <p className="mt-1 text-[10px] text-ink/30">Auto-detected from h1/h2/h3 headings</p>
            <ul className="mt-3 space-y-1">
              {tocHeadings.map((h, i) => (
                <li key={i} className={cn("truncate text-xs text-ink/60", h.level === 1 ? "font-bold" : h.level === 2 ? "ml-3" : "ml-6 text-[11px]")}>{h.text}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Save Buttons */}
        <div className="space-y-2">
          <button type="button" onClick={() => handleSave("published")} disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-manara-teal py-3 font-display font-bold text-white transition hover:bg-manara-yellow hover:text-manara-teal disabled:opacity-50">
            <Globe className="size-4" />{isPending ? "Saving..." : "Publish"}
          </button>
          <button type="button" onClick={() => handleSave("draft")} disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-surface py-3 font-display font-semibold text-ink/70 transition hover:bg-gray-50 disabled:opacity-50">
            <FileText className="size-4" />{isPending ? "Saving..." : "Save Draft"}
          </button>
        </div>

        {/* Post Info */}
        {post && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-5 text-sm">
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
