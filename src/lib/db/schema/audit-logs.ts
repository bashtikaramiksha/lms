import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    adminId: text("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // 'APPROVE_TEACHER' | 'REJECT_TEACHER' | 'SUSPEND_USER' | 'RESTORE_USER' | 'CHANGE_ROLE'
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    details: text("details"), // JSON payload or description
    ipAddress: text("ip_address"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_audit_logs_admin_id").on(table.adminId),
    index("idx_audit_logs_target_user_id").on(table.targetUserId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
