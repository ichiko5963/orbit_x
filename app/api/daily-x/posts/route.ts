import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";

initAdmin();

/**
 * GET /api/daily-x/posts
 * Get daily posts for a specific date
 * Query params:
 * - userId: Firebase user ID
 * - date: YYYY-MM-DD (defaults to today)
 * - source: "bookmark" | "trending" | "account_monitor" | "all" (defaults to "all")
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const source = searchParams.get("source") || "all";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminFirestore();

    // Get posts for the date
    const dateRef = db.collection("users").doc(userId).collection("dailyPosts").doc(date);
    const dateDoc = await dateRef.get();

    if (!dateDoc.exists) {
      return NextResponse.json({
        success: true,
        posts: [],
        date,
        meta: { totalPosts: 0 },
      });
    }

    let postsQuery: FirebaseFirestore.Query = dateRef.collection("posts");

    if (source !== "all") {
      postsQuery = postsQuery.where("source", "==", source);
    }

    const postsSnapshot = await postsQuery.get();
    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort: pending first, then by likes descending
    posts.sort((a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return (b.originalTweet?.likes || 0) - (a.originalTweet?.likes || 0);
    });

    return NextResponse.json({
      success: true,
      posts,
      date,
      meta: dateDoc.data(),
    });
  } catch (error) {
    console.error("[DailyX Posts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get posts" },
      { status: 500 }
    );
  }
}

/**
 * GET available dates
 * Query param: userId, action=dates
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminFirestore();

    if (action === "dates") {
      // Get all available dates
      const datesSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("dailyPosts")
        .orderBy("date", "desc")
        .limit(30)
        .get();

      const dates = datesSnapshot.docs.map((doc) => ({
        date: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ success: true, dates });
    }

    if (action === "update-status") {
      // Update post status
      const { date, postId, status, tweetId } = body;
      if (!date || !postId || !status) {
        return NextResponse.json({ error: "date, postId, status required" }, { status: 400 });
      }

      const postRef = db
        .collection("users")
        .doc(userId)
        .collection("dailyPosts")
        .doc(date)
        .collection("posts")
        .doc(postId);

      const updates: any = { status };
      if (status === "posted") {
        updates.postedAt = new Date().toISOString();
        if (tweetId) updates.tweetId = tweetId;
      }

      await postRef.update(updates);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[DailyX Posts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
