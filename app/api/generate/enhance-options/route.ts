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

    // Count original structure
    const lineCount = text.split("\n").length;
    const hasBullets = text.includes("・") || text.includes("-") || text.includes("•");
    const bulletCount = (text.match(/[・\-•]/g) || []).length;

    const prompt = `以下のX（Twitter）投稿を【最小限の変更】で強化してください。

【重要：構造維持のルール】
- 行数: ${lineCount}行を維持（増やさない、減らさない）
- 改行位置: 元の改行位置をそのまま維持
- 箇条書き: ${hasBullets ? `「・」を${bulletCount}個維持` : "箇条書きなし→追加しない"}
- 元の投稿の70%以上をそのまま残す

【元の投稿】
${text}

【3つの強化パターン】

1. 続きを追加
   - 元の投稿をほぼそのまま維持
   - 最後に1文だけ追加（余韻、CTA、補足）
   - 追加は20文字以内

2. 表現を磨く
   - 構造は100%維持
   - 語彙・表現のみ微調整（1〜3箇所）
   - 伝わりやすさ・パンチ力をUP
   - 意味は変えない

3. 要素を補強
   - 構造は100%維持
   - 足りない要素を追加：
     ・具体的な数字（〜%、〜倍、〜時間など）
     ・具体例（例えば〜、〜とか）
     ・体験談（実際に〜してみたら）
   - 追加は元の文に自然に溶け込ませる

【絶対禁止】
- 行数を変える
- 改行位置を変える
- 箇条書きの数を変える
- 元の投稿を大幅に書き換える
- 絵文字を追加（元になければ）
- AIっぽい表現（〜ですね、素晴らしい、ぜひ、必見）

以下のJSON形式で回答してください:
{
  "options": [
    {"id": "continue", "label": "続きを追加", "text": "強化後の投稿1"},
    {"id": "polish", "label": "表現を磨く", "text": "強化後の投稿2"},
    {"id": "reinforce", "label": "要素を補強", "text": "強化後の投稿3"}
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは投稿の「微調整」専門家です。

【絶対ルール】
- 元の投稿の構造（行数、改行、箇条書き）を100%維持
- 元の投稿の70%以上をそのまま残す
- 「書き直し」ではなく「ちょっとした改善」

あなたの仕事は「編集」であって「執筆」ではない。
ユーザーが書いた投稿を尊重し、最小限の変更で最大の効果を。

必ずJSON形式で回答してください。`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
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
