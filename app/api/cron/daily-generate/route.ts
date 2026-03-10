import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { getAllBookmarks, XTweetWithMedia } from "@/lib/x-api";
import {
  generateViralPost,
  buildDailyXPost,
  getViralPatterns,
  DailyXPost,
} from "@/lib/daily-x";
import { refreshAccessToken } from "@/lib/x-oauth";

initAdmin();

/**
 * Daily post generation cron job
 * Runs every morning - generates ~60 posts from bookmarks
 * Schedule: 0 21 * * * (UTC) = 6:00 AM JST
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[DailyGenerate] Starting daily post generation...");
    const db = getAdminFirestore();

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    const results: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      try {
        // Get user's X OAuth token
        const accessToken = await getUserAccessToken(db, userId);
        if (!accessToken) {
          console.log(`[DailyGenerate] No access token for user ${userId}, skipping`);
          continue;
        }

        // Get user's style
        const styleDoc = await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("userStyle")
          .get();
        const userStyle = styleDoc.exists ? styleDoc.data()?.promptSummary : undefined;

        // Get viral patterns from user's high-performing posts
        const viralPatterns = await getViralPatterns(db, userId);
        if (viralPatterns.length === 0) {
          console.log(`[DailyGenerate] No viral patterns for user ${userId}, using defaults`);
        }

        // Fetch bookmarks
        console.log(`[DailyGenerate] Fetching bookmarks for user ${userId}...`);
        const bookmarks = await getAllBookmarks({
          accessToken,
          limit: 100,
        });

        console.log(`[DailyGenerate] Got ${bookmarks.length} bookmarks`);

        // Filter out retweets and very short posts
        const eligibleTweets = bookmarks.filter(
          (t) => !t.is_retweet && t.text.length > 20
        );

        // Generate posts (up to 60)
        const targetCount = Math.min(60, eligibleTweets.length);
        const dailyPosts: DailyXPost[] = [];
        const today = new Date().toISOString().split("T")[0];

        console.log(`[DailyGenerate] Generating ${targetCount} posts...`);

        // Process in batches of 5 for parallelism
        for (let i = 0; i < targetCount; i += 5) {
          const batch = eligibleTweets.slice(i, Math.min(i + 5, targetCount));
          const batchPromises = batch.map(async (tweet) => {
            try {
              const generatedText = await generateViralPost({
                originalTweet: tweet,
                viralPatterns,
                userStyle,
                factCheck: true,
              });

              return buildDailyXPost(tweet, generatedText, "bookmark");
            } catch (error) {
              console.error(`[DailyGenerate] Failed to generate for tweet ${tweet.id}:`, error);
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          dailyPosts.push(...batchResults.filter(Boolean) as DailyXPost[]);

          // Rate limiting
          await new Promise((r) => setTimeout(r, 1000));
        }

        // Save to Firestore under dailyPosts/{date}/posts/{postId}
        console.log(`[DailyGenerate] Saving ${dailyPosts.length} posts to Firestore...`);
        const dateRef = db.collection("users").doc(userId).collection("dailyPosts").doc(today);
        await dateRef.set({
          date: today,
          totalPosts: dailyPosts.length,
          createdAt: new Date().toISOString(),
          source: "bookmarks",
        });

        for (const post of dailyPosts) {
          await dateRef.collection("posts").doc(post.id).set(post);
        }

        results.push({
          userId,
          postsGenerated: dailyPosts.length,
          date: today,
        });

        console.log(`[DailyGenerate] User ${userId}: ${dailyPosts.length} posts generated`);
      } catch (error) {
        console.error(`[DailyGenerate] Error for user ${userId}:`, error);
        results.push({ userId, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DailyGenerate] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
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

    if (!tokenDoc.exists) return null;
    const tokenData = tokenDoc.data();
    if (!tokenData?.accessToken) return null;

    const expiresAt = tokenData.expiresAt?.toDate?.() || new Date(tokenData.expiresAt);

    if (new Date() > new Date(expiresAt.getTime() - 5 * 60 * 1000)) {
      if (!tokenData.refreshToken) return null;

      const clientId = process.env.X_CLIENT_ID;
      const clientSecret = process.env.X_CLIENT_SECRET;
      if (!clientId) return null;

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
    }

    return tokenData.accessToken;
  } catch (error) {
    console.error(`[DailyGenerate] Token error for ${userId}:`, error);
    return null;
  }
}
