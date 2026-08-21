import { teacherStatsService } from "../teacher-stats.service";
import { db } from "../../db/client";
import {
  users,
  courses,
  modules,
  lessons,
  enrollments,
  lessonProgress,
  orders,
  orderItems,
} from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runTests() {
  console.log("🧪 Starting Slice 4.3 Teacher Dashboard & Revenue Analytics verification tests...\n");

  const timestamp = Date.now();

  // 1. Create two test teachers and two test students
  console.log("1️⃣ Creating test teachers & students...");
  const [teacherA] = await db
    .insert(users)
    .values({
      fullName: `Teacher Alpha ${timestamp}`,
      email: `teacher-a-${timestamp}@example.com`,
      role: "TEACHER",
      status: "ACTIVE",
    })
    .returning();

  const [teacherB] = await db
    .insert(users)
    .values({
      fullName: `Teacher Beta ${timestamp}`,
      email: `teacher-b-${timestamp}@example.com`,
      role: "TEACHER",
      status: "ACTIVE",
    })
    .returning();

  const [student1] = await db
    .insert(users)
    .values({
      fullName: `Student One ${timestamp}`,
      email: `student-1-${timestamp}@example.com`,
      role: "STUDENT",
      status: "ACTIVE",
    })
    .returning();

  const [student2] = await db
    .insert(users)
    .values({
      fullName: `Student Two ${timestamp}`,
      email: `student-2-${timestamp}@example.com`,
      role: "STUDENT",
      status: "ACTIVE",
    })
    .returning();

  console.log("   ✅ Created Teacher A, Teacher B, Student 1, Student 2");

  try {
    // 2. Test empty teacher stats
    console.log("2️⃣ Testing empty stats for new teacher...");
    const emptyStats = await teacherStatsService.getDashboardStats(teacherA.id);
    if (
      emptyStats.summary.totalCourses !== 0 ||
      emptyStats.summary.totalStudents !== 0 ||
      emptyStats.summary.totalRevenue !== 0 ||
      emptyStats.courses.length !== 0
    ) {
      throw new Error(`Expected 0-values for empty teacher stats: ${JSON.stringify(emptyStats)}`);
    }
    console.log("   ✅ Empty teacher returns 0 stats and empty arrays");

    // 3. Create courses: Course A1 & Course A2 for Teacher A, Course B1 for Teacher B
    console.log("3️⃣ Creating authored courses for both teachers...");
    const [courseA1] = await db
      .insert(courses)
      .values({
        title: `Advanced Next.js Mastery ${timestamp}`,
        slug: `advanced-nextjs-${timestamp}`,
        type: "RECORDED",
        price: 100,
        authorId: teacherA.id,
        status: "PUBLISHED",
      })
      .returning();

    const [courseA2] = await db
      .insert(courses)
      .values({
        title: `TypeScript Deep Dive ${timestamp}`,
        slug: `typescript-deepdive-${timestamp}`,
        type: "RECORDED",
        price: 50,
        authorId: teacherA.id,
        status: "PUBLISHED",
      })
      .returning();

    const [courseB1] = await db
      .insert(courses)
      .values({
        title: `Python For Data Science ${timestamp}`,
        slug: `python-data-${timestamp}`,
        type: "RECORDED",
        price: 200,
        authorId: teacherB.id,
        status: "PUBLISHED",
      })
      .returning();

    // Add 2 lessons to Course A1
    const [modA1] = await db
      .insert(modules)
      .values({
        courseId: courseA1.id,
        title: "Module 1",
        order: 1,
      })
      .returning();

    const [lessonA1_1] = await db
      .insert(lessons)
      .values({
        moduleId: modA1.id,
        title: "Lesson 1",
        type: "VIDEO",
        order: 1,
      })
      .returning();

    const [lessonA1_2] = await db
      .insert(lessons)
      .values({
        moduleId: modA1.id,
        title: "Lesson 2",
        type: "VIDEO",
        order: 2,
      })
      .returning();

    // 4. Enroll Student 1 and Student 2 in Course A1
    console.log("4️⃣ Creating enrollments & progress on Course A1...");
    const [enrollment1] = await db
      .insert(enrollments)
      .values({
        userId: student1.id,
        courseId: courseA1.id,
        status: "ACTIVE",
      })
      .returning();

    const [enrollment2] = await db
      .insert(enrollments)
      .values({
        userId: student2.id,
        courseId: courseA1.id,
        status: "ACTIVE",
      })
      .returning();

    // Student 1 finishes BOTH lessons -> 100% complete
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment1.id,
      lessonId: lessonA1_1.id,
      watchPercent: 100,
      isCompleted: true,
    });
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment1.id,
      lessonId: lessonA1_2.id,
      watchPercent: 100,
      isCompleted: true,
    });

    // Student 2 finishes ONLY 1 lesson -> incomplete
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment2.id,
      lessonId: lessonA1_1.id,
      watchPercent: 90,
      isCompleted: true,
    });

    // 5. Create completed orders & order items for Teacher A and Teacher B
    console.log("5️⃣ Creating purchase orders for revenue attribution...");
    // Order 1 for Course A1 (Teacher A) -> ₹100
    const [orderA1] = await db
      .insert(orders)
      .values({
        studentId: student1.id,
        status: "COMPLETED",
        gateway: "STRIPE",
        subtotal: 100,
        total: 100,
        currency: "INR",
        createdAt: new Date().toISOString(),
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: orderA1.id,
      courseId: courseA1.id,
      priceAtPurchase: 100,
      createdAt: new Date().toISOString(),
    });

    // Order 2 for Course A2 (Teacher A) -> ₹50
    const [orderA2] = await db
      .insert(orders)
      .values({
        studentId: student2.id,
        status: "COMPLETED",
        gateway: "RAZORPAY",
        subtotal: 50,
        total: 50,
        currency: "INR",
        createdAt: new Date().toISOString(),
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: orderA2.id,
      courseId: courseA2.id,
      priceAtPurchase: 50,
      createdAt: new Date().toISOString(),
    });

    // Order 3 for Course B1 (Teacher B) -> ₹200
    const [orderB1] = await db
      .insert(orders)
      .values({
        studentId: student1.id,
        status: "COMPLETED",
        gateway: "STRIPE",
        subtotal: 200,
        total: 200,
        currency: "INR",
        createdAt: new Date().toISOString(),
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: orderB1.id,
      courseId: courseB1.id,
      priceAtPurchase: 200,
      createdAt: new Date().toISOString(),
    });

    // 6. Test Teacher A Dashboard Stats
    console.log("6️⃣ Testing TeacherStatsService.getDashboardStats()...");
    const statsA = await teacherStatsService.getDashboardStats(teacherA.id);

    // Verify Course count
    if (statsA.summary.totalCourses !== 2 || statsA.summary.publishedCourses !== 2) {
      throw new Error(`Expected 2 courses for Teacher A, got ${statsA.summary.totalCourses}`);
    }

    // Verify Unique Students
    if (statsA.summary.totalStudents !== 2) {
      throw new Error(`Expected 2 unique students for Teacher A, got ${statsA.summary.totalStudents}`);
    }

    // Verify Revenue Isolation (Teacher A should have 100 + 50 = 150, NOT 350)
    if (statsA.summary.totalRevenue !== 150) {
      throw new Error(
        `Expected Teacher A revenue === 150, got ${statsA.summary.totalRevenue} (leakage check)`
      );
    }

    // Verify Completion Rate (Course A1 has 2 enrollments, 1 fully completed -> 50%)
    const statCourseA1 = statsA.courses.find((c) => c.id === courseA1.id);
    if (!statCourseA1 || statCourseA1.completionRate !== 50) {
      throw new Error(
        `Expected Course A1 completionRate === 50%, got ${statCourseA1?.completionRate}`
      );
    }
    console.log("   ✅ Teacher A stats verified: totalRevenue = 150, completionRate = 50%");

    // 7. Verify Teacher B Isolation
    console.log("7️⃣ Testing Teacher B isolation...");
    const statsB = await teacherStatsService.getDashboardStats(teacherB.id);
    if (statsB.summary.totalRevenue !== 200 || statsB.courses.length !== 1) {
      throw new Error(
        `Expected Teacher B revenue === 200 and 1 course, got rev=${statsB.summary.totalRevenue}, courses=${statsB.courses.length}`
      );
    }
    console.log("   ✅ Teacher B data isolated strictly (revenue = 200, totalCourses = 1)");

    // 8. Test Revenue Analytics & Period Filtering
    console.log("8️⃣ Testing TeacherStatsService.getRevenue()...");
    const rev12m = await teacherStatsService.getRevenue(teacherA.id, "12m");
    if (rev12m.totalRevenue !== 150 || rev12m.periodRevenue !== 150 || rev12m.periodOrders !== 2) {
      throw new Error(`Unexpected 12m revenue result: ${JSON.stringify(rev12m)}`);
    }
    if (rev12m.byCourse.length !== 2) {
      throw new Error(`Expected 2 courses in byCourse breakdown, got ${rev12m.byCourse.length}`);
    }
    if (rev12m.recentOrders.length !== 2) {
      throw new Error(`Expected 2 recent orders in ledger, got ${rev12m.recentOrders.length}`);
    }
    console.log("   ✅ 12m period revenue analytics verified");

    // Test Course Filter in Revenue
    console.log("9️⃣ Testing single-course revenue filter...");
    const revCourseA1 = await teacherStatsService.getRevenue(teacherA.id, "12m", courseA1.id);
    if (revCourseA1.periodRevenue !== 100 || revCourseA1.periodOrders !== 1) {
      throw new Error(`Expected filtered course revenue === 100, got ${revCourseA1.periodRevenue}`);
    }
    console.log("   ✅ Single course revenue filter correctly isolated");

    // 9. Clean up test records
    console.log("🔟 Cleaning up test records...");
    await db.delete(orderItems).where(inArray(orderItems.id, [orderA1.id, orderA2.id, orderB1.id]));
    await db.delete(orders).where(inArray(orders.id, [orderA1.id, orderA2.id, orderB1.id]));
    await db.delete(lessonProgress).where(inArray(lessonProgress.enrollmentId, [enrollment1.id, enrollment2.id]));
    await db.delete(enrollments).where(inArray(enrollments.id, [enrollment1.id, enrollment2.id]));
    await db.delete(lessons).where(inArray(lessons.id, [lessonA1_1.id, lessonA1_2.id]));
    await db.delete(modules).where(eq(modules.id, modA1.id));
    await db.delete(courses).where(inArray(courses.id, [courseA1.id, courseA2.id, courseB1.id]));
    await db.delete(users).where(inArray(users.id, [teacherA.id, teacherB.id, student1.id, student2.id]));
    console.log("   ✅ Test cleanup complete");

    console.log("\n🎉 ALL SLICE 4.3 TEACHER DASHBOARD & REVENUE TESTS PASSED! 🚀\n");
  } catch (err) {
    await db.delete(users).where(inArray(users.id, [teacherA.id, teacherB.id, student1.id, student2.id])).catch(() => {});
    throw err;
  }
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
