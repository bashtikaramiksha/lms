import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { AppError } from "@/lib/services/course.service";
import { validateCouponSchema } from "@/lib/validations/coupon";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = validateCouponSchema.safeParse(body);
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

    const result = await couponService.validateCouponWithCalculation(
      parsed.data.code,
      parsed.data.subtotal
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/coupons/validate error:", err);
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            reason: err.details?.reason,
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
          message: "Failed to validate coupon",
        },
      },
      { status: 500 }
    );
  }
}
