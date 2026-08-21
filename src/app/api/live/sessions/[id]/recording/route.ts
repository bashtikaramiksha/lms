import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { liveSessionService } from "@/lib/services/live-session.service";
import { addRecordingSchema } from "@/lib/validations/live.schema";
import { AppError } from "@/lib/services/course.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await req.json();
    const parseResult = addRecordingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.errors[0]?.message || "Invalid recording URL",
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const updated = await liveSessionService.addRecordingUrl(
      id,
      session.user.id,
      parseResult.data.recordingUrl,
      userRole
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        recordingUrl: updated.recordingUrl,
      },
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

    console.error("PATCH /api/live/sessions/:id/recording error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update recording URL" } },
      { status: 500 }
    );
  }
}
