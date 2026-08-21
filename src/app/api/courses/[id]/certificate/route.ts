import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { certificateService } from "@/lib/services/certificate.service";
import { AppError } from "@/lib/services/course.service";

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

    const { id: courseId } = await params;
    const data = await certificateService.getCertificateStatus(session.user.id, courseId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message, details: err.details },
        },
        { status: err.statusCode }
      );
    }

    console.error("GET /api/courses/[id]/certificate error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to get certificate status" } },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { id: courseId } = await params;
    const result = await certificateService.requestCertificate(session.user.id, courseId);

    const statusCode = result.status === "PROCESSING" ? 202 : 200;

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: statusCode }
    );
  } catch (err: any) {
    if (err instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message, details: err.details },
        },
        { status: err.statusCode }
      );
    }

    console.error("POST /api/courses/[id]/certificate error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to request certificate" } },
      { status: 500 }
    );
  }
}
