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
 * Upload images using OAuth 1.0a and return media IDs
 */
async function uploadImages(imageUrls: string[]): Promise<string[]> {
  const client = createTwitterClient();
  if (!client) {
    console.warn("[PostNow] Twitter client not available for media upload");
    return [];
  }

  const mediaIds: string[] = [];

  for (const imageUrl of imageUrls) {
    try {
      console.log(`[PostNow] Uploading image: ${imageUrl.slice(0, 50)}...`);
      const mediaId = await client.uploadMediaFromUrl(imageUrl);
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

    // Upload images if any (using OAuth 1.0a)
    let mediaIds: string[] = [];
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      console.log(`[PostNow] Uploading ${imageUrls.length} images...`);
      mediaIds = await uploadImages(imageUrls);
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
