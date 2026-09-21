import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * STEM Fest event registrations.
 * Mirrored from public.stem_fest_registrations in Supabase.
 *
 * The payment columns are the *admin's* decision, which is stored rather than
 * derived so a verification can never be undone by a late SMS and a rejection can
 * never be overridden by one. `paymentDecision` is `null` until an admin acts; a
 * null means "derive it from the forwarded-SMS match", which is what the panel
 * showed before this column existed — so no backfill was needed. The effective
 * status is built by `src/db/queries/stemfest-payment.ts`.
 *
 * `registrationCode` is *not* written by this application. It is minted by a
 * `before insert` trigger (`drizzle/add_stemfest_registration_ids.sql`) from the
 * row's gender and class, so every insert path gets one — the public form writes
 * through the Supabase client rather than through Drizzle, and an admin can insert
 * from the SQL editor. Read it, never set it: an explicit value is respected by
 * the trigger and an ID is never renumbered.
 */
export const stemfestRegistrations = pgTable(
  "stem_fest_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    class: text("class").notNull(),
    school: text("school").notNull(),
    segments: text("segments").notNull(),
    /**
     * What the participant was told to send, in BDT.
     *
     * Recomputed from the catalogue by the Server Action on insert — never taken
     * from the browser — so it is the *asked-for* amount, which is what an admin
     * reconciling a bKash payment needs to compare a forwarded SMS against.
     * Nullable: rows filed before the column existed have none, and the amount
     * cannot be recovered from `segments`, which is admin-facing prose rather than
     * a data structure. Added by `drizzle/add_stemfest_total_fee.sql`.
     */
    totalFee: integer("total_fee"),
    /**
     * Nullable because rows collected before the form asked for a gender have
     * none. The ID trigger renders that absence as `X` rather than as `O`.
     */
    gender: text("gender", { enum: ["male", "female", "other"] }),
    /** `<GENDER><CLASS><NNN>`, minted on insert. Unique, never rewritten. */
    registrationCode: text("registration_code").notNull(),
    transactionId: text("transaction_id").notNull(),
    paymentNumber: text("payment_number").notNull(),
    /**
     * Where the payment confirmation goes. Nullable on purpose: rows collected
     * before the form asked for an address have none, and an admin fills the gap
     * from the expanded row rather than the row being un-verifiable.
     */
    email: text("email"),
    paymentDecision: text("payment_decision", {
      enum: ["pending", "verified", "rejected"],
    }),
    paymentDecidedAt: timestamp("payment_decided_at", { withTimezone: true }),
    /** Admin email that made the decision. Empty for an SMS-derived status. */
    paymentDecidedBy: text("payment_decided_by"),
    /** Last time a confirmation email was accepted by Resend. */
    paymentEmailSentAt: timestamp("payment_email_sent_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("stem_fest_registrations_created_at_idx").on(table.createdAt.desc()),
    // The registration ID is the identifier a participant is told and the club
    // looks rows up by, so it must be unique — and the index is what makes that
    // lookup cheap. Created as a unique index rather than a constraint because
    // `add column if not exists` cannot add a constraint idempotently; the DDL
    // file and this definition therefore have to stay in step by hand.
    uniqueIndex("stem_fest_registrations_code_key").on(table.registrationCode),
    // Serves the TrxID -> registration lookup in the SMS forwarder webhook,
    // which matches on `upper(transaction_id)`. A plain btree on the bare column
    // cannot answer that predicate, so the index must be on the expression.
    // (audit F2 — previously a sequential scan.)
    index("stem_fest_registrations_trx_idx").on(sql`upper(${table.transactionId})`),
  ],
).enableRLS();

export type StemfestRegistration =
  typeof stemfestRegistrations.$inferSelect;

/**
 * Last registration number issued per `<GENDER><CLASS>` prefix.
 *
 * Exists so the ID minted for one participant cannot collide with another's: the
 * trigger bumps this row with `insert … on conflict do update … returning`, which
 * takes a row lock, so two simultaneous submissions serialise here instead of both
 * reading the same "last number".
 *
 * Nothing in the application reads or writes this table directly — it is mirrored
 * only so `drizzle-kit push` knows the table is meant to exist and does not offer
 * to drop it. Created by `drizzle/add_stemfest_registration_ids.sql`.
 */
export const stemfestRegistrationCounters = pgTable(
  "stem_fest_registration_counters",
  {
    prefix: text("prefix").primaryKey(),
    lastNumber: integer("last_number").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
).enableRLS();


