import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * STEM Fest event registrations.
 * Mirrored from public.stem_fest_registrations in Supabase.
 */
export const stemfestRegistrations = pgTable(
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
  },
  (table) => [
    index("stem_fest_registrations_created_at_idx").on(table.createdAt.desc()),
  ],
).enableRLS();

export type StemfestRegistration =
  typeof stemfestRegistrations.$inferSelect;

