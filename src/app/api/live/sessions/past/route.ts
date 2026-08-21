import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { liveSessionService } from "@/lib/services/live-session.service";
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

    const data = await liveSessionService.getStudentPastSessions(session.user.id);

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

    console.error("GET /api/live/sessions/past error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch past sessions" } },
      { status: 500 }
    );
  }
}
