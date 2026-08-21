import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { authService } from "@/lib/services/auth.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

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

    const result = await authService.register(parsed.data);

    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          message: "Registration successful. Please verify your email to continue.",
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.message === "EMAIL_ALREADY_EXISTS") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_ALREADY_EXISTS",
            message: "An account with this email address already exists.",
          },
        },
        { status: 409 }
      );
    }

    console.error("Registration error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to complete registration.",
        },
      },
      { status: 500 }
    );
  }
}
