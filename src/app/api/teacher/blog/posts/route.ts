import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blogService } from "@/lib/services/blog.service";
import { z } from "zod";

const teacherQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ALL"]).optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Teacher role required" } },
        { status: 403 }
      );
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = teacherQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const result = await blogService.getTeacherPosts(session.user.id, parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("GET /api/teacher/blog/posts error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch teacher posts" } },
      { status: 500 }
    );
  }
}
