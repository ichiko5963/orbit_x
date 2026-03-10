import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { searchRecentTweets } from "@/lib/x-api";
import {
  generateViralPost,
  buildDailyXPost,
  batchKeywordQueries,
  DEFAULT_KEYWORDS,
  DailyXPost,
} from "@/lib/daily-x";

initAdmin();

/**
 * Daily post generation cron job
 * Runs every morning - searches all keywords (min_faves:500) and generates posts
 * Also callable manually via POST for the "refresh" button
 * Schedule: 0 21 * * * (UTC) = 6:00 AM JST
 */
export async function GET(request: NextRequest) {
  return handleGenerate(request);
}

export async function POST(request: NextRequest) {
  return handleGenerate(request);
}

async function handleGenerate(request: NextRequest) {
  try {
    // Allow both cron (GET with auth) and manual trigger (POST with userId)
    const authHeader = request.headers.get("authorization");
    const isCron =
      !process.env.CRON_SECRET ||
      authHeader === `Bearer ${process.env.CRON_SECRET}`;

    let manualUserId: string | null = null;
    if (request.method === "POST") {
      try {
        const body = await request.json();
        manualUserId = body.userId || null;
      } catch {
        // No body
      }
    }

    if (!isCron && !manualUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[DailyGenerate] Starting keyword-based post generation...");
    const db = getAdminFirestore();
    const today = new Date().toISOString().split("T")[0];
    const results: any[] = [];

    // Get users to process
    let userIds: string[] = [];
    if (manualUserId) {
      userIds = [manualUserId];
    } else {
      const usersSnapshot = await db.collection("users").get();
      userIds = usersSnapshot.docs.map((d) => d.id);
    }

    for (const userId of userIds) {
      try {
        // Get user's custom keywords or use defaults
        const settingsDoc = await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("dailyX")
          .get();

        const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
        const keywords: string[] =
          settings.keywords?.length > 0 ? settings.keywords : DEFAULT_KEYWORDS;

        const allPosts: DailyXPost[] = [];
        const seenTweetIds = new Set<string>();

        const errors: string[] = [];
        const minLikes = settings.minLikes ?? 100;

        // Batch keywords into minimal API calls
        const batches = batchKeywordQueries(keywords);
        console.log(`[DailyGenerate] ${keywords.length} keywords -> ${batches.length} batched API calls`);

        for (const batch of batches) {
          try {
            console.log(`[DailyGenerate] Searching batch: ${batch.query.slice(0, 100)}...`);

            const result = await searchRecentTweets({
              query: batch.query,
              maxResults: 20,
              sortOrder: "relevancy",
            });

            // Filter by minimum likes client-side
            const qualifiedTweets = result.tweets.filter(
              (t) => t.likes >= minLikes && t.text.length >= 20
            );

            console.log(
              `[DailyGenerate] Found ${result.tweets.length} tweets (${qualifiedTweets.length} with ${minLikes}+ likes)`
            );

            // Generate posts for top tweets (skip duplicates)
            for (const tweet of qualifiedTweets.slice(0, 5)) {
              if (seenTweetIds.has(tweet.id)) continue;
              seenTweetIds.add(tweet.id);

              // Determine keyword
              const matchedKeyword = batch.keywords.find((kw) => {
                const lower = tweet.text.toLowerCase();
                return lower.includes(kw.toLowerCase());
              }) || batch.keywords[0];

              try {
                const generatedText = await generateViralPost({
                  originalTweet: tweet,
                  factCheck: true,
                });

                const dailyPost = buildDailyXPost(
                  tweet,
                  generatedText,
                  "keyword",
                  { keyword: matchedKeyword }
                );

                allPosts.push(dailyPost);
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                console.error(
                  `[DailyGenerate] Generate error for ${tweet.id}:`,
                  msg
                );
                errors.push(`Generate(${tweet.id}): ${msg}`);
              }
            }

            // Rate limiting between batches
            if (batches.length > 1) {
              await new Promise((r) => setTimeout(r, 1500));
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`[DailyGenerate] Search error:`, msg);
            errors.push(`Search: ${msg}`);
          }
        }

        // Save to Firestore
        console.log(
          `[DailyGenerate] Saving ${allPosts.length} posts for user ${userId}...`
        );
        const dateRef = db
          .collection("users")
          .doc(userId)
          .collection("dailyPosts")
          .doc(today);

        await dateRef.set(
          {
            date: today,
            totalPosts: allPosts.length,
            createdAt: new Date().toISOString(),
            source: "keywords",
            keywordsUsed: keywords,
          },
          { merge: true }
        );

        for (const post of allPosts) {
          await dateRef.collection("posts").doc(post.id).set(post);
        }

        results.push({
          userId,
          postsGenerated: allPosts.length,
          keywordsSearched: keywords.length,
          date: today,
          ...(errors.length > 0 && { errors }),
        });

        console.log(
          `[DailyGenerate] User ${userId}: ${allPosts.length} posts generated from ${keywords.length} keywords`
        );
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
