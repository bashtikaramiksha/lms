import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/teacher/settings", req.url));
  }

  const userRole = (session.user as any).role;
  if (userRole === "STUDENT") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Generate PKCE code verifier and challenge
  const verifierBytes = crypto.randomBytes(32);
  const codeVerifier = base64UrlEncode(verifierBytes);
  const challengeHash = crypto.createHash("sha256").update(codeVerifier).digest();
  const codeChallenge = base64UrlEncode(challengeHash);

  // Generate CSRF state
  const state = crypto.randomBytes(24).toString("hex");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/zoom/callback`;
  const clientId = process.env.ZOOM_CLIENT_ID;

  const response = clientId
    ? NextResponse.redirect(
        `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`
      )
    : NextResponse.redirect(
        new URL(`/api/auth/zoom/callback?code=mock_zoom_auth_code&state=${state}`, req.url)
      );

  // Store state and verifier in HttpOnly cookies for callback verification
  response.cookies.set("zoom_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  response.cookies.set("zoom_code_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return response;
}
