import { NextResponse } from "next/server";
import { courseService } from "@/lib/services/course.service";

export async function GET() {
  try {
    const categories = await courseService.getCategories();
    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (err: any) {
    console.error("Fetch categories error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch categories" },
      },
      { status: 500 }
    );
  }
}
