import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const formFields = pgTable("form_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  formKey: text("form_key").notNull(), // "stem-fest" | "campus-ambassador"
  name: text("name").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull().default("text"),
  placeholder: text("placeholder").notNull().default(""),
  helpText: text("help_text").notNull().default(""),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export type FormFieldRow = typeof formFields.$inferSelect;

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  formKey: text("form_key").notNull(),
  data: jsonb("data").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}).enableRLS();

export type FormSubmission = typeof formSubmissions.$inferSelect;
