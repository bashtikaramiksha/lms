import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { blogService, ConflictError, UnprocessableError } from "@/lib/services/blog.service";
import { blogPublicService } from "@/lib/services/blog-public.service";
import { createBlogPostSchema } from "@/lib/validations/blog.schema";
import { z } from "zod";

const publicBlogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(12),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = publicBlogQuerySchema.safeParse(searchParams);
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

    const result = await blogPublicService.getPosts(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("GET /api/blog/posts error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch posts" } },
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

    if (session.user.role !== "TEACHER" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Teacher or Admin role required" } },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createBlogPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid post data",
            issues: parsed.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const post = await blogService.createPost(parsed.data, session.user.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: post.id,
          slug: post.slug,
          status: post.status,
          publishedAt: post.publishedAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/blog/posts error:", err);
    if (err instanceof ConflictError) {
      return NextResponse.json(
        { success: false, error: { code: "SLUG_CONFLICT", message: "A post with this slug already exists" } },
        { status: 409 }
      );
    }
    if (err instanceof UnprocessableError) {
      return NextResponse.json(
        { success: false, error: { code: "SCHEDULED_FOR_PAST", message: "Scheduled date must be in the future" } },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create post" } },
      { status: 500 }
    );
  }
}
