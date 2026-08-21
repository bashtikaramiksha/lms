import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  blocks: text("blocks", { mode: "json" }), // JSON array of ContentBlock[]
  status: text("status", { enum: ["DRAFT", "PUBLISHED"] }).default("DRAFT").notNull(),
  inNav: integer("in_nav", { mode: "boolean" }).default(false),
  navLabel: text("nav_label"),
  seoTitle: text("seo_title"),
  seoDesc: text("seo_description"),
  ogImageUrl: text("og_image_url"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
