import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// Blog categories table
export const blogCategories = sqliteTable("blog_categories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});

// Blog tags table
export const blogTags = sqliteTable("blog_tags", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  slug: text("slug").unique().notNull(),
});

// Blog posts table
export const blogPosts = sqliteTable("blog_posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  slug: text("slug").unique().notNull(),
  excerpt: text("excerpt"),
  content: text("content"), // TipTap HTML
  featuredImage: text("featured_image"),
  categoryId: text("category_id").references(() => blogCategories.id, { onDelete: "set null" }),
  authorId: text("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["DRAFT", "PUBLISHED", "SCHEDULED"] }).default("DRAFT").notNull(),
  scheduledFor: text("scheduled_for"),
  seoTitle: text("seo_title"),
  seoDesc: text("seo_description"),
  ogImageUrl: text("og_image_url"),
  canonicalUrl: text("canonical_url"),
  publishedAt: text("published_at"),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
});

// Join table: blog_post ↔ blog_tag (many-to-many)
export const blogPostTags = sqliteTable(
  "blog_post_tags",
  {
    postId: text("post_id").notNull().references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => blogTags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
  })
);

// Relations
export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  category: one(blogCategories, {
    fields: [blogPosts.categoryId],
    references: [blogCategories.id],
  }),
  tags: many(blogPostTags),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPosts),
}));

export const blogTagsRelations = relations(blogTags, ({ many }) => ({
  posts: many(blogPostTags),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({ one }) => ({
  post: one(blogPosts, {
    fields: [blogPostTags.postId],
    references: [blogPosts.id],
  }),
  tag: one(blogTags, {
    fields: [blogPostTags.tagId],
    references: [blogTags.id],
  }),
}));

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type NewBlogCategory = typeof blogCategories.$inferInsert;
export type BlogTag = typeof blogTags.$inferSelect;
export type NewBlogTag = typeof blogTags.$inferInsert;
export type BlogPostTag = typeof blogPostTags.$inferSelect;
