import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI Responses APIでWeb検索を試行
async function tryWebSearch(
  query: string,
  dateContext: string,
  dateRange: { from: string; to: string }
): Promise<{ success: boolean; result: string; error?: string }> {
  try {
    console.log("[SearchQueries] Attempting OpenAI web search:", query);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search" }],
        input: `Search for the latest information about: ${query}
Date: ${dateContext}
Focus on: ${dateRange.from} to ${dateRange.to} (last 2 weeks only)
Return specific details: version numbers, release dates, feature names, announcements.`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[SearchQueries] Web search API not available:", response.status);
      return { success: false, result: "", error: errorText };
    }

    const data = await response.json();
    const result = data.output_text || data.output?.[0]?.content?.[0]?.text || "";

    if (result.length > 100) {
      console.log("[SearchQueries] Web search successful, length:", result.length);
      return { success: true, result };
    }

    return { success: false, result: "", error: "Empty result" };
  } catch (error) {
    console.log("[SearchQueries] Web search failed:", error);
    return { success: false, result: "", error: String(error) };
  }
}

// GPT-4oの最新知識を使って具体的な情報を取得
async function getAIKnowledge(
  content: string,
  category: string,
  dateContext: string,
  dateRange: { from: string; to: string },
  keywords: string[]
): Promise<string> {
  console.log("[SearchQueries] Using GPT-4o knowledge base...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは最新テクノロジー情報のエキスパートです。
今日は${dateContext}です。

ユーザーの投稿内容に関連する、あなたが知っている最新の具体的な情報を提供してください。

【必須要件】
1. 具体的な情報のみ（バージョン番号、機能名、リリース日、発表内容）
2. 抽象的な情報は一切不要
3. 「〜が発表された」「〜がリリースされた」など、事実ベースで記述
4. 可能な限り日付を含める（例：2025年1月、2026年1月など）
5. 知らない情報は推測せず、知っている情報のみを提供

【出力形式】
各情報を以下の形式で列挙：
- [日付] サービス名/技術名: 具体的な内容（バージョン番号、機能名など）`,
      },
      {
        role: "user",
        content: `【投稿内容】
${content}

${category ? `【カテゴリー】${category}` : ""}

【関連キーワード】
${keywords.join(", ")}

上記に関連する最新の具体的な情報を、知っている範囲で15〜20個提供してください。
各情報には必ず日付（年月）を含めてください。`,
      },
    ],
    temperature: 0.2,
    max_tokens: 3000,
  });

  return response.choices[0]?.message?.content || "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, postCategory, postSource, today } = body;

    if (!content) {
      return NextResponse.json(
        { error: "コンテンツを入力してください" },
        { status: 400 }
      );
    }

    // 今日の日付を計算
    const todayDate = today ? new Date(today) : new Date();
    const twoWeeksAgo = new Date(todayDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const dateRange = {
      from: twoWeeksAgo.toISOString().split("T")[0],
      to: todayDate.toISOString().split("T")[0],
    };

    const dateContext = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;

    console.log("[SearchQueries] Starting search...");
    console.log("[SearchQueries] Date:", dateContext);

    // Step 1: キーワード抽出
    const keywordResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "投稿内容から検索すべき具体的なキーワードを抽出。技術名、サービス名、ツール名、製品名など。",
        },
        {
          role: "user",
          content: `【投稿内容】\n${content}\n\n${postCategory ? `【カテゴリー】${postCategory}` : ""}\n\n検索キーワードを8個、JSON形式で出力：\n{"keywords": ["キーワード1", ...]}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(keywordResponse.choices[0]?.message?.content || "{}");
      keywords = parsed.keywords || [];
    } catch {
      keywords = [content.slice(0, 50)];
    }

    console.log("[SearchQueries] Keywords:", keywords);

    // Step 2: Web検索を試行（複数クエリ）
    let webSearchResults: string[] = [];
    let webSearchSucceeded = false;

    // 主要キーワードで検索を試行
    const searchQueries = keywords.slice(0, 3).map(kw => `${kw} latest news ${dateRange.to.slice(0, 7)}`);

    for (const query of searchQueries) {
      const searchResult = await tryWebSearch(query, dateContext, dateRange);
      if (searchResult.success) {
        webSearchResults.push(searchResult.result);
        webSearchSucceeded = true;
      }
    }

    // Step 3: Web検索が失敗した場合、GPT-4oの知識を使用
    let knowledgeBase = "";
    if (!webSearchSucceeded) {
      console.log("[SearchQueries] Web search not available, using GPT-4o knowledge");
      knowledgeBase = await getAIKnowledge(content, postCategory || "", dateContext, dateRange, keywords);
    }

    const combinedResults = webSearchSucceeded
      ? webSearchResults.join("\n\n---\n\n")
      : knowledgeBase;

    const sourceType = webSearchSucceeded ? "web_search" : "ai_knowledge";

    // Step 4: 検索結果/知識から具体的なテーマを抽出
    console.log("[SearchQueries] Generating themes from results...");

    const themeResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたはテクノロジー情報のキュレーターです。

【今日の日付】${dateContext}

以下の情報から、投稿に使える「リサーチテーマ」を抽出してください。

【絶対ルール】
1. 提供された情報に含まれる内容のみからテーマを作成
2. 情報に含まれていない抽象的なテーマは絶対に作らない
3. 各テーマには必ず具体的な情報（日付、バージョン、機能名など）を含める
4. 「最新情報」「トレンド」など抽象的な表現は使わない

【良いテーマの例】
- 「Claude 3.5 Sonnetの新機能: computer use（2024年10月発表）」
- 「GPT-4o-mini APIの料金改定（2025年1月）」
- 「Next.js 15のTurbopack正式リリース」

【悪いテーマの例】
- 「AI業界の最新動向」（抽象的）
- 「今後の展望」（具体性なし）
- 「関連技術のトレンド」（漠然としている）`,
        },
        {
          role: "user",
          content: `【投稿内容】
${content}

${postCategory ? `【カテゴリー】${postCategory}` : ""}

【収集した情報】
${combinedResults.slice(0, 10000)}

上記の情報から、投稿に使える具体的なリサーチテーマを10〜15個抽出してください。
情報に含まれていない内容はテーマにしないでください。

JSON形式で出力：
{
  "themes": [
    {
      "id": "theme_1",
      "title": "具体的なテーマ（日付やバージョンを含む）",
      "description": "この情報の詳細（1-2文）",
      "keywords": ["関連キーワード"],
      "relevance": "high | medium | low",
      "source": "情報源（あれば）",
      "date": "関連する日付（あれば）"
    }
  ],
  "searchSummary": "収集した情報の要約（150-200文字、具体的な内容を含める）",
  "foundItems": "見つかった具体的な情報の数"
}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const resultContent = themeResponse.choices[0]?.message?.content;
    if (!resultContent) {
      throw new Error("Theme generation failed");
    }

    const result = JSON.parse(resultContent);
    const themes = result.themes || [];
    const searchSummary = result.searchSummary || "";

    console.log("[SearchQueries] Generated", themes.length, "themes");
    console.log("[SearchQueries] Source type:", sourceType);

    // テーマをクエリ形式に変換
    const queries = themes.map((theme: any, i: number) => ({
      id: `query_${i}`,
      query: theme.title,
      category: theme.relevance === "high" ? "注目情報" : theme.relevance === "medium" ? "関連情報" : "参考情報",
      description: theme.description,
      keywords: theme.keywords || [],
      source: theme.source || null,
      date: theme.date || null,
    }));

    return NextResponse.json({
      success: true,
      queries,
      themes,
      searchSummary: webSearchSucceeded
        ? `🔍 Web検索完了: ${searchSummary}`
        : `🤖 AI知識ベース: ${searchSummary}`,
      searchResultsPreview: combinedResults.slice(0, 3000),
      dateRange,
      postCategory: postCategory || null,
      webSearchUsed: webSearchSucceeded,
      sourceType,
      searchedAt: dateContext,
    });
  } catch (error) {
    console.error("[SearchQueries] Error:", error);
    const message = error instanceof Error ? error.message : "検索クエリの生成に失敗しました";
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
