import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { refreshAccessToken } from "@/lib/x-oauth";
import { createTwitterClient } from "@/lib/twitter";

initAdmin();

/**
 * POST /api/daily-x/post-to-x
 * Post a daily-x post directly to X
 * Body: { userId, date, postId, text?, imageUrls? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, postId, text: customText, imageUrls: customImageUrls } = body;

    if (!userId || !date || !postId) {
      return NextResponse.json(
        { error: "userId, date, postId are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Get the post
    const postRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyPosts")
      .doc(date)
      .collection("posts")
      .doc(postId);

    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postDoc.data()!;
    const postText = customText || post.finalPostText;
    const imageUrls = customImageUrls || post.mediaImageUrls || [];

    // Get user's X OAuth 2.0 access token
    const accessToken = await getUserAccessToken(db, userId);

    // Upload images if any (via OAuth 1.0a - media upload requires v1.1)
    let mediaIds: string[] = [];
    if (imageUrls.length > 0 && !post.originalTweet?.hasVideo) {
      const client = createTwitterClient();
      if (client) {
        for (const imgUrl of imageUrls.slice(0, 4)) {
          try {
            const mediaId = await client.uploadMediaFromUrl(imgUrl);
            if (mediaId) mediaIds.push(mediaId);
          } catch (error) {
            console.error("[PostToX] Image upload error:", error);
          }
        }
      }
    }

    // Post using the user's own OAuth 2.0 token ONLY
    // Never fall back to app credentials (OAuth 1.0a) to prevent posting to wrong account
    if (!accessToken) {
      return NextResponse.json(
        {
          error: "X連携が必要です。設定画面からXアカウントを連携してください。",
          details: ["ユーザートークンなし（X連携未設定 or 期限切れ）"],
        },
        { status: 401 }
      );
    }

    const payload: any = { text: postText };
    if (mediaIds.length > 0) {
      payload.media = { media_ids: mediaIds };
    }

    // Try posting with retry for 5xx errors (X API temporary outages)
    let tweetResult: any = null;
    let lastError = "";
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[PostToX] Retry attempt ${attempt + 1}/${maxRetries}...`);
          await new Promise((r) => setTimeout(r, 2000 * attempt)); // 2s, 4s wait
        }

        const response = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();

        if (response.ok) {
          tweetResult = JSON.parse(responseText);
          break; // Success!
        }

        // Parse error detail
        let detail = `HTTP ${response.status}`;
        try {
          const errJson = JSON.parse(responseText);
          detail = errJson.detail || errJson.title || errJson.error || `HTTP ${response.status}`;
        } catch {
          detail = `${response.status} - ${responseText.slice(0, 200)}`;
        }
        lastError = detail;

        // Only retry on 5xx (server errors) - don't retry on 4xx (client errors)
        if (response.status < 500) {
          return NextResponse.json(
            { error: `投稿に失敗しました: ${detail}` },
            { status: response.status }
          );
        }

        console.warn(`[PostToX] Server error (${response.status}), will retry...`);
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (attempt === maxRetries - 1) {
          return NextResponse.json(
            { error: `投稿に失敗しました: ${lastError}` },
            { status: 500 }
          );
        }
      }
    }

    if (!tweetResult) {
      return NextResponse.json(
        { error: `X APIが一時的に利用できません（${maxRetries}回リトライ後）: ${lastError}` },
        { status: 503 }
      );
    }

    // Update post status
    await postRef.update({
      status: "posted",
      postedAt: new Date().toISOString(),
      tweetId: tweetResult.data?.id || null,
    });

    return NextResponse.json({
      success: true,
      tweetId: tweetResult.data?.id,
      text: postText,
    });
  } catch (error) {
    console.error("[PostToX] Unhandled error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to post" },
      { status: 500 }
    );
  }
}

async function getUserAccessToken(db: any, userId: string): Promise<string | null> {
  try {
    const tokenDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();

    if (!tokenDoc.exists) {
      console.log("[PostToX] No xAuth doc for user", userId);
      return null;
    }
    const tokenData = tokenDoc.data();
    if (!tokenData?.accessToken) {
      console.log("[PostToX] No accessToken in xAuth doc");
      return null;
    }

    const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);

    if (new Date() > new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
      if (!tokenData.refreshToken) {
        console.log("[PostToX] Token expired and no refreshToken");
        return null;
      }

      const clientId = process.env.X_CLIENT_ID;
      const clientSecret = process.env.X_CLIENT_SECRET;
      if (!clientId) {
        console.log("[PostToX] No X_CLIENT_ID for token refresh");
        return null;
      }

      try {
        const newTokens = await refreshAccessToken({
          refreshToken: tokenData.refreshToken,
          clientId,
          clientSecret,
        });

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
      } catch (e) {
        console.error("[PostToX] Token refresh failed:", e);
        return null;
      }
    }

    return tokenData.accessToken;
  } catch (e) {
    console.error("[PostToX] getUserAccessToken error:", e);
    return null;
  }
}
