import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { AppError } from "@/lib/services/course.service";
import { addCartItemSchema } from "@/lib/validations/cart";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const data = await cartService.getCart(session.user.id);
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("GET /api/cart error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch cart" } },
      { status: 500 }
    );
  }
}

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
    const parsed = addCartItemSchema.safeParse(body);

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

    const item = await cartService.addItem(session.user.id, parsed.data.courseId);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: item.id,
          courseId: item.courseId,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/cart error:", err);
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
          message: "Failed to add course to cart",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    await cartService.clearCart(session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/cart error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to clear cart" } },
      { status: 500 }
    );
  }
}
