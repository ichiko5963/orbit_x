import { NextRequest, NextResponse } from "next/server";
import {
  parseCSV,
  convertRowsToPosts,
  calculateImportStats,
} from "@/lib/csv-parser";

// Dynamic import to avoid build-time errors
let adminDb: FirebaseFirestore.Firestore | null = null;

async function getAdminDb() {
  if (adminDb) return adminDb;

  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");

    if (getApps().length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY is not set");
      }

      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
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
    const batch = db.batch();
    const postsRef = db.collection("users").doc(userId).collection("posts");

    for (const post of posts) {
      const docRef = postsRef.doc();
      batch.set(docRef, {
        ...post,
        id: docRef.id,
        importedAt: new Date(),
        createdAt: new Date(post.createdAt),
      });
    }

    await batch.commit();

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
