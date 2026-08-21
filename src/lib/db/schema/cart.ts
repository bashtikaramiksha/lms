import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { courses } from "./courses";

export const cartItems = sqliteTable(
  "cart_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    addedAt: text("added_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    uniqueIndex("idx_cart_user_course").on(table.userId, table.courseId),
    index("idx_cart_user").on(table.userId),
  ]
);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [cartItems.courseId],
    references: [courses.id],
  }),
}));

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
