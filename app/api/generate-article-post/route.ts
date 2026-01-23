import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ArticleInfo {
  title: string;
  description: string;
  url: string;
  source: string;
  author: string;
  tags: string[];
  fullContent?: string; // Full article content (optional)
}

/**
 * Fetch full article content from scrape API
 */
async function fetchFullContent(url: string): Promise<string | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/scrape-article`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.article?.content || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patternId, patternTemplate, article, fetchFull = true } = body as {
      patternId: number;
      patternTemplate: string;
      article: ArticleInfo;
      fetchFull?: boolean;
    };

    if (!patternTemplate || !article) {
      return NextResponse.json(
        { error: "パターンと記事情報が必要です" },
        { status: 400 }
      );
    }

    // Fetch full content if requested and not already provided
    let fullContent: string | undefined = article.fullContent;
    if (fetchFull && !fullContent && article.url) {
      const fetched = await fetchFullContent(article.url);
      if (fetched) {
        fullContent = fetched;
      }
    }

    // Use full content if available, otherwise fall back to description
    // Use more content (up to 6000 chars) for better accuracy
    const contentToUse = fullContent
      ? fullContent.slice(0, 6000)
      : article.description;

    // Determine if this is an official source or community source
    const officialSources = ["openai", "anthropic", "google-ai", "cursor", "vercel", "supabase"];
    const isOfficial = officialSources.includes(article.source);

    // Source display name mapping
    const sourceDisplayNames: Record<string, string> = {
      "openai": "OpenAI",
      "anthropic": "Anthropic",
      "google-ai": "Google",
      "cursor": "Cursor",
      "vercel": "Vercel",
      "supabase": "Supabase",
      "qiita": "Qiita",
      "zenn": "Zenn",
      "medium": "Medium",
      "devto": "DEV.to",
      "hashnode": "Hashnode",
      "github": "GitHub",
    };
    const sourceName = sourceDisplayNames[article.source] || article.source;

    const prompt = `以下の記事を深く読み込み、内容を完全に理解した上で投稿を作成してください。

===== STEP 1: 記事を読み込む =====
【タイトル】${article.title}
【ソース】${sourceName}（${isOfficial ? "公式ブログ" : "技術記事サイト"}）
【著者】${article.author}

【記事本文】
${contentToUse}

===== STEP 2: 記事の要点を整理する（内部処理） =====
まず以下を頭の中で整理してから投稿を書くこと：
- この記事の核心メッセージは何か？
- 最も重要なポイント3つは？
- 読者にとっての価値は？
- 具体的な数字やデータはあるか？

===== STEP 3: 投稿パターンに当てはめる =====
【パターン】
${patternTemplate}

===== 当てはめルール =====

【ソースの書き方 - 重要】
${isOfficial ? `
- 公式ブログなので「${sourceName}が公開した〜」「${sourceName}の〜」と書いてOK
- 例：「OpenAIが公開した〜」「Supabaseの新機能〜」
` : `
- 個人/コミュニティ記事なので「〇〇が公開した」とは書かない
- 代わりに以下のパターンを使う：
  ・「${sourceName}で見つけた〜」
  ・「${sourceName}で公開されてた〜がやばい」
  ・「${article.author}さんの記事〜」
  ・「〜についての記事が有益だった」
  ・ツール/技術名を主語にする「Claude Codeの〜」
`}

【文章の一貫性 - 最重要】
- 記事の流れを理解し、論理的につながる文章にする
- 前半と後半で話が飛ばないようにする
- 「〜で、〜で、〜」と単に並べるのではなく、ストーリーを作る

【パターン構造】
- 句読点、絵文字（👇🧵↓😳）、改行の位置を維持
- 語尾（〜すぎた、〜だった、〜がやばい）を維持
- 280文字以内

===== 出力 =====
記事を深く理解した、一貫性のある投稿本文のみ:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは記事を深く読み込んでX投稿を作成するライターです。

【思考プロセス】
1. まず記事を最後まで読み、核心メッセージを理解する
2. 重要なポイント、数字、具体例をピックアップする
3. パターンに当てはめながら、一貫性のあるストーリーを作る

【文章の品質】
- 読んだ人が「なるほど、この記事読みたい」と思える内容
- 前半と後半が論理的につながっている
- 具体的で説得力がある
- 「〜で、〜で、〜」と並べるだけの羅列は避ける

【公式 vs 非公式の使い分け】
- 公式ブログ（OpenAI, Anthropic等）→「〇〇が公開した〜」OK
- 技術記事サイト（Qiita, Zenn等）→「〇〇で見つけた〜」「〜についての記事」

パターンの構造（句読点、絵文字、改行、語尾）は維持しつつ、自然で一貫性のある文章を作成すること。`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error("AIからの応答がありませんでした");
    }

    // Generate thread post (2nd post with URL)
    const threadPost = `記事の詳細はこちら👇\n${article.url}`;

    return NextResponse.json({
      success: true,
      text: generatedText,
      threadPost: threadPost,
      patternId,
    });
  } catch (error) {
    console.error("Generate article post error:", error);
    const message =
      error instanceof Error ? error.message : "生成中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
