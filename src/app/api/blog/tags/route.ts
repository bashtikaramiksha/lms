import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blogService } from "@/lib/services/blog.service";
import { createTagSchema } from "@/lib/validations/blog.schema";

export async function GET() {
  try {
    const tags = await blogService.getTags();
    return NextResponse.json({ success: true, data: tags });
  } catch (err: any) {
    console.error("GET /api/blog/tags error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch tags" } },
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

    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Teacher or Admin role required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid tag data",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const tag = await blogService.createTag(parsed.data);
    return NextResponse.json({ success: true, data: tag }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/blog/tags error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create tag" } },
      { status: 500 }
    );
  }
}
