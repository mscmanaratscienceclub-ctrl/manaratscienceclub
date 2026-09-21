import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "..";

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  impersonatedBy: text("impersonatedBy"),
}, (table) => [
  // better-auth revokes a user's sessions by `userId`, and a user deletion has
  // to find them. The hot path — lookup by token — is already unique-indexed.
  // (audit F5)
  index("session_user_id_idx").on(table.userId),
]);
