import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { progressService } from "@/lib/services/progress.service";
import { AppError } from "@/lib/services/course.service";

export async function GET(
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

    const data = await progressService.getLessonData(session.user.id, courseId, lessonId);

    return NextResponse.json({
      success: true,
      data,
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

    console.error("GET /api/courses/[id]/lessons/[lessonId] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch lesson data" },
      },
      { status: 500 }
    );
  }
}
