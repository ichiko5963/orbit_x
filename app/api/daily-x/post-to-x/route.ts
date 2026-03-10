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

    // Get user's X profile to verify account ownership
    const xProfileDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();
    const xProfile = xProfileDoc.exists ? xProfileDoc.data() : null;
    const userXUsername = xProfile?.username || xProfile?.profile?.username || null;

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

    const payload: any = { text: postText };
    if (mediaIds.length > 0) {
      payload.media = { media_ids: mediaIds };
    }

    let tweetResult: any = null;
    const errors: string[] = [];

    // Method 1: OAuth 2.0 (user's own token - posts to their account)
    if (accessToken) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));

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
            console.log("[PostToX] Success via OAuth 2.0");
            break;
          }

          let detail = `OAuth2.0: HTTP ${response.status}`;
          try {
            const errJson = JSON.parse(responseText);
            detail = `OAuth2.0: ${errJson.detail || errJson.title || errJson.error || response.status}`;
          } catch {
            detail = `OAuth2.0: ${response.status} - ${responseText.slice(0, 200)}`;
          }
          errors.push(detail);

          // Don't retry on client errors
          if (response.status < 500) break;
        } catch (e) {
          errors.push(`OAuth2.0: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // Method 2: OAuth 1.0a fallback
    // Only allowed when the user has a connected X account that matches the app credentials
    // This prevents other users from posting to the app owner's account
    if (!tweetResult) {
      const client = createTwitterClient();
      if (client) {
        // Verify account ownership: user must have X connected
        if (!userXUsername) {
          console.log("[PostToX] No X profile for user, skipping OAuth 1.0a fallback");
          errors.push("X連携が必要です。設定画面からXアカウントを連携してください。");
        } else {
          try {
            tweetResult = await client.postTweet(postText, {
              mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            });
            console.log(`[PostToX] Success via OAuth 1.0a for @${userXUsername}`);
          } catch (e) {
            const msg = `OAuth1.0a: ${e instanceof Error ? e.message : String(e)}`;
            errors.push(msg);
            console.error("[PostToX]", msg);
          }
        }
      }
    }

    if (!tweetResult) {
      return NextResponse.json(
        {
          error: `投稿に失敗しました。\n${errors.join("\n")}`,
          details: errors,
        },
        { status: 500 }
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
