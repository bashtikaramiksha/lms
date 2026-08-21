import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { AppError } from "@/lib/services/course.service";
import { adminPaymentsQuerySchema } from "@/lib/validations/coupon";

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
    const parsed = adminPaymentsQuerySchema.safeParse(searchParams);
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

    const result = await paymentService.getAdminPayments(parsed.data);

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("GET /api/admin/payments error:", err);
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch payments" } },
      { status: 500 }
    );
  }
}
