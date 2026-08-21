import { NextRequest, NextResponse } from "next/server";
import { cmsService } from "@/lib/services/cms.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const page = await cmsService.getPublicPage(slug);

    if (!page) {
      return NextResponse.json(
        { success: false, error: { code: "PAGE_NOT_FOUND", message: "Page not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: page });
  } catch (err: any) {
    console.error("GET /api/cms/pages/slug/[slug] error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch page" } },
      { status: 500 }
    );
  }
}
