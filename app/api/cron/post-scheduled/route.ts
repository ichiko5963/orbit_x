import { NextRequest, NextResponse } from "next/server";
import { createTwitterClient } from "@/lib/twitter";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { refreshAccessToken } from "@/lib/x-oauth";

// Initialize Firebase Admin
initAdmin();

/**
 * Build media URL from tweet info
 * Format: https://x.com/{username}/status/{tweetId}/video/1 or /photo/1
 */
function buildMediaUrl(username: string, tweetId: string, mediaType: "video" | "photo"): string {
  const cleanTweetId = tweetId.split("?")[0];
  const suffix = mediaType === "video" ? "video/1" : "photo/1";
  return `https://x.com/${username}/status/${cleanTweetId}/${suffix}`;
}

// Post tweet using user's OAuth 2.0 token
async function postWithUserToken(
  accessToken: string,
  text: string,
  mediaInfo?: { tweetId: string; username: string; mediaType: "video" | "photo" }
): Promise<{ id: string; text: string }> {
  // Build final text with media URL if mediaInfo provided
  let finalText = text;
  if (mediaInfo?.tweetId && mediaInfo?.username && mediaInfo?.mediaType) {
    const mediaUrl = buildMediaUrl(mediaInfo.username, mediaInfo.tweetId, mediaInfo.mediaType);
    finalText = `${text.trim()}\n\n${mediaUrl}`;
  }

  const payload = { text: finalText };

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.title || "Failed to post tweet");
  }

  return data.data;
}

// Get fresh access token for user (refresh if expired)
async function getUserAccessToken(db: any, userId: string): Promise<string | null> {
  const tokenDoc = await db
    .collection("users")
    .doc(userId)
    .collection("settings")
    .doc("xAuth")
    .get();

  if (!tokenDoc.exists) {
    return null;
  }

  const tokenData = tokenDoc.data();
  if (!tokenData?.accessToken) {
    return null;
  }

  const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);

  // Check if token is expired
  if (new Date() > new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    if (!tokenData.refreshToken) {
      return null;
    }

    try {
      const clientId = process.env.X_OAUTH_CLIENT_ID;
      const clientSecret = process.env.X_OAUTH_CLIENT_SECRET;

      if (!clientId) {
        return null;
      }

      const newTokens = await refreshAccessToken({
        refreshToken: tokenData.refreshToken,
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
          refreshToken: newTokens.refresh_token || tokenData.refreshToken,
          expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
        });

      return newTokens.access_token;
    } catch {
      return null;
    }
  }

  return tokenData.accessToken;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Checking for scheduled posts...");

    const client = createTwitterClient();
    const db = getAdminFirestore();
    const now = Timestamp.now();

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    let postedCount = 0;
    let failedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Get scheduled posts that are due
      const postsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("scheduledPosts")
        .where("status", "==", "scheduled")
        .where("scheduledAt", "<=", now)
        .get();

      console.log(`[Cron] User ${userId}: ${postsSnapshot.docs.length} posts due`);

      for (const postDoc of postsSnapshot.docs) {
        const post = postDoc.data();
        const postRef = postDoc.ref;

        try {
          let result: { id: string; text: string } | undefined;

          // If post has mediaInfo, use user's OAuth token with /video/1 or /photo/1 URL
          if (post.mediaInfo) {
            const userToken = await getUserAccessToken(db, userId);
            if (!userToken) {
              throw new Error("User X token not available for media post");
            }
            result = await postWithUserToken(userToken, post.text, post.mediaInfo);
          } else if (client) {
            // Use app-level client for regular posts
            const tweetResult = await client.postTweet(post.text);
            result = tweetResult.data;
          } else {
            throw new Error("X API credentials not configured");
          }

          if (result) {
            // Update status to posted
            await postRef.update({
              status: "posted",
              postedAt: Timestamp.now(),
              tweetId: result.id,
            });
            postedCount++;
            console.log(`[Cron] Posted successfully: ${result.id}`);
          } else {
            throw new Error("No data returned from Twitter API");
          }
        } catch (error) {
          // Update status to failed
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await postRef.update({
            status: "failed",
            failedAt: Timestamp.now(),
            error: errorMessage,
          });
          failedCount++;
          console.error(`[Cron] Failed to post:`, error);
        }

        // Rate limiting: wait 1 second between posts
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Posted ${postedCount} tweets, ${failedCount} failed`,
      postedCount,
      failedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    const message = error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
