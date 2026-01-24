import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, today } = body;

    if (!content) {
      return NextResponse.json(
        { error: "コンテンツを入力してください" },
        { status: 400 }
      );
    }

    // Calculate date range (last 2 weeks)
    const todayDate = today ? new Date(today) : new Date();
    const twoWeeksAgo = new Date(todayDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const dateRange = {
      from: twoWeeksAgo.toISOString().split("T")[0],
      to: todayDate.toISOString().split("T")[0],
    };

    console.log("[SearchQueries] Generating queries for:", content.slice(0, 100));
    console.log("[SearchQueries] Date range:", dateRange);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたは情報リサーチの専門家です。
投稿内容を分析し、最新情報を検索するためのクエリを10個生成してください。

【重要】本日は ${today || todayDate.toISOString().split("T")[0]} です。
検索クエリには必ず「2026」「最新」「${todayDate.getMonth() + 1}月」などの時期を示すキーワードを含めてください。

【カテゴリー別に生成】
各クエリに以下のカテゴリーを付与：
- 公式情報: 公式ドキュメント、公式発表、プレスリリース
- 技術詳細: 技術仕様、実装方法、ベストプラクティス
- 比較・評価: ベンチマーク、比較、レビュー、評価
- 活用事例: 使用例、事例紹介、体験談
- 最新動向: 最新ニュース、アップデート、トレンド

【クエリの例】
- "Claude 3.5 Sonnet 2026年1月 新機能"
- "GPT-4o vs Claude 3.5 性能比較 2026 最新"
- "Next.js 15 公式ドキュメント 新機能"
- "LLM API 料金比較 2026年最新"

JSON形式で回答：
{
  "queries": [
    {
      "query": "検索クエリ文字列",
      "category": "公式情報 | 技術詳細 | 比較・評価 | 活用事例 | 最新動向",
      "description": "このクエリで何を調べるか（10文字程度）"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `以下の投稿内容について、最新情報を検索するためのクエリを10個生成してください。

【投稿内容】
${content}

【検索対象期間】
${dateRange.from} 〜 ${dateRange.to}（直近2週間）

カテゴリーをバランスよく、異なる角度から情報を収集できるクエリを生成してください。`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      const queries = result.queries || [];

      console.log("[SearchQueries] Generated", queries.length, "queries");

      return NextResponse.json({
        success: true,
        queries,
        dateRange,
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: "クエリの解析に失敗しました",
        queries: [],
      });
    }
  } catch (error) {
    console.error("[SearchQueries] Error:", error);
    const message =
      error instanceof Error ? error.message : "検索クエリの生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
