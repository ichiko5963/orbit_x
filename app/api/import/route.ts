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

// Practical X post categories
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
  "その他",
];

// Keyword-based categorization for X posts
function categorizeByKeywords(text: string): string {
  const lowerText = text.toLowerCase();

  // プレゼント・キャンペーン系 (check first - has specific patterns)
  if (/プレゼント|🎁|抽選|当選|RT.*フォロー|フォロー.*RT|いいね.*RT|RT.*いいね|キャンペーン|プレゼント企画/.test(text)) return "プレゼント・キャンペーン系";

  // 採用・メンバー募集系
  if (/募集|採用|hiring|求人|メンバー募集|仲間募集|一緒に働|エンジニア募集|デザイナー募集|積極採用|正社員|業務委託/.test(text)) return "採用・メンバー募集系";

  // プロダクト・リリース系
  if (/リリース|ローンチ|公開しました|作りました|開発しました|β版|ベータ版|プロダクト|サービス開始|新機能|アップデート/.test(text)) return "プロダクト・リリース系";

  // 速報・ニュース系
  if (/速報|朗報|悲報|ニュース|発表|話題|最新|緊急|重大発表|公式発表|ついに|ヤバい/.test(text)) return "速報・ニュース系";

  // イベント・登壇系
  if (/イベント|登壇|カンファレンス|勉強会|セミナー|ウェビナー|参加|開催|connpass|meetup|オフ会/.test(text)) return "イベント・登壇系";

  // プロンプト・AI活用系
  if (/プロンプト|prompt|chatgpt|gpt-4|claude|gemini|ai|生成ai|llm|copilot|cursor/.test(lowerText)) return "プロンプト・AI活用系";

  // 動画・メディア紹介系
  if (/youtube|動画|video|podcast|ポッドキャスト|配信|ライブ|アーカイブ|見て|聴いて/.test(lowerText)) return "動画・メディア紹介系";

  // 記事・コンテンツ紹介系
  if (/記事|ブログ|note|zenn|qiita|書きました|投稿しました|まとめ|解説|紹介|おすすめ|読んで/.test(lowerText)) return "記事・コンテンツ紹介系";

  // ツール・サービス紹介系
  if (/ツール|サービス|アプリ|拡張機能|extension|便利|使える|おすすめツール|神ツール|無料で/.test(text)) return "ツール・サービス紹介系";

  // Tips・ノウハウ系
  if (/tips|コツ|方法|やり方|ノウハウ|知識|テクニック|裏技|選$|個$|つ$|効率|生産性|時短/.test(lowerText)) return "Tips・ノウハウ系";

  // 日常・つぶやき系
  if (/今日|おはよう|おやすみ|疲れた|嬉しい|楽しい|思った|感じた|つぶやき|日記/.test(text)) return "日常・つぶやき系";

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
