import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").unique().notNull(),
    slug: text("slug").unique().notNull(),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_categories_slug").on(table.slug),
  ]
);

export const courses = sqliteTable(
  "courses",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").unique().notNull(),
    description: text("description"),
    shortDesc: text("short_desc"),
    thumbnailUrl: text("thumbnail_url"),
    previewUrl: text("preview_url"),
    type: text("type", { enum: ["RECORDED", "LIVE"] }).notNull(),
    status: text("status", {
      enum: ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"],
    })
      .default("DRAFT")
      .notNull(),
    level: text("level", { enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"] }),
    language: text("language").default("English"),
    price: real("price").default(0),
    discountPrice: real("discount_price"),
    accessDuration: integer("access_duration"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    isFeatured: integer("is_featured", { mode: "boolean" }).default(false),
    seoTitle: text("seo_title"),
    seoDesc: text("seo_description"),
    ogImageUrl: text("og_image_url"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_courses_slug").on(table.slug),
    index("idx_courses_status").on(table.status),
    index("idx_courses_author").on(table.authorId),
    index("idx_courses_category").on(table.categoryId),
  ]
);

import { modules } from "./curriculum";
import { reviews } from "./reviews";

export const coursesRelations = relations(courses, ({ one, many }) => ({
  author: one(users, {
    fields: [courses.authorId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [courses.categoryId],
    references: [categories.id],
  }),
  modules: many(modules),
  reviews: many(reviews),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  courses: many(courses),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export type CourseType = "RECORDED" | "LIVE";
export type CourseStatus = "DRAFT" | "PENDING_REVIEW" | "PUBLISHED" | "ARCHIVED";
export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
