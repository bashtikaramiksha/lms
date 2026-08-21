import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { teacherStatsService, RevenuePeriod } from "@/lib/services/teacher-stats.service";
import { AppError } from "@/lib/services/course.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (userRole === "STUDENT") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Teacher access required" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "12m") as RevenuePeriod;
    const courseId = searchParams.get("courseId") || undefined;

    const data = await teacherStatsService.getRevenue(session.user.id, period, courseId);

    return NextResponse.json({
      success: true,
      data,
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

    console.error("GET /api/teacher/revenue error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch teacher revenue analytics" } },
      { status: 500 }
    );
  }
}
