import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { courseService, AppError } from "@/lib/services/course.service";
import { reorderSchema } from "@/lib/validations/curriculum";

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
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only teachers and admins can modify curriculum" } },
        { status: 403 }
      );
    }

    const { id: moduleId } = await params;
    const body = await req.json();
    const parsed = reorderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Validation failed",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    await courseService.reorderLessons(
      moduleId,
      session.user.id,
      role,
      parsed.data.orderedIds
    );

    return NextResponse.json({
      success: true,
      message: "Lessons reordered successfully",
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error("PATCH /api/modules/[id]/lessons/reorder error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to reorder lessons" } },
      { status: 500 }
    );
  }
}
