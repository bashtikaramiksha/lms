import { db } from "@/lib/db/client";
import {
  users,
  courses,
  coupons,
  cartItems,
  orders,
  orderItems,
  enrollments,
} from "@/lib/db/schema";
import { paymentService } from "@/lib/services/payment.service";
import { cartService } from "@/lib/services/cart.service";
import { couponService } from "@/lib/services/coupon.service";
import { AppError } from "@/lib/services/course.service";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { env } from "@/lib/env";

async function runRazorpayTests() {
  console.log("🧪 Starting Slice 3.3 Razorpay Payment Flow Verification Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Create Test Teacher and Student
  console.log("1️⃣ Setting up test teacher and student...");
  const [teacher] = await db
    .insert(users)
    .values({
      email: `teacher_rzp_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Rzp Instructor",
      role: "TEACHER",
    })
    .returning();

  const [student] = await db
    .insert(users)
    .values({
      email: `student_rzp_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Rzp Student",
      role: "STUDENT",
    })
    .returning();

  console.log("   ✅ Users created:", {
    teacherId: teacher.id,
    studentId: student.id,
  });

  // 2. Create Published Courses
  console.log("2️⃣ Creating test courses...");
  const [course1] = await db
    .insert(courses)
    .values({
      authorId: teacher.id,
      title: `Node.js Backend Masterclass ${runId}`,
      slug: `nodejs-backend-${runId}`,
      type: "RECORDED",
      price: 89.99,
      discountPrice: 49.99,
      status: "PUBLISHED",
      accessDuration: 365,
    })
    .returning();

  const [course2] = await db
    .insert(courses)
    .values({
      authorId: teacher.id,
      title: `React with Next.js ${runId}`,
      slug: `react-nextjs-${runId}`,
      type: "RECORDED",
      price: 69.99,
      discountPrice: null, // full price
      status: "PUBLISHED",
      accessDuration: null, // lifetime
    })
    .returning();

  console.log("   ✅ Created 2 published test courses");

  // 3. Create Test Coupons
  console.log("3️⃣ Creating test coupons...");
  const [pctCoupon] = await db
    .insert(coupons)
    .values({
      code: `RZPPCT20_${runId.toUpperCase()}`,
      type: "PERCENT",
      value: 20,
      minOrderValue: 20,
      isActive: true,
      usedCount: 0,
      createdBy: teacher.id,
    })
    .returning();

  const [expiredCoupon] = await db
    .insert(coupons)
    .values({
      code: `RZPEXP_${runId.toUpperCase()}`,
      type: "PERCENT",
      value: 50,
      expiresAt: new Date(Date.now() - 86400000).toISOString(),
      isActive: true,
      usedCount: 0,
      createdBy: teacher.id,
    })
    .returning();

  // 4. Test Empty Cart validation
  console.log("\n4️⃣ Testing Empty Cart validation for Razorpay Order...");
  try {
    await paymentService.createRazorpayOrder(student.id);
    throw new Error("Should have thrown EMPTY_CART");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "EMPTY_CART") {
      console.log("   ✅ Correctly threw EMPTY_CART (400)");
    } else {
      throw err;
    }
  }

  // 5. Add Courses to Cart and Create Razorpay Order
  console.log("\n5️⃣ Testing Razorpay Order creation with 2 cart items...");
  await cartService.addItem(student.id, course1.id);
  await cartService.addItem(student.id, course2.id);

  // Cart subtotal: 49.99 + 69.99 = 119.98
  const rzpOrderResult = await paymentService.createRazorpayOrder(student.id);
  console.log("   Razorpay Order Result:", {
    razorpayOrderId: rzpOrderResult.razorpayOrderId,
    amount: rzpOrderResult.amount,
    currency: rzpOrderResult.currency,
    itemsCount: rzpOrderResult.breakdown.length,
    prefill: rzpOrderResult.prefill,
  });

  if (!rzpOrderResult.razorpayOrderId.startsWith("order_")) {
    throw new Error("Invalid Razorpay order ID format");
  }
  if (rzpOrderResult.amount !== 11998) {
    throw new Error(`Expected amount in paise 11998, got ${rzpOrderResult.amount}`);
  }
  console.log("   ✅ Razorpay order created with accurate amount & breakdown!");

  // 6. Test Razorpay Order with Percentage Coupon
  console.log("\n6️⃣ Testing Razorpay Order with Percentage Coupon...");
  const rzpWithCoupon = await paymentService.createRazorpayOrder(
    student.id,
    pctCoupon.code
  );
  // Subtotal = 119.98, 20% discount = 23.996 -> 24.00, Total = 95.98 -> 9598 paise
  console.log("   Percent Discount Order:", {
    amount: rzpWithCoupon.amount,
    expectedPaise: 9598,
  });
  if (rzpWithCoupon.amount !== 9598) {
    throw new Error(`Expected paise 9598, got ${rzpWithCoupon.amount}`);
  }
  console.log("   ✅ Percentage discount applied accurately to Razorpay order!");

  // 7. Test Expired Coupon
  console.log("\n7️⃣ Testing Expired Coupon Rejection...");
  try {
    await paymentService.createRazorpayOrder(student.id, expiredCoupon.code);
    throw new Error("Should have thrown INVALID_COUPON");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "INVALID_COUPON") {
      console.log("   ✅ Correctly rejected expired coupon (422 INVALID_COUPON)");
    } else {
      throw err;
    }
  }

  // 8. Test HMAC Signature Verification (Invalid Signature)
  console.log("\n8️⃣ Testing Razorpay Webhook Invalid Signature...");
  const mockWebhookPayload = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_${runId}_123`,
          order_id: rzpWithCoupon.razorpayOrderId,
          amount: rzpWithCoupon.amount,
          notes: {
            userId: student.id,
            cartItemIds: `${course1.id},${course2.id}`,
            couponId: pctCoupon.id,
          },
        },
      },
    },
  });

  try {
    await paymentService.handleRazorpayWebhook(
      mockWebhookPayload,
      "invalid_tampered_signature_hex"
    );
    throw new Error("Should have thrown INVALID_RAZORPAY_SIGNATURE");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "INVALID_RAZORPAY_SIGNATURE") {
      console.log("   ✅ Correctly rejected invalid HMAC signature (400)");
    } else {
      throw err;
    }
  }

  // 9. Test Valid Webhook & Shared Enrollment Activation
  console.log("\n9️⃣ Testing Valid Razorpay Webhook payment.captured processing...");
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET || "rzp_test_webhook_secret";
  const validSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(mockWebhookPayload)
    .digest("hex");

  const webhookResult = await paymentService.handleRazorpayWebhook(
    mockWebhookPayload,
    validSignature
  );

  if (!webhookResult.received) {
    throw new Error("Webhook processing failed to return received: true");
  }

  // Verify created order in DB
  const createdOrder = await db.query.orders.findFirst({
    where: eq(orders.gatewayOrderId, rzpWithCoupon.razorpayOrderId),
    with: { items: true },
  });

  if (!createdOrder || createdOrder.status !== "COMPLETED") {
    throw new Error("Order was not created with COMPLETED status");
  }
  if (createdOrder.gateway !== "RAZORPAY") {
    throw new Error(`Expected gateway RAZORPAY, got ${createdOrder.gateway}`);
  }
  if (createdOrder.items.length !== 2) {
    throw new Error(`Expected 2 order items, got ${createdOrder.items.length}`);
  }

  console.log("   ✅ Order created with status COMPLETED & gateway RAZORPAY:", {
    orderId: createdOrder.id,
    gateway: createdOrder.gateway,
    subtotal: createdOrder.subtotal,
    discountAmount: createdOrder.discountAmount,
    total: createdOrder.total,
  });

  // Verify active enrollments
  const studentEnrollments = await db.query.enrollments.findMany({
    where: and(eq(enrollments.userId, student.id), eq(enrollments.status, "ACTIVE")),
  });
  if (studentEnrollments.length !== 2) {
    throw new Error(`Expected 2 active enrollments, got ${studentEnrollments.length}`);
  }
  console.log("   ✅ Student active enrollments verified in database!");

  // Verify cart cleared
  const studentCart = await cartService.getCart(student.id);
  if (studentCart.itemCount !== 0) {
    throw new Error("Student cart was not cleared after payment");
  }
  console.log("   ✅ Student cart automatically cleared after payment completion!");

  // Verify coupon usedCount incremented
  const refreshedCoupon = await db.query.coupons.findFirst({
    where: eq(coupons.id, pctCoupon.id),
  });
  if (refreshedCoupon?.usedCount !== 1) {
    throw new Error(`Expected coupon usedCount 1, got ${refreshedCoupon?.usedCount}`);
  }
  console.log("   ✅ Coupon usedCount incremented to 1");

  // 10. Test Webhook Idempotency
  console.log("\n🔟 Testing Webhook Idempotency on duplicate event...");
  await paymentService.handleRazorpayWebhook(mockWebhookPayload, validSignature);
  const totalOrders = await db.query.orders.findMany({
    where: eq(orders.gatewayOrderId, rzpWithCoupon.razorpayOrderId),
  });
  if (totalOrders.length !== 1) {
    throw new Error("Duplicate order created for idempotent webhook event");
  }
  console.log("   ✅ Duplicate webhook event safely ignored (idempotent)!");

  // 11. Test Student Order History Retrieval
  console.log("\n1️⃣1️⃣ Testing Student Order History retrieval...");
  const orderHistory = await paymentService.getStudentOrders(student.id);
  if (orderHistory.orders.length === 0) {
    throw new Error("Failed to retrieve student order history");
  }
  console.log("   ✅ Order History retrieved successfully:", {
    ordersCount: orderHistory.orders.length,
    firstOrderId: orderHistory.orders[0].id,
    gateway: orderHistory.orders[0].gateway,
    itemsCount: orderHistory.orders[0].items.length,
  });

  console.log("\n🎉 ALL SLICE 3.3 RAZORPAY TESTS PASSED SUCCESSFULLY! 🚀\n");
}

runRazorpayTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
