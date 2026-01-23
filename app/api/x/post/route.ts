import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { refreshAccessToken } from "@/lib/x-oauth";

/**
 * POST /api/x/post
 * Post a tweet using the user's OAuth 2.0 access token
 * Supports quote_tweet_id for quoting without URL in text
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, text, quoteTweetId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Get user's X auth tokens from Firestore
    const tokenDoc = await getAdminFirestore()
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();

    if (!tokenDoc.exists) {
      return NextResponse.json(
        { error: "X account not connected", code: "NOT_CONNECTED" },
        { status: 401 }
      );
    }

    const tokenData = tokenDoc.data();
    if (!tokenData?.accessToken) {
      return NextResponse.json(
        { error: "X access token not found", code: "NOT_CONNECTED" },
        { status: 401 }
      );
    }

    let accessToken = tokenData.accessToken;
    const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);

    // Check if token is expired and refresh if needed
    if (new Date() > new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
      if (!tokenData.refreshToken) {
        return NextResponse.json(
          { error: "Token expired and no refresh token", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }

      try {
        const clientId = process.env.X_OAUTH_CLIENT_ID;
        const clientSecret = process.env.X_OAUTH_CLIENT_SECRET;

        if (!clientId) {
          throw new Error("X OAuth client ID not configured");
        }

        const newTokens = await refreshAccessToken({
          refreshToken: tokenData.refreshToken,
          clientId,
          clientSecret,
        });

        accessToken = newTokens.access_token;

        // Update tokens in Firestore
        await getAdminFirestore()
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("xAuth")
          .update({
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || tokenData.refreshToken,
            expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
          });
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return NextResponse.json(
          { error: "Failed to refresh token", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }
    }

    // Build tweet payload
    const tweetPayload: { text: string; quote_tweet_id?: string } = { text };

    if (quoteTweetId) {
      tweetPayload.quote_tweet_id = quoteTweetId;
    }

    // Post tweet using X API v2
    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tweetPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("X API error:", data);

      // Check for specific error codes
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Authentication failed", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: "Permission denied. Please reconnect your X account with tweet.write permission.", code: "PERMISSION_DENIED" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: data.detail || data.title || "Failed to post tweet" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      tweet: data.data,
    });
  } catch (error) {
    console.error("X post error:", error);
    const message = error instanceof Error ? error.message : "Failed to post tweet";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
