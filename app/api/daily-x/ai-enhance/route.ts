import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/daily-x/ai-enhance
 * AI enhancement for generated posts
 * Body: { text, originalTweet, mode: "hallucination-check" | "enhance" }
 */
export async function POST(request: NextRequest) {
  try {
    const { text, originalTweet, mode } = await request.json();

    if (!text || !mode) {
      return NextResponse.json({ error: "text and mode required" }, { status: 400 });
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "hallucination-check") {
      systemPrompt = `あなたはファクトチェッカーです。生成されたSNS投稿に事実と異なる情報（ハルシネーション）がないか厳密にチェックします。

ルール:
- 元の投稿に書かれていない情報が追加されていたら削除または修正
- 数字・固有名詞・日付が元と異なる場合は修正
- 「〜と言われている」「〜らしい」など曖昧な表現で事実を装っている場合は修正
- 問題なければそのまま返す
- URLは含めない
- 投稿本文のみを出力`;

      userPrompt = `【生成された投稿】
${text}

${originalTweet ? `【元の投稿（事実の根拠）】\n${originalTweet}` : ""}

ハルシネーションがあれば修正した投稿本文を、なければそのまま投稿本文を出力してください。`;

    } else if (mode === "enhance") {
      systemPrompt = `あなたはSNS投稿の情報価値を最大化するエキスパートです。

ルール:
- 元の投稿の情報を元に、具体的な数字・データ・事実を追加して情報量を増やす
- 元の投稿にない情報を捏造しない（元の投稿から推測できる範囲で補足）
- 構成・文体は大きく変えない
- 読みやすさを維持
- URLは含めない
- 投稿本文のみを出力`;

      userPrompt = `【現在の投稿】
${text}

${originalTweet ? `【元の投稿（情報ソース）】\n${originalTweet}` : ""}

この投稿の情報量を増やし、より具体的で価値の高い投稿にしてください。投稿本文のみを出力:`;

    } else {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: mode === "hallucination-check" ? 0.1 : 0.5,
      max_tokens: 1000,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) {
      return NextResponse.json({ error: "AI response empty" }, { status: 500 });
    }

    return NextResponse.json({ success: true, text: result, mode });
  } catch (error) {
    console.error("[AI Enhance] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Enhancement failed" },
      { status: 500 }
    );
  }
}
