import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { courseService, AppError } from "@/lib/services/course.service";
import { updateCourseSchema } from "@/lib/validations/course";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let session = null;
    try {
      session = await auth();
    } catch (e) {
      // Unauthenticated or standalone environment
    }
    const { searchParams } = new URL(req.url);

    // If teacher/admin studio edit mode is explicitly requested
    if (searchParams.get("scope") === "edit") {
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
          { status: 401 }
        );
      }
      const course = await courseService.findCourseOrThrow(id);
      return NextResponse.json({
        success: true,
        data: course,
      });
    }

    // Default: Return public course detail with curriculum gating and instructor stats
    try {
      const courseDetail = await courseService.getCourseDetail(id, session?.user?.id);
      return NextResponse.json({
        success: true,
        data: courseDetail,
      });
    } catch (detailErr) {
      // If public detail failed (e.g. course is DRAFT) but user is the owner/admin, allow fallback
      if (session?.user?.id) {
        const course = await courseService.findCourseOrThrow(id);
        const role = (session.user as any).role;
        if (role === "ADMIN" || course.authorId === session.user.id) {
          return NextResponse.json({
            success: true,
            data: course,
          });
        }
      }
      throw detailErr;
    }
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message, details: err.details } },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch course" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    const role = (session.user as any).role;
    const { id } = await params;
    const body = await req.json();

    const parsed = updateCourseSchema.safeParse(body);
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

    const updated = await courseService.updateCourse(
      id,
      session.user.id,
      role,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: any) {
    console.error("PATCH /api/courses/[id] error:", err);

    if (err instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message },
        },
        { status: err.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update course" },
      },
      { status: 500 }
    );
  }
}
