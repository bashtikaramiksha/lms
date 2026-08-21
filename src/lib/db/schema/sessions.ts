import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    sessionToken: text("session_token").unique().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: text("expires").notNull(),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_sessions_token").on(table.sessionToken),
    index("idx_sessions_user_id").on(table.userId),
  ]
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
