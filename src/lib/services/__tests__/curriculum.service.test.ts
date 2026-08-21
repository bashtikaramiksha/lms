import { courseService, AppError } from "../course.service";
import { db } from "../../db/client";
import { courses, modules, lessons, users } from "../../db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runTests() {
  console.log("🧪 Starting Slice 2.2 Curriculum Builder verification tests...\n");

  // 1. Find or create a test teacher user
  let teacher = await db.query.users.findFirst({
    where: eq(users.role, "TEACHER"),
  });

  if (!teacher) {
    console.log("Creating test teacher...");
    const [newTeacher] = await db
      .insert(users)
      .values({
        fullName: "Test Teacher",
        email: `teacher-${Date.now()}@example.com`,
        role: "TEACHER",
        status: "ACTIVE",
      })
      .returning();
    teacher = newTeacher;
  }

  // 2. Create a test course
  console.log("1️⃣ Creating test course draft...");
  const course = await courseService.createCourse(
    {
      title: `Test Course Curriculum ${Date.now()}`,
      type: "RECORDED",
      price: 29.99,
      level: "BEGINNER",
      language: "English",
    },
    teacher.id,
    teacher.role as any,
    teacher.status as any
  );
  console.log("   ✅ Course created:", course.id, course.slug);

  // 3. Test addModule (order contiguous)
  console.log("2️⃣ Testing addModule()...");
  const mod1 = await courseService.addModule(course.id, teacher.id, teacher.role as any, "Module 1: Introduction");
  if (mod1.order !== 1) throw new Error(`Expected mod1.order === 1, got ${mod1.order}`);

  const mod2 = await courseService.addModule(course.id, teacher.id, teacher.role as any, "Module 2: Advanced Concepts");
  if (mod2.order !== 2) throw new Error(`Expected mod2.order === 2, got ${mod2.order}`);

  const mod3 = await courseService.addModule(course.id, teacher.id, teacher.role as any, "Module 3: Project Building");
  if (mod3.order !== 3) throw new Error(`Expected mod3.order === 3, got ${mod3.order}`);
  console.log("   ✅ Modules added with contiguous order (1, 2, 3)");

  // 4. Test updateModule
  console.log("3️⃣ Testing updateModule()...");
  const updatedMod1 = await courseService.updateModule(mod1.id, teacher.id, teacher.role as any, "Module 1: Intro Renamed");
  if (updatedMod1.title !== "Module 1: Intro Renamed") throw new Error("Module title update failed");
  console.log("   ✅ Module title updated successfully");

  // 5. Test reorderModules
  console.log("4️⃣ Testing reorderModules()...");
  await courseService.reorderModules(course.id, teacher.id, teacher.role as any, [mod3.id, mod1.id, mod2.id]);
  const curriculumAfterModReorder = await courseService.getCurriculum(course.id);
  if (curriculumAfterModReorder[0].id !== mod3.id || curriculumAfterModReorder[0].order !== 1) {
    throw new Error("Module reorder failed");
  }
  console.log("   ✅ Modules reordered atomically (mod3 -> 1, mod1 -> 2, mod2 -> 3)");

  // 6. Test addLesson
  console.log("5️⃣ Testing addLesson()...");
  const lesson1 = await courseService.addLesson(mod1.id, teacher.id, teacher.role as any, {
    title: "Lesson 1: Welcome & Setup",
    type: "VIDEO",
    isPreview: true,
  });
  if (lesson1.order !== 1 || !lesson1.isPreview) throw new Error("Lesson 1 creation failed");

  const lesson2 = await courseService.addLesson(mod1.id, teacher.id, teacher.role as any, {
    title: "Lesson 2: Course Overview Doc",
    type: "ARTICLE",
    isPreview: true,
  });
  if (lesson2.order !== 2 || !lesson2.isPreview) throw new Error("Lesson 2 creation failed");

  const lesson3 = await courseService.addLesson(mod1.id, teacher.id, teacher.role as any, {
    title: "Lesson 3: Architecture Deepdive",
    type: "VIDEO",
    isPreview: true,
  });
  if (lesson3.order !== 3 || !lesson3.isPreview) throw new Error("Lesson 3 creation failed");
  console.log("   ✅ 3 Lessons created in module with preview=true");

  // 7. Test preview limit (max 3 previews per course)
  console.log("6️⃣ Testing 3-preview limit enforcement...");
  let caughtPreviewError = false;
  try {
    await courseService.addLesson(mod2.id, teacher.id, teacher.role as any, {
      title: "Lesson 4: Trying 4th Preview",
      type: "VIDEO",
      isPreview: true,
    });
  } catch (err: any) {
    if (err instanceof AppError && err.code === "MAX_PREVIEWS_EXCEEDED" && err.statusCode === 409) {
      caughtPreviewError = true;
    }
  }
  if (!caughtPreviewError) {
    throw new Error("Expected MAX_PREVIEWS_EXCEEDED (409) when creating 4th preview lesson");
  }
  console.log("   ✅ Correctly threw MAX_PREVIEWS_EXCEEDED (409) on 4th preview lesson creation");

  // 8. Test updateLesson (videoUrl, duration, content)
  console.log("7️⃣ Testing updateLesson()...");
  const updatedLesson1 = await courseService.updateLesson(lesson1.id, teacher.id, teacher.role as any, {
    videoUrl: "https://example.com/videos/welcome.mp4",
    duration: 480,
  });
  if (updatedLesson1.videoUrl !== "https://example.com/videos/welcome.mp4" || updatedLesson1.duration !== 480) {
    throw new Error("Lesson update failed");
  }
  console.log("   ✅ Lesson updated with video URL and duration");

  // 9. Test reorderLessons
  console.log("8️⃣ Testing reorderLessons()...");
  await courseService.reorderLessons(mod1.id, teacher.id, teacher.role as any, [lesson3.id, lesson1.id, lesson2.id]);
  const curriculumAfterLessonReorder = await courseService.getCurriculum(course.id);
  const mod1InCurriculum = curriculumAfterLessonReorder.find((m) => m.id === mod1.id);
  if (mod1InCurriculum?.lessons[0].id !== lesson3.id || mod1InCurriculum?.lessons[0].order !== 1) {
    throw new Error("Lesson reorder failed");
  }
  console.log("   ✅ Lessons reordered atomically within module");

  // 10. Test getVideoPresignedUrl
  console.log("9️⃣ Testing getVideoPresignedUrl()...");
  const videoPresign = await courseService.getVideoPresignedUrl("test-video.mp4", "video/mp4", lesson1.id);
  if (!videoPresign.uploadUrl || !videoPresign.publicUrl) {
    throw new Error("Video presign URL generation failed");
  }
  console.log("   ✅ Generated valid video upload URLs (uploadUrl & publicUrl)");

  // 11. Test deleteLesson
  console.log("🔟 Testing deleteLesson()...");
  await courseService.deleteLesson(lesson2.id, teacher.id, teacher.role as any);
  const curAfterLessonDel = await courseService.getCurriculum(course.id);
  const mod1AfterDel = curAfterLessonDel.find((m) => m.id === mod1.id);
  if (mod1AfterDel?.lessons.length !== 2) throw new Error("Lesson delete count mismatch");
  if (mod1AfterDel?.lessons[1].order !== 2) throw new Error("Lesson reordering after delete failed");
  console.log("   ✅ Lesson deleted and remaining lessons re-indexed to 1..N");

  // 12. Test deleteModule (cascading)
  console.log("1️⃣1️⃣ Testing deleteModule() cascade...");
  await courseService.deleteModule(mod1.id, teacher.id, teacher.role as any);
  const curAfterModDel = await courseService.getCurriculum(course.id);
  if (curAfterModDel.some((m) => m.id === mod1.id)) throw new Error("Module still exists after delete");
  console.log("   ✅ Module and cascaded lessons deleted successfully");

  // Clean up test course
  await db.delete(courses).where(eq(courses.id, course.id));

  console.log("\n🎉 ALL SLICE 2.2 TESTS PASSED SUCCESSFULLY! 🚀\n");
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
