import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { courseService } from "@/lib/services/course.service";
import { videoPresignSchema } from "@/lib/validations/curriculum";

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
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Only teachers and admins can upload media" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = videoPresignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid upload parameters",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const presigned = await courseService.getVideoPresignedUrl(
      parsed.data.filename,
      parsed.data.mimeType,
      parsed.data.lessonId || undefined
    );

    return NextResponse.json({
      success: true,
      data: presigned,
    });
  } catch (err: any) {
    console.error("POST /api/uploads/lesson-video error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to generate video upload URL" },
      },
      { status: 500 }
    );
  }
}
