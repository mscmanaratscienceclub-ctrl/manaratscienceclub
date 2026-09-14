import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { stemfestRegistrations } from "./stemfest-registrations";

/**
 * Incoming payment SMS logs forwarded from the Android forwarder app.
 * Used for automatic TrxID reconciliation and payment verification.
 */
export const stemfestPaymentSms = pgTable(
  "stem_fest_payment_sms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientMessageId: text("client_message_id").unique(),
    sender: text("sender").notNull(),
    rawMessage: text("raw_message").notNull(),
    transactionId: text("transaction_id"),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    senderNumber: text("sender_number"),
    status: text("status").notNull().default("unmatched"), // 'matched', 'unmatched', 'ignored'
    matchedRegistrationId: uuid("matched_registration_id").references(
      () => stemfestRegistrations.id,
      { onDelete: "set null" }
    ),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // The deployed index is on `upper(transaction_id)`, NOT the bare column,
    // because src/app/api/webhooks/sms/route.ts matches with
    // `sql`upper(${…transactionId}) = ${parsedSms.transactionId}``. Declaring it
    // as a plain column index here made `drizzle-kit push` want to drop the live
    // functional index and create a useless one — leaving the webhook
    // sequential-scanning. Keep this expression in step with the query.
    // See obsidian/backend/supabase-audit-2026-09-13.md finding F2.
    index("stem_fest_payment_sms_trx_idx").on(sql`upper(${table.transactionId})`),
    index("stem_fest_payment_sms_status_idx").on(table.status),
    index("stem_fest_payment_sms_received_at_idx").on(table.receivedAt.desc()),
    index("stem_fest_payment_sms_created_at_idx").on(table.createdAt.desc()),
    // The FK below is ON DELETE SET NULL, which still scans this table without
    // a leading-column index. (audit F5)
    index("stem_fest_payment_sms_matched_registration_id_idx").on(
      table.matchedRegistrationId,
    ),
  ]
).enableRLS();

export type StemfestPaymentSms = typeof stemfestPaymentSms.$inferSelect;

