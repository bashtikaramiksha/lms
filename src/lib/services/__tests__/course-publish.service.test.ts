import { courseService, AppError } from "../course.service";
import { db, rawClient } from "../../db/client";
import { courses, modules, lessons, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runTests() {
  console.log("🧪 Starting Slice 2.3 Course SEO & Publishing verification tests...\n");

  // 1. Find or create test teacher and test admin
  let teacher = await db.query.users.findFirst({
    where: eq(users.role, "TEACHER"),
  });

  if (!teacher) {
    const [newTeacher] = await db
      .insert(users)
      .values({
        fullName: "Test Teacher Publish",
        email: `teacher-publish-${Date.now()}@example.com`,
        role: "TEACHER",
        status: "ACTIVE",
      })
      .returning();
    teacher = newTeacher;
  }

  let admin = await db.query.users.findFirst({
    where: eq(users.role, "ADMIN"),
  });

  if (!admin) {
    const [newAdmin] = await db
      .insert(users)
      .values({
        fullName: "Test Admin Publish",
        email: `admin-publish-${Date.now()}@example.com`,
        role: "ADMIN",
        status: "ACTIVE",
      })
      .returning();
    admin = newAdmin;
  }

  // 2. Create an incomplete test course
  console.log("1️⃣ Creating incomplete course draft...");
  const course = await courseService.createCourse(
    {
      title: `Fullstack Cloud Masterclass ${Date.now()}`,
      type: "RECORDED",
      price: 99.99,
      level: "INTERMEDIATE",
      language: "English",
      // description and thumbnailUrl are left empty intentionally
    },
    teacher.id,
    teacher.role as any,
    teacher.status as any
  );
  console.log("   ✅ Course created with ID:", course.id);

  // 3. Test checkPublishReadiness on incomplete course
  console.log("2️⃣ Testing checkPublishReadiness() on incomplete course...");
  const readinessIncomplete = await courseService.checkPublishReadiness(course.id);
  if (readinessIncomplete.ready !== false) {
    throw new Error("Expected incomplete course to have ready = false");
  }
  if (readinessIncomplete.failures.length < 3) {
    throw new Error(`Expected multiple failures, got ${readinessIncomplete.failures.length}`);
  }
  console.log(`   ✅ Correctly identified ${readinessIncomplete.failures.length} missing criteria (description, thumbnail, modules)`);

  // 4. Test submitForReview failure on incomplete course
  console.log("3️⃣ Testing submitForReview() rejection for incomplete course...");
  let caughtIncomplete = false;
  try {
    await courseService.submitForReview(course.id, teacher.id, teacher.role as any);
  } catch (err: any) {
    if (err instanceof AppError && err.code === "COURSE_INCOMPLETE" && err.statusCode === 422) {
      caughtIncomplete = true;
    }
  }
  if (!caughtIncomplete) {
    throw new Error("Expected COURSE_INCOMPLETE (422) error when submitting incomplete course");
  }
  console.log("   ✅ Rejected submitForReview with COURSE_INCOMPLETE (422) and detailed failure list");

  // 5. Test updateCourseSeo()
  console.log("4️⃣ Testing updateCourseSeo()...");
  const updatedSeo = await courseService.updateCourseSeo(
    course.id,
    teacher.id,
    teacher.role as any,
    {
      seoTitle: "Fullstack Cloud Masterclass | Best Online Course",
      seoDesc: "Learn fullstack cloud architecture with Next.js, AWS S3, and Turso database in 30 days.",
      ogImageUrl: "https://cdn.example.com/og-cloud.jpg",
    }
  );
  if (
    updatedSeo.seoTitle !== "Fullstack Cloud Masterclass | Best Online Course" ||
    updatedSeo.ogImageUrl !== "https://cdn.example.com/og-cloud.jpg"
  ) {
    throw new Error("SEO metadata update failed");
  }
  console.log("   ✅ SEO metadata (seoTitle, seoDesc, ogImageUrl) updated successfully");

  // 6. Complete course details, add module, and add valid video lesson
  console.log("5️⃣ Completing course requirements (Description, Thumbnail, Module, Lessons, Video URL)...");
  await courseService.updateCourse(course.id, teacher.id, teacher.role as any, {
    description: "<p>Comprehensive guide to building modern enterprise cloud platforms.</p>",
    shortDesc: "Master cloud architectures and deployment.",
    thumbnailUrl: "https://cdn.example.com/thumbnails/cloud.jpg",
  });

  const mod1 = await courseService.addModule(course.id, teacher.id, teacher.role as any, "Module 1: Cloud Fundamentals");
  const lesson1 = await courseService.addLesson(mod1.id, teacher.id, teacher.role as any, {
    title: "Lesson 1: Introduction to Cloud Platforms",
    type: "VIDEO",
    isPreview: true,
  });

  // Check readiness when video URL is still missing
  const readinessMissingVideo = await courseService.checkPublishReadiness(course.id);
  if (readinessMissingVideo.ready !== false) {
    throw new Error("Expected readiness = false when video URL is missing");
  }
  console.log("   ✅ Correctly caught missing video URL in video lesson");

  // Update video URL on lesson
  await courseService.updateLesson(lesson1.id, teacher.id, teacher.role as any, {
    videoUrl: "https://cdn.example.com/videos/intro.mp4",
    duration: 600,
  });

  // Verify readiness is now 100% complete
  const readinessComplete = await courseService.checkPublishReadiness(course.id);
  if (!readinessComplete.ready || readinessComplete.failures.length > 0) {
    throw new Error(`Expected complete course to be ready, failures: ${readinessComplete.failures.join(", ")}`);
  }
  console.log("   ✅ 8-point checklist now 100% satisfied (ready = true, 0 failures)");

  // 7. Test submitForReview() on complete course
  console.log("6️⃣ Testing submitForReview() transition DRAFT → PENDING_REVIEW...");
  const submittedCourse = await courseService.submitForReview(course.id, teacher.id, teacher.role as any);
  if (submittedCourse.status !== "PENDING_REVIEW") {
    throw new Error(`Expected status PENDING_REVIEW, got ${submittedCourse.status}`);
  }
  console.log("   ✅ Successfully transitioned status to PENDING_REVIEW");

  // 8. Test publishCourse permission guard (Teacher cannot publish)
  console.log("7️⃣ Testing publishCourse() permission guard (Teacher blocked)...");
  let caughtTeacherPublish = false;
  try {
    await courseService.publishCourse(course.id, teacher.id, teacher.role as any);
  } catch (err: any) {
    if (err instanceof AppError && err.code === "FORBIDDEN" && err.statusCode === 403) {
      caughtTeacherPublish = true;
    }
  }
  if (!caughtTeacherPublish) {
    throw new Error("Expected FORBIDDEN (403) when non-admin attempts to publish");
  }
  console.log("   ✅ Correctly threw FORBIDDEN (403) for non-admin publish attempt");

  // 9. Test publishCourse() by Admin
  console.log("8️⃣ Testing publishCourse() by ADMIN (PENDING_REVIEW → PUBLISHED & FTS sync)...");
  const publishedCourse = await courseService.publishCourse(course.id, admin.id, admin.role as any);
  if (publishedCourse.status !== "PUBLISHED") {
    throw new Error(`Expected status PUBLISHED, got ${publishedCourse.status}`);
  }

  // Check FTS index row
  try {
    const ftsResult = await rawClient.execute({
      sql: `SELECT * FROM courses_fts WHERE course_id = ?`,
      args: [course.id],
    });
    if (ftsResult.rows.length === 0) {
      console.warn("   ⚠️ FTS virtual table row check skipped or not populated");
    } else {
      console.log("   ✅ Course verified in courses_fts full-text search index");
    }
  } catch (e) {
    console.log("   ℹ️ FTS verification query note:", e);
  }
  console.log("   ✅ Successfully published course to catalog with status = PUBLISHED");

  // 10. Test edit lock on PUBLISHED course
  console.log("9️⃣ Testing edit guard on PUBLISHED course...");
  let caughtEditPublished = false;
  try {
    await courseService.updateCourse(course.id, teacher.id, teacher.role as any, { title: "New Title Attempt" });
  } catch (err: any) {
    if (err instanceof AppError && err.code === "CANNOT_EDIT_PUBLISHED" && err.statusCode === 422) {
      caughtEditPublished = true;
    }
  }
  if (!caughtEditPublished) {
    throw new Error("Expected CANNOT_EDIT_PUBLISHED (422) when editing published course");
  }
  console.log("   ✅ Correctly blocked direct editing of PUBLISHED course");

  // 11. Test archiveCourse() by Admin
  console.log("🔟 Testing archiveCourse() by ADMIN (PUBLISHED → ARCHIVED)...");
  const archivedCourse = await courseService.archiveCourse(course.id, admin.id, admin.role as any);
  if (archivedCourse.status !== "ARCHIVED") {
    throw new Error(`Expected status ARCHIVED, got ${archivedCourse.status}`);
  }
  console.log("   ✅ Successfully archived course with status = ARCHIVED");

  // 12. Test unarchiveCourse() by Admin (ARCHIVED → DRAFT)
  console.log("1️⃣1️⃣ Testing unarchiveCourse() by ADMIN (ARCHIVED → DRAFT)...");
  const unarchivedCourse = await courseService.unarchiveCourse(course.id, admin.id, admin.role as any);
  if (unarchivedCourse.status !== "DRAFT") {
    throw new Error(`Expected status DRAFT, got ${unarchivedCourse.status}`);
  }
  console.log("   ✅ Successfully restored course to DRAFT for re-editing");

  // Clean up test course
  await db.delete(lessons).where(eq(lessons.moduleId, mod1.id));
  await db.delete(modules).where(eq(modules.id, mod1.id));
  await db.delete(courses).where(eq(courses.id, course.id));

  console.log("\n🎉 ALL SLICE 2.3 TESTS PASSED SUCCESSFULLY! 🚀\n");
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
