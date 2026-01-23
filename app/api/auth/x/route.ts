import { NextRequest, NextResponse } from "next/server";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
} from "@/lib/x-oauth";

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

    // Derive base URL from request to ensure consistency
    const requestUrl = new URL(request.url);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;
    const redirectUri = `${baseUrl}/api/auth/x/callback`;

    console.log("X Auth starting with redirectUri:", redirectUri);

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Build authorization URL
    const authUrl = buildAuthorizationUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge,
    });

    console.log("X Auth - Setting cookies and redirecting to:", authUrl);
    console.log("X Auth - State:", state);

    // Create redirect response and set cookies on it
    const response = NextResponse.redirect(authUrl);

    // Cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 600, // 10 minutes
      path: "/",
    };

    // Set cookies on the response
    response.cookies.set("x_code_verifier", codeVerifier, cookieOptions);
    response.cookies.set("x_auth_state", state, cookieOptions);
    response.cookies.set("x_auth_user_id", userId, cookieOptions);

    return response;
  } catch (error) {
    console.error("X Auth start error:", error);
    const message = error instanceof Error ? error.message : "認証開始に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
