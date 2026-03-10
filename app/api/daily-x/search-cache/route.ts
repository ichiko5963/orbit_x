import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";

initAdmin();

/**
 * GET /api/daily-x/search-cache?userId=xxx&date=yyyy-mm-dd
 * Load cached search results from Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const doc = await db
      .collection("users")
      .doc(userId)
      .collection("searchCache")
      .doc(date)
      .get();

    if (!doc.exists) {
      return NextResponse.json({
        success: true,
        tweets: [],
        completedKeywords: [],
        date,
      });
    }

    const data = doc.data()!;
    return NextResponse.json({
      success: true,
      tweets: data.tweets || [],
      completedKeywords: data.completedKeywords || [],
      updatedAt: data.updatedAt,
      date,
    });
  } catch (error) {
    console.error("[SearchCache] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/daily-x/search-cache
 * Save bookmark results to cache
 * Body: { userId, tweets, source: "bookmarks" }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, tweets, source } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const docId = source === "bookmarks" ? "bookmarks" : new Date().toISOString().split("T")[0];

    await db
      .collection("users")
      .doc(userId)
      .collection("searchCache")
      .doc(docId)
      .set(
        {
          tweets: tweets || [],
          updatedAt: new Date().toISOString(),
          source: source || "search",
        },
        { merge: true }
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SearchCache POST] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
