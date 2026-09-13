import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
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
    index("stem_fest_payment_sms_trx_idx").on(table.transactionId),
    index("stem_fest_payment_sms_status_idx").on(table.status),
    index("stem_fest_payment_sms_created_at_idx").on(table.createdAt.desc()),
  ]
).enableRLS();

export type StemfestPaymentSms = typeof stemfestPaymentSms.$inferSelect;

