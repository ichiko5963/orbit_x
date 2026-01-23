import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/x-oauth";
import { cookies } from "next/headers";
import { getAdminFirestore } from "@/lib/firebase-admin";

/**
 * GET /api/auth/x/callback
 * Handles the OAuth 2.0 callback from X
 *
 * Query params (from X):
 * - code: Authorization code
 * - state: State parameter for CSRF verification
 */
export async function GET(request: NextRequest) {
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/settings?x_auth_error=${encodeURIComponent(errorDescription)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/settings?x_auth_error=missing_params`
      );
    }

    // Get stored values from cookies
    const cookieStore = await cookies();
    const storedState = cookieStore.get("x_auth_state")?.value;
    const codeVerifier = cookieStore.get("x_code_verifier")?.value;
    const userId = cookieStore.get("x_auth_user_id")?.value;

    // Verify state
    if (state !== storedState) {
      console.error("State mismatch:", { received: state, expected: storedState });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/settings?x_auth_error=state_mismatch`
      );
    }

    if (!codeVerifier || !userId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/settings?x_auth_error=session_expired`
      );
    }

    const clientId = process.env.X_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET;

    if (!clientId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/settings?x_auth_error=config_error`
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
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

    // Save token to Firestore
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
      });

    // Clear cookies
    cookieStore.delete("x_code_verifier");
    cookieStore.delete("x_auth_state");
    cookieStore.delete("x_auth_user_id");

    // Redirect to settings with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/settings?x_auth_success=true`
    );
  } catch (error) {
    console.error("X Auth callback error:", error);
    const message = error instanceof Error ? error.message : "認証に失敗しました";
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/settings?x_auth_error=${encodeURIComponent(message)}`
    );
  }
}
