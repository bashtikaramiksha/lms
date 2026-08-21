import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const coupons = sqliteTable(
  "coupons",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    code: text("code").unique().notNull(),
    type: text("type", { enum: ["PERCENT", "FIXED"] }).notNull(),
    value: real("value").notNull(), // % or currency amount
    minOrderValue: real("min_order_value").default(0), // minimum subtotal to apply
    maxUses: integer("max_uses"), // null = unlimited
    usedCount: integer("used_count").default(0).notNull(),
    expiresAt: text("expires_at"), // ISO string; null = no expiry
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_coupons_code").on(table.code),
  ]
);

export const couponsRelations = relations(coupons, ({ one }) => ({
  creator: one(users, {
    fields: [coupons.createdBy],
    references: [users.id],
  }),
}));

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type CouponType = "PERCENT" | "FIXED";
