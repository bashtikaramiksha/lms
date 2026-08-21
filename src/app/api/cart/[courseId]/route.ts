import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { AppError } from "@/lib/services/course.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { courseId } = await params;
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Course ID is required" } },
        { status: 400 }
      );
    }

    await cartService.removeItem(session.user.id, courseId);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/cart/[courseId] error:", err);
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
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to remove course from cart" } },
      { status: 500 }
    );
  }
}
