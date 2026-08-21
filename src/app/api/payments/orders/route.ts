import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { orderHistoryQuerySchema } from "@/lib/validations/payment";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = orderHistoryQuerySchema.safeParse({
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid query parameters",
          },
        },
        { status: 400 }
      );
    }

    const { orders, nextCursor } = await paymentService.getStudentOrders(
      session.user.id,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: orders,
      meta: {
        nextCursor,
        hasNext: Boolean(nextCursor),
      },
    });
  } catch (err: any) {
    console.error("GET /api/payments/orders error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch order history" } },
      { status: 500 }
    );
  }
}
