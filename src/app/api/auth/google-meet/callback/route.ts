import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { liveOAuthService } from "@/lib/services/live-oauth.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login?callbackUrl=/teacher/settings", req.url));
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      console.warn("Google Meet OAuth denied or error:", errorParam);
      return NextResponse.redirect(new URL("/teacher/settings?error=google_denied", req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/teacher/settings?error=google_missing_code", req.url));
    }

    const cookieState = req.cookies.get("google_meet_oauth_state")?.value;
    if (cookieState && state && cookieState !== state) {
      console.error("Google OAuth CSRF state mismatch:", { cookieState, state });
      return NextResponse.redirect(new URL("/teacher/settings?error=google_state_mismatch", req.url));
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const redirectUri = `${baseUrl}/api/auth/google-meet/callback`;

    // Exchange code for Google tokens
    const tokens = await liveOAuthService.exchangeGoogleCode(code, redirectUri);

    // Save tokens encrypted
    await liveOAuthService.saveGoogleTokens(session.user.id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    const response = NextResponse.redirect(new URL("/teacher/settings?google=connected", req.url));
    response.cookies.delete("google_meet_oauth_state");

    return response;
  } catch (err: any) {
    console.error("Google Meet OAuth callback error:", err);
    return NextResponse.redirect(new URL("/teacher/settings?error=google_exchange_failed", req.url));
  }
}
