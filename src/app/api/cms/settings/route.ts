import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { settingsService } from "@/lib/services/settings.service";
import { updateSettingsSchema } from "@/lib/validations/settings.schema";

export async function GET() {
  try {
    const data = await settingsService.getAll();
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("GET /api/cms/settings error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch settings" } },
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
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message || "Invalid settings payload",
            issues: parsed.error.issues,
          },
        },
        { status: 422 }
      );
    }

    const updatedKeys = await settingsService.update(parsed.data);

    return NextResponse.json({
      success: true,
      data: { updated: updatedKeys },
    });
  } catch (err: any) {
    console.error("PATCH /api/cms/settings error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update settings" } },
      { status: 500 }
    );
  }
}
