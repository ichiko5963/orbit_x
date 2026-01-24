import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { createTwitterClient } from "@/lib/twitter";

/**
 * Post a tweet using X API v2 with OAuth 2.0 Bearer token
 */
async function postTweetWithOAuth2(
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
    console.error("[PostNow] Tweet API error:", data);
    throw new Error(data.detail || data.title || JSON.stringify(data.errors) || "Failed to post tweet");
  }

  return data.data;
}

/**
 * Upload a single image using OAuth 2.0 bearer token
 * Twitter media upload v1.1 now supports OAuth 2.0 User Context
 */
async function uploadMediaWithOAuth2(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // Fetch the image
    console.log(`[PostNow] Fetching image: ${imageUrl.slice(0, 100)}...`);
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`[PostNow] Failed to fetch image: ${imageResponse.status}`);
      return null;
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const base64Data = imageBuffer.toString("base64");
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    console.log(`[PostNow] Image size: ${imageBuffer.length} bytes, type: ${contentType}`);

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
      console.error("[PostNow] Media upload error:", uploadData);
      // If OAuth 2.0 fails, try with app-level OAuth 1.0a
      console.log("[PostNow] Trying OAuth 1.0a fallback...");
      return await uploadMediaWithOAuth1Fallback(imageUrl);
    }

    console.log(`[PostNow] Media uploaded successfully: ${uploadData.media_id_string}`);
    return uploadData.media_id_string;
  } catch (error) {
    console.error("[PostNow] Error uploading media:", error);
    return null;
  }
}

/**
 * Fallback: Upload images using OAuth 1.0a (app-level)
 */
async function uploadMediaWithOAuth1Fallback(imageUrl: string): Promise<string | null> {
  const client = createTwitterClient();
  if (!client) {
    console.warn("[PostNow] Twitter client not available for OAuth 1.0a fallback");
    return null;
  }

  try {
    const mediaId = await client.uploadMediaFromUrl(imageUrl);
    return mediaId;
  } catch (error) {
    console.error("[PostNow] OAuth 1.0a fallback failed:", error);
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
      console.log(`[PostNow] Uploading image: ${imageUrl.slice(0, 50)}...`);
      const mediaId = await uploadMediaWithOAuth2(accessToken, imageUrl);
      if (mediaId) {
        mediaIds.push(mediaId);
        console.log(`[PostNow] Image uploaded, media_id: ${mediaId}`);
      }
    } catch (error) {
      console.error(`[PostNow] Failed to upload image:`, error);
    }
  }

  return mediaIds;
}

/**
 * POST /api/x/post-now
 * Immediately post a tweet with optional thread posts and images
 */
export async function POST(request: NextRequest) {
  try {
    initAdmin();
    const db = getAdminFirestore();

    const body = await request.json();
    const { userId, text, threadPosts, imageUrls, quoteTweetId } = body;

    if (!userId || !text) {
      return NextResponse.json(
        { error: "userId and text are required" },
        { status: 400 }
      );
    }

    // Get user's OAuth 2.0 access token
    const tokenDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();

    if (!tokenDoc.exists) {
      return NextResponse.json(
        { error: "X連携されていません。設定画面から連携してください。" },
        { status: 401 }
      );
    }

    const tokenData = tokenDoc.data();
    if (!tokenData?.accessToken) {
      return NextResponse.json(
        { error: "X連携が切れています。設定画面から再連携してください。" },
        { status: 401 }
      );
    }

    const accessToken = tokenData.accessToken;

    // Upload images if any (using user's OAuth 2.0 token)
    let mediaIds: string[] = [];
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      console.log(`[PostNow] Uploading ${imageUrls.length} images...`);
      mediaIds = await uploadImages(accessToken, imageUrls);
      console.log(`[PostNow] Uploaded ${mediaIds.length} images`);
    }

    // Post the main tweet (using OAuth 2.0)
    console.log(`[PostNow] Posting main tweet for user ${userId}`);
    const mainResult = await postTweetWithOAuth2(accessToken, text, {
      quoteTweetId: quoteTweetId || undefined,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    });

    console.log(`[PostNow] Main tweet posted: ${mainResult.id}`);

    let lastTweetId = mainResult.id;
    const threadResults: { id: string; text: string }[] = [];

    // Post thread replies if any
    if (threadPosts && Array.isArray(threadPosts) && threadPosts.length > 0) {
      console.log(`[PostNow] Posting ${threadPosts.length} thread replies...`);

      for (let i = 0; i < threadPosts.length; i++) {
        const threadText = threadPosts[i];
        if (!threadText || typeof threadText !== "string") continue;

        // Wait a bit between thread posts
        await new Promise((resolve) => setTimeout(resolve, 300));

        const threadResult = await postTweetWithOAuth2(accessToken, threadText, {
          replyToTweetId: lastTweetId,
        });

        console.log(`[PostNow] Thread ${i + 1} posted: ${threadResult.id}`);
        lastTweetId = threadResult.id;
        threadResults.push(threadResult);
      }
    }

    // Get user's X profile for the tweet URL
    const profileDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xProfile")
      .get();

    const username = profileDoc.data()?.username || "i";
    const tweetUrl = `https://x.com/${username}/status/${mainResult.id}`;

    return NextResponse.json({
      success: true,
      tweet: mainResult,
      threadResults,
      tweetUrl,
      mediaUploaded: mediaIds.length,
    });
  } catch (error) {
    console.error("[PostNow] Error:", error);
    const message = error instanceof Error ? error.message : "投稿に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
