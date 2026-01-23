import { NextRequest, NextResponse } from "next/server";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
} from "@/lib/x-oauth";
import { cookies } from "next/headers";

/**
 * GET /api/auth/x
 * Initiates the X OAuth 2.0 PKCE flow
 *
 * Query params:
 * - userId: Firebase user ID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Try multiple env var names for flexibility
    const clientId = process.env.X_CLIENT_ID || process.env.X_OAUTH_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        {
          error: "X OAuth 2.0 Client IDが設定されていません。.env.localにX_CLIENT_IDを追加してください。X Developer Portal > Your App > Keys and tokens > OAuth 2.0 Client ID から取得できます。"
        },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/x/callback`;

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE values in secure cookies
    const cookieStore = await cookies();

    // Store code verifier (needed for token exchange)
    cookieStore.set("x_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // Store state (for CSRF protection)
    cookieStore.set("x_auth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Store user ID (to associate token with user)
    cookieStore.set("x_auth_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // Build authorization URL
    const authUrl = buildAuthorizationUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge,
    });

    // Redirect to X authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("X Auth start error:", error);
    const message = error instanceof Error ? error.message : "認証開始に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
