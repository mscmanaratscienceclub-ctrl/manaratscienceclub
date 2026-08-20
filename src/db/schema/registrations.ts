import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const campusAmbassadorRegistrations = pgTable(
  "campus_ambassador_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    class: text("class").notNull(),
    school: text("school").notNull(),
    experience: text("experience").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
).enableRLS();

export type CampusAmbassadorRegistration =
  typeof campusAmbassadorRegistrations.$inferSelect;
