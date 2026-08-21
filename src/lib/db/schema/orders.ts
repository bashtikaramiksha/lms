import { sqliteTable, text, real, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { courses } from "./courses";
import { coupons } from "./coupons";

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    studentId: text("student_id")
      .notNull()
      .references(() => users.id),
    status: text("status", {
      enum: ["PENDING", "COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED", "FAILED"],
    })
      .default("PENDING")
      .notNull(),
    gateway: text("gateway", { enum: ["STRIPE", "RAZORPAY"] }).notNull(),
    gatewayOrderId: text("gateway_order_id").unique(), // Stripe PaymentIntent ID or Razorpay order ID
    gatewayPaymentId: text("gateway_payment_id"), // Stripe charge ID or Razorpay payment ID
    subtotal: real("subtotal").notNull(), // before coupon
    discountAmount: real("discount_amount").default(0),
    total: real("total").notNull(), // final charged amount
    currency: text("currency").default("INR").notNull(),
    couponId: text("coupon_id").references(() => coupons.id),
    invoiceUrl: text("invoice_url"), // S3 URL or PDF location
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_orders_student").on(table.studentId),
    index("idx_orders_gateway_order").on(table.gatewayOrderId),
  ]
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    priceAtPurchase: real("price_at_purchase").notNull(), // snapshot of price at purchase time
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => [
    index("idx_order_items_order").on(table.orderId),
    index("idx_order_items_course").on(table.courseId),
  ]
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  student: one(users, {
    fields: [orders.studentId],
    references: [users.id],
  }),
  coupon: one(coupons, {
    fields: [orders.couponId],
    references: [coupons.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  course: one(courses, {
    fields: [orderItems.courseId],
    references: [courses.id],
  }),
}));

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderStatus = "PENDING" | "COMPLETED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED";
export type PaymentGateway = "STRIPE" | "RAZORPAY";
