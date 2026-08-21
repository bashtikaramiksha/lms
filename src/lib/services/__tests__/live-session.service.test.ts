import { db } from "@/lib/db/client";
import { users, courses, modules, lessons, liveSessions } from "@/lib/db/schema";
import { liveOAuthService } from "@/lib/services/live-oauth.service";
import { liveSessionService } from "@/lib/services/live-session.service";
import { createLiveSessionSchema } from "@/lib/validations/live.schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function runLiveSessionServiceTests() {
  console.log("🧪 Starting Slice 6.2 Teacher Live Session Scheduling Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Test Schema Validations
  console.log("1️⃣ Testing Zod validation schema rules...");
  const validFutureDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const pastDate = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const tooSoonDate = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins < 1 hour

  const validPayload = {
    courseId: "11111111-1111-1111-1111-111111111111",
    title: "Masterclass: Cloud Architecture Q&A",
    scheduledAt: validFutureDate,
    duration: 60,
    platform: "ZOOM" as const,
  };

  const validParsed = createLiveSessionSchema.safeParse(validPayload);
  if (!validParsed.success) {
    throw new Error(`❌ Valid payload failed validation: ${JSON.stringify(validParsed.error)}`);
  }

  const pastParsed = createLiveSessionSchema.safeParse({ ...validPayload, scheduledAt: pastDate });
  if (pastParsed.success) {
    throw new Error("❌ Schema failed to reject session scheduled in the past!");
  }

  const tooSoonParsed = createLiveSessionSchema.safeParse({ ...validPayload, scheduledAt: tooSoonDate });
  if (tooSoonParsed.success) {
    throw new Error("❌ Schema failed to reject session scheduled with < 1 hour lead time!");
  }

  const invalidDuration = createLiveSessionSchema.safeParse({ ...validPayload, duration: 500 });
  if (invalidDuration.success) {
    throw new Error("❌ Schema failed to reject session with duration > 480 mins!");
  }
  console.log("   ✅ All schema validation boundaries verified (past date, lead time, duration limits)");

  // 2. Setup Test Data (Teacher 1, Teacher 2, Course, Module, Lesson)
  console.log("2️⃣ Setting up test teacher, courses, and curriculum in Turso...");
  const teacher1Id = `teacher1-${runId}`;
  const teacher2Id = `teacher2-${runId}`;
  const courseId = `course-${runId}`;
  const moduleId = `module-${runId}`;
  const lessonId = `lesson-${runId}`;

  await db.insert(users).values([
    {
      id: teacher1Id,
      email: `t1_${runId}@example.com`,
      fullName: `Teacher Owner ${runId}`,
      role: "TEACHER",
      status: "ACTIVE",
    },
    {
      id: teacher2Id,
      email: `t2_${runId}@example.com`,
      fullName: `Teacher Other ${runId}`,
      role: "TEACHER",
      status: "ACTIVE",
    },
  ]);

  await db.insert(courses).values({
    id: courseId,
    title: `Distributed Cloud Systems ${runId}`,
    slug: `distributed-cloud-${runId}`,
    shortDesc: "Live course on distributed cloud systems",
    description: "Deep dive into cloud architecture and scalability",
    authorId: teacher1Id,
    type: "LIVE",
    status: "DRAFT",
    price: 99,
  });

  await db.insert(modules).values({
    id: moduleId,
    courseId: courseId,
    title: "Module 1: Architecture",
    order: 1,
  });

  await db.insert(lessons).values({
    id: lessonId,
    moduleId: moduleId,
    title: "Lesson 1.1: Live Architecture Q&A",
    type: "ARTICLE", // will be updated to LIVE_SESSION
    order: 1,
  });

  // 3. Test Authorization: Teacher 2 cannot schedule for Teacher 1's course
  console.log("3️⃣ Testing course ownership verification...");
  let unauthorizedThrown = false;
  try {
    await liveSessionService.createSession(
      {
        courseId,
        title: "Unauthorized Session",
        scheduledAt: validFutureDate,
        duration: 60,
        platform: "ZOOM",
      },
      teacher2Id // Not the owner
    );
  } catch (err: any) {
    if (err.code === "COURSE_NOT_FOUND" && err.statusCode === 404) {
      unauthorizedThrown = true;
    }
  }
  if (!unauthorizedThrown) {
    throw new Error("❌ Non-owner teacher was able to schedule a session for another teacher's course!");
  }
  console.log("   ✅ Non-owner teacher access strictly rejected (COURSE_NOT_FOUND 404)");

  // 4. Test Platform Token Missing Checks (ZOOM_NOT_CONNECTED & GOOGLE_NOT_CONNECTED)
  console.log("4️⃣ Testing platform connection requirements...");
  let zoomMissingThrown = false;
  try {
    await liveSessionService.createSession(
      {
        courseId,
        title: "Zoom Session without Token",
        scheduledAt: validFutureDate,
        duration: 60,
        platform: "ZOOM",
      },
      teacher1Id
    );
  } catch (err: any) {
    if (err.code === "ZOOM_NOT_CONNECTED" && err.statusCode === 422) {
      zoomMissingThrown = true;
    }
  }
  if (!zoomMissingThrown) {
    throw new Error("❌ createSession did not throw ZOOM_NOT_CONNECTED when Zoom token is missing!");
  }

  let googleMissingThrown = false;
  try {
    await liveSessionService.createSession(
      {
        courseId,
        title: "Google Meet Session without Token",
        scheduledAt: validFutureDate,
        duration: 60,
        platform: "GOOGLE_MEET",
      },
      teacher1Id
    );
  } catch (err: any) {
    if (err.code === "GOOGLE_NOT_CONNECTED" && err.statusCode === 422) {
      googleMissingThrown = true;
    }
  }
  if (!googleMissingThrown) {
    throw new Error("❌ createSession did not throw GOOGLE_NOT_CONNECTED when Google token is missing!");
  }
  console.log("   ✅ Both ZOOM_NOT_CONNECTED and GOOGLE_NOT_CONNECTED accurately thrown when unconnected");

  // 5. Test Successful Zoom Session Creation
  console.log("5️⃣ Testing Zoom live session provisioning and DB storage...");
  await liveOAuthService.saveZoomTokens(teacher1Id, {
    accessToken: `mock_zoom_token_${runId}`,
    refreshToken: `mock_zoom_ref_${runId}`,
    expiresIn: 3600,
    userId: `zoom_user_${runId}@example.com`,
  });

  const zoomSession = await liveSessionService.createSession(
    {
      courseId,
      lessonId,
      title: "Zoom Masterclass: System Resiliency",
      scheduledAt: validFutureDate,
      duration: 90,
      platform: "ZOOM",
    },
    teacher1Id
  );

  if (!zoomSession.id || zoomSession.platform !== "ZOOM") {
    throw new Error("❌ Invalid Zoom session created");
  }
  if (!zoomSession.joinUrl?.startsWith("https://zoom.us/j/")) {
    throw new Error(`❌ Zoom joinUrl format invalid: ${zoomSession.joinUrl}`);
  }
  if (!zoomSession.hostUrl?.includes("https://zoom.us/s/")) {
    throw new Error(`❌ Zoom hostUrl format invalid: ${zoomSession.hostUrl}`);
  }
  if (zoomSession.status !== "SCHEDULED") {
    throw new Error(`❌ Expected status to be SCHEDULED, got: ${zoomSession.status}`);
  }

  // Verify DB record
  const dbZoomSession = await db.query.liveSessions.findFirst({
    where: eq(liveSessions.id, zoomSession.id),
  });
  if (!dbZoomSession) {
    throw new Error("❌ Zoom session record not found in Turso database");
  }

  // Verify lesson type was updated to LIVE_SESSION
  const dbLesson = await db.query.lessons.findFirst({
    where: eq(lessons.id, lessonId),
  });
  if (dbLesson?.type !== "LIVE_SESSION") {
    throw new Error(`❌ Expected linked lesson type to be LIVE_SESSION, got: ${dbLesson?.type}`);
  }
  console.log("   ✅ Zoom session provisioned with join/host URLs, stored in DB, and lesson linked");

  // 6. Test Successful Google Meet Session Creation
  console.log("6️⃣ Testing Google Meet live session provisioning...");
  await liveOAuthService.saveGoogleTokens(teacher1Id, {
    accessToken: `mock_google_token_${runId}`,
    refreshToken: `mock_google_ref_${runId}`,
    expiresIn: 3600,
  });

  const googleSession = await liveSessionService.createSession(
    {
      courseId,
      title: "Google Meet Interactive Workshop",
      scheduledAt: validFutureDate,
      duration: 45,
      platform: "GOOGLE_MEET",
    },
    teacher1Id
  );

  if (!googleSession.id || googleSession.platform !== "GOOGLE_MEET") {
    throw new Error("❌ Invalid Google Meet session created");
  }
  if (!googleSession.joinUrl?.includes("meet.google.com")) {
    throw new Error(`❌ Google Meet joinUrl invalid: ${googleSession.joinUrl}`);
  }
  if (googleSession.joinUrl !== googleSession.hostUrl) {
    throw new Error("❌ Google Meet should use the same URL for joinUrl and hostUrl");
  }

  const dbGoogleSession = await db.query.liveSessions.findFirst({
    where: eq(liveSessions.id, googleSession.id),
  });
  if (!dbGoogleSession) {
    throw new Error("❌ Google Meet session record not found in Turso database");
  }
  console.log("   ✅ Google Meet session provisioned with meet.google.com URL and stored in DB");

  // 7. Cleanup
  console.log("\n🧹 Cleaning up test records...");
  await db.delete(liveSessions).where(eq(liveSessions.courseId, courseId));
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  await db.delete(modules).where(eq(modules.id, moduleId));
  await db.delete(courses).where(eq(courses.id, courseId));
  await db.delete(users).where(eq(users.id, teacher1Id));
  await db.delete(users).where(eq(users.id, teacher2Id));

  console.log("\n🎉 ALL Slice 6.2 Teacher Live Session Scheduling Tests PASSED Successfully!\n");
}

runLiveSessionServiceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
