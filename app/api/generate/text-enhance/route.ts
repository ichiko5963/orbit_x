import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TextEnhanceRequest {
  selectedText: string;
  fullText: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * テキスト選択AI強化: 選択部分をよりバズる表現に変換
 * 3-5個の候補を生成
 */
export async function POST(request: NextRequest) {
  try {
    const body: TextEnhanceRequest = await request.json();
    const { selectedText, fullText, selectionStart, selectionEnd } = body;

    if (!selectedText || !fullText) {
      return NextResponse.json(
        { error: "テキストが必要です" },
        { status: 400 }
      );
    }

    // 前後のコンテキストを取得
    const beforeText = fullText.slice(Math.max(0, selectionStart - 100), selectionStart);
    const afterText = fullText.slice(selectionEnd, selectionEnd + 100);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたはXのバズる投稿を作成するエキスパートです。
選択されたテキスト部分を、よりバズる表現に変換する候補を5つ生成してください。

【バズる表現の特徴】
1. 意外性・インパクト（「〇〇の9割が知らない」「マジで人生変わった」）
2. 具体性（数字、固有名詞、エピソード）
3. 共感を呼ぶ表現（「実は〜」「正直〜」「ぶっちゃけ〜」）
4. 権威性（「〇〇が公式発表」「トップ1%の〇〇」）
5. 緊急性・希少性（「今だけ」「知る人ぞ知る」）

【重要ルール】
- 元の意味は維持しつつ、表現を強化
- 文脈に自然に繋がる表現に
- 各候補は明確に違いを出す
- 文字数は元と大きく変わらない（±50%以内）`,
        },
        {
          role: "user",
          content: `【選択されたテキスト】
"${selectedText}"

【前後のコンテキスト】
前: "${beforeText}"
後: "${afterText}"

【タスク】
選択されたテキストをよりバズる表現に変換する候補を5つ生成してください。

JSON形式で出力：
{
  "options": [
    {
      "text": "変換後のテキスト",
      "style": "スタイル名（インパクト重視/共感重視/具体性重視/権威性重視/シンプル改善）",
      "reason": "なぜこの表現がバズるか（10文字程度）"
    }
  ]
}`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("候補の生成に失敗しました");
    }

    const result = JSON.parse(content);
    const options = result.options || [];

    return NextResponse.json({
      success: true,
      originalText: selectedText,
      options: options.slice(0, 5),
    });
  } catch (error) {
    console.error("[TextEnhance] Error:", error);
    const message =
      error instanceof Error ? error.message : "テキスト強化中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
