import { dashboardService } from "../dashboard.service";
import { db } from "../../db/client";
import {
  users,
  courses,
  modules,
  lessons,
  enrollments,
  lessonProgress,
  liveSessions,
} from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runTests() {
  console.log("🧪 Starting Slice 4.1 Student Dashboard verification tests...\n");

  const timestamp = Date.now();

  // 1. Create test student & test teacher
  console.log("1️⃣ Creating test student & teacher...");
  const [student] = await db
    .insert(users)
    .values({
      fullName: `Test Student ${timestamp}`,
      email: `student-${timestamp}@example.com`,
      role: "STUDENT",
      status: "ACTIVE",
    })
    .returning();

  const [teacher] = await db
    .insert(users)
    .values({
      fullName: `Teacher Prof ${timestamp}`,
      email: `teacher-${timestamp}@example.com`,
      role: "TEACHER",
      status: "ACTIVE",
    })
    .returning();

  console.log("   ✅ Student created:", student.id);
  console.log("   ✅ Teacher created:", teacher.id);

  try {
    // 2. Test Empty Dashboard
    console.log("2️⃣ Testing empty dashboard when student has no enrollments...");
    const emptyDash = await dashboardService.getStudentDashboard(student.id);
    if (emptyDash.inProgress.length !== 0 || emptyDash.completed.length !== 0) {
      throw new Error("Expected empty dashboard arrays for non-enrolled student");
    }
    if (emptyDash.stats?.enrolledCount !== 0) {
      throw new Error("Expected stats.enrolledCount === 0");
    }
    console.log("   ✅ Empty dashboard returns empty arrays and 0 stats");

    // 3. Create 2 test courses with curriculum
    console.log("3️⃣ Creating test courses & curriculum...");
    const [course1] = await db
      .insert(courses)
      .values({
        title: `React Masterclass ${timestamp}`,
        slug: `react-masterclass-${timestamp}`,
        type: "RECORDED",
        price: 49.99,
        authorId: teacher.id,
        status: "PUBLISHED",
      })
      .returning();

    const [course2] = await db
      .insert(courses)
      .values({
        title: `Node.js Backend Deepdive ${timestamp}`,
        slug: `nodejs-backend-${timestamp}`,
        type: "RECORDED",
        price: 39.99,
        authorId: teacher.id,
        status: "PUBLISHED",
      })
      .returning();

    // Add module & lessons to course 1 (2 lessons total)
    const [mod1] = await db
      .insert(modules)
      .values({
        courseId: course1.id,
        title: "Module 1: React Foundations",
        order: 1,
      })
      .returning();

    const [lesson1_1] = await db
      .insert(lessons)
      .values({
        moduleId: mod1.id,
        title: "Lesson 1: Components & JSX",
        type: "VIDEO",
        duration: 600,
        order: 1,
      })
      .returning();

    const [lesson1_2] = await db
      .insert(lessons)
      .values({
        moduleId: mod1.id,
        title: "Lesson 2: Hooks Deep Dive",
        type: "VIDEO",
        duration: 900,
        order: 2,
      })
      .returning();

    // Add module & lessons to course 2 (2 lessons total)
    const [mod2] = await db
      .insert(modules)
      .values({
        courseId: course2.id,
        title: "Module 1: Server Basics",
        order: 1,
      })
      .returning();

    const [lesson2_1] = await db
      .insert(lessons)
      .values({
        moduleId: mod2.id,
        title: "Lesson 1: Event Loop",
        type: "VIDEO",
        duration: 1200,
        order: 1,
      })
      .returning();

    const [lesson2_2] = await db
      .insert(lessons)
      .values({
        moduleId: mod2.id,
        title: "Lesson 2: Streams & Buffers",
        type: "VIDEO",
        duration: 1500,
        order: 2,
      })
      .returning();

    // 4. Enroll student in both courses
    console.log("4️⃣ Enrolling student in Course 1 & Course 2...");
    const [enrollment1] = await db
      .insert(enrollments)
      .values({
        userId: student.id,
        courseId: course1.id,
        status: "ACTIVE",
      })
      .returning();

    const [enrollment2] = await db
      .insert(enrollments)
      .values({
        userId: student.id,
        courseId: course2.id,
        status: "ACTIVE",
        certificateUrl: "https://cdn.example.com/certificates/test-cert.pdf",
        certIssuedAt: new Date().toISOString(),
      })
      .returning();

    // 5. Setup progress:
    // Course 1: In-progress (1 of 2 lessons completed = 50%)
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment1.id,
      lessonId: lesson1_1.id,
      watchPercent: 100,
      isCompleted: true,
      lastWatchedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    });

    await db.insert(lessonProgress).values({
      enrollmentId: enrollment1.id,
      lessonId: lesson1_2.id,
      watchPercent: 40,
      isCompleted: false,
      lastWatchedAt: new Date().toISOString(), // Most recent watch
    });

    // Course 2: 100% completed (2 of 2 completed)
    await db.insert(lessonProgress).values({
      enrollmentId: enrollment2.id,
      lessonId: lesson2_1.id,
      watchPercent: 100,
      isCompleted: true,
      lastWatchedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
    });

    await db.insert(lessonProgress).values({
      enrollmentId: enrollment2.id,
      lessonId: lesson2_2.id,
      watchPercent: 100,
      isCompleted: true,
      lastWatchedAt: new Date(Date.now() - 5000 * 1000).toISOString(),
    });

    // 6. Setup Live Sessions
    console.log("5️⃣ Scheduling test live sessions...");
    // Session A: 2 days in future (>15m) -> joinUrl should be null
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const [sessionFuture] = await db
      .insert(liveSessions)
      .values({
        courseId: course1.id,
        teacherId: teacher.id,
        title: "Future Q&A Workshop",
        scheduledAt: futureDate,
        duration: 60,
        platform: "ZOOM",
        joinUrl: "https://zoom.us/j/secret123",
        status: "SCHEDULED",
      })
      .returning();

    // Session B: In 5 minutes (<15m) -> joinUrl should be present
    const soonDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const [sessionSoon] = await db
      .insert(liveSessions)
      .values({
        courseId: course1.id,
        teacherId: teacher.id,
        title: "Imminent React Architecture Jam",
        scheduledAt: soonDate,
        duration: 45,
        platform: "GOOGLE_MEET",
        joinUrl: "https://meet.google.com/abc-defg-hij",
        status: "SCHEDULED",
      })
      .returning();

    // 7. Verify Dashboard Service Data
    console.log("6️⃣ Testing DashboardService.getStudentDashboard()...");
    const dash = await dashboardService.getStudentDashboard(student.id);

    // Verify in-progress partition
    if (dash.inProgress.length !== 1) {
      throw new Error(`Expected 1 inProgress course, got ${dash.inProgress.length}`);
    }
    const inProg = dash.inProgress[0];
    if (inProg.course.id !== course1.id) {
      throw new Error(`Expected inProgress course to be course1, got ${inProg.course.id}`);
    }
    if (inProg.progressPercent !== 50) {
      throw new Error(`Expected progressPercent === 50, got ${inProg.progressPercent}`);
    }
    if (inProg.lastLesson?.id !== lesson1_2.id) {
      throw new Error(
        `Expected lastLesson to be lesson1_2 (Hooks Deep Dive), got ${inProg.lastLesson?.id}`
      );
    }
    if (inProg.course.instructor?.fullName !== `Teacher Prof ${timestamp}`) {
      throw new Error(
        `Expected instructor name "Teacher Prof ${timestamp}", got "${inProg.course.instructor?.fullName}"`
      );
    }
    console.log("   ✅ In-progress course correctly partitioned with 50% progress & last-watched lesson");

    // Verify completed partition
    if (dash.completed.length !== 1) {
      throw new Error(`Expected 1 completed course, got ${dash.completed.length}`);
    }
    const comp = dash.completed[0];
    if (comp.course.id !== course2.id) {
      throw new Error(`Expected completed course to be course2, got ${comp.course.id}`);
    }
    if (comp.certificateUrl !== "https://cdn.example.com/certificates/test-cert.pdf") {
      throw new Error(`Expected certificateUrl to match, got ${comp.certificateUrl}`);
    }
    console.log("   ✅ Completed course correctly partitioned with 100% progress & certificate");

    // Verify Upcoming Live Sessions & 15-minute Join URL Masking
    console.log("7️⃣ Testing Live Sessions and 15-min Join URL masking...");
    if (dash.upcomingLiveSessions.length !== 2) {
      throw new Error(
        `Expected 2 upcoming live sessions, got ${dash.upcomingLiveSessions.length}`
      );
    }

    // Sessions sorted by scheduledAt ASC -> sessionSoon first, sessionFuture second
    const imminent = dash.upcomingLiveSessions.find((s) => s.sessionId === sessionSoon.id);
    const distant = dash.upcomingLiveSessions.find((s) => s.sessionId === sessionFuture.id);

    if (!imminent || imminent.joinUrl !== "https://meet.google.com/abc-defg-hij") {
      throw new Error(
        `Expected imminent session (<15m) to have joinUrl accessible, got ${imminent?.joinUrl}`
      );
    }

    if (!distant || distant.joinUrl !== null) {
      throw new Error(
        `Expected distant session (>15m) to have masked joinUrl (null), got ${distant?.joinUrl}`
      );
    }
    console.log("   ✅ Imminent session retains joinUrl; future session correctly masked (null)");

    // Verify Stats
    if (dash.stats?.enrolledCount !== 2) {
      throw new Error(`Expected enrolledCount === 2, got ${dash.stats?.enrolledCount}`);
    }
    if (dash.stats?.inProgressCount !== 1) {
      throw new Error(`Expected inProgressCount === 1, got ${dash.stats?.inProgressCount}`);
    }
    if (dash.stats?.completedCount !== 1) {
      throw new Error(`Expected completedCount === 1, got ${dash.stats?.completedCount}`);
    }
    console.log("   ✅ Dashboard stats summary correctly calculated");

    // Clean up test data
    console.log("8️⃣ Cleaning up test records...");
    await db.delete(liveSessions).where(inArray(liveSessions.id, [sessionFuture.id, sessionSoon.id]));
    await db.delete(lessonProgress).where(inArray(lessonProgress.enrollmentId, [enrollment1.id, enrollment2.id]));
    await db.delete(enrollments).where(inArray(enrollments.id, [enrollment1.id, enrollment2.id]));
    await db.delete(lessons).where(inArray(lessons.id, [lesson1_1.id, lesson1_2.id, lesson2_1.id, lesson2_2.id]));
    await db.delete(modules).where(inArray(modules.id, [mod1.id, mod2.id]));
    await db.delete(courses).where(inArray(courses.id, [course1.id, course2.id]));
    await db.delete(users).where(inArray(users.id, [student.id, teacher.id]));
    console.log("   ✅ Test cleanup complete");

    console.log("\n🎉 ALL SLICE 4.1 STUDENT DASHBOARD TESTS PASSED! 🚀\n");
  } catch (err) {
    // Attempt cleanup on failure
    await db.delete(users).where(inArray(users.id, [student.id, teacher.id])).catch(() => {});
    throw err;
  }
}

runTests().catch((err) => {
  console.error("❌ Test run failed:", err);
  process.exit(1);
});
