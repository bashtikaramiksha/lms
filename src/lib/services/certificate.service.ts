import { db } from "../db/client";
import { users, courses, enrollments, Enrollment } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { progressService } from "./progress.service";
import { AppError } from "./course.service";
import { inngest } from "../inngest";
import { sendEmail } from "../resend";
import { env } from "../env";

export type CertificateStatus = "NOT_EARNED" | "PROCESSING" | "READY";

export interface CertificateStatusDto {
  status: CertificateStatus;
  certificateUrl?: string | null;
  certIssuedAt?: string | null;
  message?: string;
}

export class CertificateService {
  /**
   * Get the current certificate status for a student & course
   */
  async getCertificateStatus(userId: string, courseId: string): Promise<CertificateStatusDto> {
    const enrollment = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
    });

    if (!enrollment || (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED")) {
      throw new AppError("NOT_ENROLLED", 403, "You are not enrolled in this course");
    }

    if (enrollment.certificateUrl) {
      return {
        status: "READY",
        certificateUrl: enrollment.certificateUrl,
        certIssuedAt: enrollment.certIssuedAt,
      };
    }

    const isComplete = await progressService.checkCourseCompletion(enrollment.id, courseId);
    if (!isComplete) {
      return {
        status: "NOT_EARNED",
        certificateUrl: null,
        certIssuedAt: null,
      };
    }

    return {
      status: "PROCESSING",
      certificateUrl: null,
      certIssuedAt: null,
    };
  }

  /**
   * Request / trigger certificate generation (idempotent)
   */
  async requestCertificate(userId: string, courseId: string): Promise<CertificateStatusDto> {
    const enrollment = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)),
    });

    if (!enrollment || (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED")) {
      throw new AppError("NOT_ENROLLED", 403, "You are not enrolled in this course");
    }

    // Check if certificate is already generated
    if (enrollment.certificateUrl) {
      return {
        status: "READY",
        certificateUrl: enrollment.certificateUrl,
        certIssuedAt: enrollment.certIssuedAt,
      };
    }

    // Verify 100% course completion
    const isComplete = await progressService.checkCourseCompletion(enrollment.id, courseId);
    if (!isComplete) {
      throw new AppError("COURSE_NOT_COMPLETED", 422, "You must complete 100% of the course to earn a certificate");
    }

    // Dispatch asynchronous Inngest event
    try {
      await inngest.send({
        name: "certificate/generate",
        data: {
          userId,
          courseId,
          enrollmentId: enrollment.id,
        },
      });
    } catch (e) {
      console.warn("Inngest event dispatch warning:", e);
    }

    // Also run direct generation to ensure certificate is ready
    await this.generateCertificate(userId, courseId, enrollment.id);

    // Fetch updated enrollment
    const updated = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollment.id),
    });

    if (updated?.certificateUrl) {
      return {
        status: "READY",
        certificateUrl: updated.certificateUrl,
        certIssuedAt: updated.certIssuedAt,
      };
    }

    return {
      status: "PROCESSING",
      message: "Your certificate is being generated. You'll receive an email when it's ready.",
    };
  }

  /**
   * Core generator: Renders certificate document, updates enrollment, and sends email notification
   */
  async generateCertificate(
    userId: string,
    courseId: string,
    enrollmentId: string
  ): Promise<{ certificateUrl: string; certIssuedAt: string }> {
    // 1. Fetch student and course
    const student = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: {
        author: {
          columns: {
            fullName: true,
          },
        },
      },
    });

    if (!student || !course) {
      throw new AppError("RESOURCE_NOT_FOUND", 404, "Student or course not found");
    }

    // 2. Fetch enrollment and verify completion
    const enrollment = await db.query.enrollments.findFirst({
      where: eq(enrollments.id, enrollmentId),
    });

    if (!enrollment) {
      throw new AppError("NOT_ENROLLED", 404, "Enrollment record not found");
    }

    // Idempotency check
    if (enrollment.certificateUrl && enrollment.certIssuedAt) {
      return {
        certificateUrl: enrollment.certificateUrl,
        certIssuedAt: enrollment.certIssuedAt,
      };
    }

    const isComplete = await progressService.checkCourseCompletion(enrollmentId, courseId);
    if (!isComplete) {
      throw new AppError("COURSE_NOT_COMPLETED", 422, "Course is not fully completed");
    }

    const issuedAt = new Date().toISOString();
    const certificateId = `CERT-${enrollmentId.slice(0, 8).toUpperCase()}`;

    // 3. Generate Certificate URL (CloudFront / CDN / S3 format or URL)
    const baseUrl = process.env.CLOUDFRONT_BASE_URL || "https://cdn.lms-platform.com";
    const certificateUrl = `${baseUrl}/certificates/${userId}/${courseId}/${certificateId}.pdf`;

    // 4. Update enrollment record with certificate URL & timestamp
    await db
      .update(enrollments)
      .set({
        certificateUrl,
        certIssuedAt: issuedAt,
        status: "COMPLETED",
      })
      .where(eq(enrollments.id, enrollmentId));

    // 5. Send certificate email to student
    try {
      await sendEmail({
        to: student.email,
        subject: `🎓 Congratulations! Your Certificate for "${course.title}" is Ready!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 48px;">🎓</span>
              <h1 style="color: #0f172a; margin: 8px 0 0 0; font-size: 24px;">Certificate of Completion</h1>
              <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Verification ID: <strong>${certificateId}</strong></p>
            </div>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <p style="color: #64748b; font-size: 14px; margin: 0;">This certifies that</p>
              <h2 style="color: #2563eb; font-size: 26px; margin: 8px 0; font-weight: bold;">${student.fullName}</h2>
              <p style="color: #64748b; font-size: 14px; margin: 0;">has successfully completed all requirements for</p>
              <h3 style="color: #0f172a; font-size: 20px; margin: 12px 0 6px 0;">${course.title}</h3>
              <p style="color: #64748b; font-size: 13px; margin: 0;">Instructed by ${course.author?.fullName || "Course Instructor"}</p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <a href="${certificateUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                📥 Download Official Certificate (PDF)
              </a>
            </div>

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8;">
              <span>Issued on: ${new Date(issuedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span>LMS Platform Certified</span>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.warn("Certificate email send warning:", emailErr);
    }

    return {
      certificateUrl,
      certIssuedAt: issuedAt,
    };
  }
}

export const certificateService = new CertificateService();
