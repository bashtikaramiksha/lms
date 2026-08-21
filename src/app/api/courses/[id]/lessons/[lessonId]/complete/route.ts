import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { progressService } from "@/lib/services/progress.service";
import { AppError } from "@/lib/services/course.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id: courseId, lessonId } = await params;

    const result = await progressService.markLessonComplete(session.user.id, courseId, lessonId);

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

    console.error("POST /api/courses/[id]/lessons/[lessonId]/complete error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to mark lesson complete" },
      },
      { status: 500 }
    );
  }
}
