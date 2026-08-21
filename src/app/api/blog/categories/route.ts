import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blogService, ConflictError } from "@/lib/services/blog.service";
import { createCategorySchema } from "@/lib/validations/blog.schema";

export async function GET() {
  try {
    const categories = await blogService.getCategories();
    return NextResponse.json({ success: true, data: categories });
  } catch (err: any) {
    console.error("GET /api/blog/categories error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories" } },
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
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid category data",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const category = await blogService.createCategory(parsed.data);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/blog/categories error:", err);
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { success: false, error: { code: "SLUG_CONFLICT", message: "Category slug already exists" } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create category" } },
      { status: 500 }
    );
  }
}
