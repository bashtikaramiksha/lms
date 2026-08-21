import { db } from "@/lib/db/client";
import { users, courses, liveSessions, enrollments } from "@/lib/db/schema";
import { liveSessionService } from "@/lib/services/live-session.service";
import { eq, inArray } from "drizzle-orm";

async function runStudentJoinTests() {
  console.log("🧪 Starting Slice 6.4 Student Join Flow & Live Session Access Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Setup Test Users, Courses, and Enrollments
  console.log("1️⃣ Setting up test instructor, enrolled student, non-enrolled student, and courses in Turso...");
  const teacherId = `teacher_join_${runId}`;
  const enrolledStudentId = `enrolled_stud_${runId}`;
  const nonEnrolledStudentId = `non_enrolled_stud_${runId}`;
  const course1Id = `course1_join_${runId}`;
  const course2Id = `course2_join_${runId}`;

  await db.insert(users).values([
    {
      id: teacherId,
      email: `teacher_join_${runId}@example.com`,
      fullName: `Instructor Live ${runId}`,
      role: "TEACHER",
      status: "ACTIVE",
    },
    {
      id: enrolledStudentId,
      email: `enrolled_${runId}@example.com`,
      fullName: `Enrolled Learner ${runId}`,
      role: "STUDENT",
      status: "ACTIVE",
    },
    {
      id: nonEnrolledStudentId,
      email: `nonenrolled_${runId}@example.com`,
      fullName: `Visitor Learner ${runId}`,
      role: "STUDENT",
      status: "ACTIVE",
    },
  ]);

  await db.insert(courses).values([
    {
      id: course1Id,
      title: `Distributed Systems in Production ${runId}`,
      slug: `distributed-systems-${runId}`,
      authorId: teacherId,
      type: "LIVE",
      status: "PUBLISHED",
      price: 199,
    },
    {
      id: course2Id,
      title: `Advanced Database Internals ${runId}`,
      slug: `db-internals-${runId}`,
      authorId: teacherId,
      type: "LIVE",
      status: "PUBLISHED",
      price: 149,
    },
  ]);

  // Enrolled student is ONLY enrolled in course 1
  await db.insert(enrollments).values({
    id: `enr_join_${runId}`,
    userId: enrolledStudentId,
    courseId: course1Id,
    status: "ACTIVE",
  });

  // Create test sessions with different time windows:
  // a) sessionFarFuture: starts in 3 hours (outside join window)
  const sessionFarFutureId = `sess_far_${runId}`;
  const farFutureDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

  // b) sessionInWindow: starts in 5 minutes (within 15m join window)
  const sessionInWindowId = `sess_win_${runId}`;
  const inWindowDate = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // c) sessionLive: currently LIVE
  const sessionLiveId = `sess_live_${runId}`;
  const liveDate = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // started 10m ago

  // d) sessionEnded: completed 2 hours ago with recording
  const sessionEndedId = `sess_ended_${runId}`;
  const endedDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  // e) sessionCancelled: cancelled
  const sessionCancelledId = `sess_canc_${runId}`;

  // f) sessionUnenrolledCourse: session for course 2
  const sessionCourse2Id = `sess_c2_${runId}`;

  await db.insert(liveSessions).values([
    {
      id: sessionFarFutureId,
      courseId: course1Id,
      teacherId,
      title: "Consensus Protocols (Raft & Paxos)",
      scheduledAt: farFutureDate,
      duration: 60,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/111111111",
      hostUrl: "https://zoom.us/s/111111111?zak=test",
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    },
    {
      id: sessionInWindowId,
      courseId: course1Id,
      teacherId,
      title: "Event Sourcing Architecture — Live Q&A",
      scheduledAt: inWindowDate,
      duration: 45,
      platform: "GOOGLE_MEET",
      joinUrl: "https://meet.google.com/abc-defg-hij",
      hostUrl: "https://meet.google.com/abc-defg-hij",
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    },
    {
      id: sessionLiveId,
      courseId: course1Id,
      teacherId,
      title: "Live Debugging Microservices",
      scheduledAt: liveDate,
      duration: 60,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/222222222",
      hostUrl: "https://zoom.us/s/222222222?zak=test",
      status: "LIVE",
      createdAt: new Date().toISOString(),
    },
    {
      id: sessionEndedId,
      courseId: course1Id,
      teacherId,
      title: "Foundations of CAP Theorem",
      scheduledAt: endedDate,
      duration: 60,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/333333333",
      hostUrl: "https://zoom.us/s/333333333",
      recordingUrl: "https://zoom.us/rec/play/cap-theorem-recording",
      status: "ENDED",
      createdAt: new Date().toISOString(),
    },
    {
      id: sessionCancelledId,
      courseId: course1Id,
      teacherId,
      title: "Cancelled Masterclass",
      scheduledAt: farFutureDate,
      duration: 60,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/444444444",
      status: "CANCELLED",
      createdAt: new Date().toISOString(),
    },
    {
      id: sessionCourse2Id,
      courseId: course2Id,
      teacherId,
      title: "B-Tree vs LSM-Tree Storage Engines",
      scheduledAt: inWindowDate,
      duration: 60,
      platform: "ZOOM",
      joinUrl: "https://zoom.us/j/555555555",
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    },
  ]);

  // 2. Test getStudentUpcomingSessions (Enrolled Filtering & URL Omission)
  console.log("2️⃣ Testing LiveSessionService.getStudentUpcomingSessions...");
  const studentSessions = await liveSessionService.getStudentUpcomingSessions(enrolledStudentId);

  // Should contain sessionFarFuture, sessionInWindow, sessionLive (3 sessions from course 1)
  if (studentSessions.length !== 3) {
    throw new Error(`❌ Expected 3 upcoming sessions for enrolled student, got ${studentSessions.length}`);
  }

  // Verify that sessionCourse2Id is NOT in the list
  const hasCourse2Session = studentSessions.some((s) => s.id === sessionCourse2Id);
  if (hasCourse2Session) {
    throw new Error("❌ Data isolation error: Student sees sessions for non-enrolled courses!");
  }

  // Verify CANCELLED and ENDED sessions are excluded
  const hasCancelledOrEnded = studentSessions.some(
    (s) => s.id === sessionCancelledId || s.id === sessionEndedId
  );
  if (hasCancelledOrEnded) {
    throw new Error("❌ Upcoming list includes CANCELLED or ENDED sessions!");
  }

  // Verify joinUrl is strictly omitted from listing
  for (const s of studentSessions) {
    if ((s as any).joinUrl || (s as any).hostUrl) {
      throw new Error("❌ Security violation: joinUrl or hostUrl exposed in upcoming sessions list!");
    }
  }

  // Verify canJoin flag calculation
  const winSession = studentSessions.find((s) => s.id === sessionInWindowId);
  if (!winSession?.canJoin) {
    throw new Error("❌ Expected canJoin = true for session starting in 5 minutes");
  }

  const farSession = studentSessions.find((s) => s.id === sessionFarFutureId);
  if (farSession?.canJoin) {
    throw new Error("❌ Expected canJoin = false for session starting in 3 hours");
  }

  console.log("   ✅ Enrolled course scoping, exclusion of past/cancelled sessions, and joinUrl omission verified");

  // 3. Test getJoinUrl — Enrollment and Security Checks
  console.log("3️⃣ Testing LiveSessionService.getJoinUrl access control...");

  // Test non-enrolled student access (should throw NOT_ENROLLED 403)
  let notEnrolledThrown = false;
  try {
    await liveSessionService.getJoinUrl(sessionInWindowId, nonEnrolledStudentId);
  } catch (err: any) {
    if (err.code === "NOT_ENROLLED" && err.statusCode === 403) {
      notEnrolledThrown = true;
    }
  }
  if (!notEnrolledThrown) {
    throw new Error("❌ Non-enrolled student was allowed to request join URL!");
  }

  // Test early join request (> 15 min before start) (should throw JOIN_WINDOW_NOT_OPEN 422)
  let windowNotOpenThrown = false;
  try {
    await liveSessionService.getJoinUrl(sessionFarFutureId, enrolledStudentId);
  } catch (err: any) {
    if (err.code === "JOIN_WINDOW_NOT_OPEN" && err.statusCode === 422) {
      windowNotOpenThrown = true;
    }
  }
  if (!windowNotOpenThrown) {
    throw new Error("❌ Student was allowed to join before classroom window opened!");
  }

  // Test cancelled session join request (should throw SESSION_NOT_FOUND 404)
  let cancelledThrown = false;
  try {
    await liveSessionService.getJoinUrl(sessionCancelledId, enrolledStudentId);
  } catch (err: any) {
    if (err.code === "SESSION_NOT_FOUND" && err.statusCode === 404) {
      cancelledThrown = true;
    }
  }
  if (!cancelledThrown) {
    throw new Error("❌ Cancelled session join did not throw SESSION_NOT_FOUND!");
  }

  // Test valid join request within window (should succeed with joinUrl)
  const joinResult = await liveSessionService.getJoinUrl(sessionInWindowId, enrolledStudentId);
  if (joinResult.joinUrl !== "https://meet.google.com/abc-defg-hij" || joinResult.platform !== "GOOGLE_MEET") {
    throw new Error(`❌ Unexpected join result: ${JSON.stringify(joinResult)}`);
  }

  // Test valid join request on LIVE session
  const liveJoinResult = await liveSessionService.getJoinUrl(sessionLiveId, enrolledStudentId);
  if (liveJoinResult.joinUrl !== "https://zoom.us/j/222222222" || liveJoinResult.platform !== "ZOOM") {
    throw new Error(`❌ Unexpected live session join result: ${JSON.stringify(liveJoinResult)}`);
  }

  // Test ended session join request (should throw SESSION_ENDED 410)
  let endedThrown = false;
  try {
    await liveSessionService.getJoinUrl(sessionEndedId, enrolledStudentId);
  } catch (err: any) {
    if (err.code === "SESSION_ENDED" && err.statusCode === 410) {
      endedThrown = true;
    }
  }
  if (!endedThrown) {
    throw new Error("❌ Ended session join did not throw SESSION_ENDED!");
  }

  console.log("   ✅ All access control barriers verified (403 NOT_ENROLLED, 422 JOIN_WINDOW_NOT_OPEN, 410 SESSION_ENDED, 404 CANCELLED, 200 SUCCESS)");

  // 4. Test getStudentPastSessions (Recordings)
  console.log("4️⃣ Testing LiveSessionService.getStudentPastSessions...");
  const pastList = await liveSessionService.getStudentPastSessions(enrolledStudentId);

  if (pastList.length !== 1 || pastList[0].id !== sessionEndedId) {
    throw new Error(`❌ Expected 1 past session with recording, got ${pastList.length}`);
  }

  if (pastList[0].recordingUrl !== "https://zoom.us/rec/play/cap-theorem-recording") {
    throw new Error("❌ Recording URL mismatch on past session");
  }

  console.log("   ✅ Past session listing with cloud recording replay verified");

  // 5. Cleanup
  console.log("\n🧹 Cleaning up test records...");
  await db.delete(liveSessions).where(inArray(liveSessions.courseId, [course1Id, course2Id]));
  await db.delete(enrollments).where(eq(enrollments.userId, enrolledStudentId));
  await db.delete(courses).where(inArray(courses.id, [course1Id, course2Id]));
  await db.delete(users).where(inArray(users.id, [teacherId, enrolledStudentId, nonEnrolledStudentId]));

  console.log("\n🎉 ALL Slice 6.4 Student Join Flow & Live Session Access Tests PASSED Successfully!\n");
}

runStudentJoinTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
