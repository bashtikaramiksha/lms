import { db } from "@/lib/db/client";
import { users, type UserRole, type UserStatus } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { inngest } from "@/lib/inngest";
import { sendEmail } from "@/lib/resend";
import { RegisterInput } from "@/lib/validations/auth";

export class AuthService {
  /**
   * Registers a new user.
   * - Checks email uniqueness
   * - Hashes password with bcrypt (cost 12)
   * - Generates SHA-256 hashed verification token
   * - Inserts user record
   * - Dispatches email notification (with simulated fallback for local dev)
   */
  async register(dto: RegisterInput) {
    const cleanEmail = dto.email.toLowerCase().trim();

    const existing = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (existing) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const initialStatus: UserStatus = dto.role === "TEACHER" ? "PENDING_APPROVAL" : "ACTIVE";

    // In local dev without a real Resend key, auto-verify email so users can log in immediately.
    const isDevMode = process.env.NODE_ENV === "development";
    const hasRealEmailProvider = !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_dummy_dev_key");
    const autoVerify = isDevMode && !hasRealEmailProvider;

    const [user] = await db
      .insert(users)
      .values({
        fullName: dto.fullName.trim(),
        email: cleanEmail,
        passwordHash,
        role: dto.role,
        status: initialStatus,
        emailVerified: autoVerify,        // true in dev without Resend key
        emailVerifyToken: autoVerify ? null : tokenHash,
        emailVerifyExpiresAt: autoVerify ? null : tokenExpiry,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
      });

    // Send verification email via Resend / Dev simulator
    const appUrl = process.env.AUTH_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your email address - LMS Platform",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Welcome to LMS Platform, ${user.fullName}!</h2>
          <p>Please click the button below to verify your email address and activate your account:</p>
          <div style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #64748b; font-size: 14px;">Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #2563eb; font-size: 12px;">${verifyUrl}</p>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link will expire in 24 hours.</p>
        </div>
      `,
    });

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      verifyTokenDevOnly: rawToken, // Helpful for rapid local verification without checking mailbox
    };
  }

  /**
   * Verifies user email from incoming raw token
   */
  async verifyEmail(rawToken: string) {
    if (!rawToken) {
      throw new Error("INVALID_TOKEN");
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await db.query.users.findFirst({
      where: eq(users.emailVerifyToken, tokenHash),
    });

    if (!user) {
      throw new Error("INVALID_TOKEN");
    }

    if (user.emailVerifyExpiresAt && new Date(user.emailVerifyExpiresAt) < new Date()) {
      throw new Error("TOKEN_EXPIRED");
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiresAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
  }

  /**
   * Generates a password reset token
   */
  async requestPasswordReset(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    const user = await db.query.users.findFirst({
      where: eq(users.email, cleanEmail),
    });

    if (!user) {
      // Return success quietly to prevent email enumeration attacks
      return { success: true };
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await db
      .update(users)
      .set({
        resetPasswordToken: tokenHash,
        resetPasswordExpiresAt: tokenExpiry,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    const appUrl = process.env.AUTH_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your LMS Platform password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>We received a request to reset your password. Click the link below to set a new password:</p>
          <div style="margin: 24px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    return { success: true, resetTokenDevOnly: rawToken };
  }

  /**
   * Resets password using token
   */
  async resetPassword(rawToken: string, newPassword: string) {
    if (!rawToken) throw new Error("INVALID_TOKEN");

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await db.query.users.findFirst({
      where: eq(users.resetPasswordToken, tokenHash),
    });

    if (!user) throw new Error("INVALID_TOKEN");
    if (user.resetPasswordExpiresAt && new Date(user.resetPasswordExpiresAt) < new Date()) {
      throw new Error("TOKEN_EXPIRED");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id));

    return { success: true };
  }
}

export const authService = new AuthService();
