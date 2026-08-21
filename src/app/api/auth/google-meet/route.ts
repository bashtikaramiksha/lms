import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/teacher/settings", req.url));
  }

  const userRole = (session.user as any).role;
  if (userRole === "STUDENT") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const state = crypto.randomBytes(24).toString("hex");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const redirectUri = `${baseUrl}/api/auth/google-meet/callback`;
  const clientId = process.env.AUTH_GOOGLE_ID;

  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const response = clientId
    ? NextResponse.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&scope=${encodeURIComponent(
          scopes
        )}&access_type=offline&prompt=consent&state=${state}`
      )
    : NextResponse.redirect(
        new URL(`/api/auth/google-meet/callback?code=mock_google_auth_code&state=${state}`, req.url)
      );

  response.cookies.set("google_meet_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
