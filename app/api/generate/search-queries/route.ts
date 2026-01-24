import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Perplexity APIを使用してリアルタイムWeb検索
async function searchWithPerplexity(query: string): Promise<string> {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) {
    console.log("[SearchQueries] Perplexity API key not found, using OpenAI only");
    return "";
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          {
            role: "system",
            content: "You are a research assistant. Find the most recent and specific information about the given topic. Focus on concrete updates, releases, announcements from the last 2 weeks. Provide specific details like version numbers, dates, feature names. Answer in Japanese.",
          },
          {
            role: "user",
            content: `「${query}」について、直近2週間の最新情報を具体的に教えてください。具体的なアップデート内容、リリース情報、記事、有識者の発言などを含めてください。`,
          },
        ],
        max_tokens: 1000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.error("[SearchQueries] Perplexity API error:", response.status);
      return "";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("[SearchQueries] Perplexity search error:", error);
    return "";
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

    // Calculate date range (last 2 weeks)
    const todayDate = today ? new Date(today) : new Date();
    const twoWeeksAgo = new Date(todayDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const dateRange = {
      from: twoWeeksAgo.toISOString().split("T")[0],
      to: todayDate.toISOString().split("T")[0],
    };

    console.log("[SearchQueries] Content:", content.slice(0, 100));
    console.log("[SearchQueries] Category:", postCategory || "none");

    // Step 1: 投稿内容からキーワードを抽出
    const keywordResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "投稿内容から最新情報を検索するための主要キーワードを3つ抽出してください。具体的なサービス名、技術名、人名などを優先。",
        },
        {
          role: "user",
          content: `【投稿内容】\n${content}\n\nJSON形式で回答: {"keywords": ["keyword1", "keyword2", "keyword3"]}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(keywordResponse.choices[0]?.message?.content || "{}");
      keywords = parsed.keywords || [];
    } catch {
      keywords = [content.slice(0, 50)];
    }

    console.log("[SearchQueries] Extracted keywords:", keywords);

    // Step 2: Perplexityで実際にWeb検索して最新情報を取得
    let webSearchResults = "";
    if (keywords.length > 0) {
      const searchPromises = keywords.slice(0, 2).map(async (keyword) => {
        const result = await searchWithPerplexity(`${keyword} 最新ニュース アップデート 2026年1月`);
        return result ? `【${keyword}の検索結果】\n${result}` : "";
      });
      const results = await Promise.all(searchPromises);
      webSearchResults = results.filter(r => r).join("\n\n");
    }

    console.log("[SearchQueries] Web search completed, results length:", webSearchResults.length);

    // Step 3: 検索結果を元に具体的なクエリを生成
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたは最新情報リサーチの専門家です。
Web検索で見つかった【実際の最新情報】を元に、さらに詳しく調べるための具体的な検索クエリを生成してください。

【重要】抽象的なクエリは禁止
✗ NG: 「Claude 最新情報 2026年1月」
✗ NG: 「AI ツール アップデート」
○ OK: 「Claude 3.5 Opus computer use機能 ベータ版」
○ OK: 「GPT-4o 画像生成 DALL-E統合 1月リリース」

【クエリの条件】
1. 具体的な機能名、バージョン、日付を含める
2. 検索結果で見つかった実際の情報を反映
3. さらに深掘りできる角度を提案
4. 有識者の記事、公式ドキュメント、比較記事などを見つけられるクエリ`,
        },
        {
          role: "user",
          content: `【投稿内容】
${content}

${postCategory ? `【カテゴリー】${postCategory}` : ""}

【Web検索で見つかった最新情報】
${webSearchResults || "（検索結果なし - 一般的な情報で生成）"}

上記を元に、さらに詳しく調べるための【具体的な】検索クエリを10個生成してください。
検索結果で見つかった具体的な情報（機能名、バージョン、日付など）を必ずクエリに含めてください。

JSON形式で回答：
{
  "queries": [
    {
      "query": "具体的な検索クエリ（機能名やバージョンを含む）",
      "category": "公式情報 | 技術詳細 | 比較・評価 | 活用事例 | 最新動向",
      "description": "このクエリで見つかる具体的な情報",
      "source": "検索結果のどの情報を元にしたか"
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      const queries = result.queries || [];

      console.log("[SearchQueries] Generated", queries.length, "queries");
      if (queries.length > 0) {
        console.log("[SearchQueries] Sample:", queries[0].query);
      }

      return NextResponse.json({
        success: true,
        queries,
        dateRange,
        postCategory: postCategory || null,
        webSearchUsed: webSearchResults.length > 0,
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
