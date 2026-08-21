import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  blogService,
  ConflictError,
  UnprocessableError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/services/blog.service";
import { updateBlogPostSchema } from "@/lib/validations/blog.schema";

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

    const { id } = await params;
    const post = await blogService.getPostById(id);

    if (session.user.role !== "ADMIN" && post.authorId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (err: any) {
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "POST_NOT_FOUND", message: "Post not found" } },
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

    const body = await req.json();
    const parsed = updateBlogPostSchema.safeParse(body);
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
    const updatedPost = await blogService.updatePost(
      id,
      parsed.data,
      session.user.id,
      session.user.role
    );

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPost.id,
        status: updatedPost.status,
        publishedAt: updatedPost.publishedAt,
      },
    });
  } catch (err: any) {
    console.error("PATCH /api/blog/posts/[id] error:", err);
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "POST_NOT_FOUND", message: "Post not found" } },
        { status: 404 }
      );
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You can only edit your own posts" } },
        { status: 403 }
      );
    }
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
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update post" } },
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

    const { id } = await params;
    await blogService.deletePost(id, session.user.id, session.user.role);

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("DELETE /api/blog/posts/[id] error:", err);
    if (err instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: "POST_NOT_FOUND", message: "Post not found" } },
        { status: 404 }
      );
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Admin privileges required to delete posts" } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete post" } },
      { status: 500 }
    );
  }
}
