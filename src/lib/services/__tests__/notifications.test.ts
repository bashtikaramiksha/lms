import { db } from "@/lib/db/client";
import { users, notifications } from "@/lib/db/schema";
import { notificationService } from "@/lib/services/notification.service";
import { eq, inArray } from "drizzle-orm";
import {
  generateSessionReminderHtml,
  generateSessionCancelledHtml,
  generateRecordingAvailableHtml,
} from "@/lib/emails/live-session-emails";

async function runNotificationTests() {
  console.log("🧪 Starting Slice 6.5 Email & In-App Reminders Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Setup Test Users
  console.log("1️⃣ Setting up test users in Turso DB...");
  const user1Id = `user1_notif_${runId}`;
  const user2Id = `user2_notif_${runId}`;

  await db.insert(users).values([
    {
      id: user1Id,
      email: `user1_${runId}@example.com`,
      fullName: `Learner One ${runId}`,
      role: "STUDENT",
      status: "ACTIVE",
    },
    {
      id: user2Id,
      email: `user2_${runId}@example.com`,
      fullName: `Learner Two ${runId}`,
      role: "STUDENT",
      status: "ACTIVE",
    },
  ]);

  // 2. Test Notification Creation
  console.log("2️⃣ Testing NotificationService.createNotification...");
  const notif1 = await notificationService.createNotification({
    userId: user1Id,
    type: "SESSION_REMINDER",
    title: "Class Tomorrow!",
    body: "Distributed Systems starts in 24 hours.",
    actionUrl: "/live-sessions",
  });

  const notif2 = await notificationService.createNotification({
    userId: user1Id,
    type: "SESSION_REMINDER",
    title: "Class in 1 Hour!",
    body: "Distributed Systems starts soon.",
    actionUrl: "/live-sessions",
  });

  const notifUser2 = await notificationService.createNotification({
    userId: user2Id,
    type: "SESSION_CANCELLED",
    title: "Class Cancelled",
    body: "Database Internals was cancelled.",
    actionUrl: "/live-sessions",
  });

  if (!notif1.id || notif1.isRead !== false || notif1.type !== "SESSION_REMINDER") {
    throw new Error("❌ Notification creation failed or returned invalid fields");
  }
  console.log("   ✅ In-app notifications successfully inserted with isRead = false");

  // 3. Test Scoped Querying & Isolation
  console.log("3️⃣ Testing NotificationService.getUserNotifications & Isolation...");
  const user1Notifs = await notificationService.getUserNotifications(user1Id);

  if (user1Notifs.meta.total !== 2 || user1Notifs.meta.unreadCount !== 2) {
    throw new Error(`❌ Expected 2 notifications for User 1, got total=${user1Notifs.meta.total}, unread=${user1Notifs.meta.unreadCount}`);
  }

  // Verify User 1 cannot see User 2's notifications
  const hasUser2Notif = user1Notifs.data.some((n) => n.id === notifUser2.id);
  if (hasUser2Notif) {
    throw new Error("❌ Data isolation error: User 1 can see User 2's notification!");
  }
  console.log("   ✅ Scoped notification querying, unread counting, and user isolation verified");

  // 4. Test markNotificationAsRead
  console.log("4️⃣ Testing NotificationService.markNotificationAsRead...");
  const markedSingle = await notificationService.markNotificationAsRead(notif1.id, user1Id);

  if (!markedSingle.isRead) {
    throw new Error("❌ markNotificationAsRead failed to set isRead = true");
  }

  const unreadCountAfterSingle = await notificationService.getUnreadCount(user1Id);
  if (unreadCountAfterSingle !== 1) {
    throw new Error(`❌ Expected unreadCount = 1 after marking one read, got ${unreadCountAfterSingle}`);
  }

  // Verify unauthorized read marking (User 2 attempting to mark User 1's notification)
  let unauthReadBlocked = false;
  try {
    await notificationService.markNotificationAsRead(notif2.id, user2Id);
  } catch (err: any) {
    if (err.code === "NOTIFICATION_NOT_FOUND" && err.statusCode === 404) {
      unauthReadBlocked = true;
    }
  }
  if (!unauthReadBlocked) {
    throw new Error("❌ User 2 was able to mark User 1's notification as read!");
  }
  console.log("   ✅ Single notification read marking and cross-user authorization verified");

  // 5. Test markAllNotificationsAsRead
  console.log("5️⃣ Testing NotificationService.markAllNotificationsAsRead...");
  const markAllResult = await notificationService.markAllNotificationsAsRead(user1Id);

  if (markAllResult.markedRead !== 1) {
    throw new Error(`❌ Expected 1 remaining unread notification marked read, got ${markAllResult.markedRead}`);
  }

  const unreadCountAfterAll = await notificationService.getUnreadCount(user1Id);
  if (unreadCountAfterAll !== 0) {
    throw new Error(`❌ Expected unreadCount = 0, got ${unreadCountAfterAll}`);
  }

  // Verify User 2's notification is still unread
  const user2Unread = await notificationService.getUnreadCount(user2Id);
  if (user2Unread !== 1) {
    throw new Error("❌ markAllNotificationsAsRead on User 1 mutated User 2's notifications!");
  }
  console.log("   ✅ markAllNotificationsAsRead cleanly updated only targeted user's notifications");

  // 6. Test Email Template Generators
  console.log("6️⃣ Testing live session email template generators...");
  const reminderHtml = generateSessionReminderHtml({
    studentName: "Alex",
    courseTitle: "Cloud Architecture Masterclass",
    sessionTitle: "Kubernetes & Service Meshes",
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    platform: "ZOOM",
    sessionUrl: "http://localhost:3000/live-sessions",
    timeRemaining: "24 hours",
  });

  if (!reminderHtml.includes("Kubernetes & Service Meshes") || !reminderHtml.includes("Zoom Meeting")) {
    throw new Error("❌ Reminder email HTML missing lecture or platform details");
  }

  const cancelledHtml = generateSessionCancelledHtml({
    studentName: "Alex",
    courseTitle: "Cloud Architecture Masterclass",
    sessionTitle: "Kubernetes & Service Meshes",
    scheduledAt: new Date().toISOString(),
  });

  if (!cancelledHtml.includes("Live Class Cancelled")) {
    throw new Error("❌ Cancellation email HTML missing cancellation notice");
  }

  const recordingHtml = generateRecordingAvailableHtml({
    studentName: "Alex",
    courseTitle: "Cloud Architecture Masterclass",
    sessionTitle: "Kubernetes & Service Meshes",
    recordingUrl: "https://zoom.us/rec/play/xyz123",
  });

  if (!recordingHtml.includes("https://zoom.us/rec/play/xyz123") || !recordingHtml.includes("Class Replay Published")) {
    throw new Error("❌ Recording email HTML missing replay URL");
  }
  console.log("   ✅ All HTML email templates generated valid formatted output");

  // 7. Cleanup
  console.log("\n🧹 Cleaning up test records...");
  await db.delete(notifications).where(inArray(notifications.userId, [user1Id, user2Id]));
  await db.delete(users).where(inArray(users.id, [user1Id, user2Id]));

  console.log("\n🎉 ALL Slice 6.5 Email & In-App Reminders Tests PASSED Successfully!\n");
}

runNotificationTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
