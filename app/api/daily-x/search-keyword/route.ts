import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { searchRecentTweets } from "@/lib/x-api";
import { batchKeywordQueries, translateToJapanese } from "@/lib/daily-x";

initAdmin();

/**
 * POST /api/daily-x/search-keyword
 * Search keywords (batched into minimal API calls) and save results to Firestore
 * Body: { userId, keyword } - single keyword (legacy)
 * Body: { userId, keywords } - multiple keywords (batched, preferred)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, keyword, keywords: keywordsArray, maxResults = 10 } = body;

    if (!userId || (!keyword && !keywordsArray)) {
      return NextResponse.json(
        { error: "userId and keyword(s) required" },
        { status: 400 }
      );
    }

    // Support both single keyword (legacy) and batched keywords
    const keywords: string[] = keywordsArray || [keyword];
    const batches = batchKeywordQueries(keywords);

    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let allTweets: any[] = [];

    // Execute batched queries (much fewer API calls)
    for (const batch of batches) {
      const result = await searchRecentTweets({
        query: batch.query,
        maxResults: Math.min(maxResults, 100),
        sortOrder: "relevancy",
        startTime,
      });

      // Filter out short tweets (<20 chars)
      const filteredTweets = result.tweets.filter((t) => t.text.length >= 20);

      // Process tweets: translate non-Japanese
      const processed = await Promise.all(
        filteredTweets.map(async (tweet) => {
          const imageUrls = tweet.media
            .filter((m) => m.type === "photo" && m.url)
            .map((m) => m.url!);

          let translatedText: string | undefined;
          try {
            const jpRatio =
              (tweet.text.match(/[\u3000-\u9fff\uff00-\uffef]/g) || []).length /
              tweet.text.length;
            if (jpRatio < 0.3) {
              translatedText = await translateToJapanese(tweet.text);
            }
          } catch {
            // skip
          }

          // Determine which keyword matched (best effort)
          const matchedKeyword = batch.keywords.find((kw) => {
            const lower = tweet.text.toLowerCase();
            return lower.includes(kw.toLowerCase()) || lower.includes(kw.replace(/\s+/g, "").toLowerCase());
          }) || batch.keywords[0];

          return {
            id: tweet.id,
            text: tweet.text,
            translatedText: translatedText || null,
            authorName: tweet.author_name,
            authorUsername: tweet.author_username,
            authorProfileImage: tweet.author_profile_image || null,
            url: tweet.original_url,
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
            createdAt: tweet.created_at,
            hasVideo: tweet.has_video,
            hasImage: tweet.has_image,
            imageUrls,
            videoUrl: tweet.video_url || null,
            videoMp4Url: tweet.video_mp4_url || null,
            videoPreviewUrl: tweet.video_preview_url || null,
            keyword: matchedKeyword,
          };
        })
      );

      allTweets = [...allTweets, ...processed];
    }

    // Sort by likes and take top N
    allTweets.sort((a, b) => b.likes - a.likes);
    allTweets = allTweets.slice(0, maxResults);

    // Save to Firestore
    const db = getAdminFirestore();
    const today = new Date().toISOString().split("T")[0];
    const cacheRef = db
      .collection("users")
      .doc(userId)
      .collection("searchCache")
      .doc(today);

    // Get existing tweets to merge (avoid duplicates)
    const existing = await cacheRef.get();
    const existingTweets: any[] = existing.exists
      ? existing.data()?.tweets || []
      : [];

    const existingIds = new Set(existingTweets.map((t: any) => t.id));
    const newTweets = allTweets.filter((t) => !existingIds.has(t.id));
    const mergedTweets = [...existingTweets, ...newTweets];

    // Get existing completed keywords
    const completedKeywords: string[] = existing.exists
      ? existing.data()?.completedKeywords || []
      : [];
    for (const kw of keywords) {
      if (!completedKeywords.includes(kw)) {
        completedKeywords.push(kw);
      }
    }

    await cacheRef.set(
      {
        date: today,
        tweets: mergedTweets,
        completedKeywords,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      keywords,
      batchCount: batches.length,
      tweetsFound: allTweets.length,
      totalCached: mergedTweets.length,
    });
  } catch (error) {
    console.error("[SearchKeyword] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
