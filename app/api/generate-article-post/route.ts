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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patternId, patternTemplate, article } = body as {
      patternId: number;
      patternTemplate: string;
      article: ArticleInfo;
    };

    if (!patternTemplate || !article) {
      return NextResponse.json(
        { error: "パターンと記事情報が必要です" },
        { status: 400 }
      );
    }

    const prompt = `以下の記事情報に基づいて、X（Twitter）用の投稿を作成してください。

【記事情報 - これが唯一の情報源です】
タイトル: ${article.title}
概要: ${article.description}
著者: ${article.author}
タグ: ${article.tags.join(", ")}

【パターン構造（このフォーマットに沿って書く）】
${patternTemplate}

【絶対厳守ルール - ハルシネーション禁止】
1. 【最重要】記事のタイトルと概要に書かれていない情報は絶対に書かない
2. 【最重要】「誰が公開した」かは記事タイトルから判断する。タイトルに「〇〇が公開」と書いてなければ、「〇〇が公開した」とは書かない
3. 【最重要】著者名と公開元は別物。著者が個人名なら「〇〇さんの記事」「〇〇さんがまとめた」等にする
4. 記事に書いてある事実のみを使う。推測や補完は禁止
5. パターンの構造・改行位置・絵文字を完全に再現する
6. パターンに「👇」「🧵」「↓」「😳」などがあれば必ず同じ位置に含める
7. 改行は読みやすさのために適切に入れる
8. 280文字以内に収める

【例：正しい vs 間違い】
記事タイトル「AIコーディング実践ガイド」著者「tech_writer」の場合：
× 「Googleが公開した〜」（タイトルにGoogleとない）
× 「東大松尾研が公開した〜」（タイトルに東大松尾研とない）
○ 「AIコーディング実践ガイドが有益だった」
○ 「tech_writerさんの記事が参考になった」

投稿本文のみを出力。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたはX投稿を作成するライターです。【最重要】記事のタイトルと概要に書かれている情報だけを使う。書いてない情報（誰が公開したか等）を勝手に補完しない。著者名は公開元ではない。パターンの構造・改行・絵文字を完全再現する。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
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
