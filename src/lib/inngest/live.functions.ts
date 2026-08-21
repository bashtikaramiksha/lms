import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db/client";
import { liveSessions, enrollments, users, courses } from "@/lib/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";
import { notificationService } from "@/lib/services/notification.service";
import {
  generateSessionReminderHtml,
  generateSessionCancelledHtml,
  generateRecordingAvailableHtml,
} from "@/lib/emails/live-session-emails";

/**
 * Triggered when a new live session is scheduled.
 * Schedules 24h and 1h reminders for all actively enrolled students.
 */
export const scheduleSessionReminders = inngest.createFunction(
  { id: "live-schedule-reminders", name: "Schedule Live Session Reminders" },
  { event: "live/session-created" },
  async ({ event, step }) => {
    const { sessionId, teacherId, courseId } = event.data;

    // 1. Fetch Session & Course Details
    const session = await step.run("fetch-session-and-course", async () => {
      return db.query.liveSessions.findFirst({
        where: eq(liveSessions.id, sessionId),
        with: {
          course: true,
        },
      });
    });

    if (!session || session.status === "CANCELLED" || session.status === "ENDED") {
      return { skipped: true, reason: "Session not found or not in scheduled state" };
    }

    // 2. Fetch all actively enrolled students
    const students = await step.run("fetch-enrolled-students", async () => {
      return db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.userId, users.id))
        .where(
          and(
            eq(enrollments.courseId, session.courseId),
            eq(enrollments.status, "ACTIVE")
          )
        );
    });

    if (!students || students.length === 0) {
      return { skipped: true, reason: "No enrolled students found for course" };
    }

    const sessionTime = new Date(session.scheduledAt).getTime();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const sessionHubUrl = `${siteUrl}/live-sessions`;

    // 3. 24-Hour Reminder
    const reminder24hTime = sessionTime - 24 * 60 * 60 * 1000;
    if (reminder24hTime > Date.now()) {
      await step.sleepUntil("wait-for-24h-reminder", new Date(reminder24hTime));

      await step.run("send-24h-reminders", async () => {
        // Verify session is still active
        const freshSession = await db.query.liveSessions.findFirst({
          where: eq(liveSessions.id, sessionId),
        });
        if (!freshSession || freshSession.status !== "SCHEDULED") return;

        for (const student of students) {
          const emailHtml = generateSessionReminderHtml({
            studentName: student.fullName || "Student",
            courseTitle: session.course?.title || "Live Course",
            sessionTitle: session.title,
            scheduledAt: session.scheduledAt,
            duration: session.duration,
            platform: session.platform as "ZOOM" | "GOOGLE_MEET",
            sessionUrl: sessionHubUrl,
            timeRemaining: "24 hours",
          });

          await sendEmail({
            to: student.email,
            subject: `Reminder: "${session.title}" starts in 24 hours!`,
            html: emailHtml,
          });

          await notificationService.createNotification({
            userId: student.id,
            type: "SESSION_REMINDER",
            title: "Live Class Tomorrow",
            body: `"${session.title}" starts tomorrow at ${new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
            actionUrl: "/live-sessions",
          });
        }
      });
    }

    // 4. 1-Hour Reminder
    const reminder1hTime = sessionTime - 60 * 60 * 1000;
    if (reminder1hTime > Date.now()) {
      await step.sleepUntil("wait-for-1h-reminder", new Date(reminder1hTime));

      await step.run("send-1h-reminders", async () => {
        const freshSession = await db.query.liveSessions.findFirst({
          where: eq(liveSessions.id, sessionId),
        });
        if (!freshSession || freshSession.status !== "SCHEDULED") return;

        for (const student of students) {
          const emailHtml = generateSessionReminderHtml({
            studentName: student.fullName || "Student",
            courseTitle: session.course?.title || "Live Course",
            sessionTitle: session.title,
            scheduledAt: session.scheduledAt,
            duration: session.duration,
            platform: session.platform as "ZOOM" | "GOOGLE_MEET",
            sessionUrl: sessionHubUrl,
            timeRemaining: "1 hour",
          });

          await sendEmail({
            to: student.email,
            subject: `Class starting soon: "${session.title}" in 1 hour!`,
            html: emailHtml,
          });

          await notificationService.createNotification({
            userId: student.id,
            type: "SESSION_REMINDER",
            title: "Live Class in 1 Hour!",
            body: `"${session.title}" starts in 1 hour. Get ready to join!`,
            actionUrl: "/live-sessions",
          });
        }
      });
    }

    return { success: true, notifiedCount: students.length };
  }
);

/**
 * Triggered when a live session is cancelled.
 * Dispatches cancellation emails and in-app alerts to enrolled students.
 */
export const sendCancellationNotifications = inngest.createFunction(
  { id: "live-send-cancellation", name: "Send Live Session Cancellation Notifications" },
  { event: "live/session-cancelled" },
  async ({ event, step }) => {
    const { sessionId } = event.data;

    const session = await step.run("fetch-cancelled-session", async () => {
      return db.query.liveSessions.findFirst({
        where: eq(liveSessions.id, sessionId),
        with: {
          course: true,
        },
      });
    });

    if (!session) return { skipped: true, reason: "Session not found" };

    const students = await step.run("fetch-enrolled-students", async () => {
      return db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.userId, users.id))
        .where(
          and(
            eq(enrollments.courseId, session.courseId),
            eq(enrollments.status, "ACTIVE")
          )
        );
    });

    await step.run("send-cancellation-alerts", async () => {
      for (const student of students) {
        const emailHtml = generateSessionCancelledHtml({
          studentName: student.fullName || "Student",
          courseTitle: session.course?.title || "Live Course",
          sessionTitle: session.title,
          scheduledAt: session.scheduledAt,
        });

        await sendEmail({
          to: student.email,
          subject: `Cancelled: "${session.title}"`,
          html: emailHtml,
        });

        await notificationService.createNotification({
          userId: student.id,
          type: "SESSION_CANCELLED",
          title: "Class Cancelled",
          body: `"${session.title}" scheduled for ${new Date(session.scheduledAt).toLocaleDateString()} has been cancelled.`,
          actionUrl: "/live-sessions",
        });
      }
    });

    return { success: true, cancelledSessionId: sessionId, notifiedCount: students.length };
  }
);

/**
 * Triggered when a teacher adds or updates a recording replay URL.
 * Dispatches replay available emails and in-app alerts to enrolled students.
 */
export const sendRecordingAvailableNotifications = inngest.createFunction(
  { id: "live-recording-available", name: "Send Live Recording Available Notifications" },
  { event: "live/recording-added" },
  async ({ event, step }) => {
    const { sessionId } = event.data;

    const session = await step.run("fetch-session-details", async () => {
      return db.query.liveSessions.findFirst({
        where: eq(liveSessions.id, sessionId),
        with: {
          course: true,
        },
      });
    });

    if (!session || !session.recordingUrl) {
      return { skipped: true, reason: "Session or recordingUrl not found" };
    }

    const students = await step.run("fetch-enrolled-students", async () => {
      return db
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
        })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.userId, users.id))
        .where(
          and(
            eq(enrollments.courseId, session.courseId),
            eq(enrollments.status, "ACTIVE")
          )
        );
    });

    await step.run("send-recording-alerts", async () => {
      for (const student of students) {
        const emailHtml = generateRecordingAvailableHtml({
          studentName: student.fullName || "Student",
          courseTitle: session.course?.title || "Live Course",
          sessionTitle: session.title,
          recordingUrl: session.recordingUrl!,
        });

        await sendEmail({
          to: student.email,
          subject: `Replay Ready: "${session.title}"`,
          html: emailHtml,
        });

        await notificationService.createNotification({
          userId: student.id,
          type: "RECORDING_AVAILABLE",
          title: "Class Recording Available",
          body: `The recording for "${session.title}" is now available to watch.`,
          actionUrl: "/live-sessions",
        });
      }
    });

    return { success: true, sessionId, notifiedCount: students.length };
  }
);

/**
 * Cron: Runs every minute — marks SCHEDULED sessions within [-5m, +30m] as LIVE.
 */
export const markSessionsLive = inngest.createFunction(
  { id: "live-mark-sessions-live", name: "Mark Due Sessions as LIVE", concurrency: 1 },
  { cron: "* * * * *" },
  async ({ step }) => {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString(); // -5 min
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // +30 min

    const dueSessions = await step.run("find-due-sessions", async () => {
      return db
        .select({ id: liveSessions.id })
        .from(liveSessions)
        .where(
          and(
            eq(liveSessions.status, "SCHEDULED"),
            gte(liveSessions.scheduledAt, windowStart),
            lte(liveSessions.scheduledAt, windowEnd)
          )
        );
    });

    if (dueSessions.length > 0) {
      await step.run("mark-live", async () => {
        const ids = dueSessions.map((s) => s.id);
        await db
          .update(liveSessions)
          .set({ status: "LIVE", updatedAt: new Date().toISOString() })
          .where(inArray(liveSessions.id, ids));
      });
    }

    return { markedLive: dueSessions.length };
  }
);

/**
 * Cron: Runs every 5 minutes — marks LIVE sessions as ENDED after scheduled duration + 30m buffer.
 */
export const markSessionsEnded = inngest.createFunction(
  { id: "live-mark-sessions-ended", name: "Mark Expired Sessions as ENDED", concurrency: 1 },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const now = new Date();

    const expiredSessions = await step.run("find-expired-sessions", async () => {
      const activeSessions = await db
        .select({
          id: liveSessions.id,
          scheduledAt: liveSessions.scheduledAt,
          duration: liveSessions.duration,
        })
        .from(liveSessions)
        .where(eq(liveSessions.status, "LIVE"));

      return activeSessions.filter((s) => {
        const scheduledTime = new Date(s.scheduledAt).getTime();
        const endBufferTime = scheduledTime + (s.duration + 30) * 60 * 1000;
        return endBufferTime <= now.getTime();
      });
    });

    if (expiredSessions.length > 0) {
      await step.run("mark-ended", async () => {
        const ids = expiredSessions.map((s) => s.id);
        await db
          .update(liveSessions)
          .set({ status: "ENDED", updatedAt: new Date().toISOString() })
          .where(inArray(liveSessions.id, ids));
      });
    }

    return { markedEnded: expiredSessions.length };
  }
);
