import { paymentService } from "../payment.service";
import { cartService } from "../cart.service";
import { couponService } from "../coupon.service";
import { AppError } from "../course.service";
import { db } from "../../db/client";
import {
  courses,
  users,
  enrollments,
  cartItems,
  orders,
  orderItems,
  coupons,
} from "../../db/schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runPaymentTests() {
  console.log("🧪 Starting Slice 3.2 Checkout & Stripe Payment Verification Tests...\n");

  const timestamp = Date.now();

  // 1. Create test users
  console.log("1️⃣ Setting up test teacher, student, and admin...");
  const [admin] = await db
    .insert(users)
    .values({
      fullName: `Test Admin ${timestamp}`,
      email: `admin-${timestamp}@example.com`,
      role: "ADMIN",
      status: "ACTIVE",
    })
    .returning();

  const [teacher] = await db
    .insert(users)
    .values({
      fullName: `Test Instructor ${timestamp}`,
      email: `instructor-${timestamp}@example.com`,
      role: "TEACHER",
      status: "ACTIVE",
    })
    .returning();

  const [student] = await db
    .insert(users)
    .values({
      fullName: `Test Student ${timestamp}`,
      email: `student-${timestamp}@example.com`,
      role: "STUDENT",
      status: "ACTIVE",
    })
    .returning();

  console.log("   ✅ Users created:", { adminId: admin.id, teacherId: teacher.id, studentId: student.id });

  // 2. Create test courses
  console.log("2️⃣ Creating test courses...");
  const [course1] = await db
    .insert(courses)
    .values({
      title: `React Masterclass ${timestamp}`,
      slug: `react-masterclass-${timestamp}`,
      type: "RECORDED",
      status: "PUBLISHED",
      price: 100.0,
      discountPrice: 69.99,
      accessDuration: 30, // 30-day access
      authorId: teacher.id,
    })
    .returning();

  const [course2] = await db
    .insert(courses)
    .values({
      title: `Node.js Advanced ${timestamp}`,
      slug: `nodejs-advanced-${timestamp}`,
      type: "RECORDED",
      status: "PUBLISHED",
      price: 49.99,
      discountPrice: null, // lifetime access (no duration)
      authorId: teacher.id,
    })
    .returning();

  const [courseAlreadyEnrolled] = await db
    .insert(courses)
    .values({
      title: `Already Enrolled Course ${timestamp}`,
      slug: `enrolled-${timestamp}`,
      type: "RECORDED",
      status: "PUBLISHED",
      price: 29.99,
      authorId: teacher.id,
    })
    .returning();

  console.log("   ✅ Created 3 published test courses");

  // 3. Create test coupons
  console.log("3️⃣ Creating test coupons...");
  const [percentCoupon] = await db
    .insert(coupons)
    .values({
      code: `SAVE20_${timestamp}`,
      type: "PERCENT",
      value: 20, // 20%
      minOrderValue: 50,
      maxUses: 10,
      usedCount: 0,
      createdBy: admin.id,
    })
    .returning();

  const [fixedCoupon] = await db
    .insert(coupons)
    .values({
      code: `FLAT30_${timestamp}`,
      type: "FIXED",
      value: 30, // 30 INR
      minOrderValue: 20,
      maxUses: 5,
      usedCount: 0,
      createdBy: admin.id,
    })
    .returning();

  const [expiredCoupon] = await db
    .insert(coupons)
    .values({
      code: `EXPIRED_${timestamp}`,
      type: "PERCENT",
      value: 50,
      expiresAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
      createdBy: admin.id,
    })
    .returning();

  console.log("   ✅ Created test coupons (percent, fixed, expired)");

  // ----------------------------------------------------
  // TEST A: EMPTY_CART validation
  // ----------------------------------------------------
  console.log("\n4️⃣ Testing Empty Cart validation for PaymentIntent...");
  try {
    await paymentService.createStripeIntent(student.id);
    throw new Error("Expected EMPTY_CART error but createStripeIntent succeeded");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "EMPTY_CART") {
      console.log("   ✅ Correctly threw EMPTY_CART (400)");
    } else {
      throw err;
    }
  }

  // ----------------------------------------------------
  // TEST B: Multi-item cart without coupon
  // ----------------------------------------------------
  console.log("\n5️⃣ Testing Stripe PaymentIntent with 2 cart items...");
  await cartService.addItem(student.id, course1.id);
  await cartService.addItem(student.id, course2.id);

  const intentResult1 = await paymentService.createStripeIntent(student.id);
  console.log("   PaymentIntent Result:", {
    subtotal: intentResult1.subtotal,
    discountAmount: intentResult1.discountAmount,
    total: intentResult1.total,
    itemsCount: intentResult1.breakdown.length,
    hasClientSecret: Boolean(intentResult1.clientSecret),
  });

  const expectedSubtotal = Math.round((69.99 + 49.99) * 100) / 100; // 119.98
  if (intentResult1.subtotal !== expectedSubtotal) {
    throw new Error(`Subtotal mismatch: expected ${expectedSubtotal}, got ${intentResult1.subtotal}`);
  }
  if (intentResult1.total !== expectedSubtotal) {
    throw new Error(`Total mismatch without discount: expected ${expectedSubtotal}, got ${intentResult1.total}`);
  }
  if (!intentResult1.clientSecret) {
    throw new Error("clientSecret missing from createStripeIntent result");
  }
  console.log("   ✅ PaymentIntent created with accurate subtotal & breakdown!");

  // ----------------------------------------------------
  // TEST C: Percentage Coupon Application
  // ----------------------------------------------------
  console.log("\n6️⃣ Testing PaymentIntent with Percentage Coupon...");
  const intentWithPercent = await paymentService.createStripeIntent(
    student.id,
    percentCoupon.code
  );
  const expectedPercentDiscount = Math.round((expectedSubtotal * 0.20) * 100) / 100; // 23.996 -> 24.00
  const expectedPercentTotal = Math.round((expectedSubtotal - expectedPercentDiscount) * 100) / 100;

  console.log("   Percent Discount:", {
    discountAmount: intentWithPercent.discountAmount,
    total: intentWithPercent.total,
    expectedDiscount: expectedPercentDiscount,
    expectedTotal: expectedPercentTotal,
  });

  if (Math.abs(intentWithPercent.discountAmount - expectedPercentDiscount) > 0.05) {
    throw new Error(`Percent discount mismatch: expected ~${expectedPercentDiscount}, got ${intentWithPercent.discountAmount}`);
  }
  console.log("   ✅ Percentage discount applied accurately!");

  // ----------------------------------------------------
  // TEST D: Fixed Coupon Application
  // ----------------------------------------------------
  console.log("\n7️⃣ Testing PaymentIntent with Fixed Coupon...");
  const intentWithFixed = await paymentService.createStripeIntent(
    student.id,
    fixedCoupon.code
  );
  const expectedFixedTotal = Math.round((expectedSubtotal - 30.0) * 100) / 100;

  console.log("   Fixed Discount:", {
    discountAmount: intentWithFixed.discountAmount,
    total: intentWithFixed.total,
    expectedTotal: expectedFixedTotal,
  });

  if (intentWithFixed.discountAmount !== 30.0 || intentWithFixed.total !== expectedFixedTotal) {
    throw new Error(`Fixed discount mismatch: expected total ${expectedFixedTotal}, got ${intentWithFixed.total}`);
  }
  console.log("   ✅ Fixed discount applied accurately!");

  // ----------------------------------------------------
  // TEST E: Expired Coupon Rejection
  // ----------------------------------------------------
  console.log("\n8️⃣ Testing Expired Coupon Rejection...");
  try {
    await paymentService.createStripeIntent(student.id, expiredCoupon.code);
    throw new Error("Expected INVALID_COUPON error for expired coupon");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "INVALID_COUPON") {
      console.log("   ✅ Correctly rejected expired coupon (422 INVALID_COUPON)");
    } else {
      throw err;
    }
  }

  // ----------------------------------------------------
  // TEST F: ALREADY_ENROLLED validation
  // ----------------------------------------------------
  console.log("\n9️⃣ Testing ALREADY_ENROLLED validation at checkout...");
  // Clear cart and add already enrolled course
  await cartService.clearCart(student.id);

  await db.insert(enrollments).values({
    userId: student.id,
    courseId: courseAlreadyEnrolled.id,
    status: "ACTIVE",
  });

  // Manually insert into cartItems to simulate edge case where user was enrolled after adding to cart
  await db.insert(cartItems).values({
    userId: student.id,
    courseId: courseAlreadyEnrolled.id,
  });

  try {
    await paymentService.createStripeIntent(student.id);
    throw new Error("Expected ALREADY_ENROLLED error but succeeded");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "ALREADY_ENROLLED") {
      console.log("   ✅ Correctly caught already enrolled course at checkout time (409)");
    } else {
      throw err;
    }
  }

  // ----------------------------------------------------
  // TEST G: Stripe Webhook & Enrollment Activation Flow
  // ----------------------------------------------------
  console.log("\n🔟 Testing Stripe Webhook payment_intent.succeeded processing...");
  await cartService.clearCart(student.id);
  await cartService.addItem(student.id, course1.id);
  await cartService.addItem(student.id, course2.id);

  const testPiId = `pi_test_${Date.now()}`;
  const mockSucceededEvent = {
    id: `evt_test_${Date.now()}`,
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: testPiId,
        amount: Math.round(expectedPercentTotal * 100),
        currency: "inr",
        latest_charge: `ch_test_${Date.now()}`,
        metadata: {
          userId: student.id,
          cartItemIds: `${course1.id},${course2.id}`,
          couponId: percentCoupon.id,
        },
      },
    },
  };

  await paymentService.handleStripeWebhook(
    JSON.stringify(mockSucceededEvent),
    "test_signature"
  );

  // Verify order in database
  const createdOrder = await db.query.orders.findFirst({
    where: eq(orders.gatewayOrderId, testPiId),
    with: {
      items: true,
    },
  });

  if (!createdOrder) {
    throw new Error("Order was not created by payment_intent.succeeded webhook");
  }

  if (createdOrder.status !== "COMPLETED") {
    throw new Error(`Order status mismatch: expected COMPLETED, got ${createdOrder.status}`);
  }

  if (createdOrder.items.length !== 2) {
    throw new Error(`Order items count mismatch: expected 2, got ${createdOrder.items.length}`);
  }

  console.log("   ✅ Order created with status COMPLETED & 2 order items:", {
    orderId: createdOrder.id,
    subtotal: createdOrder.subtotal,
    discountAmount: createdOrder.discountAmount,
    total: createdOrder.total,
  });

  // Verify enrollments created
  const studentEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, student.id),
  });

  const enrolledCourse1 = studentEnrollments.find((e) => e.courseId === course1.id);
  const enrolledCourse2 = studentEnrollments.find((e) => e.courseId === course2.id);

  if (!enrolledCourse1 || enrolledCourse1.status !== "ACTIVE" || !enrolledCourse1.expiresAt) {
    throw new Error("Course 1 enrollment failed or missing 30-day expiresAt");
  }
  if (!enrolledCourse2 || enrolledCourse2.status !== "ACTIVE" || enrolledCourse2.expiresAt !== null) {
    throw new Error("Course 2 enrollment failed or should have lifetime access (null expiresAt)");
  }
  console.log("   ✅ Student active enrollments verified (time-limited + lifetime)!");

  // Verify coupon usedCount incremented
  const updatedCoupon = await db.query.coupons.findFirst({
    where: eq(coupons.id, percentCoupon.id),
  });
  if (!updatedCoupon || updatedCoupon.usedCount !== 1) {
    throw new Error(`Coupon usedCount not incremented: expected 1, got ${updatedCoupon?.usedCount}`);
  }
  console.log("   ✅ Coupon usedCount incremented to 1");

  // Verify student cart is cleared
  const cartAfterCheckout = await cartService.getCart(student.id);
  if (cartAfterCheckout.itemCount !== 0) {
    throw new Error(`Cart not cleared: expected 0 items, got ${cartAfterCheckout.itemCount}`);
  }
  console.log("   ✅ Student cart automatically cleared after payment completion!");

  // ----------------------------------------------------
  // TEST H: Idempotency of duplicate webhook
  // ----------------------------------------------------
  console.log("\n1️⃣1️⃣ Testing Webhook Idempotency on duplicate event...");
  await paymentService.handleStripeWebhook(
    JSON.stringify(mockSucceededEvent),
    "test_signature"
  );
  const ordersCount = await db.query.orders.findMany({
    where: eq(orders.gatewayOrderId, testPiId),
  });
  if (ordersCount.length !== 1) {
    throw new Error(`Duplicate orders created: expected 1, got ${ordersCount.length}`);
  }
  console.log("   ✅ Duplicate webhook event safely ignored (idempotent)!");

  // ----------------------------------------------------
  // TEST I: Order History
  // ----------------------------------------------------
  console.log("\n1️⃣2️⃣ Testing Student Order History retrieval...");
  const orderHistory = await paymentService.getStudentOrders(student.id);
  if (orderHistory.orders.length === 0) {
    throw new Error("Order history returned empty for student with completed order");
  }
  const firstOrder = orderHistory.orders[0];
  if (!firstOrder.items.length || !firstOrder.total) {
    throw new Error("Order history items or total missing");
  }
  console.log("   ✅ Order History retrieved successfully:", {
    ordersCount: orderHistory.orders.length,
    firstOrderId: firstOrder.id,
    firstOrderItemsCount: firstOrder.items.length,
  });

  console.log("\n🎉 ALL SLICE 3.2 TESTS PASSED SUCCESSFULLY! 🚀\n");
}

runPaymentTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Payment test failed with error:\n", err);
    process.exit(1);
  });
