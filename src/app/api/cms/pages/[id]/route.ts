import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  cmsService,
  ConflictError,
  NotFoundError,
} from "@/lib/services/cms.service";
import { updatePageSchema } from "@/lib/validations/cms.schema";

export async function GET(
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    const page = await cmsService.getPageById(id);

    return NextResponse.json({ success: true, data: page });
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "PAGE_NOT_FOUND", message: "Page not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message } },
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updatePageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid update data",
            issues: parsed.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const { id } = await params;
    const updatedPage = await cmsService.updatePage(id, parsed.data);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPage.id,
        slug: updatedPage.slug,
        status: updatedPage.status,
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/cms/pages/[id] error:", err);
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "PAGE_NOT_FOUND", message: "Page not found" } },
        { status: 404 }
      );
    }
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { success: false, error: { code: "SLUG_CONFLICT", message: "A page with this slug already exists" } },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update page" } },
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const { id } = await params;
    await cmsService.deletePage(id);

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/cms/pages/[id] error:", err);
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "PAGE_NOT_FOUND", message: "Page not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete page" } },
      { status: 500 }
    );
  }
}
