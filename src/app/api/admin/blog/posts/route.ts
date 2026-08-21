import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blogService } from "@/lib/services/blog.service";
import { adminBlogQuerySchema } from "@/lib/validations/blog.schema";
import { db } from "@/lib/db/client";
import { blogPosts } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";

const bulkStatusSchema = z.object({
  postIds: z.array(z.string()).min(1, "At least one post ID required"),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]),
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = adminBlogQuerySchema.safeParse(searchParams);
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

    const result = await blogService.getAdminPosts(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("GET /api/admin/blog/posts error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch posts" } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const parsed = bulkStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid bulk update request",
            issues: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const patch: Partial<typeof blogPosts.$inferInsert> = {
      status: parsed.data.status,
      updatedAt: now,
    };
    if (parsed.data.status === "PUBLISHED") {
      patch.publishedAt = now;
    }

    await db
      .update(blogPosts)
      .set(patch)
      .where(inArray(blogPosts.id, parsed.data.postIds));

    return NextResponse.json({
      success: true,
      data: { updatedCount: parsed.data.postIds.length },
    });
  } catch (err: any) {
    console.error("PATCH /api/admin/blog/posts error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to bulk update posts" } },
      { status: 500 }
    );
  }
}
