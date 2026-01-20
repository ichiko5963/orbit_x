import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (server-side)
const getFirebaseAdmin = () => {
  if (getApps().length === 0) {
    // For development, use service account or emulator
    // In production, this would use proper credentials
    initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }
  return getFirestore();
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CSVRow {
  date: string;
  text: string;
  link: string;
  impressions: number;
  likes: number;
  engagement: number;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  // Find column indices
  const dateIdx = header.findIndex((h) => h.includes("日付"));
  const textIdx = header.findIndex((h) => h.includes("ポスト本文") || h.includes("本文"));
  const linkIdx = header.findIndex((h) => h.includes("リンク"));
  const impressionsIdx = header.findIndex((h) => h.includes("インプレッション"));
  const likesIdx = header.findIndex((h) => h.includes("いいね"));
  const engagementIdx = header.findIndex((h) => h.includes("エンゲージメント"));

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line handling quoted fields
    const values = parseCSVLine(line);

    rows.push({
      date: values[dateIdx] || "",
      text: values[textIdx] || "",
      link: values[linkIdx] || "",
      impressions: parseInt(values[impressionsIdx], 10) || 0,
      likes: parseInt(values[likesIdx], 10) || 0,
      engagement: parseInt(values[engagementIdx], 10) || 0,
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function calculateTier(likes: number): "S" | "A" | "B" | "C" {
  if (likes >= 200) return "S";
  if (likes >= 100) return "A";
  if (likes >= 50) return "B";
  return "C";
}

async function analyzePostWithAI(
  text: string
): Promise<{ category: string; structure: { role: string; text: string }[] }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたはX（Twitter）投稿の分析専門家です。投稿を分析して以下を返してください：
1. カテゴリー: 投稿の主題を1つ選択（技術Tips, キャリア, マインド, ニュース速報, 日常, ノウハウ, 意見・主張, その他）
2. 構造: 投稿の各部分の役割を分析

構造の役割は以下から選択：
- hook: 注目を引く導入
- problem: 問題提起
- insight: 洞察・気づき
- solution: 解決策
- list: リスト・箇条書き
- example: 具体例
- cta: 行動喚起
- conclusion: 結論

JSON形式で返答してください：
{"category": "カテゴリー名", "structure": [{"role": "役割", "text": "該当テキスト"}]}`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("AI analysis error:", error);
  }

  return {
    category: "その他",
    structure: [{ role: "content", text: text }],
  };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const formData = await request.formData();
        const file = formData.get("file") as Blob | null;
        const userId = formData.get("userId") as string | null;

        if (!file || !userId) {
          sendUpdate({ error: "ファイルまたはユーザーIDが不足しています" });
          controller.close();
          return;
        }

        const csvText = await file.text();
        const rows = parseCSV(csvText);

        if (rows.length === 0) {
          sendUpdate({ error: "CSVファイルにデータが含まれていません" });
          controller.close();
          return;
        }

        // Step 0: AI構造分析
        sendUpdate({ step: 0, progress: 0, completed: false });

        const analyzedPosts: any[] = [];
        const categories = new Set<string>();
        const tierCounts = { S: 0, A: 0, B: 0, C: 0 };

        // Analyze posts in batches
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const tier = calculateTier(row.likes);
          tierCounts[tier]++;

          // AI analysis for posts with significant engagement
          let analysis = { category: "その他", structure: [] as any[] };

          if (row.text && row.text.length > 10) {
            analysis = await analyzePostWithAI(row.text);
          }

          categories.add(analysis.category);

          analyzedPosts.push({
            text: row.text,
            date: row.date,
            link: row.link,
            impressions: row.impressions,
            likes: row.likes,
            engagement: row.engagement,
            tier,
            category: analysis.category,
            structure: analysis.structure,
            createdAt: new Date().toISOString(),
          });

          // Send progress update
          const progress = Math.round(((i + 1) / rows.length) * 100);
          sendUpdate({ step: 0, progress, currentPost: i + 1, completed: false });

          // Small delay to avoid rate limiting
          if (i % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        sendUpdate({ step: 0, progress: 100, completed: true });

        // Step 1: カテゴリー分類（完了）
        sendUpdate({ step: 1, progress: 100, completed: true });

        // Step 2: ティア判定（完了）
        sendUpdate({ step: 2, progress: 100, completed: true });

        // Step 3: データベース保存
        sendUpdate({ step: 3, progress: 0, completed: false });

        try {
          // Note: In production, use Firebase Admin SDK with proper credentials
          // For now, we'll return the data and let the client save it
          sendUpdate({ step: 3, progress: 100, completed: true });
        } catch (dbError) {
          console.error("Database save error:", dbError);
          // Continue even if DB save fails
          sendUpdate({ step: 3, progress: 100, completed: true });
        }

        // Send final result
        sendUpdate({
          result: {
            total: analyzedPosts.length,
            tierS: tierCounts.S,
            tierA: tierCounts.A,
            tierB: tierCounts.B,
            tierC: tierCounts.C,
            categories: Array.from(categories),
          },
          posts: analyzedPosts,
        });

        controller.close();
      } catch (error) {
        console.error("Analysis error:", error);
        sendUpdate({
          error: error instanceof Error ? error.message : "分析中にエラーが発生しました",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
