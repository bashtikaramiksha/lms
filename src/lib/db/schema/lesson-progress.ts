import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { enrollments } from "./enrollments";
import { lessons } from "./curriculum";

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    enrollmentId: text("enrollment_id")
      .notNull()
      .references(() => enrollments.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    watchPercent: real("watch_percent").default(0).notNull(),
    isCompleted: integer("is_completed", { mode: "boolean" }).default(false).notNull(),
    lastWatchedAt: text("last_watched_at"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_lesson_progress_enrollment").on(table.enrollmentId),
    index("idx_lesson_progress_lesson").on(table.lessonId),
    uniqueIndex("idx_lesson_progress_unique").on(table.enrollmentId, table.lessonId),
  ]
);

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  enrollment: one(enrollments, {
    fields: [lessonProgress.enrollmentId],
    references: [enrollments.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}));

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
