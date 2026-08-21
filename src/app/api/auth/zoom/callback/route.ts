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
      console.warn("Zoom OAuth denied or error:", errorParam);
      return NextResponse.redirect(new URL("/teacher/settings?error=zoom_denied", req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/teacher/settings?error=zoom_missing_code", req.url));
    }

    const cookieState = req.cookies.get("zoom_oauth_state")?.value;
    const codeVerifier = req.cookies.get("zoom_code_verifier")?.value;

    // Validate state if cookie was present
    if (cookieState && state && cookieState !== state) {
      console.error("Zoom OAuth CSRF state mismatch:", { cookieState, state });
      return NextResponse.redirect(new URL("/teacher/settings?error=zoom_state_mismatch", req.url));
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const redirectUri = `${baseUrl}/api/auth/zoom/callback`;

    // Exchange authorization code for tokens
    const tokens = await liveOAuthService.exchangeZoomCode(code, codeVerifier, redirectUri);

    // Fetch user details from Zoom
    const zoomUser = await liveOAuthService.fetchZoomUser(tokens.access_token);

    // Encrypt and persist
    await liveOAuthService.saveZoomTokens(session.user.id, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      userId: zoomUser.email || zoomUser.id,
    });

    const response = NextResponse.redirect(new URL("/teacher/settings?zoom=connected", req.url));

    // Clear state cookies
    response.cookies.delete("zoom_oauth_state");
    response.cookies.delete("zoom_code_verifier");

    return response;
  } catch (err: any) {
    console.error("Zoom OAuth callback error:", err);
    return NextResponse.redirect(new URL("/teacher/settings?error=zoom_exchange_failed", req.url));
  }
}
