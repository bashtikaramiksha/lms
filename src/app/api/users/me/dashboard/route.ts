import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { dashboardService } from "@/lib/services/dashboard.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (userRole === "TEACHER") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "FORBIDDEN", message: "Student dashboard is only accessible by students" },
        },
        { status: 403 }
      );
    }

    const data = await dashboardService.getStudentDashboard(session.user.id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("GET /api/users/me/dashboard error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch student dashboard" },
      },
      { status: 500 }
    );
  }
}
