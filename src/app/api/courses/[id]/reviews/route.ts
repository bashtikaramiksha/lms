import { NextRequest, NextResponse } from "next/server";
import { courseService, AppError } from "@/lib/services/course.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const cursor = searchParams.get("cursor") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 10;

    const reviewsData = await courseService.getCourseReviews(id, { cursor, limit });

    return NextResponse.json({
      success: true,
      data: reviewsData.data,
      meta: reviewsData.meta,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch course reviews" } },
      { status: 500 }
    );
  }
}
