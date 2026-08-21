import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cmsService, ConflictError } from "@/lib/services/cms.service";
import { createPageSchema, adminPageQuerySchema } from "@/lib/validations/cms.schema";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = adminPageQuerySchema.safeParse(searchParams);
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

    const result = await cmsService.getAdminPages(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("GET /api/cms/pages error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch pages" } },
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid page data",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const page = await cmsService.createPage(parsed.data);
    return NextResponse.json(
      {
        success: true,
        data: {
          id: page.id,
          slug: page.slug,
          status: page.status,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/cms/pages error:", err);
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { success: false, error: { code: "SLUG_CONFLICT", message: "A page with this slug already exists" } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create page" } },
      { status: 500 }
    );
  }
}
