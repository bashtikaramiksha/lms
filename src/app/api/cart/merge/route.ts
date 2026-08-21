import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { mergeCartSchema } from "@/lib/validations/cart";

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
    const parsed = mergeCartSchema.safeParse(body);

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

    const result = await cartService.mergeGuestCart(
      session.user.id,
      parsed.data.courseIds
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("POST /api/cart/merge error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to merge cart" } },
      { status: 500 }
    );
  }
}
