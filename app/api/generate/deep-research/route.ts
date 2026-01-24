import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Deep research for each query with date awareness
async function deepResearchQuery(query: string, today: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは徹底的なリサーチャーです。
与えられたトピックについて、一次情報を重視した詳細な情報を提供してください。

【重要】本日は ${today} です。
直近2週間以内（2026年1月中旬〜現在）の最新情報を優先してください。

【重視する情報】
- 公式ドキュメントの最新内容
- 公式発表・プレスリリースの情報（日付付き）
- 具体的な数字・統計データ
- バージョン情報・リリース日
- 技術的な仕様・詳細
- 信頼できるエンジニアの知見

【出力形式】
- 1200〜1800文字程度で詳細に（しっかり長く書く）
- 箇条書きと説明を組み合わせる
- 情報源を「〜によると」「公式では」「2026年1月の発表では」などで明記
- 具体的なデータ・数字を必ず含める
- 日付やバージョンを必ず含める
- 「〜と言われている」「〜のようだ」などの曖昧な表現は避ける

【注意】
- URLは含めない
- 推測や憶測は避け、事実のみを記載
- 情報が古い可能性がある場合は、その旨を明記`,
      },
      {
        role: "user",
        content: `「${query}」について、2026年1月の最新情報を中心に徹底的にリサーチし、詳細な情報を1500文字程度で提供してください。`,
      },
    ],
    temperature: 0.2,
    max_tokens: 3000,
  });

  return response.choices[0]?.message?.content || "";
}

// Synthesize all research into comprehensive 5000+ char document
async function synthesizeResearch(
  content: string,
  queries: string[],
  researchResults: { query: string; result: string }[],
  today: string
): Promise<string> {
  const allResearch = researchResults
    .filter(r => r.result)
    .map(r => `【検索クエリ: ${r.query}】\n${r.result}`)
    .join("\n\n" + "=".repeat(50) + "\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは情報整理の専門家です。
複数のリサーチ結果を統合し、投稿作成に役立つ【5000文字以上】の包括的な情報ドキュメントを作成してください。

【重要】本日は ${today} です。情報の鮮度を意識してください。

【統合ルール】
1. 重複する情報は統合してまとめる
2. 最も重要・有益な情報を優先
3. 具体的なデータ・数字は必ず全て含める
4. 情報源を明記する（「〜によると」「公式発表では」）
5. 日付・バージョン情報は必ず残す
6. 【重要】5000文字以上を必ず出力する

【出力形式 - 各セクションを充実させる】

## 基本情報・概要（800文字以上）
技術・サービスの概要、公式情報を詳しく

## 技術的詳細・仕様（1000文字以上）
機能、パフォーマンス、アーキテクチャなどを詳しく

## 最新情報・アップデート（800文字以上）
2026年1月の新機能、変更点、発表を詳しく

## 数値データ・比較（600文字以上）
具体的な数字、ベンチマーク、比較データ

## 実践的な知見・活用法（600文字以上）
ベストプラクティス、注意点、使用例

## 投稿で使える重要ポイント（500文字以上）
引用可能な具体的情報を箇条書きで10個以上

【絶対ルール】
- 5000文字未満は許可しない
- 曖昧な表現は避け、具体的に書く
- 情報を省略しない`,
      },
      {
        role: "user",
        content: `【投稿テーマ】
${content}

【検索クエリ】
${queries.join(", ")}

【リサーチ結果】
${allResearch}

上記を統合して、【必ず5000文字以上】の包括的な情報ドキュメントを作成してください。
各セクションを充実させ、具体的な情報を豊富に含めてください。`,
      },
    ],
    temperature: 0.2,
    max_tokens: 8000, // 十分な出力を確保
  });

  return response.choices[0]?.message?.content || "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, queries, today } = body;

    if (!content) {
      return NextResponse.json(
        { error: "コンテンツを入力してください" },
        { status: 400 }
      );
    }

    // Use provided queries or fall back to content-based generation
    const searchQueries: string[] = queries && queries.length > 0
      ? queries
      : [content.slice(0, 100)]; // Fallback

    const todayDate = today || new Date().toISOString().split("T")[0];

    console.log("[DeepResearch] Starting with queries:", searchQueries);
    console.log("[DeepResearch] Today:", todayDate);

    // Deep research for each query (parallel)
    const researchPromises = searchQueries.map(async (query: string) => {
      const result = await deepResearchQuery(query, todayDate);
      return { query, result };
    });
    const researchResults = await Promise.all(researchPromises);

    const totalRawChars = researchResults.reduce((sum, r) => sum + r.result.length, 0);
    console.log("[DeepResearch] Raw research total:", totalRawChars, "chars");

    // Synthesize into comprehensive 5000+ char document
    const synthesizedResearch = await synthesizeResearch(
      content,
      searchQueries,
      researchResults,
      todayDate
    );

    console.log("[DeepResearch] Synthesized research:", synthesizedResearch.length, "chars");

    // If synthesis is too short, append raw results
    let finalResearch = synthesizedResearch;
    if (synthesizedResearch.length < 4000 && totalRawChars > synthesizedResearch.length) {
      console.log("[DeepResearch] Synthesis too short, appending raw results");
      const additionalInfo = researchResults
        .filter(r => r.result)
        .map(r => `\n\n## 詳細リサーチ: ${r.query}\n${r.result}`)
        .join("");
      finalResearch = synthesizedResearch + additionalInfo;
    }

    return NextResponse.json({
      success: true,
      queries: searchQueries,
      research: finalResearch,
      rawResults: researchResults.map(r => ({
        query: r.query,
        length: r.result.length,
      })),
      totalChars: finalResearch.length,
    });
  } catch (error) {
    console.error("[DeepResearch] Error:", error);
    const message =
      error instanceof Error ? error.message : "リサーチ中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
