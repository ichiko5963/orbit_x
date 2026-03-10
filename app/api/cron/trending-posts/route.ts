import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { searchTweetsWithMinLikes } from "@/lib/x-api";
import {
  generateViralPost,
  buildDailyXPost,
  getViralPatterns,
  DEFAULT_KEYWORDS,
  DailyXPost,
} from "@/lib/daily-x";
import { sendTrendingDigest } from "@/lib/discord";

initAdmin();

/**
 * Trending posts cron job
 * Runs daily at 8 PM JST (11:00 UTC)
 * Searches for posts with specific keywords that have 500+ likes in the last 24 hours
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

    console.log("[TrendingPosts] Starting trending posts search...");
    const db = getAdminFirestore();
    const today = new Date().toISOString().split("T")[0];
    const usersSnapshot = await db.collection("users").get();
    const results: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      try {
        // Get user's custom keywords or use defaults
        const settingsDoc = await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("dailyX")
          .get();

        const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
        const keywords: string[] = settings.keywords?.length > 0
          ? settings.keywords
          : DEFAULT_KEYWORDS;

        const discordWebhookUrl = settings.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;

        // Get viral patterns
        const viralPatterns = await getViralPatterns(db, userId);

        // Get user style
        const styleDoc = await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("userStyle")
          .get();
        const userStyle = styleDoc.exists ? styleDoc.data()?.promptSummary : undefined;

        const allTrendingPosts: DailyXPost[] = [];

        // Search for each keyword
        for (const keyword of keywords) {
          try {
            console.log(`[TrendingPosts] Searching: "${keyword}" min_faves:500`);

            const tweets = await searchTweetsWithMinLikes({
              keyword,
              minLikes: 500,
              maxResults: 20,
            });

            console.log(`[TrendingPosts] Found ${tweets.length} tweets for "${keyword}"`);

            // Generate posts for each tweet
            for (const tweet of tweets.slice(0, 5)) {
              try {
                const generatedText = await generateViralPost({
                  originalTweet: tweet,
                  viralPatterns,
                  userStyle,
                  factCheck: true,
                });

                const dailyPost = buildDailyXPost(
                  tweet,
                  generatedText,
                  "trending",
                  { keyword }
                );

                allTrendingPosts.push(dailyPost);
              } catch (error) {
                console.error(`[TrendingPosts] Generate error for ${tweet.id}:`, error);
              }
            }

            // Rate limiting between keywords
            await new Promise((r) => setTimeout(r, 2000));
          } catch (error) {
            console.error(`[TrendingPosts] Search error for "${keyword}":`, error);
          }
        }

        // Save to Firestore
        console.log(`[TrendingPosts] Saving ${allTrendingPosts.length} trending posts...`);
        const dateRef = db
          .collection("users")
          .doc(userId)
          .collection("dailyPosts")
          .doc(today);

        // Update or create the date document
        const dateDoc = await dateRef.get();
        if (dateDoc.exists) {
          await dateRef.update({
            trendingPostsCount: allTrendingPosts.length,
            trendingUpdatedAt: new Date().toISOString(),
          });
        } else {
          await dateRef.set({
            date: today,
            totalPosts: 0,
            trendingPostsCount: allTrendingPosts.length,
            createdAt: new Date().toISOString(),
            source: "trending",
          });
        }

        for (const post of allTrendingPosts) {
          await dateRef.collection("posts").doc(post.id).set(post);
        }

        // Send to Discord if webhook is configured
        if (discordWebhookUrl) {
          for (const keyword of keywords) {
            const keywordPosts = allTrendingPosts.filter(
              (p) => p.sourceKeyword === keyword
            );
            if (keywordPosts.length > 0) {
              await sendTrendingDigest({
                webhookUrl: discordWebhookUrl,
                keyword,
                posts: keywordPosts.map((p) => ({
                  authorUsername: p.originalTweet.authorUsername,
                  text: p.originalTweet.text,
                  likes: p.originalTweet.likes,
                  url: p.originalTweet.url,
                  suggestedPost: p.finalPostText,
                })),
              });
            }
          }
        }

        results.push({
          userId,
          trendingPosts: allTrendingPosts.length,
          keywords: keywords.length,
        });
      } catch (error) {
        console.error(`[TrendingPosts] Error for user ${userId}:`, error);
        results.push({ userId, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[TrendingPosts] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
