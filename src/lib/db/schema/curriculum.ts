import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { courses } from "./courses";

export const modules = sqliteTable(
  "modules",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    order: integer("order").notNull(),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_modules_course").on(table.courseId),
  ]
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    moduleId: text("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: text("type", {
      enum: ["VIDEO", "ARTICLE", "QUIZ", "LIVE_SESSION"],
    }).notNull(),
    order: integer("order").notNull(),
    videoUrl: text("video_url"),
    duration: integer("duration"),
    content: text("content"),
    isPreview: integer("is_preview", { mode: "boolean" }).default(false),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_lessons_module").on(table.moduleId),
  ]
);

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, {
    fields: [modules.courseId],
    references: [courses.id],
  }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one }) => ({
  module: one(modules, {
    fields: [lessons.moduleId],
    references: [modules.id],
  }),
}));

export type Module = typeof modules.$inferSelect;
export type NewModule = typeof modules.$inferInsert;

export type Lesson = typeof lessons.$inferSelect;
export type NewLesson = typeof lessons.$inferInsert;

export type LessonType = "VIDEO" | "ARTICLE" | "QUIZ" | "LIVE_SESSION";
