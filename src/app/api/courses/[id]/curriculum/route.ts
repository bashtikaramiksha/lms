import { NextRequest, NextResponse } from "next/server";
import { courseService, AppError } from "@/lib/services/course.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const curriculum = await courseService.getCurriculum(id);

    return NextResponse.json({
      success: true,
      data: curriculum,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error("GET /api/courses/[id]/curriculum error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch course curriculum" } },
      { status: 500 }
    );
  }
}
