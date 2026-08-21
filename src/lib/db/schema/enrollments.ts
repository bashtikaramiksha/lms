import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { courses } from "./courses";
import { orders } from "./orders";

export const enrollments = sqliteTable(
  "enrollments",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
    status: text("status", {
      enum: ["ACTIVE", "EXPIRED", "REFUNDED", "COMPLETED", "CANCELLED"],
    })
      .default("ACTIVE")
      .notNull(),
    enrolledAt: text("enrolled_at").$defaultFn(() => new Date().toISOString()),
    expiresAt: text("expires_at"),
    certificateUrl: text("certificate_url"),
    certIssuedAt: text("cert_issued_at"),
  },
  (table) => [
    index("idx_enrollments_user").on(table.userId),
    index("idx_enrollments_course").on(table.courseId),
    index("idx_enrollments_order").on(table.orderId),
    uniqueIndex("idx_enrollments_user_course").on(table.userId, table.courseId),
  ]
);

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, {
    fields: [enrollments.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [enrollments.courseId],
    references: [courses.id],
  }),
  order: one(orders, {
    fields: [enrollments.orderId],
    references: [orders.id],
  }),
}));

export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type EnrollmentStatus = "ACTIVE" | "EXPIRED" | "REFUNDED" | "COMPLETED" | "CANCELLED";
