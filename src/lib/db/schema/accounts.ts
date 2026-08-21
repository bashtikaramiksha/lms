import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'oauth' | 'credentials'
    provider: text("provider").notNull(), // 'google' | 'github'
    providerAccountId: text("provider_account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_accounts_user_id").on(table.userId),
    index("idx_accounts_provider").on(table.provider, table.providerAccountId),
  ]
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
