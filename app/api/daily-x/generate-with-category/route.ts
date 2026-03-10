import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { generateWithReference } from "@/lib/openai";
import { deepResearchTweet, buildDailyXPost } from "@/lib/daily-x";
import { XTweetWithMedia } from "@/lib/x-api";

initAdmin();

/**
 * POST /api/daily-x/generate-with-category
 * Generate 6 post patterns from a tweet using category-based reference posts
 * Body: { userId, tweet, category }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tweet, category } = body;

    if (!userId || !tweet || !category) {
      return NextResponse.json(
        { error: "userId, tweet, category are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Load reference posts from user's context (contextPosts collection)
    // Fetch all and filter in-memory to avoid needing composite index
    const contextSnap = await db
      .collection("users")
      .doc(userId)
      .collection("contextPosts")
      .limit(100)
      .get();

    let referencePosts: { text: string; tier: string; likes: number; category: string }[] = [];
    contextSnap.forEach((doc) => {
      const d = doc.data();
      referencePosts.push({
        text: d.text || d.content || "",
        tier: d.tier || "B",
        likes: d.likes || 0,
        category: d.category || "",
      });
    });

    // Filter by category first, fall back to all if none match
    const categoryPosts = referencePosts.filter((p) => p.category === category);
    if (categoryPosts.length > 0) {
      referencePosts = categoryPosts;
    }

    // Sort by tier priority (S > A > B > C) then by likes
    const tierOrder: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
    referencePosts.sort((a, b) => {
      const tierDiff = (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3);
      if (tierDiff !== 0) return tierDiff;
      return b.likes - a.likes;
    });

    // Select 6 reference posts (or repeat if less)
    const selected: string[] = [];
    for (let i = 0; i < 6; i++) {
      if (referencePosts.length > 0) {
        selected.push(referencePosts[i % referencePosts.length].text);
      }
    }

    // Load user style analysis
    let userStyle = "";
    try {
      const styleDoc = await db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("styleAnalysis")
        .get();
      if (styleDoc.exists) {
        userStyle = styleDoc.data()?.analysis || "";
      }
    } catch {
      // skip
    }

    // Deep research for context
    const researchContext = await deepResearchTweet(tweet.text);

    // Generate 6 posts in parallel (batches of 2)
    const content = tweet.translatedText || tweet.text;
    const posts: { text: string; referenceIndex: number }[] = [];

    for (let batch = 0; batch < 3; batch++) {
      const batchPromises = [];
      for (let j = 0; j < 2; j++) {
        const idx = batch * 2 + j;
        if (idx >= 6) break;
        const referenceText = selected[idx] || selected[0] || content;
        batchPromises.push(
          generateWithReference({
            content,
            templateId: "reference",
            referenceText,
            category,
            userStyle: userStyle || undefined,
            researchData: researchContext || undefined,
          }).then((text) => ({ text, referenceIndex: idx }))
            .catch((err) => ({ text: `生成エラー: ${err.message}`, referenceIndex: idx }))
        );
      }
      const results = await Promise.all(batchPromises);
      posts.push(...results);
    }

    // Save all generated posts to Firestore
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

    // Convert tweet to XTweetWithMedia format for buildDailyXPost
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
      has_video: tweet.hasVideo || false,
      has_image: tweet.hasImage || false,
      is_retweet: false,
      is_quote: false,
      original_url: tweet.url,
      video_url: tweet.videoUrl,
      video_preview_url: tweet.videoPreviewUrl,
    };

    const savedPosts = [];
    for (const p of posts) {
      const dailyPost = buildDailyXPost(xTweet, p.text, "keyword", {
        keyword: tweet.keyword,
      });
      await dateRef.collection("posts").doc(dailyPost.id).set(dailyPost);
      savedPosts.push(dailyPost);
    }

    // Update total count
    const postsSnap = await dateRef.collection("posts").count().get();
    await dateRef.update({ totalPosts: postsSnap.data().count });

    return NextResponse.json({
      success: true,
      posts: savedPosts,
      count: savedPosts.length,
    });
  } catch (error) {
    console.error("[DailyX GenerateWithCategory] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
