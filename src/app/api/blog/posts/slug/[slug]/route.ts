import { NextRequest, NextResponse } from "next/server";
import { blogPublicService } from "@/lib/services/blog-public.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const post = await blogPublicService.getPostBySlug(slug);

    if (!post) {
      return NextResponse.json(
        { success: false, error: { code: "POST_NOT_FOUND", message: "Blog post not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (err: any) {
    console.error("GET /api/blog/posts/slug/[slug] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch post" } },
      { status: 500 }
    );
  }
}
