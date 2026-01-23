import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { refreshAccessToken, isTokenExpired } from "@/lib/x-oauth";

const X_API_BASE = "https://api.twitter.com/2";

interface XBookmark {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
  author?: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
  };
}

/**
 * GET /api/x/bookmarks
 * Fetch user's bookmarks from X API
 *
 * Query params:
 * - userId: Firebase user ID (required)
 * - pagination_token: For pagination (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const paginationToken = searchParams.get("pagination_token");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get stored token from Firestore
    const db = getAdminFirestore();
    const authDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();

    if (!authDoc.exists) {
      return NextResponse.json(
        { error: "Not connected to X", code: "NOT_CONNECTED" },
        { status: 401 }
      );
    }

    const authData = authDoc.data() as {
      accessToken: string;
      refreshToken?: string;
      expiresAt: string;
      scope: string;
    };

    let accessToken = authData.accessToken;

    // Check if token is expired and refresh if needed
    if (isTokenExpired(new Date(authData.expiresAt))) {
      if (!authData.refreshToken) {
        return NextResponse.json(
          { error: "Token expired and no refresh token", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }

      try {
        const clientId = process.env.X_CLIENT_ID!;
        const clientSecret = process.env.X_CLIENT_SECRET;

        const newTokens = await refreshAccessToken({
          refreshToken: authData.refreshToken,
          clientId,
          clientSecret,
        });

        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokens.expires_in);

        // Update token in Firestore
        await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("xAuth")
          .update({
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || authData.refreshToken,
            expiresAt: newExpiresAt.toISOString(),
          });

        accessToken = newTokens.access_token;
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        return NextResponse.json(
          { error: "Failed to refresh token", code: "REFRESH_FAILED" },
          { status: 401 }
        );
      }
    }

    // First, get the authenticated user's ID
    const meResponse = await fetch(`${X_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!meResponse.ok) {
      const error = await meResponse.json();
      console.error("X API /users/me error:", error);

      let errorMessage = "ユーザー情報の取得に失敗しました";
      if (meResponse.status === 401) {
        errorMessage = "認証が無効です。設定ページでXと再連携してください。";
      } else if (meResponse.status === 429) {
        errorMessage = "X APIのレート制限に達しました。しばらく待ってから再試行してください。";
      }

      return NextResponse.json(
        { error: errorMessage, code: meResponse.status === 401 ? "TOKEN_INVALID" : `HTTP_${meResponse.status}` },
        { status: meResponse.status }
      );
    }

    const meData = await meResponse.json();
    const xUserId = meData.data.id;

    // Fetch bookmarks
    const bookmarksUrl = new URL(`${X_API_BASE}/users/${xUserId}/bookmarks`);
    bookmarksUrl.searchParams.set("max_results", "5");
    bookmarksUrl.searchParams.set(
      "tweet.fields",
      "created_at,public_metrics,author_id"
    );
    bookmarksUrl.searchParams.set(
      "user.fields",
      "name,username,profile_image_url"
    );
    bookmarksUrl.searchParams.set("expansions", "author_id");

    if (paginationToken) {
      bookmarksUrl.searchParams.set("pagination_token", paginationToken);
    }

    const bookmarksResponse = await fetch(bookmarksUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!bookmarksResponse.ok) {
      const error = await bookmarksResponse.json();
      console.error("X API bookmarks error:", error);

      // Provide more helpful error messages
      let errorMessage = "ブックマークの取得に失敗しました";

      if (bookmarksResponse.status === 429) {
        errorMessage = "X APIのレート制限に達しました。しばらく待ってから再試行してください。";
      } else if (bookmarksResponse.status === 403) {
        errorMessage = "ブックマークAPIへのアクセス権がありません。X Developer Portalで「Basic」以上のプランが必要です。";
      } else if (error?.detail || error?.title) {
        errorMessage = error.detail || error.title;
      } else if (error?.errors?.[0]?.message) {
        errorMessage = error.errors[0].message;
      }

      return NextResponse.json(
        { error: errorMessage, code: `HTTP_${bookmarksResponse.status}` },
        { status: bookmarksResponse.status }
      );
    }

    const bookmarksData = await bookmarksResponse.json();

    // Build user map for author info
    const users = new Map<string, XBookmark["author"]>();
    if (bookmarksData.includes?.users) {
      for (const user of bookmarksData.includes.users) {
        users.set(user.id, {
          id: user.id,
          name: user.name,
          username: user.username,
          profile_image_url: user.profile_image_url,
        });
      }
    }

    // Merge author info into tweets
    const bookmarks: XBookmark[] = (bookmarksData.data || []).map(
      (tweet: any) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at,
        author_id: tweet.author_id,
        public_metrics: tweet.public_metrics,
        author: users.get(tweet.author_id),
      })
    );

    return NextResponse.json({
      success: true,
      bookmarks,
      meta: bookmarksData.meta,
    });
  } catch (error) {
    console.error("Bookmarks fetch error:", error);
    const message = error instanceof Error ? error.message : "ブックマークの取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
