import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { generateViralPost, buildDailyXPost, deepResearchTweet } from "@/lib/daily-x";
import { XTweetWithMedia } from "@/lib/x-api";

initAdmin();

/**
 * POST /api/daily-x/generate-from-tweet
 * Generate a viral post from a specific tweet
 * Body: { userId, tweet: SearchTweet }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tweet } = body;

    if (!userId || !tweet) {
      return NextResponse.json(
        { error: "userId and tweet are required" },
        { status: 400 }
      );
    }

    // Convert search tweet format to XTweetWithMedia
    const xTweet: XTweetWithMedia = {
      id: tweet.id,
      text: tweet.text,
      created_at: tweet.createdAt,
      author_id: "",
      author_name: tweet.authorName,
      author_username: tweet.authorUsername,
      author_profile_image: tweet.authorProfileImage,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      impressions: 0,
      media: [],
      has_video: tweet.hasVideo,
      has_image: tweet.hasImage,
      is_retweet: false,
      is_quote: false,
      original_url: tweet.url,
      video_url: tweet.videoUrl,
      video_mp4_url: tweet.videoMp4Url,
      video_preview_url: tweet.videoPreviewUrl,
    };

    // Reconstruct media from imageUrls
    if (tweet.imageUrls) {
      for (const url of tweet.imageUrls) {
        xTweet.media.push({
          media_key: `photo_${url}`,
          type: "photo",
          url,
        });
      }
    }

    // Deep research: search web for additional context
    const researchContext = await deepResearchTweet(xTweet.text);

    const tweetSource = tweet.source || "keyword";
    const generatedText = await generateViralPost({
      originalTweet: xTweet,
      factCheck: true,
      researchContext: researchContext || undefined,
      source: tweetSource,
    });

    const source = tweetSource;
    const dailyPost = buildDailyXPost(xTweet, generatedText, source, {
      keyword: tweet.keyword,
    });

    // Save to Firestore
    const db = getAdminFirestore();
    const today = new Date().toISOString().split("T")[0];
    const dateRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyPosts")
      .doc(today);

    const dateDoc = await dateRef.get();
    if (!dateDoc.exists) {
      await dateRef.set({
        date: today,
        totalPosts: 0,
        createdAt: new Date().toISOString(),
        source: "keyword",
      });
    }

    await dateRef.collection("posts").doc(dailyPost.id).set(dailyPost);

    // Update total count
    const postsSnap = await dateRef.collection("posts").count().get();
    await dateRef.update({ totalPosts: postsSnap.data().count });

    return NextResponse.json({
      success: true,
      post: dailyPost,
    });
  } catch (error) {
    console.error("[DailyX GenerateFromTweet] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
