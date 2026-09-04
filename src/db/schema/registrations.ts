import { sql } from "drizzle-orm";
import { boolean, check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const campusAmbassadorRegistrations = pgTable(
  "campus_ambassador_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type", { enum: ["campus", "batch"] }).notNull().default("campus"),
    name: text("name").notNull(),
    class: text("class").notNull(),
    school: text("school").notNull(),
    phone: text("phone"),
    email: text("email"),
    gender: text("gender", { enum: ["male", "female", "other"] }),
    facebook: text("facebook"),
    instagram: text("instagram"),
    experience: text("experience").notNull(),
    firstTimeCa: boolean("first_time_ca").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "campus_ambassador_registrations_type_check",
      sql`${table.type} in ('campus', 'batch')`
    ),
    check(
      "campus_ambassador_registrations_gender_check",
      sql`${table.gender} is null or ${table.gender} in ('male', 'female', 'other')`
    ),
  ]
).enableRLS();

export type CampusAmbassadorRegistration =
  typeof campusAmbassadorRegistrations.$inferSelect;
