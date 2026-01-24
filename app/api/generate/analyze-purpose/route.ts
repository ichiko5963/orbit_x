import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PurposeSuggestion {
  id: string;
  label: string;
  description: string;
  searchKeywords: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "投稿内容を入力してください" },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは投稿コンテンツアナリストです。
ユーザーの投稿内容を分析し、「この投稿で何を伝えたいか」の候補を3つ提案してください。

各候補には：
- 簡潔なラベル（10文字以内）
- 説明（どんな角度で投稿するか、20文字程度）
- 情報補足のための検索キーワード（2-3個）

を含めてください。`,
        },
        {
          role: "user",
          content: `以下の投稿内容を分析して、投稿目的の候補を3つ提案してください。

【投稿内容】
${content}

JSON形式で回答：
{
  "purposes": [
    {
      "id": "purpose_1",
      "label": "ラベル（例：速報共有）",
      "description": "説明（例：最新情報をいち早く届ける）",
      "searchKeywords": ["キーワード1", "キーワード2"]
    },
    ...
  ]
}`,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    const purposes: PurposeSuggestion[] = result.purposes || [];

    return NextResponse.json({
      success: true,
      purposes,
    });
  } catch (error) {
    console.error("[AnalyzePurpose] Error:", error);
    const message =
      error instanceof Error ? error.message : "目的分析に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
