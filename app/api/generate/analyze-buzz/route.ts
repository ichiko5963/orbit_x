import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PostForAnalysis {
  text: string;
  likes: number;
  tier: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { posts } = body;

    if (!posts || posts.length === 0) {
      return NextResponse.json(
        { error: "分析する投稿がありません" },
        { status: 400 }
      );
    }

    // S tierの投稿のみをフィルタリング
    const sTierPosts: PostForAnalysis[] = posts
      .filter((p: PostForAnalysis) => p.tier === "S")
      .sort((a: PostForAnalysis, b: PostForAnalysis) => b.likes - a.likes)
      .slice(0, 30); // 最大30投稿

    if (sTierPosts.length < 3) {
      return NextResponse.json(
        { error: "S tier投稿が3件以上必要です" },
        { status: 400 }
      );
    }

    const avgLikes = Math.round(
      sTierPosts.reduce((sum, p) => sum + p.likes, 0) / sTierPosts.length
    );

    console.log(`[AnalyzeBuzz] Analyzing ${sTierPosts.length} S-tier posts (avg ${avgLikes} likes)`);

    // 投稿テキストを整形
    const postsText = sTierPosts
      .map((p, i) => `[${i + 1}] (${p.likes}いいね)\n${p.text}`)
      .join("\n\n---\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたはXの投稿分析のエキスパートです。
バズっている投稿群を徹底的に分析し、「バズる投稿を作るためのプロンプト」を生成してください。

【分析の観点】
1. 構造パターン（導入→展開→結論の流れ）
2. フック（冒頭の書き出し）の特徴
3. 具体と抽象のバランス
4. 感情を動かす要素
5. 一貫性の作り方
6. 締めくくり方

【重要】
- 抽象化したパターンを3つ抽出
- 実際に使える表現・フレーズを抜き出す
- 避けるべきパターンも特定`,
        },
        {
          role: "user",
          content: `以下のS tier投稿（いいね数が多い投稿）を分析し、バズる投稿を作るためのプロンプトを生成してください。

【分析対象投稿】
${postsText}

【出力形式】JSON
{
  "prompt": "AI投稿生成時に使用する包括的なプロンプト（500文字程度）。投稿を生成するAIに対する具体的な指示を含める。",
  "patterns": [
    {
      "name": "パターン名（例：逆説フック型）",
      "description": "このパターンの特徴と効果（50文字程度）",
      "template": "抽象化したテンプレート（〇〇、△△などのプレースホルダー付き）"
    }
  ],
  "characteristics": [
    "バズる投稿の特徴1（具体的に）",
    "バズる投稿の特徴2",
    "バズる投稿の特徴3",
    "バズる投稿の特徴4",
    "バズる投稿の特徴5"
  ],
  "avoidPatterns": [
    "避けるべきパターン1",
    "避けるべきパターン2",
    "避けるべきパターン3"
  ],
  "samplePhrases": [
    "実際の投稿から抽出した使える表現1",
    "実際の投稿から抽出した使える表現2",
    "実際の投稿から抽出した使える表現3",
    "実際の投稿から抽出した使える表現4",
    "実際の投稿から抽出した使える表現5"
  ]
}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("分析結果が取得できませんでした");
    }

    const result = JSON.parse(content);

    return NextResponse.json({
      success: true,
      buzzPrompt: {
        prompt: result.prompt,
        patterns: result.patterns || [],
        characteristics: result.characteristics || [],
        avoidPatterns: result.avoidPatterns || [],
        samplePhrases: result.samplePhrases || [],
        analyzedPosts: sTierPosts.length,
        avgLikesAnalyzed: avgLikes,
      },
    });
  } catch (error) {
    console.error("[AnalyzeBuzz] Error:", error);
    const message =
      error instanceof Error ? error.message : "分析中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
