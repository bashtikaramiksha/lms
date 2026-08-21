import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { liveSessionService } from "@/lib/services/live-session.service";
import { AppError } from "@/lib/services/course.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await liveSessionService.getJoinUrl(id, session.user.id);

    return NextResponse.json({
      success: true,
      data: result,
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

    console.error("GET /api/live/sessions/:id/join error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to obtain join URL" } },
      { status: 500 }
    );
  }
}
