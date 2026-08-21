import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            details: parsed.error.format(),
          },
        },
        { status: 400 }
      );
    }

    await authService.resetPassword(parsed.data.token, parsed.data.password);

    return NextResponse.json({
      success: true,
      data: {
        message: "Password reset successful. You can now sign in with your new password.",
      },
    });
  } catch (err: any) {
    if (err.message === "INVALID_TOKEN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired password reset link.",
          },
        },
        { status: 400 }
      );
    }

    if (err.message === "TOKEN_EXPIRED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "The password reset link has expired. Please request a new one.",
          },
        },
        { status: 410 }
      );
    }

    console.error("Reset password error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to reset password.",
        },
      },
      { status: 500 }
    );
  }
}
