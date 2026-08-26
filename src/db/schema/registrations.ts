import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const campusAmbassadorRegistrations = pgTable(
  "campus_ambassador_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    class: text("class").notNull(),
    school: text("school").notNull(),
    experience: text("experience").notNull(),
    firstTimeCa: boolean("first_time_ca").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
).enableRLS();

export type CampusAmbassadorRegistration =
  typeof campusAmbassadorRegistrations.$inferSelect;

export const stemFestRegistrations = pgTable(
  "stem_fest_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    class: text("class").notNull(),
    school: text("school").notNull(),
    segments: text("segments").notNull(),
    transactionId: text("transaction_id").notNull(),
    paymentNumber: text("payment_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
).enableRLS();

export type StemFestRegistration = typeof stemFestRegistrations.$inferSelect;
