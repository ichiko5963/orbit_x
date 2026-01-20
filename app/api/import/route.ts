import { NextRequest, NextResponse } from "next/server";
import {
  parseCSV,
  convertRowsToPosts,
  calculateImportStats,
} from "@/lib/csv-parser";

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

// 10 categories for auto-categorization
const CATEGORIES = [
  "マインドセット",
  "キャリア・転職",
  "技術・プログラミング",
  "ツール・サービス",
  "ニュース・速報",
  "学習・勉強法",
  "仕事術・生産性",
  "日常・雑談",
  "お知らせ・告知",
  "その他",
];

// Simple keyword-based categorization
function categorizeByKeywords(text: string): string {
  const lowerText = text.toLowerCase();

  if (/マインド|考え方|大切|重要|本当に|気づ|学んだ|意識/.test(text)) return "マインドセット";
  if (/転職|キャリア|年収|副業|フリーランス|独立|会社員/.test(text)) return "キャリア・転職";
  if (/react|typescript|javascript|python|api|コード|実装|開発|エンジニア|プログラミング/.test(lowerText)) return "技術・プログラミング";
  if (/chatgpt|copilot|notion|figma|ツール|サービス|アプリ|使って/.test(lowerText)) return "ツール・サービス";
  if (/速報|朗報|悲報|発表|リリース|対応|アップデート|新機能/.test(text)) return "ニュース・速報";
  if (/勉強|学習|読書|本|おすすめ|入門|初心者|始め/.test(text)) return "学習・勉強法";
  if (/効率|時短|生産性|タスク|習慣|朝活|ルーティン|仕事/.test(text)) return "仕事術・生産性";
  if (/今日|日記|つぶやき|思った|感じた/.test(text)) return "日常・雑談";
  if (/お知らせ|告知|イベント|募集|登壇|参加/.test(text)) return "お知らせ・告知";

  return "その他";
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

    // Convert to posts with auto-categorization
    const posts = convertRowsToPosts(rows).map(post => ({
      ...post,
      category: categorizeByKeywords(post.text),
    }));

    // Calculate statistics
    const stats = calculateImportStats(posts);

    // Save posts to Firebase
    const db = await getAdminDb();
    const { Timestamp } = await import("firebase-admin/firestore");

    // Firestore batch has a limit of 500 operations, so we chunk if needed
    const batchSize = 500;
    const chunks = [];
    for (let i = 0; i < posts.length; i += batchSize) {
      chunks.push(posts.slice(i, i + batchSize));
    }

    const postsRef = db.collection("users").doc(userId).collection("posts");

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
    posts.forEach(post => {
      categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        categories: Object.keys(categoryCounts).length,
      },
      categoryCounts,
      savedCount: posts.length,
    });
  } catch (error) {
    console.error("Import error:", error);
    const message =
      error instanceof Error ? error.message : "インポート中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
