import { db } from "@/lib/db/client";
import {
  users,
  courses,
  coupons,
  orders,
  orderItems,
  enrollments,
} from "@/lib/db/schema";
import { couponService } from "@/lib/services/coupon.service";
import { paymentService } from "@/lib/services/payment.service";
import { AppError } from "@/lib/services/course.service";
import { eq, and } from "drizzle-orm";

async function runCouponAndRefundTests() {
  console.log("🧪 Starting Slice 3.4 Coupon System & Admin Refund Verification Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Create Admin, Teacher, and Student Users
  console.log("1️⃣ Setting up test Admin, Teacher, and Student...");
  const [admin] = await db
    .insert(users)
    .values({
      email: `admin_cr_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Platform Admin",
      role: "ADMIN",
    })
    .returning();

  const [teacher] = await db
    .insert(users)
    .values({
      email: `teacher_cr_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Course Author",
      role: "TEACHER",
    })
    .returning();

  const [student] = await db
    .insert(users)
    .values({
      email: `student_cr_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Enrolled Student",
      role: "STUDENT",
    })
    .returning();

  console.log("   ✅ Users created:", {
    adminId: admin.id,
    teacherId: teacher.id,
    studentId: student.id,
  });

  // 2. Create Published Courses
  console.log("2️⃣ Creating test courses...");
  const [course1] = await db
    .insert(courses)
    .values({
      authorId: teacher.id,
      title: `Microservices Architecture ${runId}`,
      slug: `microservices-${runId}`,
      type: "RECORDED",
      price: 100,
      discountPrice: 80,
      status: "PUBLISHED",
    })
    .returning();

  const [course2] = await db
    .insert(courses)
    .values({
      authorId: teacher.id,
      title: `DevOps on AWS ${runId}`,
      slug: `devops-aws-${runId}`,
      type: "RECORDED",
      price: 60,
      discountPrice: null,
      status: "PUBLISHED",
    })
    .returning();

  // 3. Test Coupon Creation and Validation Logic
  console.log("\n3️⃣ Testing Coupon Creation via CouponService...");
  const percentCoupon = await couponService.createCoupon(
    {
      code: `SAVE25_${runId}`,
      type: "PERCENT",
      value: 25,
      minOrderValue: 50,
      maxUses: 10,
      isActive: true,
    },
    admin.id
  );

  console.log("   ✅ Created PERCENT coupon:", {
    code: percentCoupon.code,
    value: percentCoupon.value,
  });

  if (percentCoupon.code !== `SAVE25_${runId.toUpperCase()}`) {
    throw new Error("Coupon code was not uppercase formatted");
  }

  // Duplicate coupon code prevention
  try {
    await couponService.createCoupon(
      {
        code: `save25_${runId}`,
        type: "PERCENT",
        value: 10,
      },
      admin.id
    );
    throw new Error("Should have thrown COUPON_CODE_EXISTS");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "COUPON_CODE_EXISTS") {
      console.log("   ✅ Duplicate coupon code correctly rejected (409)");
    } else {
      throw err;
    }
  }

  // Percentage cap > 100 validation
  try {
    await couponService.createCoupon(
      {
        code: `BIG150_${runId}`,
        type: "PERCENT",
        value: 150,
      },
      admin.id
    );
    throw new Error("Should have thrown VALIDATION_ERROR");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "VALIDATION_ERROR") {
      console.log("   ✅ Percentage > 100 correctly rejected (400)");
    } else {
      throw err;
    }
  }

  // 4. Test Coupon Validation Calculations
  console.log("\n4️⃣ Testing Coupon Validation & Calculation...");
  const calcResult = await couponService.validateCouponWithCalculation(
    percentCoupon.code,
    140 // subtotal
  );
  // 25% of 140 = 35 discount, newTotal = 105
  console.log("   Validation result:", calcResult);
  if (calcResult.discountAmount !== 35 || calcResult.newTotal !== 105) {
    throw new Error(`Calculation mismatch: discount=${calcResult.discountAmount}, newTotal=${calcResult.newTotal}`);
  }
  console.log("   ✅ Coupon validation calculation verified!");

  // Min order threshold validation
  try {
    await couponService.validateCoupon(percentCoupon.code, 40); // subtotal < 50 min
    throw new Error("Should have thrown MIN_ORDER_NOT_MET");
  } catch (err: any) {
    if (err instanceof AppError && err.details?.reason === "MIN_ORDER_NOT_MET") {
      console.log("   ✅ Subtotal below minimum order value correctly rejected (422)");
    } else {
      throw err;
    }
  }

  // 5. Test Coupon Updates & Toggling
  console.log("\n5️⃣ Testing Coupon Status Toggling & Listing...");
  const updatedCoupon = await couponService.updateCoupon(percentCoupon.id, {
    isActive: false,
  });
  if (updatedCoupon.isActive !== false) {
    throw new Error("Failed to deactivate coupon");
  }
  console.log("   ✅ Coupon deactivated successfully");

  try {
    await couponService.validateCoupon(percentCoupon.code, 100);
    throw new Error("Should have thrown INACTIVE");
  } catch (err: any) {
    if (err instanceof AppError && err.details?.reason === "INACTIVE") {
      console.log("   ✅ Deactivated coupon rejected with reason=INACTIVE (422)");
    } else {
      throw err;
    }
  }

  // Re-activate
  await couponService.updateCoupon(percentCoupon.id, { isActive: true });

  const couponList = await couponService.getCoupons();
  if (couponList.coupons.length === 0) {
    throw new Error("Failed to list coupons");
  }
  console.log("   ✅ Listed admin coupons successfully (count:", couponList.coupons.length, ")");

  // 6. Test Full Stripe Order & Refund with Enrollment Revocation
  console.log("\n6️⃣ Testing Full Stripe Refund & Automatic Enrollment Revocation...");
  const [stripeOrder] = await db
    .insert(orders)
    .values({
      studentId: student.id,
      status: "COMPLETED",
      gateway: "STRIPE",
      gatewayOrderId: `pi_test_${runId}`,
      gatewayPaymentId: `ch_test_${runId}`,
      subtotal: 140,
      discountAmount: 35,
      total: 105,
      currency: "USD",
    })
    .returning();

  const [item1] = await db
    .insert(orderItems)
    .values({
      orderId: stripeOrder.id,
      courseId: course1.id,
      priceAtPurchase: 80,
    })
    .returning();

  const [item2] = await db
    .insert(orderItems)
    .values({
      orderId: stripeOrder.id,
      courseId: course2.id,
      priceAtPurchase: 60,
    })
    .returning();

  // Create active enrollments
  await db.insert(enrollments).values({
    userId: student.id,
    courseId: course1.id,
    orderId: stripeOrder.id,
    status: "ACTIVE",
  });
  await db.insert(enrollments).values({
    userId: student.id,
    courseId: course2.id,
    orderId: stripeOrder.id,
    status: "ACTIVE",
  });

  // Execute full refund
  const fullRefundResult = await paymentService.refundOrder(
    stripeOrder.id,
    admin.id,
    {
      amount: 105,
      reason: "REQUESTED_BY_CUSTOMER",
    }
  );

  console.log("   Full Refund Result:", fullRefundResult);
  if (fullRefundResult.newOrderStatus !== "REFUNDED") {
    throw new Error("Expected status REFUNDED for full refund");
  }

  // Verify order status in DB
  const refreshedStripeOrder = await db.query.orders.findFirst({
    where: eq(orders.id, stripeOrder.id),
  });
  if (refreshedStripeOrder?.status !== "REFUNDED") {
    throw new Error(`Expected order status REFUNDED, got ${refreshedStripeOrder?.status}`);
  }

  // Verify enrollments revoked
  const revokedEnrollments = await db.query.enrollments.findMany({
    where: and(eq(enrollments.orderId, stripeOrder.id), eq(enrollments.status, "REFUNDED")),
  });
  if (revokedEnrollments.length !== 2) {
    throw new Error(`Expected 2 enrollments set to REFUNDED, got ${revokedEnrollments.length}`);
  }
  console.log("   ✅ Full refund executed and all student enrollments revoked to status=REFUNDED!");

  // Repeated refund prevention
  try {
    await paymentService.refundOrder(stripeOrder.id, admin.id, {
      amount: 105,
      reason: "DUPLICATE",
    });
    throw new Error("Should have thrown ALREADY_REFUNDED");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "ALREADY_REFUNDED") {
      console.log("   ✅ Repeated refund on refunded order correctly rejected (422 ALREADY_REFUNDED)");
    } else {
      throw err;
    }
  }

  // 7. Test Partial Razorpay Refund
  console.log("\n7️⃣ Testing Partial Razorpay Refund...");
  const [course3] = await db
    .insert(courses)
    .values({
      authorId: teacher.id,
      title: `Kubernetes in Production ${runId}`,
      slug: `kubernetes-prod-${runId}`,
      type: "RECORDED",
      price: 90,
      discountPrice: 80,
      status: "PUBLISHED",
    })
    .returning();

  const [rzpOrder] = await db
    .insert(orders)
    .values({
      studentId: student.id,
      status: "COMPLETED",
      gateway: "RAZORPAY",
      gatewayOrderId: `order_rzp_${runId}`,
      gatewayPaymentId: `pay_rzp_${runId}`,
      subtotal: 140,
      discountAmount: 0,
      total: 140,
      currency: "INR",
    })
    .returning();

  const [rzpItem1] = await db
    .insert(orderItems)
    .values({
      orderId: rzpOrder.id,
      courseId: course3.id,
      priceAtPurchase: 80,
    })
    .returning();

  await db.insert(enrollments).values({
    userId: student.id,
    courseId: course3.id,
    orderId: rzpOrder.id,
    status: "ACTIVE",
  });

  // Excess refund rejection
  try {
    await paymentService.refundOrder(rzpOrder.id, admin.id, {
      amount: 200, // exceeds 140
      reason: "REQUESTED_BY_CUSTOMER",
    });
    throw new Error("Should have thrown REFUND_EXCEEDS_TOTAL");
  } catch (err: any) {
    if (err instanceof AppError && err.code === "REFUND_EXCEEDS_TOTAL") {
      console.log("   ✅ Refund amount exceeding total correctly rejected (422 REFUND_EXCEEDS_TOTAL)");
    } else {
      throw err;
    }
  }

  // Execute partial refund for item 1
  const partialRefundResult = await paymentService.refundOrder(
    rzpOrder.id,
    admin.id,
    {
      amount: 80,
      reason: "REQUESTED_BY_CUSTOMER",
      orderItemIds: [rzpItem1.id],
    }
  );

  console.log("   Partial Refund Result:", partialRefundResult);
  if (partialRefundResult.newOrderStatus !== "PARTIALLY_REFUNDED") {
    throw new Error("Expected PARTIALLY_REFUNDED for partial refund");
  }

  const refreshedRzpOrder = await db.query.orders.findFirst({
    where: eq(orders.id, rzpOrder.id),
  });
  if (refreshedRzpOrder?.status !== "PARTIALLY_REFUNDED") {
    throw new Error(`Expected PARTIALLY_REFUNDED, got ${refreshedRzpOrder?.status}`);
  }

  const partialEnrollment = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.orderId, rzpOrder.id), eq(enrollments.courseId, course3.id)),
  });
  if (partialEnrollment?.status !== "REFUNDED") {
    throw new Error(`Expected enrollment status REFUNDED, got ${partialEnrollment?.status}`);
  }
  console.log("   ✅ Partial refund executed and selected enrollment revoked!");

  // 8. Test Admin Payments Audit List
  console.log("\n8️⃣ Testing Admin Payments Audit listing and filtering...");
  const adminPayments = await paymentService.getAdminPayments({ limit: 10 });
  if (adminPayments.orders.length === 0) {
    throw new Error("Admin payments list returned empty");
  }

  const firstPayment = adminPayments.orders[0];
  console.log("   Admin Transaction Record:", {
    orderId: firstPayment.id,
    status: firstPayment.status,
    gateway: firstPayment.gateway,
    total: firstPayment.total,
    student: firstPayment.student,
    itemsCount: firstPayment.items.length,
  });

  if (!firstPayment.student.email) {
    throw new Error("Student email missing in admin payments record");
  }
  console.log("   ✅ Admin transaction audit details verified!");

  console.log("\n🎉 ALL SLICE 3.4 COUPON & REFUND TESTS PASSED SUCCESSFULLY! 🚀\n");
}

runCouponAndRefundTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
