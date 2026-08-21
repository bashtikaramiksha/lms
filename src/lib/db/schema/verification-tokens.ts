import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: text("expires").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.identifier, table.token] }),
  ]
);

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
