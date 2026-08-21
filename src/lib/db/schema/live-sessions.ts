import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { lessons } from "./curriculum";
import { courses } from "./courses";
import { users } from "./users";

export const liveSessions = sqliteTable(
  "live_sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    lessonId: text("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    teacherId: text("teacher_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    scheduledAt: text("scheduled_at").notNull(),
    duration: integer("duration").notNull(), // minutes
    platform: text("platform", { enum: ["ZOOM", "GOOGLE_MEET"] }).default("ZOOM").notNull(),
    joinUrl: text("join_url"),
    hostUrl: text("host_url"),
    status: text("status", { enum: ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"] })
      .default("SCHEDULED")
      .notNull(),
    recordingUrl: text("recording_url"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_live_sessions_course").on(table.courseId),
    index("idx_live_sessions_teacher").on(table.teacherId),
    index("idx_live_sessions_scheduled").on(table.scheduledAt),
    index("idx_live_sessions_status").on(table.status),
  ]
);

export const liveSessionsRelations = relations(liveSessions, ({ one }) => ({
  lesson: one(lessons, {
    fields: [liveSessions.lessonId],
    references: [lessons.id],
  }),
  course: one(courses, {
    fields: [liveSessions.courseId],
    references: [courses.id],
  }),
  teacher: one(users, {
    fields: [liveSessions.teacherId],
    references: [users.id],
  }),
}));

export type LiveSession = typeof liveSessions.$inferSelect;
export type NewLiveSession = typeof liveSessions.$inferInsert;
