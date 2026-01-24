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
    console.log("[SearchQueries] Perplexity API key not found");
    return { searchResults: "", topics: [] };
  }

  try {
    // Step 1: まず投稿内容とカテゴリを理解して検索すべきトピックを特定
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-large-128k-online", // 大きいモデルで徹底検索
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

できるだけ具体的な情報（バージョン番号、機能名、日付など）を含めて回答してください。
「新機能」「アップデート」だけではなく、何がどう変わったのか具体的に教えてください。`,
          },
        ],
        max_tokens: 2500, // 多めに取得
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error("[SearchQueries] Perplexity API error:", response.status);
      return { searchResults: "", topics: [] };
    }

    const data = await response.json();
    const searchResults = data.choices?.[0]?.message?.content || "";

    console.log("[SearchQueries] Perplexity search completed, length:", searchResults.length);

    // Step 2: 検索結果からトピック（テーマ）を抽出
    const topics: string[] = [];
    if (searchResults) {
      // 簡易的にトピックを抽出（後でOpenAIで精査）
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

    console.log("[SearchQueries] Starting deep search...");
    console.log("[SearchQueries] Content:", content.slice(0, 100));
    console.log("[SearchQueries] Category:", postCategory || "none");
    console.log("[SearchQueries] Date:", dateContext);

    // Step 1: Perplexityで徹底的に検索（中規模ディープリサーチ）
    const { searchResults, topics } = await deepSearchWithPerplexity(
      content,
      postCategory || "",
      dateContext,
      dateRange
    );

    console.log("[SearchQueries] Search results length:", searchResults.length);
    console.log("[SearchQueries] Found topics:", topics.length);

    // Step 2: 検索結果を元に具体的なテーマを生成
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたは最新情報リサーチの専門家です。

【今日の日付】${dateContext}
【検索対象期間】${dateRange.from}〜${dateRange.to}（直近2週間のみ）

Web検索で見つかった【実際の最新情報】を元に、投稿に使える具体的な「リサーチテーマ」を生成してください。

【重要】抽象的なテーマは禁止
✗ NG: 「${monthYearContext}の新機能」「最新アップデート」「AIツールの動向」
○ OK: 「Claude 3.5 Sonnet の computer use 機能（${monthYearContext}11日発表）」
○ OK: 「GPT-4o の画像生成機能 DALL-E 3統合（${monthYearContext}15日リリース）」
○ OK: 「GitHub Copilot Chat のマルチファイル編集機能」

【テーマの条件】
1. 検索結果で見つかった実際の情報を反映
2. 具体的な機能名、バージョン、日付を含める
3. 投稿で使える有益な情報になるもの
4. 古い情報は絶対に含めない`,
        },
        {
          role: "user",
          content: `【投稿内容】
${content}

${postCategory ? `【カテゴリー】${postCategory}` : ""}

【Web検索で見つかった最新情報（これを元にテーマを生成）】
${searchResults || "（検索結果なし）"}

${topics.length > 0 ? `【検出されたトピック】\n${topics.join("\n")}` : ""}

上記の検索結果を元に、この投稿で使える具体的な「リサーチテーマ」を8〜12個生成してください。
検索結果で見つかった具体的な情報（機能名、バージョン、日付など）を必ずテーマに含めてください。

【重要】検索結果に含まれていない情報や、古い情報（2023-2025年）は絶対に含めないでください。

JSON形式で回答：
{
  "themes": [
    {
      "id": "theme_1",
      "title": "具体的なテーマタイトル（機能名・バージョン・日付を含む）",
      "description": "このテーマで調べると分かること（2-3文）",
      "keywords": ["関連キーワード1", "関連キーワード2"],
      "source": "検索結果のどの情報を元にしたか",
      "relevance": "high | medium | low"
    }
  ],
  "searchSummary": "検索結果の要約（100-200文字）"
}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      const themes = result.themes || [];
      const searchSummary = result.searchSummary || "";

      console.log("[SearchQueries] Generated", themes.length, "themes");
      if (themes.length > 0) {
        console.log("[SearchQueries] Sample theme:", themes[0].title);
      }

      // テーマをクエリ形式に変換（後方互換性のため）
      const queries = themes.map((theme: any, i: number) => ({
        id: `query_${i}`,
        query: theme.title,
        category: theme.relevance === "high" ? "注目情報" : theme.relevance === "medium" ? "関連情報" : "参考情報",
        description: theme.description,
        keywords: theme.keywords || [],
        source: theme.source || "",
      }));

      return NextResponse.json({
        success: true,
        queries,
        themes, // 新形式
        searchSummary, // 検索結果の要約
        searchResultsPreview: searchResults.slice(0, 1000), // 検索結果のプレビュー（最初の1000文字）
        dateRange,
        postCategory: postCategory || null,
        webSearchUsed: searchResults.length > 0,
        searchedAt: dateContext,
      });
    } catch (parseError) {
      console.error("[SearchQueries] Parse error:", parseError);
      return NextResponse.json({
        success: false,
        error: "テーマの解析に失敗しました",
        queries: [],
        themes: [],
      });
    }
  } catch (error) {
    console.error("[SearchQueries] Error:", error);
    const message =
      error instanceof Error ? error.message : "検索クエリの生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
