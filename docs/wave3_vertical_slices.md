# 🌊 Wave 3 — Vertical Slices
## LMS Platform · Commerce Engine

> **Target Date:** November 3, 2026
> **Theme:** Turn browsers into buyers — cart, checkout, payments, coupon discounts, and enrollment activation.
> **Definition of Done:** All 4 slices pass unit tests, integration tests, and can be demonstrated end-to-end in staging with at least one successful paid enrollment visible in the admin panel.

---

## Table of Contents

1. [Slice 3.1 — Shopping Cart](#slice-31--shopping-cart)
2. [Slice 3.2 — Checkout & Stripe Payment](#slice-32--checkout--stripe-payment)
3. [Slice 3.3 — Razorpay Payment Flow](#slice-33--razorpay-payment-flow)
4. [Slice 3.4 — Coupon System & Admin Refunds](#slice-34--coupon-system--admin-refunds)
5. [Wave 3 Shared Infrastructure](#wave-3-shared-infrastructure)

---

## Slice 3.1 — Shopping Cart

### Goal
Students can add published courses to a cart. **Guest users** (unauthenticated) persist the cart in `localStorage`. On login, the guest cart is **merged** into the server-side cart. Logged-in users have a DB-backed cart via `cart_items`. Cart operations are exposed via a REST API. A user cannot add the same course twice, and cannot add a course they are already enrolled in.

---

### Database Schema

```typescript
// lib/db/schema/cart.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const cartItems = sqliteTable('cart_items', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId:  text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  addedAt:   text('added_at').$defaultFn(() => new Date().toISOString()),
})

export type CartItem    = typeof cartItems.$inferSelect
export type NewCartItem = typeof cartItems.$inferInsert
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_cart_user_course ON cart_items(user_id, course_id);
CREATE INDEX idx_cart_user             ON cart_items(user_id);
```

---

### Business Logic

**Rules:**
1. Only authenticated users have a server-side cart. Guests use `localStorage` exclusively.
2. A course cannot be added to the cart if the user is already **actively enrolled** (`enrollments.status = 'ACTIVE'`).
3. A course cannot be added twice (unique index on `(user_id, course_id)`).
4. Only `status = PUBLISHED` courses can be added to the cart.
5. **Cart merge on login:** when the user logs in, the client sends the guest `localStorage` cart (array of `courseId`s) to `POST /api/cart/merge`. The server adds any valid, non-duplicate, non-enrolled items.
6. Cart item count is returned in every cart response.
7. Cart items include full course pricing snapshot (price, discountPrice, thumbnailUrl) for display — fetched via JOIN, not stored.

**Cart Merge Flow:**
```
User clicks Login
  → Auth successful
  → Client reads localStorage cart: ["course-a", "course-b"]
  → POST /api/cart/merge { courseIds: ["course-a", "course-b"] }
  → Server inserts non-duplicate, non-enrolled, PUBLISHED courses
  → Client clears localStorage
  → Cart UI refetches from API
```

---

### API

#### `GET /api/cart` — Get Cart

**Auth:** Required.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "courseId": "uuid",
        "title": "React Masterclass",
        "slug": "react-masterclass",
        "thumbnailUrl": "https://cdn.yourlms.com/thumbnails/uuid.jpg",
        "price": 49.99,
        "discountPrice": 29.99,
        "instructor": { "fullName": "Jane Smith" }
      }
    ],
    "itemCount": 1,
    "subtotal": 29.99
  }
}
```

---

#### `POST /api/cart` — Add Item

**Auth:** Required.

**Request (Zod schema):**
```typescript
// lib/validations/cart.schema.ts
export const addCartItemSchema = z.object({
  courseId: z.string().uuid(),
})
```

**Response `201`:**
```json
{ "success": true, "data": { "id": "uuid", "courseId": "uuid" } }
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `404` | `COURSE_NOT_FOUND` | Course does not exist or is not PUBLISHED |
| `409` | `ALREADY_IN_CART` | Course is already in the user's cart |
| `409` | `ALREADY_ENROLLED` | User has an active enrollment for this course |

---

#### `DELETE /api/cart/{courseId}` — Remove Item

**Auth:** Required.

**Response `204`:** No body.

**Error:** `404 ITEM_NOT_FOUND` — Item not in cart.

---

#### `DELETE /api/cart` — Clear Cart

**Auth:** Required.

**Response `204`:** Removes all cart items for the user.

---

#### `POST /api/cart/merge` — Merge Guest Cart on Login

**Auth:** Required.

**Request:**
```typescript
export const mergeCartSchema = z.object({
  courseIds: z.array(z.string().uuid()).max(20),
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "added": 2, "skipped": 1 }
}
```

Skipped items are silently ignored (already in cart, already enrolled, or not PUBLISHED).

---

### Backend Logic (Service Layer)

```typescript
// lib/services/cart.service.ts

export class CartService {
  async getCart(userId: string): Promise<CartSummary> {
    const items = await db
      .select({
        id:            cartItems.id,
        courseId:      cartItems.courseId,
        title:         courses.title,
        slug:          courses.slug,
        thumbnailUrl:  courses.thumbnailUrl,
        price:         courses.price,
        discountPrice: courses.discountPrice,
        instructor:    { fullName: users.fullName },
      })
      .from(cartItems)
      .innerJoin(courses, eq(cartItems.courseId, courses.id))
      .innerJoin(users,   eq(courses.authorId,   users.id))
      .where(eq(cartItems.userId, userId))

    const subtotal = items.reduce(
      (sum, item) => sum + (item.discountPrice ?? item.price),
      0,
    )
    return { items, itemCount: items.length, subtotal }
  }

  async addItem(userId: string, courseId: string): Promise<CartItem> {
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.status, 'PUBLISHED')),
    })
    if (!course) throw new AppError('COURSE_NOT_FOUND', 404)

    const enrolled = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, userId),
        eq(enrollments.courseId,  courseId),
        eq(enrollments.status,    'ACTIVE'),
      ),
    })
    if (enrolled) throw new AppError('ALREADY_ENROLLED', 409)

    try {
      const [item] = await db
        .insert(cartItems)
        .values({ userId, courseId })
        .returning()
      return item
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        throw new AppError('ALREADY_IN_CART', 409)
      }
      throw err
    }
  }

  async removeItem(userId: string, courseId: string): Promise<void> {
    const result = await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.courseId, courseId)))
    if (result.rowsAffected === 0) throw new AppError('ITEM_NOT_FOUND', 404)
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId))
  }

  async mergeGuestCart(
    userId: string,
    courseIds: string[],
  ): Promise<{ added: number; skipped: number }> {
    let added = 0; let skipped = 0
    for (const courseId of courseIds) {
      try {
        await this.addItem(userId, courseId)
        added++
      } catch {
        skipped++
      }
    }
    return { added, skipped }
  }
}
```

---

### Unit Tests

```typescript
// __tests__/services/cart.service.test.ts
describe('CartService.addItem()', () => {
  it('adds a PUBLISHED course to the cart', async () => { /* ... */ })
  it('throws COURSE_NOT_FOUND for a DRAFT course', async () => { /* ... */ })
  it('throws ALREADY_ENROLLED for an actively enrolled student', async () => { /* ... */ })
  it('throws ALREADY_IN_CART for a duplicate add', async () => { /* ... */ })
  it('throws COURSE_NOT_FOUND for unknown courseId', async () => { /* ... */ })
})

describe('CartService.getCart()', () => {
  it('returns correct subtotal using discountPrice when set', async () => { /* ... */ })
  it('returns correct subtotal using price when discountPrice is null', async () => { /* ... */ })
  it('returns empty items array for user with empty cart', async () => { /* ... */ })
  it('includes instructor fullName in each item', async () => { /* ... */ })
})

describe('CartService.mergeGuestCart()', () => {
  it('adds new valid courses and skips already-in-cart items', async () => { /* ... */ })
  it('skips courses that are not PUBLISHED', async () => { /* ... */ })
  it('skips courses the user is already enrolled in', async () => { /* ... */ })
  it('returns correct added and skipped counts', async () => { /* ... */ })
})

describe('CartService.removeItem()', () => {
  it('removes item successfully', async () => { /* ... */ })
  it('throws ITEM_NOT_FOUND for item not in cart', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
// __tests__/integration/cart.test.ts
describe('GET /api/cart [integration]', () => {
  it('returns 200 with items and subtotal for authenticated student', async () => { /* ... */ })
  it('returns 401 for unauthenticated request', async () => { /* ... */ })
  it('returns empty cart for user with no items', async () => { /* ... */ })
})

describe('POST /api/cart [integration]', () => {
  it('returns 201 when adding a valid published course', async () => { /* ... */ })
  it('returns 409 ALREADY_IN_CART on duplicate add', async () => { /* ... */ })
  it('returns 409 ALREADY_ENROLLED for enrolled student', async () => { /* ... */ })
  it('returns 404 for non-published course', async () => { /* ... */ })
})

describe('POST /api/cart/merge [integration]', () => {
  it('merges guest cart and returns added count', async () => { /* ... */ })
  it('silently skips invalid courseIds', async () => { /* ... */ })
})

describe('DELETE /api/cart/{courseId} [integration]', () => {
  it('removes item and returns 204', async () => { /* ... */ })
  it('returns 404 for item not in cart', async () => { /* ... */ })
})
```

---

## Slice 3.2 — Checkout & Stripe Payment

### Goal
A logged-in student can checkout using **Stripe**. The checkout flow: validate cart → apply coupon (optional) → create Stripe `PaymentIntent` → student pays via Stripe Elements UI → Stripe fires a `payment_intent.succeeded` webhook → server creates an `order` + `enrollments`, clears cart, and dispatches an Inngest event to send a PDF receipt via email.

---

### Database Schema

```typescript
// lib/db/schema/orders.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const orders = sqliteTable('orders', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId:        text('student_id').notNull().references(() => users.id),
  status:           text('status', {
                      enum: ['PENDING', 'COMPLETED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED'],
                    }).default('PENDING').notNull(),
  gateway:          text('gateway', { enum: ['STRIPE', 'RAZORPAY'] }).notNull(),
  gatewayOrderId:   text('gateway_order_id').unique(),     // Stripe PaymentIntent ID or Razorpay order ID
  gatewayPaymentId: text('gateway_payment_id'),            // Stripe charge ID or Razorpay payment ID
  subtotal:         real('subtotal').notNull(),             // before coupon
  discountAmount:   real('discount_amount').default(0),
  total:            real('total').notNull(),                // final charged amount
  currency:         text('currency').default('INR').notNull(),
  couponId:         text('coupon_id').references(() => coupons.id),
  invoiceUrl:       text('invoice_url'),                   // S3 URL of generated PDF
  createdAt:        text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:        text('updated_at').$defaultFn(() => new Date().toISOString()),
})

export const orderItems = sqliteTable('order_items', {
  id:              text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:         text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  courseId:        text('course_id').notNull().references(() => courses.id),
  priceAtPurchase: real('price_at_purchase').notNull(),    // snapshot of price at time of purchase
  createdAt:       text('created_at').$defaultFn(() => new Date().toISOString()),
})

export const enrollments = sqliteTable('enrollments', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId:  text('student_id').notNull().references(() => users.id),
  courseId:   text('course_id').notNull().references(() => courses.id),
  orderId:    text('order_id').references(() => orders.id),
  status:     text('status', { enum: ['ACTIVE', 'EXPIRED', 'REFUNDED'] }).default('ACTIVE').notNull(),
  expiresAt:  text('expires_at'),                         // null = lifetime access
  enrolledAt: text('enrolled_at').$defaultFn(() => new Date().toISOString()),
})

export type Order      = typeof orders.$inferSelect
export type Enrollment = typeof enrollments.$inferSelect
```

**Indexes:**
```sql
CREATE INDEX idx_orders_student        ON orders(student_id);
CREATE INDEX idx_orders_gateway_order  ON orders(gateway_order_id);
CREATE INDEX idx_order_items_order     ON order_items(order_id);
CREATE UNIQUE INDEX idx_enrollments_unique ON enrollments(student_id, course_id);
CREATE INDEX idx_enrollments_student   ON enrollments(student_id);
CREATE INDEX idx_enrollments_course    ON enrollments(course_id);
```

---

### Business Logic

**Checkout Validation Rules:**
1. Cart must have at least 1 item.
2. All cart items must still be `PUBLISHED` at time of checkout.
3. Student must not already be enrolled in any cart item (re-validate at checkout time).
4. Coupon (if supplied) must be valid: not expired, not exhausted, applies to the cart.
5. Stripe `PaymentIntent` amount is in the **smallest currency unit** (paise for INR: `total * 100`).

**Order Creation Rules (Webhook):**
1. Webhook payload **must pass Stripe signature verification** — reject all others with `400`.
2. Duplicate webhook events (same `paymentIntentId`) are idempotent — check if order already exists.
3. `enrollments.expiresAt` is set to `NOW + course.accessDuration days` if `accessDuration` is not null; otherwise `null` (lifetime).
4. Cart is cleared after successful enrollment creation.
5. Receipt PDF is generated asynchronously via Inngest (never blocks the webhook response).

**Price Snapshot:** `orderItems.priceAtPurchase` captures `discountPrice ?? price` at the moment of purchase. This is the source of truth for revenue reports, regardless of future course price changes.

---

### API

#### `POST /api/payments/create-intent` — Create Stripe PaymentIntent

**Auth:** Required. Role: `STUDENT`.

**Request (Zod schema):**
```typescript
// lib/validations/payment.schema.ts
export const createStripeIntentSchema = z.object({
  couponCode: z.string().max(50).optional(),
})
```

**Flow:**
1. Fetch cart items for user.
2. Validate all items (PUBLISHED, not already enrolled).
3. Validate coupon (if supplied).
4. Compute `subtotal`, `discountAmount`, `total`.
5. Create Stripe `PaymentIntent` with `amount = Math.round(total * 100)`, `currency = 'inr'`, `metadata = { userId, cartItemIds, couponId }`.
6. Return `clientSecret` to client.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_3Nxxx_secret_xxx",
    "subtotal": 79.98,
    "discountAmount": 10.00,
    "total": 69.98,
    "breakdown": [
      { "courseId": "uuid", "title": "React Masterclass", "price": 29.99 },
      { "courseId": "uuid", "title": "Node.js Advanced",  "price": 39.99 }
    ]
  }
}
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `400` | `EMPTY_CART` | Cart has no items |
| `409` | `ALREADY_ENROLLED` | One or more cart items already enrolled |
| `422` | `INVALID_COUPON` | Coupon not found, expired, or exhausted |
| `500` | `STRIPE_ERROR` | Stripe SDK failure |

---

#### `POST /api/webhooks/stripe` — Stripe Webhook Handler

**Auth:** None (signature verification via `stripe.webhooks.constructEvent`).

**Handled Events:**
- `payment_intent.succeeded` → create order + enrollments + clear cart + fire Inngest
- `payment_intent.payment_failed` → update order status to `FAILED`

**Response:** Always `200` (to acknowledge receipt). Internal errors are logged but do not return `500` to Stripe (prevents retries on non-retryable errors).

---

#### `GET /api/payments/orders` — Order History (Student)

**Auth:** Required.

**Query:** `cursor`, `limit` (default 10, max 50).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "gateway": "STRIPE",
      "total": 69.98,
      "currency": "INR",
      "invoiceUrl": "https://cdn.yourlms.com/invoices/order-uuid.pdf",
      "createdAt": "2026-10-28T14:00:00.000Z",
      "items": [
        { "courseId": "uuid", "title": "React Masterclass", "priceAtPurchase": 29.99 }
      ]
    }
  ],
  "meta": { "hasNext": false }
}
```

---

### Backend Logic (Service Layer)

```typescript
// lib/services/payment.service.ts

export class PaymentService {
  async createStripeIntent(
    userId: string,
    couponCode?: string,
  ): Promise<StripeIntentResult> {
    const cart = await cartService.getCart(userId)
    if (cart.itemCount === 0) throw new AppError('EMPTY_CART', 400)

    for (const item of cart.items) {
      const enrolled = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, userId),
          eq(enrollments.courseId,  item.courseId),
          eq(enrollments.status,    'ACTIVE'),
        ),
      })
      if (enrolled) throw new AppError('ALREADY_ENROLLED', 409)
    }

    let discountAmount = 0
    let coupon: Coupon | undefined
    if (couponCode) {
      coupon = await couponService.validateCoupon(couponCode, cart.subtotal)
      discountAmount = coupon.type === 'PERCENT'
        ? (cart.subtotal * coupon.value) / 100
        : coupon.value
      discountAmount = Math.min(discountAmount, cart.subtotal)
    }

    const total = Math.max(0, cart.subtotal - discountAmount)

    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(total * 100),
      currency: 'inr',
      metadata: {
        userId,
        cartItemIds: cart.items.map((i) => i.courseId).join(','),
        couponId:    coupon?.id ?? '',
      },
    })

    return {
      clientSecret:   intent.client_secret!,
      subtotal:       cart.subtotal,
      discountAmount,
      total,
      breakdown: cart.items.map((i) => ({
        courseId: i.courseId,
        title:    i.title,
        price:    i.discountPrice ?? i.price,
      })),
    }
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      throw new AppError('INVALID_STRIPE_SIGNATURE', 400)
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.processStripeSuccess(event.data.object as Stripe.PaymentIntent)
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      await db.update(orders)
        .set({ status: 'FAILED', updatedAt: new Date().toISOString() })
        .where(eq(orders.gatewayOrderId, pi.id))
    }
  }

  private async processStripeSuccess(pi: Stripe.PaymentIntent): Promise<void> {
    const existing = await db.query.orders.findFirst({
      where: eq(orders.gatewayOrderId, pi.id),
    })
    if (existing?.status === 'COMPLETED') return

    const { userId, cartItemIds, couponId } = pi.metadata
    const courseIds  = cartItemIds.split(',').filter(Boolean)

    await this.processEnrollments({
      userId,
      courseIds,
      gateway:          'STRIPE',
      gatewayOrderId:   pi.id,
      gatewayPaymentId: pi.latest_charge as string,
      total:            pi.amount / 100,
      couponId:         couponId || null,
    })
  }

  // Shared enrollment processing - called by both Stripe and Razorpay paths
  private async processEnrollments(params: ProcessEnrollmentsParams): Promise<void> {
    const { userId, courseIds, gateway, gatewayOrderId, gatewayPaymentId, total, couponId } = params
    const courseList = await db.query.courses.findMany({ where: inArray(courses.id, courseIds) })
    const subtotal   = courseList.reduce((s, c) => s + (c.discountPrice ?? c.price), 0)

    await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({
        studentId: userId, status: 'COMPLETED', gateway,
        gatewayOrderId, gatewayPaymentId,
        subtotal, discountAmount: subtotal - total, total,
        couponId,
      }).returning()

      await tx.insert(orderItems).values(
        courseList.map((c) => ({
          orderId:         order.id,
          courseId:        c.id,
          priceAtPurchase: c.discountPrice ?? c.price,
        })),
      )

      await tx.insert(enrollments).values(
        courseList.map((c) => ({
          studentId: userId,
          courseId:  c.id,
          orderId:   order.id,
          status:    'ACTIVE' as const,
          expiresAt: c.accessDuration
            ? new Date(Date.now() + c.accessDuration * 86400000).toISOString()
            : null,
        })),
      )

      if (couponId) {
        await tx.update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.id, couponId))
      }

      await tx.delete(cartItems).where(eq(cartItems.userId, userId))

      await inngest.send({
        name: 'payment/completed',
        data: { orderId: order.id, userId, gateway },
      })
    })
  }
}
```

---

### Background Jobs (Inngest)

```typescript
// lib/inngest/payment.functions.ts

export const sendPurchaseReceipt = inngest.createFunction(
  { id: 'payment/send-receipt', retries: 3 },
  { event: 'payment/completed' },
  async ({ event, step }) => {
    const { orderId, userId } = event.data

    const [order, student] = await step.run('fetch-order-and-student', async () =>
      Promise.all([
        db.query.orders.findFirst({
          where: eq(orders.id, orderId),
          with:  { items: { with: { course: true } } },
        }),
        db.query.users.findFirst({ where: eq(users.id, userId) }),
      ])
    )

    const pdfBuffer = await step.run('generate-pdf', () =>
      generateInvoicePdf({ order: order!, student: student! })
    )

    const key = `invoices/${orderId}.pdf`
    const invoiceUrl = await step.run('upload-pdf-to-s3', async () => {
      await s3Client.send(new PutObjectCommand({
        Bucket:      process.env.AWS_S3_BUCKET!,
        Key:         key,
        Body:        pdfBuffer,
        ContentType: 'application/pdf',
      }))
      return getPublicCdnUrl(key)
    })

    await step.run('save-invoice-url', () =>
      db.update(orders)
        .set({ invoiceUrl })
        .where(eq(orders.id, orderId))
    )

    await step.run('send-email', () =>
      resend.emails.send({
        from:    'noreply@yourlms.com',
        to:      student!.email,
        subject: `Your purchase receipt — Order #${orderId.slice(0, 8).toUpperCase()}`,
        html:    renderPurchaseReceiptEmail({ student: student!, order: order!, invoiceUrl }),
      })
    )
  },
)
```

---

### Unit Tests

```typescript
describe('PaymentService.createStripeIntent()', () => {
  it('creates intent for cart with 2 items', async () => { /* ... */ })
  it('throws EMPTY_CART when cart has no items', async () => { /* ... */ })
  it('throws ALREADY_ENROLLED when student is enrolled in a cart item', async () => { /* ... */ })
  it('applies percentage coupon discount correctly', async () => { /* ... */ })
  it('applies fixed amount coupon discount correctly', async () => { /* ... */ })
  it('caps discount at subtotal (total >= 0)', async () => { /* ... */ })
  it('throws INVALID_COUPON for expired coupon', async () => { /* ... */ })
})

describe('PaymentService.handleStripeWebhook()', () => {
  it('throws INVALID_STRIPE_SIGNATURE for tampered payload', async () => { /* ... */ })
  it('creates order + enrollments on payment_intent.succeeded', async () => { /* ... */ })
  it('is idempotent — ignores duplicate payment_intent.succeeded events', async () => { /* ... */ })
  it('sets status=FAILED on payment_intent.payment_failed', async () => { /* ... */ })
  it('clears cart after successful payment', async () => { /* ... */ })
  it('sets expiresAt correctly for time-limited course', async () => { /* ... */ })
  it('sets expiresAt=null for lifetime access course', async () => { /* ... */ })
  it('increments coupon usedCount on successful payment', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
describe('POST /api/payments/create-intent [integration]', () => {
  it('returns 200 with clientSecret for authenticated student with cart', async () => { /* ... */ })
  it('returns 400 EMPTY_CART when cart is empty', async () => { /* ... */ })
  it('returns 409 ALREADY_ENROLLED when cart item already enrolled', async () => { /* ... */ })
  it('returns 401 for unauthenticated request', async () => { /* ... */ })
  it('applies valid coupon and reduces total', async () => { /* ... */ })
})

describe('POST /api/webhooks/stripe [integration]', () => {
  it('returns 400 for invalid signature', async () => { /* ... */ })
  it('creates order + enrollments for valid payment_intent.succeeded event', async () => { /* ... */ })
  it('returns 200 and is idempotent for duplicate event', async () => { /* ... */ })
})

describe('GET /api/payments/orders [integration]', () => {
  it('returns paginated order history for authenticated student', async () => { /* ... */ })
  it('returns 401 for unauthenticated request', async () => { /* ... */ })
  it('returns empty list for student with no orders', async () => { /* ... */ })
})
```

---

## Slice 3.3 — Razorpay Payment Flow

### Goal
Students who prefer India-local payment methods (UPI, NetBanking, Indian cards) can checkout via **Razorpay**. The flow: create Razorpay order on server → render Razorpay checkout modal on client → on success, Razorpay fires a webhook → server verifies HMAC signature → creates order + enrollments. The enrollment activation logic is identical to Slice 3.2 and is extracted into the shared `PaymentService.processEnrollments()` helper.

---

### Database Schema

No new tables. Reuses `orders`, `order_items`, `enrollments` from Slice 3.2.

- `orders.gateway = 'RAZORPAY'`
- `orders.gatewayOrderId` → Razorpay `order_id` (e.g., `order_9A33XWu170gUtm`)
- `orders.gatewayPaymentId` → Razorpay `payment_id` (e.g., `pay_29QiAfLdAQFZHh`)

---

### Business Logic

**Razorpay Flow:**
```
Client → POST /api/payments/razorpay/create-order
         → Razorpay SDK creates order → returns { razorpayOrderId, amount, currency, key }

Client → Opens Razorpay checkout modal (browser SDK)
         → Student completes payment
         → Razorpay sends webhook POST /api/webhooks/razorpay

Server → Verifies HMAC-SHA256 signature:
           hmac(razorpayOrderId + "|" + razorpayPaymentId, RAZORPAY_WEBHOOK_SECRET)
         → Creates order + enrollments (shared logic with Stripe slice)
         → Fires Inngest payment/completed event
```

**Signature Verification:**
```typescript
const expectedSignature = crypto
  .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex')
if (expectedSignature !== razorpay_signature) throw new AppError('INVALID_RAZORPAY_SIGNATURE', 400)
```

**Idempotency:** Check for existing order with `gatewayOrderId = razorpay_order_id` before processing. Duplicate webhooks are silently acknowledged with `200`.

---

### API

#### `POST /api/payments/razorpay/create-order` — Create Razorpay Order

**Auth:** Required. Role: `STUDENT`.

**Request (Zod schema):**
```typescript
export const createRazorpayOrderSchema = z.object({
  couponCode: z.string().max(50).optional(),
})
```

**Flow:** Same cart validation as Stripe (Slice 3.2 steps 1–4). Creates Razorpay order via SDK.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_9A33XWu170gUtm",
    "amount": 6998,
    "currency": "INR",
    "razorpayKey": "rzp_live_xxx",
    "prefill": {
      "name":  "Alice Doe",
      "email": "alice@example.com"
    },
    "breakdown": [
      { "courseId": "uuid", "title": "React Masterclass", "price": 29.99 }
    ]
  }
}
```

`amount` is in paise (e.g., `69.98 INR → 6998 paise`).

**Error Responses:** Same codes as `POST /api/payments/create-intent`.

---

#### `POST /api/webhooks/razorpay` — Razorpay Webhook Handler

**Auth:** None (HMAC signature verification).

**Handled Events:**
- `payment.captured` → HMAC verify → create order + enrollments + Inngest
- `payment.failed` → update order to `FAILED`

**Response:** `200` always (same Stripe pattern).

---

### Backend Logic (Service Layer)

```typescript
// lib/services/payment.service.ts (additions)

async createRazorpayOrder(
  userId: string,
  couponCode?: string,
): Promise<RazorpayOrderResult> {
  const cart = await cartService.getCart(userId)
  if (cart.itemCount === 0) throw new AppError('EMPTY_CART', 400)

  for (const item of cart.items) {
    const enrolled = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.studentId, userId),
        eq(enrollments.courseId,  item.courseId),
        eq(enrollments.status,    'ACTIVE'),
      ),
    })
    if (enrolled) throw new AppError('ALREADY_ENROLLED', 409)
  }

  let discountAmount = 0; let coupon: Coupon | undefined
  if (couponCode) {
    coupon = await couponService.validateCoupon(couponCode, cart.subtotal)
    discountAmount = coupon.type === 'PERCENT'
      ? (cart.subtotal * coupon.value) / 100
      : coupon.value
    discountAmount = Math.min(discountAmount, cart.subtotal)
  }

  const total = Math.max(0, cart.subtotal - discountAmount)

  const rzpOrder = await razorpay.orders.create({
    amount:   Math.round(total * 100),
    currency: 'INR',
    notes:    {
      userId,
      cartItemIds: cart.items.map((i) => i.courseId).join(','),
      couponId:    coupon?.id ?? '',
    },
  })

  const student = await db.query.users.findFirst({ where: eq(users.id, userId) })

  return {
    razorpayOrderId: rzpOrder.id,
    amount:          rzpOrder.amount as number,
    currency:        'INR',
    razorpayKey:     process.env.NEXT_PUBLIC_RAZORPAY_KEY!,
    prefill:         { name: student!.fullName, email: student!.email },
    breakdown: cart.items.map((i) => ({
      courseId: i.courseId,
      title:    i.title,
      price:    i.discountPrice ?? i.price,
    })),
  }
}

async handleRazorpayWebhook(payload: RazorpayWebhookPayload): Promise<void> {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')
  if (expected !== razorpay_signature) throw new AppError('INVALID_RAZORPAY_SIGNATURE', 400)

  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.gatewayOrderId, razorpay_order_id), eq(orders.status, 'COMPLETED')),
  })
  if (existing) return // idempotent

  const rzpOrder   = await razorpay.orders.fetch(razorpay_order_id)
  const { userId, cartItemIds, couponId } = rzpOrder.notes as Record<string, string>
  const courseIds  = cartItemIds.split(',').filter(Boolean)

  await this.processEnrollments({
    userId,
    courseIds,
    gateway:          'RAZORPAY',
    gatewayOrderId:   razorpay_order_id,
    gatewayPaymentId: razorpay_payment_id,
    total:            (rzpOrder.amount as number) / 100,
    couponId:         couponId || null,
  })
}
```

---

### Unit Tests

```typescript
describe('PaymentService.createRazorpayOrder()', () => {
  it('creates a Razorpay order for cart with items', async () => { /* ... */ })
  it('throws EMPTY_CART for empty cart', async () => { /* ... */ })
  it('throws ALREADY_ENROLLED for enrolled cart item', async () => { /* ... */ })
  it('applies coupon discount and creates order with correct amount', async () => { /* ... */ })
  it('includes student prefill in response', async () => { /* ... */ })
})

describe('PaymentService.handleRazorpayWebhook()', () => {
  it('throws INVALID_RAZORPAY_SIGNATURE for bad signature', async () => { /* ... */ })
  it('creates order + enrollments for valid payment.captured event', async () => { /* ... */ })
  it('is idempotent for duplicate webhook events', async () => { /* ... */ })
  it('fires inngest payment/completed event', async () => { /* ... */ })
  it('clears cart after successful enrollment', async () => { /* ... */ })
})

describe('PaymentService.processEnrollments() — shared', () => {
  it('creates order + enrollments in a single transaction', async () => { /* ... */ })
  it('rolls back all writes if any insertion fails', async () => { /* ... */ })
  it('increments couponId usedCount when coupon is present', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
describe('POST /api/payments/razorpay/create-order [integration]', () => {
  it('returns 200 with razorpayOrderId and breakdown', async () => { /* ... */ })
  it('returns 400 for empty cart', async () => { /* ... */ })
  it('returns 401 for unauthenticated user', async () => { /* ... */ })
})

describe('POST /api/webhooks/razorpay [integration]', () => {
  it('returns 400 for invalid HMAC signature', async () => { /* ... */ })
  it('creates enrollment after valid payment.captured event', async () => { /* ... */ })
  it('returns 200 and skips processing for duplicate event', async () => { /* ... */ })
})
```

---

## Slice 3.4 — Coupon System & Admin Refunds

### Goal
**Admins** can create percentage or fixed-amount coupon codes with optional expiry dates, usage limits, and minimum order thresholds. Students apply coupons at checkout. Admins can view all transactions in `/admin/payments` and issue full or partial refunds via Stripe or Razorpay, which sets the enrollment to `REFUNDED`.

---

### Database Schema

```typescript
// lib/db/schema/coupons.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const coupons = sqliteTable('coupons', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code:          text('code').unique().notNull(),
  type:          text('type', { enum: ['PERCENT', 'FIXED'] }).notNull(),
  value:         real('value').notNull(),              // % or INR amount
  minOrderValue: real('min_order_value').default(0),  // minimum subtotal to apply
  maxUses:       integer('max_uses'),                 // null = unlimited
  usedCount:     integer('used_count').default(0).notNull(),
  expiresAt:     text('expires_at'),                  // ISO string; null = no expiry
  isActive:      integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  createdBy:     text('created_by').notNull().references(() => users.id),
  createdAt:     text('created_at').$defaultFn(() => new Date().toISOString()),
})

export type Coupon    = typeof coupons.$inferSelect
export type NewCoupon = typeof coupons.$inferInsert
```

**Indexes:**
```sql
CREATE INDEX idx_coupons_code ON coupons(code);
```

---

### Business Logic

**Coupon Validation Rules:**
1. Code must exist and `isActive = true`.
2. If `expiresAt` is set, it must be in the future.
3. If `maxUses` is set, `usedCount < maxUses`.
4. Cart `subtotal >= minOrderValue`.
5. Coupon is validated at `create-intent` time **and** re-validated at webhook time.
6. `PERCENT` coupons: `discountAmount = subtotal * (value / 100)`.
7. `FIXED` coupons: `discountAmount = value`, capped at `subtotal`.

**Refund Rules:**
1. Only `ADMIN` can initiate refunds.
2. Full refund: refunds 100% of `order.total` via the original payment gateway.
3. Partial refund: refunds a specified `amount` (must be `<= order.total`).
4. On full refund: `order.status → 'REFUNDED'`; all `enrollments.status → 'REFUNDED'`.
5. On partial refund: `order.status → 'PARTIALLY_REFUNDED'`; selected `enrollments.status → 'REFUNDED'`.

---

### API

#### `POST /api/coupons/validate` — Validate Coupon

**Auth:** Required. Role: `STUDENT`.

**Request:**
```typescript
export const validateCouponSchema = z.object({
  code:     z.string().min(1).max(50),
  subtotal: z.number().positive(),
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "code": "SUMMER20",
    "type": "PERCENT",
    "value": 20,
    "discountAmount": 15.99,
    "newTotal": 63.99
  }
}
```

**Error `422` `INVALID_COUPON`:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_COUPON",
    "message": "This coupon has expired.",
    "reason": "EXPIRED"
  }
}
```

`reason` values: `NOT_FOUND`, `INACTIVE`, `EXPIRED`, `EXHAUSTED`, `MIN_ORDER_NOT_MET`.

---

#### `POST /api/admin/coupons` — Create Coupon (Admin only)

```typescript
export const createCouponSchema = z.object({
  code:          z.string().min(3).max(50).toUpperCase(),
  type:          z.enum(['PERCENT', 'FIXED']),
  value:         z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  maxUses:       z.number().int().positive().optional(),
  expiresAt:     z.string().datetime().optional(),
})
```

**Validation:** `PERCENT` type: `value <= 100`.

**Response `201`:** Full coupon object.

**Error:** `409 COUPON_CODE_EXISTS` — Code already in use.

---

#### `GET /api/admin/coupons` — List Coupons (Admin only)

**Query:** `cursor`, `limit` (default 20), `isActive` (boolean filter).

**Response `200`:** Paginated list of coupons with `usedCount`, `expiresAt`, `isActive`.

---

#### `PATCH /api/admin/coupons/{id}` — Update Coupon (Admin only)

Allows toggling `isActive`, updating `expiresAt`, `maxUses`. Cannot change `code`, `type`, or `value`.

---

#### `GET /api/admin/payments` — All Transactions (Admin only)

**Query:** `cursor`, `limit`, `gateway`, `status`, `studentId`, `dateFrom`, `dateTo`.

**Response `200`:** Paginated orders with student info, items, totals, coupon code used.

---

#### `POST /api/admin/payments/{orderId}/refund` — Refund Order (Admin only)

**Request:**
```typescript
export const refundSchema = z.object({
  amount:       z.number().positive(),
  reason:       z.enum(['DUPLICATE', 'FRAUDULENT', 'REQUESTED_BY_CUSTOMER']),
  orderItemIds: z.array(z.string().uuid()).optional(),
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "orderId": "uuid",
    "refundedAmount": 29.99,
    "newOrderStatus": "PARTIALLY_REFUNDED",
    "gatewayRefundId": "re_3Nyyyy"
  }
}
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `422` | `ALREADY_REFUNDED` | Order already fully refunded |
| `422` | `REFUND_EXCEEDS_TOTAL` | Requested amount > order.total |
| `500` | `GATEWAY_REFUND_ERROR` | Stripe/Razorpay refund API failure |

---

### Backend Logic (Service Layer)

```typescript
// lib/services/coupon.service.ts

export class CouponService {
  async validateCoupon(code: string, subtotal: number): Promise<Coupon> {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code.toUpperCase()),
    })

    if (!coupon)          throw new AppError('INVALID_COUPON', 422, { reason: 'NOT_FOUND' })
    if (!coupon.isActive) throw new AppError('INVALID_COUPON', 422, { reason: 'INACTIVE' })
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())
                          throw new AppError('INVALID_COUPON', 422, { reason: 'EXPIRED' })
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
                          throw new AppError('INVALID_COUPON', 422, { reason: 'EXHAUSTED' })
    if (subtotal < coupon.minOrderValue)
                          throw new AppError('INVALID_COUPON', 422, { reason: 'MIN_ORDER_NOT_MET' })
    return coupon
  }

  async createCoupon(dto: CreateCouponDto, adminId: string): Promise<Coupon> {
    if (dto.type === 'PERCENT' && dto.value > 100) {
      throw new AppError('VALIDATION_ERROR', 400, { message: 'Percent value cannot exceed 100' })
    }
    try {
      const [coupon] = await db
        .insert(coupons)
        .values({ ...dto, code: dto.code.toUpperCase(), createdBy: adminId })
        .returning()
      return coupon
    } catch (err: any) {
      if (err.message?.includes('UNIQUE constraint failed')) {
        throw new AppError('COUPON_CODE_EXISTS', 409)
      }
      throw err
    }
  }
}

// lib/services/payment.service.ts (additions)

async refundOrder(
  orderId: string,
  adminId: string,
  dto: RefundDto,
): Promise<RefundResult> {
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) })
  if (!order)                      throw new AppError('ORDER_NOT_FOUND', 404)
  if (order.status === 'REFUNDED') throw new AppError('ALREADY_REFUNDED', 422)
  if (dto.amount > order.total)    throw new AppError('REFUND_EXCEEDS_TOTAL', 422)

  let gatewayRefundId: string

  if (order.gateway === 'STRIPE') {
    const refund = await stripe.refunds.create({
      charge: order.gatewayPaymentId!,
      amount: Math.round(dto.amount * 100),
      reason: dto.reason,
    })
    gatewayRefundId = refund.id
  } else {
    const refund = await razorpay.payments.refund(order.gatewayPaymentId!, {
      amount: Math.round(dto.amount * 100),
      notes:  { reason: dto.reason, adminId },
    })
    gatewayRefundId = refund.id
  }

  const isFullRefund = dto.amount === order.total
  const newStatus    = isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED'

  await db.transaction(async (tx) => {
    await tx.update(orders)
      .set({ status: newStatus, updatedAt: new Date().toISOString() })
      .where(eq(orders.id, orderId))

    if (isFullRefund) {
      await tx.update(enrollments)
        .set({ status: 'REFUNDED' })
        .where(eq(enrollments.orderId, orderId))
    } else if (dto.orderItemIds?.length) {
      const itemCourses = await tx.query.orderItems.findMany({
        where:   inArray(orderItems.id, dto.orderItemIds),
        columns: { courseId: true },
      })
      for (const { courseId } of itemCourses) {
        await tx.update(enrollments)
          .set({ status: 'REFUNDED' })
          .where(and(eq(enrollments.orderId, orderId), eq(enrollments.courseId, courseId)))
      }
    }
  })

  return { orderId, refundedAmount: dto.amount, newOrderStatus: newStatus, gatewayRefundId }
}
```

---

### Unit Tests

```typescript
describe('CouponService.validateCoupon()', () => {
  it('returns coupon for a valid active code', async () => { /* ... */ })
  it('throws INVALID_COUPON reason=NOT_FOUND for unknown code', async () => { /* ... */ })
  it('throws INVALID_COUPON reason=INACTIVE for deactivated coupon', async () => { /* ... */ })
  it('throws INVALID_COUPON reason=EXPIRED for past expiresAt', async () => { /* ... */ })
  it('throws INVALID_COUPON reason=EXHAUSTED when usedCount >= maxUses', async () => { /* ... */ })
  it('throws INVALID_COUPON reason=MIN_ORDER_NOT_MET when subtotal < minOrderValue', async () => { /* ... */ })
  it('accepts coupon when maxUses is null (unlimited)', async () => { /* ... */ })
  it('accepts coupon when expiresAt is null (no expiry)', async () => { /* ... */ })
})

describe('CouponService.createCoupon()', () => {
  it('creates a PERCENT coupon', async () => { /* ... */ })
  it('creates a FIXED coupon', async () => { /* ... */ })
  it('uppercases the code', async () => { /* ... */ })
  it('throws COUPON_CODE_EXISTS for duplicate code', async () => { /* ... */ })
  it('throws VALIDATION_ERROR for PERCENT value > 100', async () => { /* ... */ })
})

describe('PaymentService.refundOrder()', () => {
  it('issues full Stripe refund and sets status=REFUNDED', async () => { /* ... */ })
  it('issues partial Stripe refund and sets status=PARTIALLY_REFUNDED', async () => { /* ... */ })
  it('issues full Razorpay refund and sets status=REFUNDED', async () => { /* ... */ })
  it('sets all enrollments to REFUNDED on full refund', async () => { /* ... */ })
  it('sets selected enrollments to REFUNDED on partial refund', async () => { /* ... */ })
  it('throws ALREADY_REFUNDED for already-refunded order', async () => { /* ... */ })
  it('throws REFUND_EXCEEDS_TOTAL when amount > order.total', async () => { /* ... */ })
  it('throws ORDER_NOT_FOUND for unknown orderId', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
describe('POST /api/coupons/validate [integration]', () => {
  it('returns 200 with discountAmount for valid coupon', async () => { /* ... */ })
  it('returns 422 INVALID_COUPON for expired coupon', async () => { /* ... */ })
  it('returns 422 INVALID_COUPON when min order not met', async () => { /* ... */ })
  it('returns 401 for unauthenticated request', async () => { /* ... */ })
})

describe('POST /api/admin/coupons [integration]', () => {
  it('creates coupon for Admin and returns 201', async () => { /* ... */ })
  it('returns 403 for TEACHER role', async () => { /* ... */ })
  it('returns 409 for duplicate coupon code', async () => { /* ... */ })
})

describe('POST /api/admin/payments/{orderId}/refund [integration]', () => {
  it('issues full refund and updates order status to REFUNDED', async () => { /* ... */ })
  it('issues partial refund and updates status to PARTIALLY_REFUNDED', async () => { /* ... */ })
  it('returns 403 for non-Admin caller', async () => { /* ... */ })
  it('returns 404 for unknown orderId', async () => { /* ... */ })
  it('returns 422 when refund amount exceeds order total', async () => { /* ... */ })
})

describe('GET /api/admin/payments [integration]', () => {
  it('returns paginated order list for Admin', async () => { /* ... */ })
  it('filters by gateway=STRIPE', async () => { /* ... */ })
  it('filters by status=REFUNDED', async () => { /* ... */ })
  it('returns 403 for non-Admin', async () => { /* ... */ })
})
```

---

## Wave 3 Shared Infrastructure

### Complete Table List — Wave 3

| Table | Purpose | First Used In |
|-------|---------|---------------|
| `cart_items` | Server-side shopping cart for logged-in users | Slice 3.1 |
| `orders` | Payment records with gateway reference and status | Slice 3.2 |
| `order_items` | Individual course line items per order | Slice 3.2 |
| `enrollments` | Student course access grants, expiry, and status | Slice 3.2 |
| `coupons` | Discount codes (percent or fixed) with usage tracking | Slice 3.4 |

**Run migrations:**
```bash
npx drizzle-kit generate   # diff schema → generate SQL migration files
npx drizzle-kit migrate    # apply to Turso database
```

---

### Stripe Configuration

```typescript
// lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
  typescript:  true,
})
```

**Stripe Dashboard Setup:**
- Create webhook endpoint: `https://yourlms.com/api/webhooks/stripe`
- Subscribe to: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Copy `STRIPE_WEBHOOK_SECRET` from dashboard to env vars

---

### Razorpay Configuration

```typescript
// lib/razorpay.ts
import Razorpay from 'razorpay'

export const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})
```

**Razorpay Dashboard Setup:**
- Create webhook endpoint: `https://yourlms.com/api/webhooks/razorpay`
- Subscribe to: `payment.captured`, `payment.failed`
- Copy `RAZORPAY_WEBHOOK_SECRET` from dashboard to env vars

---

### PDF Invoice Generation (Inngest + React-PDF)

```typescript
// lib/pdf/invoice.tsx
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page:  { padding: 40, fontFamily: 'Helvetica' },
  title: { fontSize: 20, marginBottom: 16 },
  row:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 12, color: '#555' },
  value: { fontSize: 12 },
  total: { fontSize: 14, fontWeight: 'bold', marginTop: 16 },
})

export async function generateInvoicePdf(params: {
  order:   OrderWithItems
  student: User
}): Promise<Buffer> {
  const { order, student } = params

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Purchase Receipt</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Order ID</Text>
          <Text style={styles.value}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Student</Text>
          <Text style={styles.value}>{student.fullName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{new Date(order.createdAt).toLocaleDateString()}</Text>
        </View>
        {order.items.map((item) => (
          <View style={styles.row} key={item.id}>
            <Text style={styles.label}>{item.course.title}</Text>
            <Text style={styles.value}>&#8377;{item.priceAtPurchase.toFixed(2)}</Text>
          </View>
        ))}
        {order.discountAmount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Discount</Text>
            <Text style={styles.value}>-&#8377;{order.discountAmount.toFixed(2)}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Text style={styles.total}>Total Charged</Text>
          <Text style={styles.total}>&#8377;{order.total.toFixed(2)}</Text>
        </View>
      </Page>
    </Document>
  )

  return Buffer.from(await renderToBuffer(doc))
}
```

---

### Middleware Additions — Wave 3

```typescript
// lib/middleware/withRole.ts (additions)
export const withStudentOnly = withRole(['STUDENT'])
export const withAdminOnly   = withRole(['ADMIN'])

// Webhook routes bypass auth middleware entirely:
// middleware.ts — add to the public route matcher
const PUBLIC_ROUTES = [
  '/api/webhooks/stripe',
  '/api/webhooks/razorpay',
  '/api/webhooks/inngest',
]
```

**Rate Limits — Wave 3:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/cart` | 30 req | 1 min / user |
| `POST /api/cart/merge` | 5 req | 5 min / user |
| `POST /api/payments/create-intent` | 10 req | 1 min / user |
| `POST /api/payments/razorpay/create-order` | 10 req | 1 min / user |
| `POST /api/coupons/validate` | 20 req | 1 min / user |
| `POST /api/webhooks/stripe` | No limit (Stripe IPs only) | — |
| `POST /api/webhooks/razorpay` | No limit (Razorpay IPs only) | — |

---

### Environment Variables (New in Wave 3)

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx
NEXT_PUBLIC_RAZORPAY_KEY=rzp_live_xxx
```

---

### File Delivery Checklist

| File | Type | Slice |
|------|------|-------|
| `lib/db/schema/cart.ts` | Schema | 3.1 |
| `lib/db/schema/orders.ts` | Schema | 3.2 |
| `lib/db/schema/coupons.ts` | Schema | 3.4 |
| `lib/stripe.ts` | Stripe client | 3.2 |
| `lib/razorpay.ts` | Razorpay client | 3.3 |
| `lib/pdf/invoice.tsx` | PDF generator | 3.2 |
| `lib/validations/cart.schema.ts` | Zod | 3.1 |
| `lib/validations/payment.schema.ts` | Zod | 3.2, 3.3 |
| `lib/validations/coupon.schema.ts` | Zod | 3.4 |
| `lib/services/cart.service.ts` | Service | 3.1 |
| `lib/services/payment.service.ts` | Service | 3.2, 3.3, 3.4 |
| `lib/services/coupon.service.ts` | Service | 3.4 |
| `lib/inngest/payment.functions.ts` | Inngest jobs | 3.2 |
| `app/api/cart/route.ts` | Route Handler | 3.1 |
| `app/api/cart/[courseId]/route.ts` | Route Handler | 3.1 |
| `app/api/cart/merge/route.ts` | Route Handler | 3.1 |
| `app/api/payments/create-intent/route.ts` | Route Handler | 3.2 |
| `app/api/payments/razorpay/create-order/route.ts` | Route Handler | 3.3 |
| `app/api/payments/orders/route.ts` | Route Handler | 3.2 |
| `app/api/webhooks/stripe/route.ts` | Route Handler | 3.2 |
| `app/api/webhooks/razorpay/route.ts` | Route Handler | 3.3 |
| `app/api/coupons/validate/route.ts` | Route Handler | 3.4 |
| `app/api/admin/coupons/route.ts` | Route Handler | 3.4 |
| `app/api/admin/coupons/[id]/route.ts` | Route Handler | 3.4 |
| `app/api/admin/payments/route.ts` | Route Handler | 3.4 |
| `app/api/admin/payments/[orderId]/refund/route.ts` | Route Handler | 3.4 |
| `__tests__/services/cart.service.test.ts` | Tests | 3.1 |
| `__tests__/services/payment.service.test.ts` | Tests | 3.2, 3.3 |
| `__tests__/services/coupon.service.test.ts` | Tests | 3.4 |
| `__tests__/integration/cart.test.ts` | Tests | 3.1 |
| `__tests__/integration/stripe-checkout.test.ts` | Tests | 3.2 |
| `__tests__/integration/razorpay-checkout.test.ts` | Tests | 3.3 |
| `__tests__/integration/coupons-refunds.test.ts` | Tests | 3.4 |
