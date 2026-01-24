import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { refreshAccessToken } from "@/lib/x-oauth";

// Initialize Firebase Admin
initAdmin();

/**
 * Post a tweet using X API v2 with OAuth 2.0 Bearer token
 */
async function postTweet(
  accessToken: string,
  text: string,
  options?: {
    replyToTweetId?: string;
    quoteTweetId?: string;
    mediaIds?: string[];
  }
): Promise<{ id: string; text: string }> {
  const payload: any = { text };

  if (options?.replyToTweetId) {
    payload.reply = { in_reply_to_tweet_id: options.replyToTweetId };
  }

  if (options?.quoteTweetId) {
    payload.quote_tweet_id = options.quoteTweetId;
  }

  if (options?.mediaIds && options.mediaIds.length > 0) {
    payload.media = { media_ids: options.mediaIds };
  }

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
    console.error("[Cron] Tweet API error:", data);
    throw new Error(data.detail || data.title || JSON.stringify(data.errors) || "Failed to post tweet");
  }

  return data.data;
}

/**
 * Upload media to X API (OAuth 1.0a is required for media upload)
 * For now, we'll skip media upload and just post text
 * TODO: Implement media upload with OAuth 1.0a chunked upload
 */
async function uploadMedia(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error("[Cron] Failed to fetch image:", imageUrl);
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // X API v1.1 media upload (requires OAuth 1.0a)
    // For OAuth 2.0, we need to use a different approach or skip media
    // This is a simplified version that may not work with OAuth 2.0
    console.log("[Cron] Media upload not yet implemented for OAuth 2.0");
    return null;
  } catch (error) {
    console.error("[Cron] Media upload error:", error);
    return null;
  }
}

/**
 * Get fresh access token for user (refresh if expired)
 */
async function getUserAccessToken(db: any, userId: string): Promise<string | null> {
  try {
    const tokenDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();

    if (!tokenDoc.exists) {
      console.log(`[Cron] No xAuth token for user ${userId}`);
      return null;
    }

    const tokenData = tokenDoc.data();
    if (!tokenData?.accessToken) {
      console.log(`[Cron] No accessToken in xAuth for user ${userId}`);
      return null;
    }

    const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);

    // Check if token is expired (5 minute buffer)
    if (new Date() > new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
      console.log(`[Cron] Token expired for user ${userId}, refreshing...`);

      if (!tokenData.refreshToken) {
        console.log(`[Cron] No refresh token available for user ${userId}`);
        return null;
      }

      try {
        const clientId = process.env.X_CLIENT_ID || process.env.X_OAUTH_CLIENT_ID;
        const clientSecret = process.env.X_CLIENT_SECRET || process.env.X_OAUTH_CLIENT_SECRET;

        if (!clientId) {
          console.error("[Cron] X_CLIENT_ID not configured");
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

        console.log(`[Cron] Token refreshed for user ${userId}`);
        return newTokens.access_token;
      } catch (error) {
        console.error(`[Cron] Failed to refresh token for user ${userId}:`, error);
        return null;
      }
    }

    return tokenData.accessToken;
  } catch (error) {
    console.error(`[Cron] Error getting token for user ${userId}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this automatically)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      console.log("[Cron] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting scheduled posts check...");

    const db = getAdminFirestore();
    const now = Timestamp.now();

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    let postedCount = 0;
    let failedCount = 0;
    const results: any[] = [];

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

      if (postsSnapshot.docs.length === 0) {
        continue;
      }

      console.log(`[Cron] User ${userId}: ${postsSnapshot.docs.length} posts due`);

      // Get user's access token
      const accessToken = await getUserAccessToken(db, userId);
      if (!accessToken) {
        console.error(`[Cron] No valid access token for user ${userId}`);
        // Mark all posts as failed
        for (const postDoc of postsSnapshot.docs) {
          await postDoc.ref.update({
            status: "failed",
            failedAt: Timestamp.now(),
            error: "X連携が切れています。設定画面から再連携してください。",
          });
          failedCount++;
        }
        continue;
      }

      for (const postDoc of postsSnapshot.docs) {
        const post = postDoc.data();
        const postRef = postDoc.ref;

        try {
          console.log(`[Cron] Posting for user ${userId}: "${post.text.slice(0, 50)}..."`);

          // Post the main tweet
          const mainResult = await postTweet(accessToken, post.text, {
            quoteTweetId: post.quoteTweetId,
          });

          console.log(`[Cron] Main tweet posted: ${mainResult.id}`);

          let lastTweetId = mainResult.id;

          // Post thread replies if any
          if (post.threadPosts && Array.isArray(post.threadPosts) && post.threadPosts.length > 0) {
            console.log(`[Cron] Posting ${post.threadPosts.length} thread replies...`);

            for (let i = 0; i < post.threadPosts.length; i++) {
              const threadText = post.threadPosts[i];
              if (!threadText || typeof threadText !== "string") continue;

              // Wait a bit between thread posts to avoid rate limiting
              await new Promise((resolve) => setTimeout(resolve, 500));

              const threadResult = await postTweet(accessToken, threadText, {
                replyToTweetId: lastTweetId,
              });

              console.log(`[Cron] Thread ${i + 1} posted: ${threadResult.id}`);
              lastTweetId = threadResult.id;
            }
          }

          // Update status to posted
          await postRef.update({
            status: "posted",
            postedAt: Timestamp.now(),
            tweetId: mainResult.id,
          });

          postedCount++;
          results.push({
            userId,
            postId: postDoc.id,
            tweetId: mainResult.id,
            status: "posted",
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`[Cron] Failed to post for user ${userId}:`, errorMessage);

          await postRef.update({
            status: "failed",
            failedAt: Timestamp.now(),
            error: errorMessage,
          });

          failedCount++;
          results.push({
            userId,
            postId: postDoc.id,
            status: "failed",
            error: errorMessage,
          });
        }

        // Rate limiting: wait between posts
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`[Cron] Completed: ${postedCount} posted, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Posted ${postedCount} tweets, ${failedCount} failed`,
      postedCount,
      failedCount,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Fatal error:", error);
    const message = error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
