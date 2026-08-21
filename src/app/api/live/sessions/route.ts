import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { liveSessionService } from "@/lib/services/live-session.service";
import { createLiveSessionSchema, listLiveSessionsQuerySchema } from "@/lib/validations/live.schema";
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
        { success: false, error: { code: "FORBIDDEN", message: "Teacher or Admin access required" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsedQuery = listLiveSessionsQuerySchema.safeParse({
      status: searchParams.get("status") || undefined,
      courseId: searchParams.get("courseId") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: parsedQuery.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const result = await liveSessionService.getTeacherSessions(session.user.id, parsedQuery.data);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
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

    console.error("GET /api/live/sessions error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch live sessions" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parseResult = createLiveSessionSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parseResult.error.errors[0]?.message || "Invalid session payload",
            details: parseResult.error.format(),
          },
        },
        { status: 422 }
      );
    }

    const createdSession = await liveSessionService.createSession(
      parseResult.data,
      session.user.id,
      userRole
    );

    return NextResponse.json(
      {
        success: true,
        data: createdSession,
      },
      { status: 201 }
    );
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

    console.error("POST /api/live/sessions error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to schedule live session" } },
      { status: 500 }
    );
  }
}
