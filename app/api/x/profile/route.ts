import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { refreshAccessToken } from "@/lib/x-oauth";

/**
 * Refresh expired access token using refresh token
 */
async function refreshTokenIfNeeded(
  db: FirebaseFirestore.Firestore,
  userId: string,
  xAuthData: FirebaseFirestore.DocumentData
): Promise<{ accessToken: string; refreshed: boolean } | null> {
  const expiresAt = xAuthData.expiresAt?.toDate?.() || new Date(xAuthData.expiresAt);
  const now = new Date();

  // Check if token is expired or about to expire (5 minute buffer)
  if (now < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    // Token is still valid
    return { accessToken: xAuthData.accessToken, refreshed: false };
  }

  // Token is expired, try to refresh
  if (!xAuthData.refreshToken) {
    console.log(`[X Profile] No refresh token available for user ${userId}`);
    return null;
  }

  try {
    const clientId = process.env.X_CLIENT_ID || process.env.X_OAUTH_CLIENT_ID;
    const clientSecret = process.env.X_CLIENT_SECRET || process.env.X_OAUTH_CLIENT_SECRET;

    if (!clientId) {
      console.error("[X Profile] X_CLIENT_ID not configured");
      return null;
    }

    console.log(`[X Profile] Refreshing token for user ${userId}...`);

    const newTokens = await refreshAccessToken({
      refreshToken: xAuthData.refreshToken,
      clientId,
      clientSecret,
    });

    // Update tokens in Firestore
    await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .update({
        accessToken: newTokens.access_token,
        refreshToken: newTokens.refresh_token || xAuthData.refreshToken,
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
      });

    console.log(`[X Profile] Token refreshed successfully for user ${userId}`);
    return { accessToken: newTokens.access_token, refreshed: true };
  } catch (error) {
    console.error(`[X Profile] Failed to refresh token for user ${userId}:`, error);
    return null;
  }
}

/**
 * GET /api/x/profile
 * Get the user's connected X profile info from Firestore
 * Auto-refreshes expired tokens if refresh token is available
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

    const db = getAdminFirestore();
    const xAuthDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();

    if (!xAuthDoc.exists) {
      return NextResponse.json({
        connected: false,
        message: "X未連携",
      });
    }

    const xAuthData = xAuthDoc.data();

    if (!xAuthData?.accessToken) {
      return NextResponse.json({
        connected: false,
        message: "X未連携",
      });
    }

    // Try to refresh token if expired
    const tokenResult = await refreshTokenIfNeeded(db, userId, xAuthData);

    if (!tokenResult) {
      // Token expired and couldn't refresh - need to reconnect
      return NextResponse.json({
        connected: false,
        expired: true,
        message: "X連携の有効期限が切れています。再連携してください。",
      });
    }

    // Token is valid (either still valid or successfully refreshed)
    return NextResponse.json({
      connected: true,
      profile: {
        id: xAuthData.xUserId,
        name: xAuthData.xName,
        username: xAuthData.xUsername,
        profileImageUrl: xAuthData.xProfileImageUrl,
      },
      connectedAt: xAuthData.connectedAt,
      tokenRefreshed: tokenResult.refreshed,
    });
  } catch (error) {
    console.error("X profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch X profile" },
      { status: 500 }
    );
  }
}
