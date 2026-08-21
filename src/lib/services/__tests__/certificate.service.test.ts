import { certificateService } from "../certificate.service";
import { db } from "../../db/client";
import {
  users,
  courses,
  modules,
  lessons,
  enrollments,
  lessonProgress,
} from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import { AppError } from "../course.service";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runTests() {
  console.log("🧪 Starting Slice 4.4 Course Completion Certificate verification tests...\n");

  const timestamp = Date.now();

  // 1. Create test student & teacher
  console.log("1️⃣ Creating test student & teacher...");
  const [student] = await db
    .insert(users)
    .values({
      fullName: `Graduating Student ${timestamp}`,
      email: `grad-${timestamp}@example.com`,
      role: "STUDENT",
      status: "ACTIVE",
    })
    .returning();

  const [teacher] = await db
    .insert(users)
    .values({
      fullName: `Instructor Jane ${timestamp}`,
      email: `instructor-${timestamp}@example.com`,
      role: "TEACHER",
      status: "ACTIVE",
    })
    .returning();

  console.log("   ✅ Created student:", student.id);
  console.log("   ✅ Created teacher:", teacher.id);

  try {
    // 2. Create test course with 2 lessons
    console.log("2️⃣ Creating test course with curriculum...");
    const [course] = await db
      .insert(courses)
      .values({
        title: `Fullstack Next.js Certificate Masterclass ${timestamp}`,
        slug: `nextjs-cert-${timestamp}`,
        type: "RECORDED",
        price: 99.99,
        authorId: teacher.id,
        status: "PUBLISHED",
      })
      .returning();

    const [mod] = await db
      .insert(modules)
      .values({
        courseId: course.id,
        title: "Core Curriculum",
        order: 1,
      })
      .returning();

    const [lesson1] = await db
      .insert(lessons)
      .values({
        moduleId: mod.id,
        title: "Lesson 1: Foundations",
        type: "VIDEO",
        duration: 500,
        order: 1,
      })
      .returning();

    const [lesson2] = await db
      .insert(lessons)
      .values({
        moduleId: mod.id,
        title: "Lesson 2: Capstone Project",
        type: "VIDEO",
        duration: 800,
        order: 2,
      })
      .returning();

    // 3. Test NOT_ENROLLED error
    console.log("3️⃣ Testing non-enrolled user access...");
    let caughtNotEnrolled = false;
    try {
      await certificateService.getCertificateStatus(student.id, course.id);
    } catch (err: any) {
      if (err instanceof AppError && err.code === "NOT_ENROLLED" && err.statusCode === 403) {
        caughtNotEnrolled = true;
      }
    }
    if (!caughtNotEnrolled) {
      throw new Error("Expected NOT_ENROLLED 403 error for non-enrolled user");
    }
    console.log("   ✅ Non-enrolled user blocked with 403 NOT_ENROLLED");

    // 4. Enroll student
    console.log("4️⃣ Enrolling student in course...");
    const [enrollment] = await db
      .insert(enrollments)
      .values({
        userId: student.id,
        courseId: course.id,
        status: "ACTIVE",
      })
      .returning();

    // 5. Test NOT_EARNED status when incomplete
    console.log("5️⃣ Testing certificate status when incomplete (< 100%)...");
    const initialStatus = await certificateService.getCertificateStatus(student.id, course.id);
    if (initialStatus.status !== "NOT_EARNED" || initialStatus.certificateUrl !== null) {
      throw new Error(`Expected NOT_EARNED status, got: ${JSON.stringify(initialStatus)}`);
    }
    console.log("   ✅ Incomplete course returns status: NOT_EARNED");

    // Test rejection when requesting certificate prematurely
    let caughtPrematureRequest = false;
    try {
      await certificateService.requestCertificate(student.id, course.id);
    } catch (err: any) {
      if (err instanceof AppError && err.code === "COURSE_NOT_COMPLETED" && err.statusCode === 422) {
        caughtPrematureRequest = true;
      }
    }
    if (!caughtPrematureRequest) {
      throw new Error("Expected COURSE_NOT_COMPLETED 422 error on premature certificate request");
    }
    console.log("   ✅ Premature certificate request rejected with 422 COURSE_NOT_COMPLETED");

    // 6. Complete both lessons (100% progress)
    console.log("6️⃣ Marking all course lessons complete (100% progress)...");
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment.id,
      lessonId: lesson1.id,
      watchPercent: 100,
      isCompleted: true,
      lastWatchedAt: new Date().toISOString(),
    });

    await db.insert(lessonProgress).values({
      enrollmentId: enrollment.id,
      lessonId: lesson2.id,
      watchPercent: 100,
      isCompleted: true,
      lastWatchedAt: new Date().toISOString(),
    });

    // 7. Request Certificate upon 100% completion
    console.log("7️⃣ Requesting certificate for 100% completed course...");
    const certResult = await certificateService.requestCertificate(student.id, course.id);
    if (certResult.status !== "READY" || !certResult.certificateUrl) {
      throw new Error(`Expected READY status with certificateUrl, got: ${JSON.stringify(certResult)}`);
    }
    console.log("   ✅ Certificate generated successfully:", certResult.certificateUrl);

    // 8. Verify enrollment table updated
    console.log("8️⃣ Verifying enrollment record in database...");
    const updatedEnrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollment.id),
    });
    if (!updatedEnrollment?.certificateUrl || !updatedEnrollment.certIssuedAt) {
      throw new Error("Enrollment table missing certificateUrl or certIssuedAt");
    }
    console.log("   ✅ Enrollment updated with certificateUrl & certIssuedAt");

    // 9. Test Idempotency (subsequent status & request calls return same certificate)
    console.log("9️⃣ Testing certificate generation idempotency...");
    const secondStatus = await certificateService.getCertificateStatus(student.id, course.id);
    if (secondStatus.status !== "READY" || secondStatus.certificateUrl !== certResult.certificateUrl) {
      throw new Error("Idempotent certificate status check failed");
    }

    const secondRequest = await certificateService.requestCertificate(student.id, course.id);
    if (secondRequest.status !== "READY" || secondRequest.certificateUrl !== certResult.certificateUrl) {
      throw new Error("Idempotent certificate request failed");
    }
    console.log("   ✅ Subsequent checks returned identical certificate URL (idempotent)");

    // 10. Clean up test records
    console.log("🔟 Cleaning up test records...");
    await db.delete(lessonProgress).where(eq(lessonProgress.enrollmentId, enrollment.id));
    await db.delete(enrollments).where(eq(enrollments.id, enrollment.id));
    await db.delete(lessons).where(inArray(lessons.id, [lesson1.id, lesson2.id]));
    await db.delete(modules).where(eq(modules.id, mod.id));
    await db.delete(courses).where(eq(courses.id, course.id));
    await db.delete(users).where(inArray(users.id, [student.id, teacher.id]));
    console.log("   ✅ Test cleanup complete");

    console.log("\n🎉 ALL SLICE 4.4 COURSE COMPLETION CERTIFICATE TESTS PASSED! 🚀\n");
  } catch (err) {
    await db.delete(users).where(inArray(users.id, [student.id, teacher.id])).catch(() => {});
    throw err;
  }
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
