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

    const prompt = `以下の記事情報とパターンに基づいて、X（Twitter）用の投稿を作成してください。

【記事情報】
タイトル: ${article.title}
概要: ${article.description}
ソース: ${article.source}
著者: ${article.author}
タグ: ${article.tags.join(", ")}

【パターン構造（これに沿って書く）】
${patternTemplate}

【重要なルール】
1. 記事の内容を正確に反映すること（タイトル、概要から情報を抽出）
2. パターンの構造・口調・絵文字の使い方を完全に再現すること
3. パターンに「👇」「🧵」「↓」などがあれば必ず含める
4. パターンに絵文字があれば同様の場所に絵文字を使う
5. パターンにない絵文字は追加しない
6. 「〜ですね」「〜しましょう」「素晴らしい」「ぜひ」等のAI表現は禁止
7. 280文字以内に収める
8. 記事の具体的な特徴や学べることを含める

投稿本文のみを出力してください。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたはX（Twitter）でバズる投稿を作成するライターです。記事の内容を正確に把握し、指定されたパターンの構造・口調・絵文字の使い方を完全に再現してください。パターンにある絵文字（👇🧵😳↓など）は必ず含めてください。AIっぽい表現は禁止。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.6,
      max_tokens: 500,
    });

    const generatedText = response.choices[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new Error("AIからの応答がありませんでした");
    }

    return NextResponse.json({
      success: true,
      text: generatedText,
      patternId,
    });
  } catch (error) {
    console.error("Generate article post error:", error);
    const message =
      error instanceof Error ? error.message : "生成中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
