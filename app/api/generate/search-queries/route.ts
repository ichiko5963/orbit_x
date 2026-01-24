import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 日付文字列をパースして有効かチェック
function isWithinTwoWeeks(dateStr: string, referenceDate: Date): boolean {
  // 日付パターンを検出
  const patterns = [
    /(\d{4})年(\d{1,2})月(\d{1,2})日/,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
    /(\d{4})-(\d{1,2})-(\d{1,2})/,
    /(\d{4})年(\d{1,2})月/,
  ];

  for (const pattern of patterns) {
    const match = dateStr.match(pattern);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      const day = match[3] ? parseInt(match[3]) : 15; // 日がない場合は月中旬

      const date = new Date(year, month - 1, day);
      const twoWeeksAgo = new Date(referenceDate);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      return date >= twoWeeksAgo && date <= referenceDate;
    }
  }

  return false;
}

// OpenAI Responses APIでWeb検索を試行（複数回リトライ）
async function tryWebSearchWithRetry(
  query: string,
  maxRetries: number = 3
): Promise<{ success: boolean; result: string; citations?: string[] }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[SearchQueries] Web search attempt ${attempt + 1}/${maxRetries}: ${query}`);

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          tools: [{ type: "web_search" }],
          input: query,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[SearchQueries] Web search API error (attempt ${attempt + 1}):`, response.status);
        if (attempt === maxRetries - 1) {
          return { success: false, result: "", citations: [] };
        }
        await new Promise(r => setTimeout(r, 1000)); // 1秒待機
        continue;
      }

      const data = await response.json();
      const result = data.output_text || data.output?.[0]?.content?.[0]?.text || "";
      const citations = data.citations || [];

      if (result.length > 100) {
        console.log(`[SearchQueries] Web search successful (attempt ${attempt + 1}), length:`, result.length);
        return { success: true, result, citations };
      }
    } catch (error) {
      console.log(`[SearchQueries] Web search error (attempt ${attempt + 1}):`, error);
    }

    if (attempt < maxRetries - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return { success: false, result: "", citations: [] };
}

// 徹底的なWeb検索（30秒かけて複数クエリを実行）
async function thoroughWebSearch(
  content: string,
  keywords: string[],
  dateContext: string,
  dateRange: { from: string; to: string }
): Promise<{ results: string[]; webSearchWorked: boolean }> {
  console.log("[SearchQueries] Starting thorough web search...");

  const searchQueries = [
    // 公式アップデート検索
    `${keywords[0]} official release announcement ${dateRange.to.slice(0, 7)}`,
    `${keywords[0]} new features update January 2026`,
    // ニュース検索
    `${keywords[0]} latest news this week`,
    `${keywords.slice(0, 2).join(" ")} news ${dateRange.to}`,
    // 技術記事検索
    `${keywords[0]} tutorial guide 2026`,
    // キーワード別検索
    ...keywords.slice(1, 4).map(kw => `${kw} update ${dateRange.to.slice(0, 7)}`),
  ];

  const results: string[] = [];
  let webSearchWorked = false;

  // 並列で検索実行（最大6クエリ）
  const searchPromises = searchQueries.slice(0, 6).map(async (query) => {
    const result = await tryWebSearchWithRetry(query, 2);
    return result;
  });

  const searchResults = await Promise.all(searchPromises);

  for (const result of searchResults) {
    if (result.success && result.result.length > 100) {
      results.push(result.result);
      webSearchWorked = true;
    }
  }

  console.log(`[SearchQueries] Web search completed. Found ${results.length} results. Worked: ${webSearchWorked}`);
  return { results, webSearchWorked };
}

// GPT-4oに最新情報を聞く（日付を厳格に指定）
async function askGPTForRecentInfo(
  content: string,
  category: string,
  keywords: string[],
  dateContext: string,
  dateRange: { from: string; to: string }
): Promise<string> {
  console.log("[SearchQueries] Asking GPT-4o for information...");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたはテクノロジー情報のリサーチャーです。

【重要】今日は${dateContext}です。

ユーザーの投稿内容に関連する情報を提供してください。

【厳格なルール】
1. あなたの知識ベースにある情報のみを提供してください
2. 各情報に必ず「いつの情報か」を明記してください
3. 知識のカットオフ日より新しい情報は推測しないでください
4. 具体的な情報のみ（バージョン番号、機能名、発表内容）
5. 抽象的な予測や一般論は不要です

【出力形式】
各情報を以下の形式で列挙してください：
- [YYYY年MM月] サービス/技術名: 具体的な内容

例：
- [2024年10月] Claude 3.5 Sonnet: computer use機能を発表
- [2025年1月] GPT-4o: 新しい音声モード追加

【あなたの知識カットオフについて】
あなたの知識が${dateContext}より古い場合は、その旨を最初に明記してください。`,
      },
      {
        role: "user",
        content: `【投稿内容】
${content}

${category ? `【カテゴリー】${category}` : ""}

【キーワード】
${keywords.join(", ")}

上記に関連する、あなたが確実に知っている情報を20個以上提供してください。
各情報には必ず日付（年月）を含めてください。
知らない情報や推測は含めないでください。`,
      },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  return response.choices[0]?.message?.content || "";
}

// 検索結果から具体的なテーマを抽出
async function extractThemesFromResults(
  content: string,
  category: string,
  searchResults: string,
  dateContext: string,
  dateRange: { from: string; to: string },
  webSearchWorked: boolean
): Promise<{
  themes: any[];
  searchSummary: string;
  validInfoCount: number;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたはテクノロジー情報のキュレーターです。

【今日の日付】${dateContext}
【対象期間】${dateRange.from}〜${dateRange.to}

以下の情報から、投稿に使える「リサーチテーマ」を抽出してください。

【絶対ルール】
1. 提供された情報に実際に含まれる内容のみからテーマを作成
2. 各テーマには必ず「日付」と「具体的な情報」を含める
3. 情報に日付がある場合はその日付を、ない場合は「日付不明」と記載
4. 「最新情報」「トレンド」などの抽象的な表現は使わない
5. 推測や一般化は禁止

【良いテーマの例】
- 「Claude 3.5 Sonnetのcomputer use機能（2024年10月発表）」
- 「OpenAI GPT-4o音声モードの改善（2025年1月）」
- 「Next.js 15のTurbopack正式サポート（2024年10月）」

【悪いテーマの例】
- 「AI業界の最新動向」（抽象的すぎる）
- 「今後の展望」（推測）
- 「便利な機能まとめ」（具体性なし）`,
      },
      {
        role: "user",
        content: `【投稿内容】
${content}

${category ? `【カテゴリー】${category}` : ""}

【収集した情報】
${searchResults.slice(0, 12000)}

上記の情報から、投稿に使える具体的なリサーチテーマを15〜20個抽出してください。
必ず情報源に含まれる内容のみをテーマにしてください。

JSON形式で出力：
{
  "themes": [
    {
      "id": "theme_1",
      "title": "具体的なテーマ（日付と内容を含む）",
      "description": "この情報の詳細（2-3文）",
      "keywords": ["関連キーワード"],
      "relevance": "high | medium | low",
      "date": "情報の日付（YYYY年MM月形式）",
      "source": "公式/記事/発表など"
    }
  ],
  "searchSummary": "収集した情報の要約（200文字程度、具体的な内容を含める）",
  "validInfoCount": 情報に含まれる具体的なアイテム数（数値）,
  "knowledgeCutoffNote": "${webSearchWorked ? "" : "知識ベースからの情報です。実際の発表日時は異なる可能性があります。"}"
}`,
      },
    ],
    temperature: 0.1,
    max_tokens: 5000,
    response_format: { type: "json_object" },
  });

  const resultContent = response.choices[0]?.message?.content;
  if (!resultContent) {
    throw new Error("Theme extraction failed");
  }

  const result = JSON.parse(resultContent);
  return {
    themes: result.themes || [],
    searchSummary: result.searchSummary || "",
    validInfoCount: result.validInfoCount || 0,
  };
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

    // 今日の日付
    const todayDate = today ? new Date(today) : new Date();
    const twoWeeksAgo = new Date(todayDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const dateRange = {
      from: twoWeeksAgo.toISOString().split("T")[0],
      to: todayDate.toISOString().split("T")[0],
    };

    const dateContext = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;

    console.log("[SearchQueries] ===========================================");
    console.log("[SearchQueries] Starting thorough search...");
    console.log("[SearchQueries] Date:", dateContext);
    console.log("[SearchQueries] Range:", dateRange.from, "to", dateRange.to);

    // Step 1: キーワード抽出
    console.log("[SearchQueries] Step 1: Extracting keywords...");
    const keywordResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "投稿内容から検索すべきキーワードを抽出。技術名、サービス名、ツール名、製品名、人名など具体的なものを優先。",
        },
        {
          role: "user",
          content: `【投稿内容】\n${content}\n\n${postCategory ? `【カテゴリー】${postCategory}` : ""}\n\n検索キーワードを10個、JSON形式で出力：\n{"keywords": ["キーワード1", ...]}`,
        },
      ],
      temperature: 0.2,
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

    // Step 2: Web検索を試行（徹底的に）
    console.log("[SearchQueries] Step 2: Attempting web search...");
    const { results: webResults, webSearchWorked } = await thoroughWebSearch(
      content,
      keywords,
      dateContext,
      dateRange
    );

    // Step 3: GPT-4oの知識を取得（Web検索が機能したかに関わらず）
    console.log("[SearchQueries] Step 3: Getting GPT-4o knowledge...");
    const gptKnowledge = await askGPTForRecentInfo(
      content,
      postCategory || "",
      keywords,
      dateContext,
      dateRange
    );

    // 結果を統合
    const allResults = [
      ...webResults,
      "---\n【GPT-4oの知識ベースからの情報】\n" + gptKnowledge,
    ].join("\n\n---\n\n");

    console.log("[SearchQueries] Combined results length:", allResults.length);

    // Step 4: テーマを抽出
    console.log("[SearchQueries] Step 4: Extracting themes...");
    const { themes, searchSummary, validInfoCount } = await extractThemesFromResults(
      content,
      postCategory || "",
      allResults,
      dateContext,
      dateRange,
      webSearchWorked
    );

    console.log("[SearchQueries] Generated", themes.length, "themes");
    console.log("[SearchQueries] Valid info count:", validInfoCount);
    console.log("[SearchQueries] Web search worked:", webSearchWorked);

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

    // 検索結果のサマリーを作成
    const summaryPrefix = webSearchWorked
      ? "🔍 Web検索＋AI知識: "
      : "🤖 AI知識ベース: ";

    return NextResponse.json({
      success: true,
      queries,
      themes,
      searchSummary: summaryPrefix + searchSummary,
      searchResultsPreview: allResults.slice(0, 4000),
      dateRange,
      postCategory: postCategory || null,
      webSearchUsed: webSearchWorked,
      sourceType: webSearchWorked ? "web_search_and_knowledge" : "knowledge_only",
      searchedAt: dateContext,
      validInfoCount,
      note: webSearchWorked
        ? null
        : "Web検索APIが利用できないため、GPT-4oの知識ベースを使用しています。リアルタイム情報が必要な場合は、Tavily APIの追加を検討してください。",
    });
  } catch (error) {
    console.error("[SearchQueries] Error:", error);
    const message = error instanceof Error ? error.message : "検索クエリの生成に失敗しました";
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
