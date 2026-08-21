import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { AppError } from "@/lib/services/course.service";
import { updateCouponSchema } from "@/lib/validations/coupon";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid update data",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const updated = await couponService.updateCoupon(id, parsed.data);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("PATCH /api/admin/coupons/[id] error:", err);
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update coupon" } },
      { status: 500 }
    );
  }
}
