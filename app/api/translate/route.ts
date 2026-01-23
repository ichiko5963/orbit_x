import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/translate
 * Translate text from English to Japanese using OpenAI
 *
 * Body:
 * - text: Text to translate
 * - targetLang: Target language (default: "ja")
 */
export async function POST(request: NextRequest) {
  try {
    const { text, targetLang = "ja" } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    // Skip translation if already in target language (simple heuristic)
    const japaneseRatio = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length / text.length;
    if (japaneseRatio > 0.3) {
      // Already mostly Japanese
      return NextResponse.json({
        success: true,
        translated: text,
        isOriginal: true,
      });
    }

    const prompt = `以下のテキストを自然な日本語に翻訳してください。
技術用語やブランド名は原文のままで構いません。
SNS投稿なので、カジュアルで読みやすい文体で訳してください。

テキスト:
${text}

翻訳のみを出力してください。`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは英語から日本語への翻訳者です。SNS投稿を自然な日本語に翻訳します。技術用語やブランド名は適切に判断して、原文のままか日本語に訳すかを決めてください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const translated = response.choices[0]?.message?.content?.trim();

    if (!translated) {
      throw new Error("翻訳に失敗しました");
    }

    return NextResponse.json({
      success: true,
      translated,
      original: text,
      isOriginal: false,
    });
  } catch (error) {
    console.error("Translation error:", error);
    const message = error instanceof Error ? error.message : "翻訳に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
