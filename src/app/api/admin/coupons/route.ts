import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { AppError } from "@/lib/services/course.service";
import {
  createCouponSchema,
  listCouponsQuerySchema,
} from "@/lib/validations/coupon";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid coupon data",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const coupon = await couponService.createCoupon(
      parsed.data,
      session.user.id
    );

    return NextResponse.json({ success: true, data: coupon }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/admin/coupons error:", err);
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message, details: err.details } },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create coupon" } },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = listCouponsQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = await couponService.getCoupons(parsed.data);

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("GET /api/admin/coupons error:", err);
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch coupons" } },
      { status: 500 }
    );
  }
}
