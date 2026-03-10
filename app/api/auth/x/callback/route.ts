import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/x-oauth";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";

initAdmin();

// Helper to get base URL
function getBaseUrl(request: NextRequest): string {
  // Try env first, then derive from request
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  // Derive from request URL
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * GET /api/auth/x/callback
 * Handles the OAuth 2.0 callback from X
 *
 * Query params (from X):
 * - code: Authorization code
 * - state: State parameter for CSRF verification
 */
export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle error from X
    if (error) {
      const errorDescription = searchParams.get("error_description") || error;
      console.error("X Auth error:", errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/settings?x_auth_error=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/settings?x_auth_error=missing_params`
      );
    }

    // Get stored values from cookies (using request.cookies)
    const storedState = request.cookies.get("x_auth_state")?.value;
    const codeVerifier = request.cookies.get("x_code_verifier")?.value;
    const userId = request.cookies.get("x_auth_user_id")?.value;

    console.log("Callback cookies:", {
      hasState: !!storedState,
      hasVerifier: !!codeVerifier,
      hasUserId: !!userId,
      receivedState: state,
      storedStateValue: storedState
    });

    // Verify state
    if (state !== storedState) {
      console.error("State mismatch:", { received: state, expected: storedState });
      return NextResponse.redirect(
        `${baseUrl}/settings?x_auth_error=state_mismatch_セッションが切れました。もう一度お試しください。`
      );
    }

    if (!codeVerifier || !userId) {
      console.error("Missing PKCE data:", { hasVerifier: !!codeVerifier, hasUserId: !!userId });
      return NextResponse.redirect(
        `${baseUrl}/settings?x_auth_error=session_expired_もう一度お試しください`
      );
    }

    const clientId = process.env.X_CLIENT_ID || process.env.X_OAUTH_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET || process.env.X_OAUTH_CLIENT_SECRET;

    if (!clientId) {
      return NextResponse.redirect(
        `${baseUrl}/settings?x_auth_error=X_CLIENT_ID未設定`
      );
    }

    const redirectUri = `${baseUrl}/api/auth/x/callback`;

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken({
      code,
      codeVerifier,
      clientId,
      clientSecret,
      redirectUri,
    });

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

    // Fetch X user profile
    let xProfile = null;
    try {
      const profileResponse = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username",
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        }
      );

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        xProfile = profileData.data;
        console.log("X Profile fetched:", xProfile);
      } else {
        console.error("Failed to fetch X profile:", await profileResponse.text());
      }
    } catch (profileError) {
      console.error("Error fetching X profile:", profileError);
    }

    // Save token and profile to Firestore
    const db = getAdminFirestore();
    await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .set({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt: expiresAt.toISOString(),
        scope: tokenResponse.scope,
        connectedAt: new Date().toISOString(),
        // X Profile info
        xUserId: xProfile?.id || null,
        xName: xProfile?.name || null,
        xUsername: xProfile?.username || null,
        xProfileImageUrl: xProfile?.profile_image_url || null,
      });

    // Redirect to settings with success and clear cookies
    const successResponse = NextResponse.redirect(
      `${baseUrl}/settings?x_auth_success=true`
    );

    // Clear cookies
    successResponse.cookies.delete("x_code_verifier");
    successResponse.cookies.delete("x_auth_state");
    successResponse.cookies.delete("x_auth_user_id");

    return successResponse;
  } catch (error) {
    console.error("X Auth callback error:", error);
    const message = error instanceof Error ? error.message : "認証に失敗しました";
    return NextResponse.redirect(
      `${baseUrl}/settings?x_auth_error=${encodeURIComponent(message)}`
    );
  }
}
