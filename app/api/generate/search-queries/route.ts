import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI Responses APIでWeb検索を実行
async function searchWithOpenAI(
  query: string,
  dateContext: string,
  dateRange: { from: string; to: string }
): Promise<string> {
  try {
    console.log("[SearchQueries] OpenAI web search:", query);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "web_search" }],
        input: `【検索日】${dateContext}
【検索対象期間】${dateRange.from}〜${dateRange.to}（直近2週間のみ）

以下について最新情報を徹底的に検索してください：
${query}

【重要】
- 具体的な情報のみ（バージョン番号、機能名、リリース日、発表内容）
- 古い情報（2024年以前）は含めない
- 公式発表、アップデート情報を優先
- 日本語で回答`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SearchQueries] OpenAI Responses API error:", response.status, errorText);
      return "";
    }

    const data = await response.json();
    const result = data.output_text || data.choices?.[0]?.message?.content || "";
    console.log("[SearchQueries] Search result length:", result.length);
    return result;
  } catch (error) {
    console.error("[SearchQueries] OpenAI web search error:", error);
    return "";
  }
}

// 徹底的なWeb検索（複数クエリで並列実行）
async function deepWebSearch(
  content: string,
  category: string,
  dateContext: string,
  dateRange: { from: string; to: string }
): Promise<{ searchResults: string; topics: string[] }> {
  console.log("[SearchQueries] Starting deep web search...");

  // コンテンツからキーワードを抽出してクエリを生成
  const keywordResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "投稿内容から検索すべきキーワードを抽出してください。技術名、サービス名、ツール名、トレンドワードなど。",
      },
      {
        role: "user",
        content: `【投稿内容】\n${content}\n\n${category ? `【カテゴリー】${category}` : ""}\n\nこの投稿に関連する検索キーワードを5個、JSON配列で出力：\n["キーワード1", "キーワード2", ...]`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  let keywords: string[] = [];
  try {
    const keywordContent = keywordResponse.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(keywordContent);
    keywords = Array.isArray(parsed) ? parsed : (parsed.keywords || parsed.queries || []);
  } catch {
    keywords = [];
  }

  console.log("[SearchQueries] Extracted keywords:", keywords);

  if (keywords.length === 0) {
    // キーワード抽出失敗時はコンテンツの主題で検索
    keywords = [content.slice(0, 100)];
  }

  // 検索クエリを構築
  const searchQueries = [
    // メインクエリ：投稿内容に直接関連
    `${keywords[0] || content.slice(0, 50)} 最新情報 ${dateRange.to.slice(0, 7)}`,
    // 技術トレンド
    `${keywords[0] || ""} アップデート リリース ${dateContext.slice(0, 7)}`,
    // 各キーワードで検索
    ...keywords.slice(1, 4).map(kw => `${kw} 最新 ${dateContext.slice(0, 7)}`),
  ].filter(q => q.trim().length > 5);

  console.log("[SearchQueries] Search queries:", searchQueries);

  // 並列で検索実行
  const searchPromises = searchQueries.map(query =>
    searchWithOpenAI(query, dateContext, dateRange)
  );

  const results = await Promise.all(searchPromises);
  const validResults = results.filter(r => r.length > 100);

  console.log("[SearchQueries] Valid results count:", validResults.length);

  if (validResults.length === 0) {
    console.log("[SearchQueries] No valid search results, falling back to AI knowledge");
    return { searchResults: "", topics: [] };
  }

  // 検索結果を統合
  const combinedResults = validResults.join("\n\n---\n\n");

  // トピックを抽出
  const topics: string[] = [];
  for (const result of validResults) {
    const lines = result.split("\n").filter((l: string) => l.trim());
    for (const line of lines) {
      if (line.includes("：") || line.includes(":") || line.match(/^\d+\./) || line.match(/^[-•]/)) {
        const topic = line.replace(/^[\d\.\-\*•]+\s*/, "").trim();
        if (topic.length > 10 && topic.length < 150 && !topics.includes(topic)) {
          topics.push(topic);
        }
      }
    }
  }

  console.log("[SearchQueries] Extracted topics:", topics.length);

  return {
    searchResults: combinedResults,
    topics: topics.slice(0, 15)
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

    // 今日の日付を計算
    const todayDate = today ? new Date(today) : new Date();
    const twoWeeksAgo = new Date(todayDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const dateRange = {
      from: twoWeeksAgo.toISOString().split("T")[0],
      to: todayDate.toISOString().split("T")[0],
    };

    // 日付フォーマット
    const dateContext = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月${todayDate.getDate()}日`;

    console.log("[SearchQueries] Starting search...");
    console.log("[SearchQueries] Content:", content.slice(0, 100));
    console.log("[SearchQueries] Category:", postCategory || "none");
    console.log("[SearchQueries] Date:", dateContext);

    // Step 1: OpenAI Responses APIで徹底的にWeb検索
    const { searchResults, topics } = await deepWebSearch(
      content,
      postCategory || "",
      dateContext,
      dateRange
    );

    const hasWebSearchResults = searchResults.length > 0;
    console.log("[SearchQueries] Has web search results:", hasWebSearchResults);
    console.log("[SearchQueries] Search results length:", searchResults.length);

    // Step 2: 検索結果を元にリサーチテーマを生成
    const systemPrompt = hasWebSearchResults
      ? `あなたは最新情報リサーチの専門家です。

【今日の日付】${dateContext}
【検索対象期間】${dateRange.from}〜${dateRange.to}

Web検索で見つかった最新情報を元に、投稿に使える「リサーチテーマ」を生成してください。

【重要】
- 検索結果に含まれる具体的な情報（機能名、バージョン、日付）を必ず反映
- 抽象的なテーマは作らない
- 検索で見つかった事実に基づいたテーマのみ`
      : `あなたは最新情報リサーチの専門家です。

【今日の日付】${dateContext}
【検索対象期間】${dateRange.from}〜${dateRange.to}

投稿内容とカテゴリを分析して、この投稿を充実させるために調べるべき「リサーチテーマ」を提案してください。

【重要】
- テーマは具体的に（「最新情報」ではなく、何についての情報か明示）
- 投稿内容に関連する技術、ツール、トレンドを含める
- ユーザーが投稿で言及しそうな内容を予測`;

    const userPrompt = hasWebSearchResults
      ? `【投稿内容】
${content}

${postCategory ? `【カテゴリー】${postCategory}` : ""}

【Web検索で見つかった最新情報】
${searchResults.slice(0, 8000)}

${topics.length > 0 ? `【検出されたトピック】\n${topics.join("\n")}` : ""}

上記の検索結果を元に、この投稿で使える「リサーチテーマ」を10〜15個生成してください。
検索結果に含まれる具体的な情報（機能名、バージョン番号、日付）を必ずテーマに含めてください。`
      : `【投稿内容】
${content}

${postCategory ? `【カテゴリー】${postCategory}` : ""}

投稿内容を分析して、この投稿を充実させるために調べるべき「リサーチテーマ」を8〜12個提案してください。

【テーマの例】
- 投稿で言及されているツール・サービスの最新機能
- 関連する技術トレンドや業界動向
- 競合サービスとの比較ポイント
- 実践的な活用方法やTips
- 有識者の見解や評価`;

    console.log("[SearchQueries] Calling OpenAI to generate themes...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${userPrompt}

JSON形式で回答：
{
  "themes": [
    {
      "id": "theme_1",
      "title": "具体的なテーマタイトル（検索で見つかった情報を含む）",
      "description": "このテーマで調べると分かること（1-2文）",
      "keywords": ["キーワード1", "キーワード2"],
      "relevance": "high | medium | low",
      "source": "検索結果から抽出した場合はその情報源"
    }
  ],
  "searchSummary": "${hasWebSearchResults ? "Web検索で見つかった最新情報の要約（150-200文字）" : "投稿内容の分析結果（100-150文字）"}"
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });

    const resultContent = response.choices[0]?.message?.content;
    console.log("[SearchQueries] OpenAI response received");

    if (!resultContent) {
      throw new Error("OpenAI response is empty");
    }

    const result = JSON.parse(resultContent);
    const themes = result.themes || [];
    const searchSummary = result.searchSummary || "";

    console.log("[SearchQueries] Generated", themes.length, "themes");

    // テーマをクエリ形式に変換
    const queries = themes.map((theme: any, i: number) => ({
      id: `query_${i}`,
      query: theme.title,
      category: theme.relevance === "high" ? "注目情報" : theme.relevance === "medium" ? "関連情報" : "参考情報",
      description: theme.description,
      keywords: theme.keywords || [],
      source: theme.source || null,
    }));

    return NextResponse.json({
      success: true,
      queries,
      themes,
      searchSummary,
      searchResultsPreview: searchResults.slice(0, 2000),
      dateRange,
      postCategory: postCategory || null,
      webSearchUsed: hasWebSearchResults,
      searchedAt: dateContext,
    });
  } catch (error) {
    console.error("[SearchQueries] Error:", error);
    const message = error instanceof Error ? error.message : "検索クエリの生成に失敗しました";
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
