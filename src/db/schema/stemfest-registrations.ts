import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { StemfestEntry } from "@/lib/data/stemfest-registration";

/**
 * STEM Fest event registrations — the participants competing in Olympiads,
 * Robotics, Project Display and E-sports.
 *
 * Separate from `campus_ambassador_registrations` and `volunteer_registrations`,
 * which are about staffing the fest rather than entering it.
 *
 * `totalFee` is always recomputed on the server from `entries`; the value a
 * browser sends is discarded. Created by
 * `drizzle/create_stemfest_registrations.sql`.
 */
export const stemfestRegistrations = pgTable(
  "stemfest_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Participant
    name: text("name").notNull(),
    /** Canonical class id from `stemfestClasses`, e.g. "class-7". */
    class: text("class").notNull(),
    phone: text("phone").notNull(),

    // Payment reference
    bkashNumber: text("bkash_number").notNull(),
    bkashTrxId: text("bkash_trx_id").notNull(),

    /** Every event this participant entered, with derived category and team. */
    entries: jsonb("entries").$type<StemfestEntry[]>().notNull(),

    /** Authoritative amount owed, in whole BDT. */
    totalFee: integer("total_fee").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stemfest_registrations_created_at_idx").on(table.createdAt.desc()),
    // Supports "who entered Robosoccer" style reporting without a full scan.
    index("stemfest_registrations_entries_idx").using("gin", table.entries),
  ],
).enableRLS();

export type StemfestRegistration =
  typeof stemfestRegistrations.$inferSelect;
