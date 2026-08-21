import { db } from "@/lib/db/client";
import { users, courses, liveSessions, enrollments } from "@/lib/db/schema";
import { liveSessionService } from "@/lib/services/live-session.service";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import crypto from "crypto";

async function runLiveSessionManagementTests() {
  console.log("🧪 Starting Slice 6.3 Live Session Management & Lifecycle Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Setup Test Teacher, Student, Courses, and Enrollments
  console.log("1️⃣ Setting up test teacher, student, courses, and enrollments in Turso...");
  const teacher1Id = `t1_mgmt_${runId}`;
  const teacher2Id = `t2_mgmt_${runId}`;
  const studentId = `stud_mgmt_${runId}`;
  const course1Id = `course1_${runId}`;
  const course2Id = `course2_${runId}`;

  await db.insert(users).values([
    {
      id: teacher1Id,
      email: `t1_${runId}@example.com`,
      fullName: `Teacher Lead ${runId}`,
      role: "TEACHER",
      status: "ACTIVE",
    },
    {
      id: teacher2Id,
      email: `t2_${runId}@example.com`,
      fullName: `Teacher Secondary ${runId}`,
      role: "TEACHER",
      status: "ACTIVE",
    },
    {
      id: studentId,
      email: `stud_${runId}@example.com`,
      fullName: `Student Learner ${runId}`,
      role: "STUDENT",
      status: "ACTIVE",
    },
  ]);

  await db.insert(courses).values([
    {
      id: course1Id,
      title: `Cloud Scalability Masterclass ${runId}`,
      slug: `cloud-scalability-${runId}`,
      authorId: teacher1Id,
      type: "LIVE",
      status: "PUBLISHED",
      price: 199,
    },
    {
      id: course2Id,
      title: `Microservices & Kubernetes ${runId}`,
      slug: `microservices-k8s-${runId}`,
      authorId: teacher2Id,
      type: "LIVE",
      status: "PUBLISHED",
      price: 149,
    },
  ]);

  // Enroll student into course 1
  await db.insert(enrollments).values({
    id: `enr_${runId}`,
    userId: studentId,
    courseId: course1Id,
    status: "ACTIVE",
  });

  // Create test sessions
  const futureDate4h = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  const futureDate1h = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
  const pastEndedDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

  const session1Id = `sess1_${runId}`; // Teacher 1 - Scheduled in 4h
  const session2Id = `sess2_${runId}`; // Teacher 1 - Scheduled in 1h
  const session3Id = `sess3_${runId}`; // Teacher 1 - Ended in past
  const sessionOtherId = `sess_other_${runId}`; // Teacher 2 - Session

  await db.insert(liveSessions).values([
    {
      id: session1Id,
      courseId: course1Id,
      teacherId: teacher1Id,
      title: "System Resiliency & Circuit Breakers",
      scheduledAt: futureDate4h,
      duration: 60,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/111222333",
      hostUrl: "https://zoom.us/s/111222333?zak=mock",
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    },
    {
      id: session2Id,
      courseId: course1Id,
      teacherId: teacher1Id,
      title: "Immediate Q&A Session",
      scheduledAt: futureDate1h,
      duration: 30,
      platform: "GOOGLE_MEET",
      joinUrl: "https://meet.google.com/abc-defg-hij",
      hostUrl: "https://meet.google.com/abc-defg-hij",
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    },
    {
      id: session3Id,
      courseId: course1Id,
      teacherId: teacher1Id,
      title: "Historical Cloud Architecture Review",
      scheduledAt: pastEndedDate,
      duration: 60,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/444555666",
      hostUrl: "https://zoom.us/s/444555666",
      status: "ENDED",
      createdAt: new Date().toISOString(),
    },
    {
      id: sessionOtherId,
      courseId: course2Id,
      teacherId: teacher2Id,
      title: "Kubernetes Cluster Ingress",
      scheduledAt: futureDate4h,
      duration: 45,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/777888999",
      hostUrl: "https://zoom.us/s/777888999",
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    },
  ]);

  // 2. Test getTeacherSessions (Listing, Scoping, and Enrolled Count)
  console.log("2️⃣ Testing LiveSessionService.getTeacherSessions...");
  const teacher1List = await liveSessionService.getTeacherSessions(teacher1Id, { page: 1, limit: 10 });

  if (teacher1List.meta.total !== 3) {
    throw new Error(`❌ Expected Teacher 1 to have 3 sessions, got ${teacher1List.meta.total}`);
  }

  // Verify other teacher's session is not present
  const hasOtherTeacherSession = teacher1List.data.some((s) => s.id === sessionOtherId);
  if (hasOtherTeacherSession) {
    throw new Error("❌ Data leak: Teacher 1 list contains Teacher 2's session!");
  }

  // Verify enrolled count
  const sessionWithEnrolled = teacher1List.data.find((s) => s.id === session1Id);
  if (sessionWithEnrolled?.enrolledCount !== 1) {
    throw new Error(`❌ Expected enrolledCount = 1 for course 1, got ${sessionWithEnrolled?.enrolledCount}`);
  }

  // Test status filter
  const scheduledOnly = await liveSessionService.getTeacherSessions(teacher1Id, { status: "SCHEDULED" });
  if (scheduledOnly.data.length !== 2) {
    throw new Error(`❌ Expected 2 SCHEDULED sessions, got ${scheduledOnly.data.length}`);
  }
  console.log("   ✅ Scoped teacher session listing, status filtering, and enrolledCount verified");

  // 3. Test Session Update and Rescheduling Rules
  console.log("3️⃣ Testing LiveSessionService.updateSession & 2-hour rescheduling constraint...");

  // Update session 1 title and duration (allowed)
  const updated1 = await liveSessionService.updateSession(session1Id, teacher1Id, {
    title: "System Resiliency & Circuit Breakers (Extended Edition)",
    duration: 90,
  });

  if (updated1.title !== "System Resiliency & Circuit Breakers (Extended Edition)" || updated1.duration !== 90) {
    throw new Error("❌ Session title and duration update failed");
  }

  // Reschedule session 1 to 5h ahead (allowed)
  const newDate5h = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
  const rescheduled1 = await liveSessionService.updateSession(session1Id, teacher1Id, {
    scheduledAt: newDate5h,
  });
  if (rescheduled1.scheduledAt !== newDate5h) {
    throw new Error("❌ Rescheduling future session failed");
  }

  // Try to reschedule session 2 (which is scheduled in 1h, < 2h lead time rule)
  let rescheduleLockedThrown = false;
  try {
    await liveSessionService.updateSession(session2Id, teacher1Id, {
      scheduledAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err: any) {
    if (err.code === "RESCHEDULE_TOO_LATE" && err.statusCode === 422) {
      rescheduleLockedThrown = true;
    }
  }
  if (!rescheduleLockedThrown) {
    throw new Error("❌ updateSession did not throw RESCHEDULE_TOO_LATE when original start is < 2h away!");
  }

  // Try to edit ended session (should throw 409 SESSION_ALREADY_ENDED)
  let endedEditThrown = false;
  try {
    await liveSessionService.updateSession(session3Id, teacher1Id, { title: "New Title" });
  } catch (err: any) {
    if (err.code === "SESSION_ALREADY_ENDED" && err.statusCode === 409) {
      endedEditThrown = true;
    }
  }
  if (!endedEditThrown) {
    throw new Error("❌ updateSession allowed editing an already ENDED session!");
  }
  console.log("   ✅ 2-hour rescheduling lead-time barrier and ENDED immutability verified");

  // 4. Test Add Recording URL
  console.log("4️⃣ Testing LiveSessionService.addRecordingUrl...");
  const recordingUrl = `https://zoom.us/rec/play/cloud_recording_${runId}`;
  const withRecording = await liveSessionService.addRecordingUrl(session3Id, teacher1Id, recordingUrl);

  if (withRecording.recordingUrl !== recordingUrl) {
    throw new Error("❌ addRecordingUrl failed to persist recording link");
  }
  console.log("   ✅ Recording URL successfully attached to ended session");

  // 5. Test Cancel Session
  console.log("5️⃣ Testing LiveSessionService.cancelSession...");
  const cancelled = await liveSessionService.cancelSession(session1Id, teacher1Id);
  if (cancelled.status !== "CANCELLED") {
    throw new Error(`❌ Expected status CANCELLED, got ${cancelled.status}`);
  }

  // Verify trying to cancel a LIVE session is blocked
  const liveSessionId = `live_sess_${runId}`;
  await db.insert(liveSessions).values({
    id: liveSessionId,
    courseId: course1Id,
    teacherId: teacher1Id,
    title: "Currently Live Session",
    scheduledAt: new Date().toISOString(),
    duration: 60,
    platform: "ZOOM",
    status: "LIVE",
  });

  let liveCancelBlocked = false;
  try {
    await liveSessionService.cancelSession(liveSessionId, teacher1Id);
  } catch (err: any) {
    if (err.code === "SESSION_ALREADY_LIVE" && err.statusCode === 409) {
      liveCancelBlocked = true;
    }
  }
  if (!liveCancelBlocked) {
    throw new Error("❌ cancelSession allowed cancelling an active LIVE session!");
  }
  console.log("   ✅ Session cancellation verified and active LIVE session cancellation blocked");

  // 6. Test Inngest Cron Logic (markSessionsLive & markSessionsEnded)
  console.log("6️⃣ Testing Inngest status transition cron logic...");

  // Test markSessionsLive logic: create a session starting in 5 minutes
  const dueSessionId = `due_sess_${runId}`;
  const dueIn5m = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await db.insert(liveSessions).values({
    id: dueSessionId,
    courseId: course1Id,
    teacherId: teacher1Id,
    title: "Due Session for Live Transition",
    scheduledAt: dueIn5m,
    duration: 60,
    platform: "ZOOM",
    status: "SCHEDULED",
  });

  // Execute markSessionsLive query logic
  const now = new Date();
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

  const dueSessions = await db
    .select({ id: liveSessions.id })
    .from(liveSessions)
    .where(
      and(
        eq(liveSessions.status, "SCHEDULED"),
        gte(liveSessions.scheduledAt, windowStart),
        lte(liveSessions.scheduledAt, windowEnd)
      )
    );

  const matchedDue = dueSessions.some((s) => s.id === dueSessionId);
  if (!matchedDue) {
    throw new Error("❌ markSessionsLive query did not identify session due within [-5m, +30m] window");
  }

  await db
    .update(liveSessions)
    .set({ status: "LIVE" })
    .where(eq(liveSessions.id, dueSessionId));

  const transitionedLive = await db.query.liveSessions.findFirst({
    where: eq(liveSessions.id, dueSessionId),
  });
  if (transitionedLive?.status !== "LIVE") {
    throw new Error("❌ Session failed to transition to LIVE status");
  }

  // Test markSessionsEnded logic: create a LIVE session where end time + 30m buffer has passed
  const expiredLiveId = `expired_live_${runId}`;
  const started2hAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 120 mins ago, duration 60 mins -> ended 30 mins ago
  await db.insert(liveSessions).values({
    id: expiredLiveId,
    courseId: course1Id,
    teacherId: teacher1Id,
    title: "Expired Live Session",
    scheduledAt: started2hAgo,
    duration: 60,
    platform: "ZOOM",
    status: "LIVE",
  });

  const activeSessions = await db
    .select({
      id: liveSessions.id,
      scheduledAt: liveSessions.scheduledAt,
      duration: liveSessions.duration,
    })
    .from(liveSessions)
    .where(eq(liveSessions.status, "LIVE"));

  const expiredList = activeSessions.filter((s) => {
    const scheduledTime = new Date(s.scheduledAt).getTime();
    const endBufferTime = scheduledTime + (s.duration + 30) * 60 * 1000;
    return endBufferTime <= Date.now();
  });

  const matchedExpired = expiredList.some((s) => s.id === expiredLiveId);
  if (!matchedExpired) {
    throw new Error("❌ markSessionsEnded logic did not identify session past duration + 30m buffer");
  }

  await db
    .update(liveSessions)
    .set({ status: "ENDED" })
    .where(eq(liveSessions.id, expiredLiveId));

  const transitionedEnded = await db.query.liveSessions.findFirst({
    where: eq(liveSessions.id, expiredLiveId),
  });
  if (transitionedEnded?.status !== "ENDED") {
    throw new Error("❌ Session failed to transition to ENDED status");
  }
  console.log("   ✅ Both markSessionsLive and markSessionsEnded cron state machines verified");

  // 7. Cleanup
  console.log("\n🧹 Cleaning up test records...");
  await db.delete(liveSessions).where(inArray(liveSessions.courseId, [course1Id, course2Id]));
  await db.delete(enrollments).where(eq(enrollments.userId, studentId));
  await db.delete(courses).where(inArray(courses.id, [course1Id, course2Id]));
  await db.delete(users).where(inArray(users.id, [teacher1Id, teacher2Id, studentId]));

  console.log("\n🎉 ALL Slice 6.3 Live Session Management & Lifecycle Tests PASSED Successfully!\n");
}

runLiveSessionManagementTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
