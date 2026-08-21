import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { courseService, AppError } from "@/lib/services/course.service";
import { seoSchema } from "@/lib/validations/course";

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

    const role = (session.user as any).role;
    const { id } = await params;
    const body = await req.json();

    const parsed = seoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid SEO input",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const updated = await courseService.updateCourseSeo(
      id,
      session.user.id,
      role,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message, details: err.details },
        },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update SEO settings" },
      },
      { status: 500 }
    );
  }
}
