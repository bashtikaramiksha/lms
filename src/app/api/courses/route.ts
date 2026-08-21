import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { courseService, AppError } from "@/lib/services/course.service";
import { createCourseSchema, listCoursesSchema } from "@/lib/validations/course";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // If teacher scope is explicitly requested
    if (searchParams.get("scope") === "teacher") {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 }
        );
      }

      const role = (session.user as any).role;
      if (role !== "TEACHER" && role !== "ADMIN") {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Teacher or Admin role required" } },
          { status: 403 }
        );
      }

      const teacherCourses = await courseService.getTeacherCourses(session.user.id, role);
      return NextResponse.json({
        success: true,
        data: teacherCourses,
      });
    }

    // Public Course Listing with FTS search, filters, sort, cursor pagination
    const queryObj: Record<string, any> = {};
    if (searchParams.has("q")) queryObj.q = searchParams.get("q");
    if (searchParams.has("category")) queryObj.category = searchParams.get("category");
    if (searchParams.has("level")) queryObj.level = searchParams.get("level");
    if (searchParams.has("type")) queryObj.type = searchParams.get("type");
    if (searchParams.has("sort")) queryObj.sort = searchParams.get("sort");
    if (searchParams.has("cursor")) queryObj.cursor = searchParams.get("cursor");
    if (searchParams.has("limit")) queryObj.limit = searchParams.get("limit");

    const parsed = listCoursesSchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid query parameters",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = await courseService.listPublicCourses(parsed.data);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (err: any) {
    console.error("GET /api/courses error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch courses" } },
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

    const role = (session.user as any).role;
    const status = (session.user as any).status;

    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only teachers and admins can create courses" } },
        { status: 403 }
      );
    }

    if (role === "TEACHER" && status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: { code: "TEACHER_NOT_APPROVED", message: "Instructor account must be approved before creating courses" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Validation failed",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = await courseService.createCourse(
      parsed.data,
      session.user.id,
      role,
      status
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/courses error:", err);

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

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error occurred",
        },
      },
      { status: 500 }
    );
  }
}
