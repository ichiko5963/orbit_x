import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract contextual search queries based on content AND purpose
async function extractContextualQueries(
  content: string,
  purposeKeywords: string[],
  purposeDescription?: string
): Promise<{
  queries: string[];
  reasoning: string;
}> {
  const purposeContext = purposeKeywords.length > 0
    ? `\n投稿目的のキーワード: ${purposeKeywords.join(", ")}`
    : "";

  const purposeDesc = purposeDescription
    ? `\n投稿の意図: ${purposeDescription}`
    : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `あなたは情報リサーチの専門家です。
投稿内容を分析し、その投稿を強化するために検索すべきクエリを3つ生成してください。

【重要な検索クエリの生成ルール】
1. 単語単体ではなく、投稿内容の文脈を踏まえた検索クエリを作成
2. 一次情報（公式ドキュメント、公式発表、信頼できる技術記事）にたどり着けるクエリ
3. 投稿の目的に合わせて、必要な情報を得られるクエリ

【良い検索クエリの例】
- "Claude 3.5 公式ドキュメント 機能"
- "Next.js 15 App Router 新機能 2024"
- "OpenAI GPT-4o API 料金 比較"
- "React Server Components 公式ガイド"

【悪い検索クエリの例】
- "AI" （単語だけ）
- "便利" （抽象的すぎる）
- "最新情報" （具体性がない）

JSON形式で回答：
{
  "queries": ["検索クエリ1", "検索クエリ2", "検索クエリ3"],
  "reasoning": "これらのクエリを選んだ理由（1文）"
}`,
      },
      {
        role: "user",
        content: `以下の投稿内容を強化するための検索クエリを3つ生成してください。
${purposeContext}${purposeDesc}

【投稿内容】
${content}`,
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      queries: result.queries || [],
      reasoning: result.reasoning || "",
    };
  } catch {
    return {
      queries: [],
      reasoning: "クエリ生成に失敗",
    };
  }
}

// Perform contextual web search with focus on primary sources
async function searchForPrimarySources(
  query: string,
  originalContent: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたは技術リサーチャーです。検索クエリに基づいて、信頼できる一次情報を提供してください。

【重視する情報源】
- 公式ドキュメント
- 公式ブログ・発表
- 技術的な詳細（バージョン、日付、数値）
- 信頼できるエンジニアの記事（Zenn, Qiita等の技術記事）

【出力形式】
- 具体的な事実・データを3-5個の箇条書きで
- 可能な限り日付・バージョン・数値を含める
- 「〜によると」「公式では」のように情報源を明記
- 150-200文字程度で簡潔に

【注意】
- 推測や一般論は避け、具体的な事実のみ
- 古い情報より最新の情報を優先
- URLは含めない（文章のみ）`,
        },
        {
          role: "user",
          content: `【検索クエリ】
${query}

【元の投稿内容（参考）】
${originalContent}

上記のクエリについて、投稿を強化するための具体的な情報をリサーチしてください。`,
        },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Search error:", error);
    return "";
  }
}

// Enrich content with researched information
async function enrichContentWithResearch(
  originalContent: string,
  searchResults: { query: string; result: string }[],
  purposeKeywords: string[]
): Promise<string> {
  const validResults = searchResults.filter(r => r.result);

  if (validResults.length === 0) {
    return originalContent;
  }

  const researchSection = validResults
    .map(r => `【${r.query}の調査結果】\n${r.result}`)
    .join("\n\n");

  const purposeContext = purposeKeywords.length > 0
    ? `\n投稿目的: ${purposeKeywords.join(", ")}`
    : "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは投稿コンテンツの専門家です。
元の投稿内容に、リサーチ結果から得られた具体的な情報を自然に統合してください。

【統合ルール】
1. 元の投稿の意図・トーン・構造を維持
2. リサーチ結果から「最も価値のある1-2個の情報」だけを追加
3. 具体的な数字・日付・バージョンがあれば含める
4. 「〜によると」「公式では」など出典を自然に入れる
5. 投稿として適切な長さ（200-350文字）に収める
6. 箇条書きを使っても良いが、元の形式に合わせる

【重要】
- 情報を詰め込みすぎない
- 元の投稿を大きく変えない
- 追加情報は「補足」程度に留める`,
      },
      {
        role: "user",
        content: `【元の投稿内容】
${originalContent}
${purposeContext}

【リサーチ結果】
${researchSection}

上記を統合して、情報が充実した投稿内容を作成してください。`,
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });

  return response.choices[0]?.message?.content || originalContent;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, purposeKeywords = [], purposeDescription } = body;

    if (!content) {
      return NextResponse.json(
        { error: "コンテンツを入力してください" },
        { status: 400 }
      );
    }

    // Step 1: Extract contextual search queries
    console.log("[EnrichContent] Extracting contextual queries...");
    const { queries, reasoning } = await extractContextualQueries(
      content,
      purposeKeywords,
      purposeDescription
    );

    if (queries.length === 0) {
      return NextResponse.json({
        success: true,
        enriched: false,
        originalContent: content,
        enrichedContent: content,
        reason: "検索クエリを生成できませんでした",
      });
    }

    console.log("[EnrichContent] Queries:", queries);
    console.log("[EnrichContent] Reasoning:", reasoning);

    // Step 2: Search for each query (up to 3)
    const searchPromises = queries.slice(0, 3).map(async (query) => {
      const result = await searchForPrimarySources(query, content);
      return { query, result };
    });
    const searchResults = await Promise.all(searchPromises);

    // Step 3: Enrich the content with research
    const enrichedContent = await enrichContentWithResearch(
      content,
      searchResults,
      purposeKeywords
    );

    return NextResponse.json({
      success: true,
      enriched: true,
      originalContent: content,
      enrichedContent,
      reason: reasoning,
      searchQueries: queries,
    });
  } catch (error) {
    console.error("[EnrichContent] Error:", error);
    const message =
      error instanceof Error ? error.message : "情報補足中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
