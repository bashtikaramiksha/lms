import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { courseService, AppError } from "@/lib/services/course.service";
import { updateModuleSchema } from "@/lib/validations/curriculum";

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
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only teachers and admins can modify curriculum" } },
        { status: 403 }
      );
    }

    const { id: moduleId } = await params;
    const body = await req.json();
    const parsed = updateModuleSchema.safeParse(body);

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

    const updatedModule = await courseService.updateModule(
      moduleId,
      session.user.id,
      role,
      parsed.data.title
    );

    return NextResponse.json({
      success: true,
      data: updatedModule,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error("PATCH /api/modules/[id] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update module" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only teachers and admins can modify curriculum" } },
        { status: 403 }
      );
    }

    const { id: moduleId } = await params;
    await courseService.deleteModule(moduleId, session.user.id, role);

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: err.statusCode }
      );
    }
    console.error("DELETE /api/modules/[id] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete module" } },
      { status: 500 }
    );
  }
}
