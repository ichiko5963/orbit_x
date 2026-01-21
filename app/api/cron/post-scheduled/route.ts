import { NextRequest, NextResponse } from "next/server";
import { createTwitterClient } from "@/lib/twitter";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

// Initialize Firebase Admin
initAdmin();

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional security measure)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Checking for scheduled posts...");

    const client = createTwitterClient();
    if (!client) {
      return NextResponse.json({
        success: false,
        message: "X API credentials not configured",
      });
    }

    const db = getAdminFirestore();
    const now = Timestamp.now();

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    let postedCount = 0;
    let failedCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Get scheduled posts that are due
      const postsSnapshot = await db
        .collection("users")
        .doc(userId)
        .collection("scheduledPosts")
        .where("status", "==", "scheduled")
        .where("scheduledAt", "<=", now)
        .get();

      console.log(`[Cron] User ${userId}: ${postsSnapshot.docs.length} posts due`);

      for (const postDoc of postsSnapshot.docs) {
        const post = postDoc.data();
        const postRef = postDoc.ref;

        try {
          // Post to Twitter
          const result = await client.postTweet(post.text);

          if (result.data) {
            // Update status to posted
            await postRef.update({
              status: "posted",
              postedAt: Timestamp.now(),
              tweetId: result.data.id,
            });
            postedCount++;
            console.log(`[Cron] Posted successfully: ${result.data.id}`);
          } else {
            throw new Error("No data returned from Twitter API");
          }
        } catch (error) {
          // Update status to failed
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await postRef.update({
            status: "failed",
            failedAt: Timestamp.now(),
            error: errorMessage,
          });
          failedCount++;
          console.error(`[Cron] Failed to post:`, error);
        }

        // Rate limiting: wait 1 second between posts
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      message: `Posted ${postedCount} tweets, ${failedCount} failed`,
      postedCount,
      failedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    const message = error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
