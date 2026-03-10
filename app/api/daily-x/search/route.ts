import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { searchRecentTweets } from "@/lib/x-api";
import {
  buildKeywordQuery,
  translateToJapanese,
  DEFAULT_KEYWORDS,
} from "@/lib/daily-x";

initAdmin();

/**
 * POST /api/daily-x/search
 * Quick search preview - returns raw tweets with translation
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

    // Get user settings
    const settingsDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("dailyX")
      .get();
    const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
    const keywords: string[] =
      settings.keywords?.length > 0 ? settings.keywords : DEFAULT_KEYWORDS;

    // 24 hours ago
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const allTweets: Array<{
      id: string;
      text: string;
      translatedText?: string;
      authorName: string;
      authorUsername: string;
      authorProfileImage?: string;
      url: string;
      likes: number;
      retweets: number;
      replies: number;
      createdAt: string;
      hasVideo: boolean;
      hasImage: boolean;
      imageUrls: string[];
      videoUrl?: string;
      videoPreviewUrl?: string;
      keyword: string;
    }> = [];

    const seenIds = new Set<string>();
    const errors: string[] = [];

    for (const keyword of keywords) {
      try {
        const query = buildKeywordQuery(keyword);
        const result = await searchRecentTweets({
          query,
          maxResults: 20,
          sortOrder: "relevancy",
          startTime,
        });

        for (const tweet of result.tweets) {
          if (seenIds.has(tweet.id)) continue;
          seenIds.add(tweet.id);

          const imageUrls = tweet.media
            .filter((m) => m.type === "photo" && m.url)
            .map((m) => m.url!);

          // Translate non-Japanese text
          let translatedText: string | undefined;
          try {
            const jpChars = (tweet.text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
            if (jpChars / tweet.text.length < 0.1) {
              const result = await translateToJapanese(tweet.text);
              if (result !== tweet.text) translatedText = result;
            }
          } catch {
            // Translation failed, skip
          }

          allTweets.push({
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
            keyword,
          });
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`"${keyword}": ${msg}`);
      }
    }

    // Sort by likes descending
    allTweets.sort((a, b) => b.likes - a.likes);

    return NextResponse.json({
      success: true,
      tweets: allTweets,
      totalKeywords: keywords.length,
      errors,
    });
  } catch (error) {
    console.error("[DailyX Search] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
