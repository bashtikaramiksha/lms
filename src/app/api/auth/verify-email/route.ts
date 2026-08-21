import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/auth.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/login?error=INVALID_TOKEN", req.url)
      );
    }

    const result = await authService.verifyEmail(token);

    if (result.role === "TEACHER" && result.status === "PENDING_APPROVAL") {
      return NextResponse.redirect(
        new URL("/login?verified=true&pendingApproval=true", req.url)
      );
    }

    return NextResponse.redirect(
      new URL("/login?verified=true", req.url)
    );
  } catch (err: any) {
    if (err.message === "TOKEN_EXPIRED") {
      return NextResponse.redirect(
        new URL("/login?error=TOKEN_EXPIRED", req.url)
      );
    }

    return NextResponse.redirect(
      new URL("/login?error=INVALID_TOKEN", req.url)
    );
  }
}
