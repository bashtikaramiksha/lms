import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { AppError } from "@/lib/services/course.service";
import { refundSchema } from "@/lib/validations/coupon";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
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

    const { orderId } = await params;
    const body = await req.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid refund parameters",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = await paymentService.refundOrder(
      orderId,
      session.user.id,
      parsed.data
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error("POST /api/admin/payments/[orderId]/refund error:", err);
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to process refund" } },
      { status: 500 }
    );
  }
}
