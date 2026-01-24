import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Check if content needs enrichment
async function analyzeContentDepth(content: string): Promise<{
  needsEnrichment: boolean;
  reason: string;
  searchQueries: string[];
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `あなたはコンテンツ分析の専門家です。
投稿内容を分析し、以下を判定してください：
1. 情報量が十分かどうか（短すぎる、具体性に欠ける、詳細がない等）
2. 補足情報が必要な場合、どんな情報を検索すべきか

JSON形式で回答：
{
  "needsEnrichment": true/false,
  "reason": "判定理由",
  "searchQueries": ["検索クエリ1", "検索クエリ2"] // 最大3つ
}`,
      },
      {
        role: "user",
        content: `以下の投稿内容を分析してください：

${content}

判定基準：
- 50文字未満 → 情報不足の可能性高い
- 固有名詞や専門用語があるが説明がない → 補足必要
- 「〇〇とは」「〇〇について」など一般的なトピック → 最新情報で補足
- 数字・統計データがない抽象的な内容 → 具体例で補足`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      needsEnrichment: result.needsEnrichment || false,
      reason: result.reason || "",
      searchQueries: result.searchQueries || [],
    };
  } catch {
    return {
      needsEnrichment: false,
      reason: "分析に失敗",
      searchQueries: [],
    };
  }
}

// Perform web search using SerpAPI or similar (using OpenAI's web search for now)
async function searchWeb(query: string): Promise<string> {
  try {
    // Use OpenAI to simulate a web search response based on its knowledge
    // In production, you would use SerpAPI, Google Custom Search, or Perplexity API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたはリサーチャーです。以下のトピックについて、最新の知識に基づいて重要な情報を提供してください。

出力形式：
- 具体的な事実・データを箇条書きで
- 日付・数字があれば含める
- 情報ソースがあれば明記
- 200文字程度で簡潔に`,
        },
        {
          role: "user",
          content: `「${query}」についてリサーチしてください。`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Web search error:", error);
    return "";
  }
}

// Enrich content with additional information
async function enrichContent(
  originalContent: string,
  searchResults: string[]
): Promise<string> {
  const combinedResults = searchResults.filter(Boolean).join("\n\n---\n\n");

  if (!combinedResults) {
    return originalContent;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたはコンテンツエンリッチメントの専門家です。
元の投稿内容に、リサーチ結果から有用な情報を追加してください。

ルール：
- 元の内容の意図・トーンを維持
- 具体的な数字・事例・最新情報を追加
- 投稿に適した長さ（300文字程度）に調整
- 自然な文章として統合（箇条書きOK）
- 出典・日付があれば含める`,
      },
      {
        role: "user",
        content: `【元の投稿内容】
${originalContent}

【リサーチ結果】
${combinedResults}

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
    const { content, forceEnrich = false, purposeKeywords = [] } = body;

    if (!content) {
      return NextResponse.json(
        { error: "コンテンツを入力してください" },
        { status: 400 }
      );
    }

    // Step 1: Analyze if enrichment is needed
    const analysis = await analyzeContentDepth(content);

    if (!analysis.needsEnrichment && !forceEnrich && purposeKeywords.length === 0) {
      return NextResponse.json({
        success: true,
        enriched: false,
        originalContent: content,
        enrichedContent: content,
        reason: "情報量が十分です",
      });
    }

    // Step 2: Search for supplementary information
    // Use purposeKeywords if provided, otherwise use analyzed queries
    const queriesToSearch = purposeKeywords.length > 0
      ? [...purposeKeywords, ...analysis.searchQueries.slice(0, 1)]
      : analysis.searchQueries;

    console.log("[EnrichContent] Searching for:", queriesToSearch);
    const searchPromises = queriesToSearch.slice(0, 3).map(searchWeb);
    const searchResults = await Promise.all(searchPromises);

    // Step 3: Enrich the content
    const enrichedContent = await enrichContent(content, searchResults);

    return NextResponse.json({
      success: true,
      enriched: true,
      originalContent: content,
      enrichedContent,
      reason: analysis.reason,
      searchQueries: analysis.searchQueries,
    });
  } catch (error) {
    console.error("[EnrichContent] Error:", error);
    const message =
      error instanceof Error ? error.message : "情報補足中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
