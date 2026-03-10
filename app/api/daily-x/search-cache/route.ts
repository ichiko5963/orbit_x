import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { translateToJapanese } from "@/lib/daily-x";

initAdmin();

/**
 * Check if text needs (re-)translation to Japanese
 * Returns true if the text is non-Japanese and either has no translation or translation is same as original
 */
function needsTranslation(tweet: { text: string; translatedText?: string | null }): boolean {
  // Check for Japanese-specific characters (hiragana + katakana only)
  const jpChars = (tweet.text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const isJapanese = jpChars / tweet.text.length > 0.1;
  if (isJapanese) return false;

  // No translation yet
  if (!tweet.translatedText) return true;

  // Translation is same as original (bad translation from old code)
  if (tweet.translatedText === tweet.text) return true;

  // Translation still contains mostly non-Japanese characters (e.g. Chinese was "translated" but stayed Chinese)
  const translatedJpChars = (tweet.translatedText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const originalHasCJK = (tweet.text.match(/[\u4e00-\u9fff]/g) || []).length > 3;
  if (originalHasCJK && translatedJpChars / tweet.translatedText.length < 0.05) return true;

  return false;
}

/**
 * GET /api/daily-x/search-cache?userId=xxx&date=yyyy-mm-dd
 * Load cached search results from Firestore
 * Auto-retranslates tweets that have missing or bad translations
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
    const docRef = db
      .collection("users")
      .doc(userId)
      .collection("searchCache")
      .doc(date);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({
        success: true,
        tweets: [],
        completedKeywords: [],
        date,
      });
    }

    const data = doc.data()!;
    let tweets = data.tweets || [];

    // Re-translate tweets with missing or bad translations (e.g. Chinese not translated)
    const tweetsToFix = tweets.filter((t: any) => needsTranslation(t));
    if (tweetsToFix.length > 0) {
      console.log(`[SearchCache] Re-translating ${tweetsToFix.length} tweets with missing/bad translations`);
      const translations = await Promise.all(
        tweetsToFix.map(async (t: any) => {
          try {
            const result = await translateToJapanese(t.text);
            return { id: t.id, translatedText: result !== t.text ? result : null };
          } catch {
            return { id: t.id, translatedText: null };
          }
        })
      );

      // Apply translations
      const translationMap = new Map(translations.map((t) => [t.id, t.translatedText]));
      tweets = tweets.map((t: any) => {
        const newTranslation = translationMap.get(t.id);
        if (newTranslation !== undefined) {
          return { ...t, translatedText: newTranslation };
        }
        return t;
      });

      // Update cache in background (don't await)
      docRef.update({ tweets }).catch((e: any) =>
        console.error("[SearchCache] Failed to update translations:", e)
      );
    }

    return NextResponse.json({
      success: true,
      tweets,
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
