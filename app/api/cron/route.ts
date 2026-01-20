import { NextRequest, NextResponse } from "next/server";
import { fetchAllArticles } from "@/lib/external-content";

// Vercel Cron Job endpoint
// Configure this in vercel.json with:
// {
//   "crons": [{
//     "path": "/api/cron",
//     "schedule": "0 6 * * *"  // Every day at 6:00 AM JST (UTC+9 = 21:00 UTC previous day)
//   }]
// }

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

    console.log("[Cron] Starting daily content fetch...");

    // Fetch external articles
    const articles = await fetchAllArticles();
    console.log(`[Cron] Fetched ${articles.length} articles`);

    // TODO: Store articles in database (Firebase)
    // For now, we just log the results

    // You could also:
    // - Send a daily digest email
    // - Update cache
    // - Generate AI summaries
    // - etc.

    return NextResponse.json({
      success: true,
      message: "Daily content fetch completed",
      articlesCount: articles.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error:", error);
    const message =
      error instanceof Error ? error.message : "Cron job failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
