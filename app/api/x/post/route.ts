import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { refreshAccessToken } from "@/lib/x-oauth";

/**
 * Build media URL from tweet info
 * Format: https://x.com/{username}/status/{tweetId}/video/1 or /photo/1
 */
function buildMediaUrl(username: string, tweetId: string, mediaType: "video" | "photo"): string {
  const cleanTweetId = tweetId.split("?")[0];
  const suffix = mediaType === "video" ? "video/1" : "photo/1";
  return `https://x.com/${username}/status/${cleanTweetId}/${suffix}`;
}

/**
 * POST /api/x/post
 * Post a tweet using the user's OAuth 2.0 access token
 * Supports mediaInfo for embedding media via /video/1 or /photo/1 URL
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, text, mediaInfo } = await request.json() as {
      userId: string;
      text: string;
      mediaInfo?: {
        tweetId: string;
        username: string;
        mediaType: "video" | "photo";
      };
    };

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

    // Build tweet text with media URL if mediaInfo provided
    let finalText = text;
    if (mediaInfo?.tweetId && mediaInfo?.username && mediaInfo?.mediaType) {
      const mediaUrl = buildMediaUrl(mediaInfo.username, mediaInfo.tweetId, mediaInfo.mediaType);
      // Append media URL to end of text (on new line)
      finalText = `${text.trim()}\n\n${mediaUrl}`;
    }

    console.log("[X Post] Posting tweet:", {
      textLength: finalText.length,
      hasMediaInfo: !!mediaInfo,
      textPreview: finalText.substring(0, 100) + "...",
    });

    // Build tweet payload (text only, no quote_tweet_id)
    const tweetPayload = { text: finalText };

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

    console.log("[X Post] X API response:", {
      status: response.status,
      ok: response.ok,
      data: JSON.stringify(data).substring(0, 500),
    });

    if (!response.ok) {
      console.error("[X Post] X API error:", response.status, data);

      // Check for specific error codes
      if (response.status === 401) {
        return NextResponse.json(
          { error: "認証エラー: トークンが無効です。Xアカウントを再連携してください。", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: "権限エラー: tweet.write権限が必要です。Xアカウントを再連携してください。", code: "PERMISSION_DENIED" },
          { status: 403 }
        );
      }

      // X API returns errors in various formats
      const errorMsg = data.detail || data.title || data.errors?.[0]?.message || "投稿に失敗しました";
      return NextResponse.json(
        { error: errorMsg },
        { status: response.status }
      );
    }

    // Log success
    console.log("[X Post] Tweet posted successfully:", data.data?.id);

    // Get username from tokenData to build tweet URL
    const tweetUrl = data.data?.id ? `https://x.com/i/status/${data.data.id}` : undefined;

    return NextResponse.json({
      success: true,
      tweet: data.data,
      tweetUrl,
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
