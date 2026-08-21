import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { AppError } from "@/lib/services/course.service";
import { createRazorpayOrderSchema } from "@/lib/validations/payment";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    let body = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const parsed = createRazorpayOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid request body",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = await paymentService.createRazorpayOrder(
      session.user.id,
      parsed.data.couponCode
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/payments/razorpay/create-order error:", err);
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create Razorpay order",
        },
      },
      { status: 500 }
    );
  }
}
