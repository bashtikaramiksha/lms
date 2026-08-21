import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { notifyAdminOfSubmission, notifyTeacherOfPublish } from "@/lib/inngest/course.functions";
import { sendPurchaseReceipt } from "@/lib/inngest/payment.functions";
import { generateCertificateFunction } from "@/lib/inngest/certificate.functions";
import { publishScheduledPosts } from "@/lib/inngest/blog.functions";
import {
  scheduleSessionReminders,
  sendCancellationNotifications,
  sendRecordingAvailableNotifications,
  markSessionsLive,
  markSessionsEnded,
} from "@/lib/inngest/live.functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    notifyAdminOfSubmission,
    notifyTeacherOfPublish,
    sendPurchaseReceipt,
    generateCertificateFunction,
    publishScheduledPosts,
    scheduleSessionReminders,
    sendCancellationNotifications,
    sendRecordingAvailableNotifications,
    markSessionsLive,
    markSessionsEnded,
  ],
});
