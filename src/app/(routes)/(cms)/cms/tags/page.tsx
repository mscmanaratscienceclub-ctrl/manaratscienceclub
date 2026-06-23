import { getAllTagsWithCounts } from "@/lib/actions/posts";
import { getTagConfig } from "@/lib/tag-styles";
import { Tag as TagIcon, FileText } from "lucide-react";

export default async function TagsCmsPage() {
  const tags = await getAllTagsWithCounts();

  return (
    <div className="space-y-8 p-8">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">
          Tags Management
        </h1>
        <p className="mt-2 font-body text-ink/60">
          View all tags used across your articles and monitor their publication counts.
        </p>
      </div>

      {tags.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tags.map((tagObj) => {
            const config = getTagConfig(tagObj.name);

            return (
              <div
                key={tagObj.name}
                className="relative overflow-hidden rounded-2xl border border-manara-teal/10 bg-surface p-6 shadow-subtle transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: config.dot }}
                ></div>
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-semibold"
                    style={{
                      background: config.bg,
                      color: config.text,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: config.dot }}
                    ></span>
                    {config.name}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-ink/50">
                    <FileText className="h-3.5 w-3.5" />
                    <span>
                      {tagObj.count} {tagObj.count === 1 ? "Post" : "Posts"}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="font-display text-lg font-bold text-ink truncate">
                    {tagObj.name}
                  </p>
                  <p className="mt-1 text-xs text-ink/40 font-body">
                    System identifier: <code className="bg-gray-50 px-1 py-0.5 rounded text-gray-600">{tagObj.name.toLowerCase()}</code>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-manara-teal/10 bg-surface py-16 text-center shadow-subtle">
          <TagIcon className="mb-3 h-10 w-10 text-manara-teal/30" />
          <h3 className="font-display text-lg font-bold text-ink/70">
            No tags found
          </h3>
          <p className="mt-2 text-sm text-ink/45 max-w-sm font-body">
            Tags will automatically appear here once they are added to posts.
          </p>
        </div>
      )}
    </div>
  );
}
