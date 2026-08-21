import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";

/**
 * Background function: Notify Admins when a teacher submits a course for review.
 */
export const notifyAdminOfSubmission = inngest.createFunction(
  { id: "course-submitted-for-review", retries: 3 },
  { event: "course/submitted-for-review" },
  async ({ event, step }) => {
    const { courseTitle, courseId, teacherId } = event.data;

    const admins = await step.run("fetch-admins", async () => {
      return await db.query.users.findMany({
        where: and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE")),
        columns: { email: true, fullName: true },
      });
    });

    const teacher = await step.run("fetch-teacher", async () => {
      return await db.query.users.findFirst({
        where: eq(users.id, teacherId),
        columns: { fullName: true, email: true },
      });
    });

    await step.run("send-admin-notifications", async () => {
      if (!admins.length) return;

      return Promise.all(
        admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `Course Review Required: ${courseTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
                <h2 style="color: #0f172a; margin-top: 0;">New Course Submitted for Review</h2>
                <p>Hello <strong>${admin.fullName}</strong>,</p>
                <p>Teacher <strong>${teacher?.fullName || "Instructor"}</strong> has submitted a course for review and publication approval:</p>
                <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                  <p style="margin: 0; font-size: 16px; font-weight: bold; color: #1e293b;">${courseTitle}</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Course ID: ${courseId}</p>
                </div>
                <p>Please review the curriculum, SEO metadata, and video materials in the Admin Panel.</p>
              </div>
            `,
          })
        )
      );
    });
  }
);

/**
 * Background function: Notify Teacher when their course is published live.
 */
export const notifyTeacherOfPublish = inngest.createFunction(
  { id: "course-published", retries: 3 },
  { event: "course/published" },
  async ({ event, step }) => {
    const { teacherId, courseTitle, courseId } = event.data;

    const teacher = await step.run("fetch-teacher", async () => {
      return await db.query.users.findFirst({
        where: eq(users.id, teacherId),
        columns: { fullName: true, email: true },
      });
    });

    if (teacher?.email) {
      await step.run("send-teacher-notification", async () => {
        return sendEmail({
          to: teacher.email,
          subject: `Your course is now LIVE! 🎉 ${courseTitle ? `— ${courseTitle}` : ""}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
              <h2 style="color: #10b981; margin-top: 0;">Congratulations, ${teacher.fullName}! 🎉</h2>
              <p>Your course <strong>"${courseTitle || "Course"}"</strong> has been approved and published to the public catalog.</p>
              <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #10b981;">
                <p style="margin: 0; font-size: 14px; color: #166534;">Your course is now visible to all students and open for enrollment.</p>
              </div>
              <p>Course ID: ${courseId}</p>
              <p>Thank you for contributing great learning content to our community!</p>
            </div>
          `,
        });
      });
    }
  }
);
