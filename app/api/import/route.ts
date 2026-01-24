import { NextRequest, NextResponse } from "next/server";
import {
  parseCSV,
  filterCSVRows,
  convertRowsToPosts,
  calculateImportStats,
} from "@/lib/csv-parser";
import { batchCategorizePosts } from "@/lib/openai";

// Dynamic import to avoid build-time errors
let adminDb: FirebaseFirestore.Firestore | null = null;

// Parse date string safely and return valid Date or current date as fallback
function parseDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== "string") {
    return new Date();
  }

  // Try various date formats
  const formats = [
    // ISO format
    () => new Date(dateStr),
    // Japanese format: 2024/01/15 or 2024年01月15日
    () => {
      const match = dateStr.match(/(\d{4})[\/年](\d{1,2})[\/月](\d{1,2})/);
      if (match) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
      return null;
    },
    // Date with time: 2024/01/15 10:30:00
    () => {
      const match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
      if (match) {
        return new Date(
          parseInt(match[1]),
          parseInt(match[2]) - 1,
          parseInt(match[3]),
          parseInt(match[4]),
          parseInt(match[5])
        );
      }
      return null;
    },
  ];

  for (const parser of formats) {
    try {
      const date = parser();
      if (date && !isNaN(date.getTime())) {
        return date;
      }
    } catch {
      // Continue to next format
    }
  }

  // Fallback to current date
  console.warn(`Could not parse date: ${dateStr}, using current date`);
  return new Date();
}

async function getAdminDb() {
  if (adminDb) return adminDb;

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (!privateKey) {
        console.error("FIREBASE_PRIVATE_KEY environment variable is not set");
        throw new Error("Firebase Admin設定エラー: FIREBASE_PRIVATE_KEYを.env.localに設定してください");
      }

      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      if (!clientEmail) {
        console.error("FIREBASE_CLIENT_EMAIL environment variable is not set");
        throw new Error("Firebase Admin設定エラー: FIREBASE_CLIENT_EMAILを.env.localに設定してください");
      }

      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    }

    adminDb = getFirestore();
    return adminDb;
  } catch (error) {
    console.error("Firebase Admin init error:", error);
    throw error;
  }
}

// Practical X post categories (AI determines categories - no "その他")
const CATEGORIES = [
  "速報・ニュース系",
  "Tips・ノウハウ系",
  "記事・コンテンツ紹介系",
  "ツール・サービス紹介系",
  "動画・メディア紹介系",
  "プロンプト・AI活用系",
  "プロダクト・リリース系",
  "イベント・登壇系",
  "プレゼント・キャンペーン系",
  "採用・メンバー募集系",
  "日常・つぶやき系",
];

// Normalize text for duplicate comparison (remove whitespace variations)
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "CSVファイルのみアップロード可能です" },
        { status: 400 }
      );
    }

    // Read file content
    const csvText = await file.text();

    // Parse CSV
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSVファイルにデータが含まれていません" },
        { status: 400 }
      );
    }

    // Filter rows: exclude @ mentions and likes <= 5
    const { filtered: filteredRows, excluded } = filterCSVRows(rows);

    console.log(`[Import] Filtered: ${excluded.replies} replies, ${excluded.lowLikes} low-likes posts excluded`);

    if (filteredRows.length === 0) {
      return NextResponse.json(
        { error: "フィルタ条件を満たす投稿がありません（リプライと5いいね以下を除外）" },
        { status: 400 }
      );
    }

    // Convert to posts (without category yet)
    const rawPosts = convertRowsToPosts(filteredRows);

    // Get Firebase instance
    const db = await getAdminDb();
    const { Timestamp } = await import("firebase-admin/firestore");
    const postsRef = db.collection("users").doc(userId).collection("posts");

    // === DUPLICATE CHECK ===
    // Fetch existing posts to check for duplicates
    const existingPostsSnapshot = await postsRef.get();
    const existingTexts = new Set<string>();
    existingPostsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.text) {
        existingTexts.add(normalizeText(data.text));
      }
    });

    // Filter out duplicates
    const newPosts = rawPosts.filter((post) => {
      const normalized = normalizeText(post.text);
      return !existingTexts.has(normalized);
    });

    const duplicateCount = rawPosts.length - newPosts.length;

    if (newPosts.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          total: 0,
          categories: 0,
        },
        categoryCounts: {},
        savedCount: 0,
        duplicateCount,
        message: "すべての投稿が既にインポート済みでした",
      });
    }

    // === AI CATEGORIZATION ===
    // Prepare posts for batch categorization
    const postsForCategorization = newPosts.map((post, idx) => ({
      id: String(idx),
      text: post.text,
    }));

    console.log(`Categorizing ${postsForCategorization.length} posts with AI...`);
    const categoryResults = await batchCategorizePosts(postsForCategorization);

    // Apply AI-determined categories
    const categorizedPosts = newPosts.map((post, idx) => ({
      ...post,
      category: categoryResults[String(idx)] || "日常・つぶやき系",
    }));

    // Calculate statistics
    const stats = calculateImportStats(categorizedPosts);

    // === SAVE TO FIREBASE ===
    // Firestore batch has a limit of 500 operations, so we chunk if needed
    const batchSize = 500;
    const chunks = [];
    for (let i = 0; i < categorizedPosts.length; i += batchSize) {
      chunks.push(categorizedPosts.slice(i, i + batchSize));
    }

    for (const chunk of chunks) {
      const batch = db.batch();

      for (const post of chunk) {
        const docRef = postsRef.doc();

        // Parse dates safely
        const createdAtDate = parseDate(post.createdAt);
        const importedAtDate = new Date();

        batch.set(docRef, {
          ...post,
          id: docRef.id,
          importedAt: Timestamp.fromDate(importedAtDate),
          createdAt: Timestamp.fromDate(createdAtDate),
        });
      }

      await batch.commit();
    }

    // Update category counts
    const categoryCounts: Record<string, number> = {};
    categorizedPosts.forEach((post) => {
      categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        categories: Object.keys(categoryCounts).length,
      },
      categoryCounts,
      savedCount: categorizedPosts.length,
      duplicateCount,
      excludedCount: {
        replies: excluded.replies,
        lowLikes: excluded.lowLikes,
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    const message =
      error instanceof Error ? error.message : "インポート中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
