import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { getUserTweets, resolveUserId, XTweetWithMedia } from "@/lib/x-api";
import {
  generateViralPost,
  buildDailyXPost,
  translateToJapanese,
  getViralPatterns,
  DEFAULT_MONITORED_ACCOUNTS,
} from "@/lib/daily-x";
import { sendTweetNotification } from "@/lib/discord";

initAdmin();

/**
 * Account monitoring cron job
 * Runs every 15 minutes - checks monitored accounts for new posts
 * Sends notifications to Discord "Daily X" channel
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

    console.log("[MonitorAccounts] Starting account monitoring...");
    const db = getAdminFirestore();
    const usersSnapshot = await db.collection("users").get();
    const results: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      try {
        // Get settings
        const settingsDoc = await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("dailyX")
          .get();

        const settings = settingsDoc.exists ? settingsDoc.data() || {} : {};
        const accounts: string[] = settings.monitoredAccounts?.length > 0
          ? settings.monitoredAccounts
          : DEFAULT_MONITORED_ACCOUNTS;

        const discordWebhookUrl = settings.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
        if (!discordWebhookUrl) {
          console.log(`[MonitorAccounts] No Discord webhook for user ${userId}, skipping`);
          continue;
        }

        const lastCheckedIds: Record<string, string> = settings.lastCheckedTweetIds || {};

        // Get viral patterns for post generation
        const viralPatterns = await getViralPatterns(db, userId);

        // Get user style
        const styleDoc = await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("userStyle")
          .get();
        const userStyle = styleDoc.exists ? styleDoc.data()?.promptSummary : undefined;

        let newPostsTotal = 0;

        // Check each account
        for (const account of accounts) {
          try {
            console.log(`[MonitorAccounts] Checking @${account}...`);

            // Resolve username to ID (cache this in production)
            let accountUserId: string;
            try {
              accountUserId = await resolveUserId(account);
            } catch {
              console.error(`[MonitorAccounts] Failed to resolve @${account}`);
              continue;
            }

            // Get recent tweets (excluding retweets)
            const tweets = await getUserTweets({
              userId: accountUserId,
              username: account,
              maxResults: 10,
              excludeRetweets: true,
              sinceId: lastCheckedIds[account],
            });

            if (tweets.length === 0) {
              console.log(`[MonitorAccounts] No new tweets from @${account}`);
              continue;
            }

            console.log(`[MonitorAccounts] ${tweets.length} new tweets from @${account}`);

            // Process each new tweet
            for (const tweet of tweets) {
              try {
                // Translate to Japanese
                const translatedText = await translateToJapanese(tweet.text);

                // Generate viral post
                const generatedText = await generateViralPost({
                  originalTweet: tweet,
                  viralPatterns,
                  userStyle,
                  factCheck: true,
                });

                // Build the daily post
                const dailyPost = buildDailyXPost(
                  tweet,
                  generatedText,
                  "account_monitor",
                  { account }
                );

                // Save to Firestore
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
                  });
                }
                await dateRef.collection("posts").doc(dailyPost.id).set(dailyPost);

                // Send to Discord
                const imageUrls = tweet.media
                  .filter((m) => m.type === "photo" && m.url)
                  .map((m) => m.url!);

                await sendTweetNotification({
                  webhookUrl: discordWebhookUrl,
                  authorName: tweet.author_name,
                  authorUsername: tweet.author_username,
                  authorProfileImage: tweet.author_profile_image,
                  originalText: tweet.text,
                  translatedText,
                  suggestedPost: dailyPost.finalPostText,
                  tweetUrl: tweet.original_url,
                  likes: tweet.likes,
                  retweets: tweet.retweets,
                  hasVideo: tweet.has_video,
                  hasImage: tweet.has_image,
                  imageUrls,
                  videoUrl: tweet.has_video
                    ? `${tweet.original_url}/video/1`
                    : undefined,
                });

                newPostsTotal++;
              } catch (error) {
                console.error(`[MonitorAccounts] Error processing tweet ${tweet.id}:`, error);
              }

              // Rate limiting
              await new Promise((r) => setTimeout(r, 500));
            }

            // Update last checked tweet ID
            if (tweets.length > 0) {
              lastCheckedIds[account] = tweets[0].id;
            }
          } catch (error) {
            console.error(`[MonitorAccounts] Error checking @${account}:`, error);
          }

          // Rate limiting between accounts
          await new Promise((r) => setTimeout(r, 1000));
        }

        // Save updated last checked IDs
        await db
          .collection("users")
          .doc(userId)
          .collection("settings")
          .doc("dailyX")
          .set(
            { lastCheckedTweetIds: lastCheckedIds, updatedAt: new Date().toISOString() },
            { merge: true }
          );

        results.push({
          userId,
          newPosts: newPostsTotal,
          accountsChecked: accounts.length,
        });
      } catch (error) {
        console.error(`[MonitorAccounts] Error for user ${userId}:`, error);
        results.push({ userId, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[MonitorAccounts] Fatal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
