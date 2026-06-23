import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
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
}).enableRLS();

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
