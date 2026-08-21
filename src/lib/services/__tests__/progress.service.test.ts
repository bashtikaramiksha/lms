import { progressService } from "../progress.service";
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
  console.log("🧪 Starting Slice 4.2 Course Video Player & Progress Tracking verification tests...\n");

  const timestamp = Date.now();

  // 1. Create test student & teacher
  console.log("1️⃣ Creating test student & teacher...");
  const [student] = await db
    .insert(users)
    .values({
      fullName: `Test Learner ${timestamp}`,
      email: `learner-${timestamp}@example.com`,
      role: "STUDENT",
      status: "ACTIVE",
    })
    .returning();

  const [teacher] = await db
    .insert(users)
    .values({
      fullName: `Prof Code ${timestamp}`,
      email: `prof-${timestamp}@example.com`,
      role: "TEACHER",
      status: "ACTIVE",
    })
    .returning();

  console.log("   ✅ Student created:", student.id);
  console.log("   ✅ Teacher created:", teacher.id);

  try {
    // 2. Create test course with 2 modules and 3 lessons total
    console.log("2️⃣ Creating test course with multi-module curriculum...");
    const [course] = await db
      .insert(courses)
      .values({
        title: `Next.js Fullstack Architecture ${timestamp}`,
        slug: `nextjs-fullstack-${timestamp}`,
        type: "RECORDED",
        price: 79.99,
        authorId: teacher.id,
        status: "PUBLISHED",
      })
      .returning();

    // Module 1: 2 lessons
    const [mod1] = await db
      .insert(modules)
      .values({
        courseId: course.id,
        title: "Module 1: Server Components",
        order: 1,
      })
      .returning();

    const [lesson1] = await db
      .insert(lessons)
      .values({
        moduleId: mod1.id,
        title: "Lesson 1: RSC Architecture",
        type: "VIDEO",
        videoUrl: "https://cdn.example.com/videos/lesson1.mp4",
        duration: 600,
        order: 1,
      })
      .returning();

    const [lesson2] = await db
      .insert(lessons)
      .values({
        moduleId: mod1.id,
        title: "Lesson 2: Server Actions & Mutations",
        type: "VIDEO",
        videoUrl: "https://cdn.example.com/videos/lesson2.mp4",
        duration: 900,
        order: 2,
      })
      .returning();

    // Module 2: 1 lesson
    const [mod2] = await db
      .insert(modules)
      .values({
        courseId: course.id,
        title: "Module 2: Advanced Caching",
        order: 2,
      })
      .returning();

    const [lesson3] = await db
      .insert(lessons)
      .values({
        moduleId: mod2.id,
        title: "Lesson 3: Incremental Static Regeneration",
        type: "ARTICLE",
        content: "<p>ISR allows you to update static pages in the background.</p>",
        order: 1,
      })
      .returning();

    console.log("   ✅ Course created with 3 lessons across 2 modules");

    // 3. Test NOT_ENROLLED error
    console.log("3️⃣ Testing enrollment protection (NOT_ENROLLED)...");
    let caughtNotEnrolled = false;
    try {
      await progressService.getLessonData(student.id, course.id, lesson1.id);
    } catch (err: any) {
      if (err instanceof AppError && err.code === "NOT_ENROLLED" && err.statusCode === 403) {
        caughtNotEnrolled = true;
      }
    }
    if (!caughtNotEnrolled) {
      throw new Error("Expected NOT_ENROLLED 403 error for non-enrolled user");
    }
    console.log("   ✅ Non-enrolled user properly blocked with 403 NOT_ENROLLED");

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

    // 5. Test getLessonData with curriculum & prev/next navigation
    console.log("5️⃣ Testing getLessonData() & navigation computation...");
    // Fetch Lesson 2 (middle lesson)
    const lesson2Data = await progressService.getLessonData(student.id, course.id, lesson2.id);
    if (lesson2Data.lesson.id !== lesson2.id) {
      throw new Error("Lesson ID mismatch in getLessonData");
    }
    if (lesson2Data.navigation.prevLesson?.id !== lesson1.id) {
      throw new Error(
        `Expected prevLesson to be lesson1, got ${lesson2Data.navigation.prevLesson?.id}`
      );
    }
    if (lesson2Data.navigation.nextLesson?.id !== lesson3.id) {
      throw new Error(
        `Expected nextLesson across module boundary to be lesson3, got ${lesson2Data.navigation.nextLesson?.id}`
      );
    }
    if (lesson2Data.curriculum.length !== 2) {
      throw new Error(`Expected 2 modules in curriculum, got ${lesson2Data.curriculum.length}`);
    }
    console.log("   ✅ getLessonData returned correct curriculum and seamless prev/next navigation");

    // 6. Test updateProgress (initial watch < 80%)
    console.log("6️⃣ Testing watch progress update (< 80%)...");
    const prog1 = await progressService.updateProgress({
      studentId: student.id,
      courseId: course.id,
      lessonId: lesson1.id,
      watchPercent: 45.5,
    });
    if (prog1.watchPercent !== 45.5 || prog1.isCompleted !== false || prog1.justCompleted !== false) {
      throw new Error(`Unexpected progress result for 45.5%: ${JSON.stringify(prog1)}`);
    }
    console.log("   ✅ Progress updated to 45.5% (isCompleted: false)");

    // 7. Test monotonic watch progress (rewinding does not decrease progress)
    console.log("7️⃣ Testing monotonic watchPercent (never decreases)...");
    const prog2 = await progressService.updateProgress({
      studentId: student.id,
      courseId: course.id,
      lessonId: lesson1.id,
      watchPercent: 20.0,
    });
    if (prog2.watchPercent !== 45.5) {
      throw new Error(`Expected watchPercent to stay at 45.5, but got ${prog2.watchPercent}`);
    }
    console.log("   ✅ Rewind to 20% preserved highest watched progress (45.5%)");

    // 8. Test auto-completion at >= 80% (justCompleted: true)
    console.log("8️⃣ Testing auto-completion at >= 80% threshold...");
    const prog3 = await progressService.updateProgress({
      studentId: student.id,
      courseId: course.id,
      lessonId: lesson1.id,
      watchPercent: 82.0,
    });
    if (prog3.isCompleted !== true || prog3.justCompleted !== true || prog3.courseCompleted !== false) {
      throw new Error(`Expected isCompleted: true and justCompleted: true, got ${JSON.stringify(prog3)}`);
    }
    console.log("   ✅ Lesson 1 auto-completed at 82% watch time (justCompleted: true)");

    // 9. Test subsequent update above 80% (justCompleted: false)
    console.log("9️⃣ Testing subsequent update above 80% (justCompleted: false)...");
    const prog4 = await progressService.updateProgress({
      studentId: student.id,
      courseId: course.id,
      lessonId: lesson1.id,
      watchPercent: 95.0,
    });
    if (prog4.isCompleted !== true || prog4.justCompleted !== false) {
      throw new Error(`Expected justCompleted: false on repeated completion, got ${JSON.stringify(prog4)}`);
    }
    console.log("   ✅ Subsequent progress update preserved completion with justCompleted: false");

    // 10. Test manual markLessonComplete on Lesson 2
    console.log("🔟 Testing manual markLessonComplete()...");
    const complete2 = await progressService.markLessonComplete(student.id, course.id, lesson2.id);
    if (complete2.isCompleted !== true || complete2.justCompleted !== true || complete2.courseCompleted !== false) {
      throw new Error(`Expected lesson 2 complete, got ${JSON.stringify(complete2)}`);
    }
    console.log("   ✅ Lesson 2 manually marked complete");

    // 11. Complete final lesson (Lesson 3) -> courseCompleted = true
    console.log("1️⃣1️⃣ Testing course completion detection on final lesson...");
    const complete3 = await progressService.markLessonComplete(student.id, course.id, lesson3.id);
    if (complete3.isCompleted !== true || complete3.courseCompleted !== true) {
      throw new Error(`Expected courseCompleted: true on final lesson, got ${JSON.stringify(complete3)}`);
    }
    console.log("   ✅ Final lesson complete triggered courseCompleted: true");

    // 12. Clean up test records
    console.log("1️⃣2️⃣ Cleaning up test records...");
    await db.delete(lessonProgress).where(eq(lessonProgress.enrollmentId, enrollment.id));
    await db.delete(enrollments).where(eq(enrollments.id, enrollment.id));
    await db.delete(lessons).where(inArray(lessons.id, [lesson1.id, lesson2.id, lesson3.id]));
    await db.delete(modules).where(inArray(modules.id, [mod1.id, mod2.id]));
    await db.delete(courses).where(eq(courses.id, course.id));
    await db.delete(users).where(inArray(users.id, [student.id, teacher.id]));
    console.log("   ✅ Test cleanup complete");

    console.log("\n🎉 ALL SLICE 4.2 PROGRESS TRACKING TESTS PASSED! 🚀\n");
  } catch (err) {
    await db.delete(users).where(inArray(users.id, [student.id, teacher.id])).catch(() => {});
    throw err;
  }
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
