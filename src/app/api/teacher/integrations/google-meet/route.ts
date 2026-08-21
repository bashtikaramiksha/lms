import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { liveOAuthService } from "@/lib/services/live-oauth.service";
import { AppError } from "@/lib/services/course.service";

export async function DELETE(req: NextRequest) {
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
        { success: false, error: { code: "FORBIDDEN", message: "Teacher or Admin access required" } },
        { status: 403 }
      );
    }

    await liveOAuthService.disconnectGoogleMeet(session.user.id);

    return NextResponse.json({
      success: true,
      data: { disconnected: "googleMeet" },
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

    console.error("DELETE /api/teacher/integrations/google-meet error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to disconnect Google Meet" } },
      { status: 500 }
    );
  }
}
