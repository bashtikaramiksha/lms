import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { courses } from "./courses";

export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1 to 5
    comment: text("comment"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_reviews_course").on(table.courseId),
    index("idx_reviews_student").on(table.studentId),
    uniqueIndex("idx_reviews_course_student").on(table.courseId, table.studentId),
  ]
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  course: one(courses, {
    fields: [reviews.courseId],
    references: [courses.id],
  }),
  student: one(users, {
    fields: [reviews.studentId],
    references: [users.id],
  }),
}));

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
