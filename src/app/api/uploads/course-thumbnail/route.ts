import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { courseService } from "@/lib/services/course.service";
import { thumbnailPresignSchema } from "@/lib/validations/course";

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
    const parsed = thumbnailPresignSchema.safeParse(body);

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

    const presigned = await courseService.getThumbnailPresignedUrl(
      parsed.data.filename,
      parsed.data.mimeType
    );

    return NextResponse.json({
      success: true,
      data: presigned,
    });
  } catch (err: any) {
    console.error("POST /api/uploads/course-thumbnail error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to generate thumbnail upload URL" },
      },
      { status: 500 }
    );
  }
}
