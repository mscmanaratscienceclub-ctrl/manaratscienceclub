import {
  index,
  pgTable,
  text,
  timestamp,
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
    // Serves the TrxID -> registration lookup in the SMS forwarder webhook,
    // which matches on `upper(transaction_id)`. A plain btree on the bare column
    // cannot answer that predicate, so the index must be on the expression.
    // (audit F2 — previously a sequential scan.)
    index("stem_fest_registrations_trx_idx").on(sql`upper(${table.transactionId})`),
  ],
).enableRLS();

export type StemfestRegistration =
  typeof stemfestRegistrations.$inferSelect;

