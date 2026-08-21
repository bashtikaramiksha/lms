import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { progressService } from "@/lib/services/progress.service";
import { updateProgressSchema } from "@/lib/validations/progress";
import { AppError } from "@/lib/services/course.service";

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

    const { id: lessonId } = await params;
    const body = await req.json();
    const parsed = updateProgressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid progress data",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = await progressService.updateProgress({
      studentId: session.user.id,
      courseId: parsed.data.courseId,
      lessonId,
      watchPercent: parsed.data.watchPercent,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
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

    console.error("PATCH /api/lessons/[id]/progress error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update watch progress" },
      },
      { status: 500 }
    );
  }
}
