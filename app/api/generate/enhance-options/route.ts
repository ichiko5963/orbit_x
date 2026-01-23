import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const prompt = `以下のX（Twitter）投稿を3つの異なる方向性で強化してください。

【元の投稿】
${text}

【強化の方向性】
1. インパクト重視: 冒頭で強く注目を引く。数字や逆説を活用。
2. 明確さ重視: 構造を整理し、読みやすく。箇条書きや改行を効果的に使用。
3. バズ重視: 共感・議論を呼ぶ要素を追加。問いかけや具体例を含める。

【ルール】
- 各投稿は280文字以内
- 元の内容・意図は必ず維持
- 自然な日本語で
- 絵文字は控えめに（最大2個）
- 各投稿は完結した形で

以下のJSON形式で回答してください:
{
  "options": [
    {"id": "impact", "label": "インパクト重視", "text": "強化後の投稿1"},
    {"id": "clarity", "label": "明確さ重視", "text": "強化後の投稿2"},
    {"id": "viral", "label": "バズ重視", "text": "強化後の投稿3"}
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたはX（Twitter）投稿の専門家です。投稿を様々な方向性で強化します。必ずJSON形式で回答してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Enhance options error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate options";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
