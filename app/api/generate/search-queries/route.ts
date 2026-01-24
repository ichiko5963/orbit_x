import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Perplexity APIを使用して徹底的にWeb検索（中規模のディープリサーチ）
async function deepSearchWithPerplexity(
  content: string,
  category: string,
  dateContext: string,
  dateRange: { from: string; to: string }
): Promise<{ searchResults: string; topics: string[] }> {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) {
    console.log("[SearchQueries] Perplexity API key not found, will use OpenAI only");
    return { searchResults: "", topics: [] };
  }

  try {
    console.log("[SearchQueries] Calling Perplexity API...");
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-large-128k-online",
        messages: [
          {
            role: "system",
            content: `あなたは最新テクノロジー情報のリサーチャーです。

【今日の日付】${dateContext}
【検索対象期間】${dateRange.from}〜${dateRange.to}（直近2週間のみ）

ユーザーが投稿を作成しようとしています。その投稿に役立つ最新情報を徹底的に調べてください。

【重要な指示】
1. 抽象的な情報は不要です。具体的な機能名、バージョン番号、リリース日、発表内容を含めてください
2. 古い情報（2023年、2024年、2025年など）は含めないでください
3. 公式発表、アップデート情報、有識者の記事などを優先してください
4. 検索結果は日本語で回答してください`,
          },
          {
            role: "user",
            content: `以下の投稿内容に関連する最新情報を徹底的に調べてください。

【投稿内容】
${content}

${category ? `【カテゴリー】${category}` : ""}

【調べてほしいこと】
1. この投稿に関連する直近2週間（${dateRange.from}〜${dateRange.to}）の最新アップデート、リリース、発表
2. 具体的な機能名、バージョン番号、発表日
3. 関連する有識者の記事や解説
4. 実際の活用事例や評価

できるだけ具体的な情報（バージョン番号、機能名、日付など）を含めて回答してください。`,
          },
        ],
        max_tokens: 2500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[SearchQueries] Perplexity API error:", response.status, errorText);
      return { searchResults: "", topics: [] };
    }

    const data = await response.json();
    const searchResults = data.choices?.[0]?.message?.content || "";

    console.log("[SearchQueries] Perplexity search completed, length:", searchResults.length);

    // トピックを抽出
    const topics: string[] = [];
    if (searchResults) {
      const lines = searchResults.split("\n").filter((l: string) => l.trim());
      for (const line of lines) {
        if (line.includes("：") || line.includes(":") || line.match(/^\d+\./)) {
          const topic = line.replace(/^[\d\.\-\*]+\s*/, "").trim();
          if (topic.length > 10 && topic.length < 100) {
            topics.push(topic);
          }
        }
      }
    }

    return { searchResults, topics: topics.slice(0, 10) };
  } catch (error) {
    console.error("[SearchQueries] Perplexity deep search error:", error);
    return { searchResults: "", topics: [] };
  }
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
    const monthYearContext = `${todayDate.getFullYear()}年${todayDate.getMonth() + 1}月`;

    console.log("[SearchQueries] Starting search...");
    console.log("[SearchQueries] Content:", content.slice(0, 100));
    console.log("[SearchQueries] Category:", postCategory || "none");
    console.log("[SearchQueries] Date:", dateContext);

    // Step 1: Perplexityで検索（利用可能な場合）
    const { searchResults, topics } = await deepSearchWithPerplexity(
      content,
      postCategory || "",
      dateContext,
      dateRange
    );

    const hasPerplexityResults = searchResults.length > 0;
    console.log("[SearchQueries] Has Perplexity results:", hasPerplexityResults);

    // Step 2: OpenAIでテーマを生成（Perplexity結果の有無に関わらず）
    const systemPrompt = hasPerplexityResults
      ? `あなたは最新情報リサーチの専門家です。

【今日の日付】${dateContext}
【検索対象期間】${dateRange.from}〜${dateRange.to}

Web検索で見つかった最新情報を元に、投稿に使える「リサーチテーマ」を生成してください。
検索結果に含まれる具体的な情報（機能名、バージョン、日付など）を反映してください。`
      : `あなたは最新情報リサーチの専門家です。

【今日の日付】${dateContext}
【検索対象期間】${dateRange.from}〜${dateRange.to}

投稿内容とカテゴリを分析して、この投稿を充実させるために調べるべき「リサーチテーマ」を提案してください。
投稿内容から推測される関連トピック、最新動向、深掘りすべき観点を提案してください。

【重要】
- テーマは具体的に（「最新情報」ではなく、何についての情報か明示）
- 投稿内容に関連する技術、ツール、トレンドを含める
- ユーザーが投稿で言及しそうな内容を予測`;

    const userPrompt = hasPerplexityResults
      ? `【投稿内容】
${content}

${postCategory ? `【カテゴリー】${postCategory}` : ""}

【Web検索で見つかった最新情報】
${searchResults}

${topics.length > 0 ? `【検出されたトピック】\n${topics.join("\n")}` : ""}

上記の検索結果を元に、この投稿で使える「リサーチテーマ」を8〜12個生成してください。`
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
      "title": "具体的なテーマタイトル",
      "description": "このテーマで調べると分かること（1-2文）",
      "keywords": ["キーワード1", "キーワード2"],
      "relevance": "high | medium | low"
    }
  ],
  "searchSummary": "${hasPerplexityResults ? "検索結果の要約（100-150文字）" : "投稿内容の分析結果（100-150文字）"}"
}`,
        },
      ],
      temperature: 0.3,
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
    }));

    return NextResponse.json({
      success: true,
      queries,
      themes,
      searchSummary,
      searchResultsPreview: searchResults.slice(0, 1000),
      dateRange,
      postCategory: postCategory || null,
      webSearchUsed: hasPerplexityResults,
      searchedAt: dateContext,
    });
  } catch (error) {
    console.error("[SearchQueries] Error:", error);
    const message = error instanceof Error ? error.message : "検索クエリの生成に失敗しました";
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
