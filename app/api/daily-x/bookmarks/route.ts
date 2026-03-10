import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { getBookmarksWithMedia } from "@/lib/x-api";
import { refreshAccessToken } from "@/lib/x-oauth";
import { translateToJapanese } from "@/lib/daily-x";

initAdmin();

/**
 * Refresh token if expired
 */
async function getValidAccessToken(
  db: FirebaseFirestore.Firestore,
  userId: string
): Promise<string | null> {
  const xAuthDoc = await db
    .collection("users")
    .doc(userId)
    .collection("settings")
    .doc("xAuth")
    .get();

  if (!xAuthDoc.exists) return null;
  const data = xAuthDoc.data();
  if (!data?.accessToken) return null;

  const expiresAt =
    data.expiresAt?.toDate?.() || new Date(data.expiresAt);
  const now = new Date();

  // Still valid (5 min buffer)
  if (now < new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
    return data.accessToken;
  }

  // Try refresh
  if (!data.refreshToken) return null;

  const clientId = process.env.X_CLIENT_ID || process.env.X_OAUTH_CLIENT_ID;
  const clientSecret =
    process.env.X_CLIENT_SECRET || process.env.X_OAUTH_CLIENT_SECRET;
  if (!clientId) return null;

  try {
    const newTokens = await refreshAccessToken({
      refreshToken: data.refreshToken,
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
        refreshToken: newTokens.refresh_token || data.refreshToken,
        expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
      });

    return newTokens.access_token;
  } catch {
    return null;
  }
}

/**
 * POST /api/daily-x/bookmarks
 * Fetch user's bookmarked tweets with translation
 * Body: { userId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const accessToken = await getValidAccessToken(db, userId);

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: "X未連携または認証期限切れです。設定からX連携してください。",
        needsAuth: true,
      });
    }

    const result = await getBookmarksWithMedia({
      accessToken,
      maxResults: 50,
    });

    const tweets = await Promise.all(
      result.tweets.map(async (tweet) => {
        const imageUrls = tweet.media
          .filter((m) => m.type === "photo" && m.url)
          .map((m) => m.url!);

        let translatedText: string | undefined;
        try {
          const jpChars = (tweet.text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
          if (jpChars / tweet.text.length < 0.1) {
            const result = await translateToJapanese(tweet.text);
            if (result !== tweet.text) translatedText = result;
          }
        } catch {
          // skip
        }

        return {
          id: tweet.id,
          text: tweet.text,
          translatedText,
          authorName: tweet.author_name,
          authorUsername: tweet.author_username,
          authorProfileImage: tweet.author_profile_image,
          url: tweet.original_url,
          likes: tweet.likes,
          retweets: tweet.retweets,
          replies: tweet.replies,
          createdAt: tweet.created_at,
          hasVideo: tweet.has_video,
          hasImage: tweet.has_image,
          imageUrls,
          videoUrl: tweet.video_url,
          videoPreviewUrl: tweet.video_preview_url,
          keyword: "bookmark",
        };
      })
    );

    return NextResponse.json({
      success: true,
      tweets,
    });
  } catch (error) {
    console.error("[DailyX Bookmarks] Error:", error);
    const message = error instanceof Error ? error.message : "ブックマーク取得に失敗しました";
    return NextResponse.json({
      success: false,
      error: message,
    });
  }
}
