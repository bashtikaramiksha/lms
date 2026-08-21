import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { authService } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

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

    const result = await authService.requestPasswordReset(parsed.data.email);

    return NextResponse.json({
      success: true,
      data: {
        message: "If an account with that email exists, password reset instructions have been sent.",
        ...result,
      },
    });
  } catch (err: any) {
    console.error("Password reset request error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to process request.",
        },
      },
      { status: 500 }
    );
  }
}
