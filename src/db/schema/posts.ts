import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { user } from "./auth/user";

export const posts = pgTable("posts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").default(""),
  content: text("content").notNull().default(""),
  coverImage: text("cover_image"),
  tags: text("tags").array().default([]),
  status: text("status").notNull().default("draft"), // "draft" | "published"
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  customAuthorName: text("custom_author_name"),
  customAuthorAvatar: text("custom_author_avatar"),
  customAuthorBio: text("custom_author_bio"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  // The public listing filters on status = 'published' and sorts by
  // published_at. A partial index holds only the rows the query can return, so
  // it stays a fraction of the size of a full index. (audit F4)
  index("posts_published_at_idx")
    .on(table.publishedAt.desc())
    .where(sql`status = 'published'`),
  // The CMS dashboard listing is unfiltered, so it needs the plain form.
  index("posts_updated_at_idx").on(table.updatedAt.desc()),
  // ON DELETE CASCADE on `author_id` scans this table to find a deleted user's
  // posts, and the CMS filters `author_id = $1` for a writer's own list.
  // (audit F5)
  index("posts_author_id_idx").on(table.authorId),
]).enableRLS();

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
