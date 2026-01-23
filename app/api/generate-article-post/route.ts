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
      ? `【記事本文】\n${fullContent.slice(0, 6000)}`
      : article.description;

    const prompt = `以下の記事を読み込んで、指定されたパターンに【完全に】当てはめた投稿を作成してください。

===== 記事情報 =====
【タイトル】${article.title}
【著者】${article.author}
【タグ】${article.tags.join(", ")}

【本文】
${contentToUse}

===== 投稿パターン（これに完全に当てはめる） =====
${patternTemplate}

===== パターン当てはめルール =====

【構造の完全再現】
- パターン内の〇〇、△△、□□、■■、▲▲、●●、◆◆、◇◇ は記事内容で置き換える
- 句読点の位置（。、...）を完全に維持
- 絵文字の位置と種類（👇🧵↓😳）を完全に維持
- 改行の位置を完全に維持
- 「〜すぎた」「〜だった」「〜がやばい」などの語尾を維持

【置き換え例】
パターン: 〇〇が公開した「△△」が有益すぎた。□□で■■を実現。▲▲な人は必読👇🧵
↓
生成例: Claude Codeの新機能「マルチファイル編集」が有益すぎた。AIで複数ファイルを同時編集を実現。開発効率を上げたい人は必読👇🧵

【内容のルール】
1. 記事本文から具体的な機能・数字・特徴を引用する
2. 「誰が公開した」はタイトルに明記されている場合のみ使う
3. 著者名（${article.author}）は公開元ではない。個人名なら「〇〇さんの記事」等
4. 記事に書いていない情報は絶対に書かない
5. 280文字以内

===== 出力 =====
パターンに当てはめた投稿本文のみ（説明不要）:`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたはX投稿パターンに当てはめるスペシャリストです。

【最重要ルール】
1. パターンの構造を100%維持する（句読点、絵文字、改行の位置）
2. 〇〇△△□□などのプレースホルダーを記事内容で置き換える
3. 記事本文から具体的な機能・数字・特徴を引用する
4. パターンの語尾（〜すぎた、〜だった、〜がやばい等）をそのまま使う
5. 絵文字（👇🧵↓😳）は必ず同じ位置に配置

パターンに当てはまらない自由形式の投稿は禁止。必ずパターンの骨格を維持すること。`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
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
