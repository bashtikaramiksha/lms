import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto";
import { AppError } from "@/lib/services/course.service";

export interface IntegrationStatusDto {
  zoom: {
    connected: boolean;
    email: string | null;
  };
  googleMeet: {
    connected: boolean;
    email: string | null;
  };
}

export interface SaveZoomTokensInput {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // in seconds
  userId?: string;
}

export interface SaveGoogleTokensInput {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // in seconds
}

export class LiveOAuthService {
  /**
   * Retrieves connection status for Zoom and Google Meet for a given user.
   */
  async getIntegrationStatus(userId: string): Promise<IntegrationStatusDto> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new AppError("USER_NOT_FOUND", 404, "User not found");
    }

    return {
      zoom: {
        connected: !!user.zoomAccessToken,
        email: user.zoomUserId || null,
      },
      googleMeet: {
        connected: !!user.googleAccessToken,
        email: user.googleAccessToken ? (user.googleRefreshToken ? "Google Calendar Connected" : "Connected") : null,
      },
    };
  }

  /**
   * Exchanges Zoom authorization code for access and refresh tokens.
   */
  async exchangeZoomCode(
    code: string,
    codeVerifier?: string,
    redirectUri?: string
  ): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // In development / test without actual third-party credentials, provide simulated tokens
      return {
        access_token: `mock_zoom_access_token_${Date.now()}`,
        refresh_token: `mock_zoom_refresh_token_${Date.now()}`,
        expires_in: 3600,
      };
    }

    const defaultRedirect = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/zoom/callback`;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri || defaultRedirect,
    });

    if (codeVerifier) {
      params.append("code_verifier", codeVerifier);
    }

    const res = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new AppError("ZOOM_TOKEN_EXCHANGE_FAILED", 502, "Failed to exchange code with Zoom", errBody);
    }

    return res.json();
  }

  /**
   * Fetches the current Zoom user profile (/users/me).
   */
  async fetchZoomUser(accessToken: string): Promise<{ id: string; email?: string }> {
    if (accessToken.startsWith("mock_zoom_access_token")) {
      return { id: "mock_zoom_user_id", email: "teacher@zoom.mock" };
    }

    const res = await fetch("https://api.zoom.us/v2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      return { id: "zoom_user", email: undefined };
    }

    const data = await res.json();
    return { id: data.id, email: data.email };
  }

  /**
   * Encrypts and saves Zoom tokens into Turso.
   */
  async saveZoomTokens(userId: string, input: SaveZoomTokensInput): Promise<void> {
    const expiryDate = new Date(Date.now() + (input.expiresIn ?? 3600) * 1000).toISOString();

    await db
      .update(users)
      .set({
        zoomAccessToken: encrypt(input.accessToken),
        zoomRefreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
        zoomTokenExpiry: expiryDate,
        zoomUserId: input.userId || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Retrieves and decrypts the Zoom access token, refreshing it if expired or nearing expiry.
   */
  async getDecryptedZoomToken(userId: string): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.zoomAccessToken) {
      throw new AppError("ZOOM_NOT_CONNECTED", 422, "Zoom account is not connected");
    }

    // Refresh if expired or expiring within 5 minutes
    if (user.zoomTokenExpiry) {
      const expiryTime = new Date(user.zoomTokenExpiry).getTime();
      const fiveMinutesAhead = Date.now() + 5 * 60 * 1000;
      if (expiryTime <= fiveMinutesAhead && user.zoomRefreshToken) {
        return this.refreshZoomToken(userId, user.zoomRefreshToken);
      }
    }

    return decrypt(user.zoomAccessToken);
  }

  /**
   * Refreshes Zoom access token using the stored refresh token.
   */
  async refreshZoomToken(userId: string, encryptedRefreshToken?: string | null): Promise<string> {
    if (!encryptedRefreshToken) {
      throw new AppError("ZOOM_REFRESH_TOKEN_MISSING", 422, "No refresh token available for Zoom");
    }

    const refreshToken = decrypt(encryptedRefreshToken);
    const clientId = process.env.ZOOM_CLIENT_ID;
    const clientSecret = process.env.ZOOM_CLIENT_SECRET;

    if (!clientId || !clientSecret || refreshToken.startsWith("mock_")) {
      const newAccess = `mock_refreshed_zoom_access_${Date.now()}`;
      await this.saveZoomTokens(userId, {
        accessToken: newAccess,
        refreshToken: refreshToken,
        expiresIn: 3600,
      });
      return newAccess;
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new AppError("ZOOM_REFRESH_FAILED", 502, "Failed to refresh Zoom access token");
    }

    const data = await res.json();
    await this.saveZoomTokens(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    });

    return data.access_token;
  }

  /**
   * Clears Zoom tokens from the database.
   */
  async disconnectZoom(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        zoomAccessToken: null,
        zoomRefreshToken: null,
        zoomTokenExpiry: null,
        zoomUserId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Exchanges Google authorization code for access and refresh tokens.
   */
  async exchangeGoogleCode(
    code: string,
    redirectUri?: string
  ): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
    const clientId = process.env.AUTH_GOOGLE_ID;
    const clientSecret = process.env.AUTH_GOOGLE_SECRET;

    if (!clientId || !clientSecret) {
      return {
        access_token: `mock_google_access_token_${Date.now()}`,
        refresh_token: `mock_google_refresh_token_${Date.now()}`,
        expires_in: 3600,
      };
    }

    const defaultRedirect = `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/google-meet/callback`;
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri || defaultRedirect,
      grant_type: "authorization_code",
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new AppError("GOOGLE_TOKEN_EXCHANGE_FAILED", 502, "Failed to exchange code with Google", errBody);
    }

    return res.json();
  }

  /**
   * Encrypts and saves Google tokens into Turso.
   */
  async saveGoogleTokens(userId: string, input: SaveGoogleTokensInput): Promise<void> {
    const expiryDate = new Date(Date.now() + (input.expiresIn ?? 3600) * 1000).toISOString();

    await db
      .update(users)
      .set({
        googleAccessToken: encrypt(input.accessToken),
        googleRefreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
        googleTokenExpiry: expiryDate,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Retrieves and decrypts the Google access token, refreshing if expired.
   */
  async getDecryptedGoogleToken(userId: string): Promise<string> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.googleAccessToken) {
      throw new AppError("GOOGLE_NOT_CONNECTED", 422, "Google Meet account is not connected");
    }

    // Refresh if expired or expiring within 5 minutes
    if (user.googleTokenExpiry) {
      const expiryTime = new Date(user.googleTokenExpiry).getTime();
      const fiveMinutesAhead = Date.now() + 5 * 60 * 1000;
      if (expiryTime <= fiveMinutesAhead && user.googleRefreshToken) {
        return this.refreshGoogleToken(userId, user.googleRefreshToken);
      }
    }

    return decrypt(user.googleAccessToken);
  }

  /**
   * Refreshes Google access token using the stored refresh token.
   */
  async refreshGoogleToken(userId: string, encryptedRefreshToken?: string | null): Promise<string> {
    if (!encryptedRefreshToken) {
      throw new AppError("GOOGLE_REFRESH_TOKEN_MISSING", 422, "No refresh token available for Google Meet");
    }

    const refreshToken = decrypt(encryptedRefreshToken);
    const clientId = process.env.AUTH_GOOGLE_ID;
    const clientSecret = process.env.AUTH_GOOGLE_SECRET;

    if (!clientId || !clientSecret || refreshToken.startsWith("mock_")) {
      const newAccess = `mock_refreshed_google_access_${Date.now()}`;
      await this.saveGoogleTokens(userId, {
        accessToken: newAccess,
        refreshToken: refreshToken,
        expiresIn: 3600,
      });
      return newAccess;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      throw new AppError("GOOGLE_REFRESH_FAILED", 502, "Failed to refresh Google access token");
    }

    const data = await res.json();
    await this.saveGoogleTokens(userId, {
      accessToken: data.access_token,
      refreshToken: refreshToken,
      expiresIn: data.expires_in,
    });

    return data.access_token;
  }

  /**
   * Clears Google Meet tokens from the database.
   */
  async disconnectGoogleMeet(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));
  }
}

export const liveOAuthService = new LiveOAuthService();
