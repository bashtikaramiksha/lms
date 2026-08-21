import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text("email").unique().notNull(),
    passwordHash: text("password_hash"), // null for OAuth-only users
    fullName: text("full_name").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: text("role", {
      enum: ["ADMIN", "TEACHER", "STUDENT"],
    })
      .default("STUDENT")
      .notNull(),
    status: text("status", {
      enum: ["ACTIVE", "PENDING_APPROVAL", "SUSPENDED", "REJECTED"],
    })
      .default("ACTIVE")
      .notNull(),
    emailVerified: integer("email_verified", { mode: "boolean" }).default(false),
    emailVerifyToken: text("email_verify_token"), // one-time token, hashed SHA-256
    emailVerifyExpiresAt: text("email_verify_expires_at"), // ISO8601
    resetPasswordToken: text("reset_password_token"), // SHA-256 hash
    resetPasswordExpiresAt: text("reset_password_expires_at"), // ISO8601
    // Wave 6 - Live Class OAuth tokens (encrypted at rest)
    zoomAccessToken: text("zoom_access_token"),
    zoomRefreshToken: text("zoom_refresh_token"),
    zoomTokenExpiry: text("zoom_token_expiry"), // ISO 8601
    zoomUserId: text("zoom_user_id"), // Zoom internal user ID / email
    googleAccessToken: text("google_access_token"),
    googleRefreshToken: text("google_refresh_token"),
    googleTokenExpiry: text("google_token_expiry"), // ISO 8601
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
    index("idx_users_status").on(table.status),
    index("idx_users_verify_token").on(table.emailVerifyToken),
    index("idx_users_reset_token").on(table.resetPasswordToken),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = "ADMIN" | "TEACHER" | "STUDENT";
export type UserStatus = "ACTIVE" | "PENDING_APPROVAL" | "SUSPENDED" | "REJECTED";
