import { NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { refreshAccessToken } from "@/lib/x-oauth";
import { createTwitterClient } from "@/lib/twitter";

initAdmin();

/**
 * GET /api/cron/scheduled-posts
 * Execute scheduled posts that are due
 */
export async function GET() {
  try {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    // Find all users
    const usersSnap = await db.collection("users").get();
    let posted = 0;
    let errors = 0;

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;

      // Get all dailyPosts dates
      const datesSnap = await db
        .collection("users")
        .doc(userId)
        .collection("dailyPosts")
        .get();

      for (const dateDoc of datesSnap.docs) {
        const postsSnap = await dateDoc.ref
          .collection("posts")
          .where("status", "==", "scheduled")
          .get();

        for (const postDoc of postsSnap.docs) {
          const post = postDoc.data();
          if (!post.scheduledAt || post.scheduledAt > now) continue;

          // Time to post!
          try {
            const accessToken = await getUserAccessToken(db, userId);
            if (!accessToken) {
              console.error(`[ScheduledPosts] No access token for user ${userId}`);
              errors++;
              continue;
            }

            const postText = post.finalPostText;

            // Upload images if any
            let mediaIds: string[] = [];
            const imageUrls = post.mediaImageUrls || [];
            if (imageUrls.length > 0 && !post.originalTweet?.hasVideo) {
              const client = createTwitterClient();
              if (client) {
                for (const imgUrl of imageUrls.slice(0, 4)) {
                  try {
                    const mediaId = await client.uploadMediaFromUrl(imgUrl);
                    if (mediaId) mediaIds.push(mediaId);
                  } catch (e) {
                    console.error("[ScheduledPosts] Image upload error:", e);
                  }
                }
              }
            }

            const payload: Record<string, unknown> = { text: postText };
            if (mediaIds.length > 0) {
              payload.media = { media_ids: mediaIds };
            }

            const response = await fetch("https://api.twitter.com/2/tweets", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            if (response.ok) {
              const result = await response.json();
              await postDoc.ref.update({
                status: "posted",
                postedAt: new Date().toISOString(),
                tweetId: result.data?.id || null,
              });
              posted++;
            } else {
              const errText = await response.text();
              console.error(`[ScheduledPosts] Post failed: ${response.status} ${errText}`);
              errors++;
            }
          } catch (e) {
            console.error("[ScheduledPosts] Error posting:", e);
            errors++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, posted, errors });
  } catch (error) {
    console.error("[ScheduledPosts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
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

      try {
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
      } catch {
        return null;
      }
    }
    return tokenData.accessToken;
  } catch {
    return null;
  }
}
