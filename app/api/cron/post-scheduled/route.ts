import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { refreshAccessToken } from "@/lib/x-oauth";
import { createTwitterClient } from "@/lib/twitter";

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
 * Upload a single image using OAuth 2.0 bearer token
 */
async function uploadMediaWithOAuth2(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // Fetch the image
    console.log(`[Cron] Fetching image: ${imageUrl.slice(0, 100)}...`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`[Cron] Failed to fetch image: ${imageResponse.status}`);
      return null;
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64Data = imageBuffer.toString("base64");
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    console.log(`[Cron] Image size: ${imageBuffer.length} bytes, type: ${contentType}`);

    // Upload to Twitter using OAuth 2.0
    const formData = new URLSearchParams();
    formData.append("media_data", base64Data);

    // Determine media_category based on content type
    if (contentType.includes("gif")) {
      formData.append("media_category", "tweet_gif");
    } else if (contentType.includes("video")) {
      formData.append("media_category", "tweet_video");
    } else {
      formData.append("media_category", "tweet_image");
    }

    const uploadResponse = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error("[Cron] Media upload error:", uploadData);
      // If OAuth 2.0 fails, try with app-level OAuth 1.0a
      console.log("[Cron] Trying OAuth 1.0a fallback...");
      return await uploadMediaWithOAuth1Fallback(imageUrl);
    }

    console.log(`[Cron] Media uploaded successfully: ${uploadData.media_id_string}`);
    return uploadData.media_id_string;
  } catch (error) {
    console.error("[Cron] Error uploading media:", error);
    return null;
  }
}

/**
 * Fallback: Upload images using OAuth 1.0a (app-level)
 */
async function uploadMediaWithOAuth1Fallback(imageUrl: string): Promise<string | null> {
  const client = createTwitterClient();
  if (!client) {
    console.warn("[Cron] Twitter client not available for OAuth 1.0a fallback");
    return null;
  }

  try {
    const mediaId = await client.uploadMediaFromUrl(imageUrl);
    return mediaId;
  } catch (error) {
    console.error("[Cron] OAuth 1.0a fallback failed:", error);
    return null;
  }
}

/**
 * Upload images using user's OAuth 2.0 token
 */
async function uploadImages(accessToken: string, imageUrls: string[]): Promise<string[]> {
  const mediaIds: string[] = [];

  for (const imageUrl of imageUrls) {
    try {
      console.log(`[Cron] Uploading image: ${imageUrl.slice(0, 50)}...`);
      const mediaId = await uploadMediaWithOAuth2(accessToken, imageUrl);
      if (mediaId) {
        mediaIds.push(mediaId);
        console.log(`[Cron] Image uploaded, media_id: ${mediaId}`);
      }
    } catch (error) {
      console.error(`[Cron] Failed to upload image:`, error);
    }
  }

  return mediaIds;
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

          // Upload images if any (using user's OAuth 2.0 token)
          let mediaIds: string[] = [];
          if (post.imageUrls && Array.isArray(post.imageUrls) && post.imageUrls.length > 0) {
            console.log(`[Cron] Uploading ${post.imageUrls.length} images...`);
            mediaIds = await uploadImages(accessToken, post.imageUrls);
            console.log(`[Cron] Uploaded ${mediaIds.length} images`);
          }

          // Post the main tweet
          const mainResult = await postTweet(accessToken, post.text, {
            quoteTweetId: post.quoteTweetId,
            mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
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
