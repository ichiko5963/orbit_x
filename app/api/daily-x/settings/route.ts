import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { DEFAULT_KEYWORDS, DEFAULT_MONITORED_ACCOUNTS } from "@/lib/daily-x";

initAdmin();

/**
 * GET /api/daily-x/settings
 * Get Daily X settings (keywords, monitored accounts, discord webhook)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const settingsDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("dailyX")
      .get();

    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    return NextResponse.json({
      success: true,
      settings: {
        keywords: settings?.keywords || DEFAULT_KEYWORDS,
        monitoredAccounts: settings?.monitoredAccounts || DEFAULT_MONITORED_ACCOUNTS,
        discordWebhookUrl: settings?.discordWebhookUrl || "",
        minLikes: settings?.minLikes ?? 100,
        maxTweets: settings?.maxTweets ?? 20,
        lastCheckedTweetIds: settings?.lastCheckedTweetIds || {},
      },
    });
  } catch (error) {
    console.error("[DailyX Settings] GET Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/daily-x/settings
 * Update Daily X settings
 * Body: { userId, keywords?, monitoredAccounts?, discordWebhookUrl? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, keywords, monitoredAccounts, discordWebhookUrl, minLikes, maxTweets } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (keywords !== undefined) {
      updates.keywords = keywords;
    }
    if (monitoredAccounts !== undefined) {
      updates.monitoredAccounts = monitoredAccounts;
    }
    if (discordWebhookUrl !== undefined) {
      updates.discordWebhookUrl = discordWebhookUrl;
    }
    if (minLikes !== undefined) {
      updates.minLikes = minLikes;
    }
    if (maxTweets !== undefined) {
      updates.maxTweets = maxTweets;
    }

    await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("dailyX")
      .set(updates, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DailyX Settings] POST Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
