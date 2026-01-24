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
バズっている投稿群を徹底的に分析し、そのまま使える「AIプロンプト」を生成してください。

【重要な出力形式】
出力するpromptは、投稿生成AIにそのまま渡せる完全なプロンプトとして書いてください。
例: 「以下の特徴を持つX投稿を作成してください: ...」という形式で始める。

【分析すべき観点】
1. 冒頭の書き出し（括弧の使用、絵文字、インパクトのある一言など）
2. 構造パターン（何行目に何があるか、改行位置、箇条書きの有無）
3. よく使われる表現・言い回し
4. 絵文字の使い方と位置
5. 具体的な数字の入れ方
6. 語尾のパターン
7. 締めくくり方（CTA、余韻など）

【禁止事項】
- 抽象的すぎるアドバイスは禁止
- 「読者の共感を呼ぶ」のような曖昧な表現は禁止
- 具体的に「〇〇という表現を使う」「冒頭に【】を入れる」のように書く`,
        },
        {
          role: "user",
          content: `以下のS tier投稿（いいね数が多い投稿）を徹底分析してください。

【分析対象投稿】
${postsText}

【出力形式】JSON
{
  "prompt": "（800〜1200文字程度）このプロンプトはAI投稿生成に直接使用されます。以下の構成で書いてください:

  1. 冒頭に「以下の特徴を持つX投稿を作成してください:」と書く
  2. 具体的な特徴を羅列（例: 「冒頭に【】で強調ワードを入れる」「2行目で具体的な数字を出す」など）
  3. よく使われる表現パターンを具体的に列挙
  4. 絵文字の使い方を具体的に指定
  5. 構造パターン（改行位置、箇条書きの有無など）を明示",

  "characteristics": [
    "具体的な特徴1（例: 冒頭に【】括弧を使用して強調）",
    "具体的な特徴2（例: 数字は「3つ」「5選」など具体的に）",
    "具体的な特徴3（例: 絵文字は文末に1-2個のみ）",
    "具体的な特徴4",
    "具体的な特徴5",
    "具体的な特徴6",
    "具体的な特徴7",
    "具体的な特徴8",
    "具体的な特徴9",
    "具体的な特徴10"
  ],

  "avoidPatterns": [
    "避けるべきパターン1（例: 絵文字を3個以上連続で使う）",
    "避けるべきパターン2（例: 曖昧な表現「すごい」「やばい」だけで終わる）",
    "避けるべきパターン3",
    "避けるべきパターン4",
    "避けるべきパターン5"
  ],

  "samplePhrases": [
    "実際の投稿から抜き出した使える表現1",
    "実際の投稿から抜き出した使える表現2",
    "実際の投稿から抜き出した使える表現3",
    "実際の投稿から抜き出した使える表現4",
    "実際の投稿から抜き出した使える表現5",
    "実際の投稿から抜き出した使える表現6",
    "実際の投稿から抜き出した使える表現7",
    "実際の投稿から抜き出した使える表現8"
  ],

  "structurePatterns": [
    "構造パターン1（例: 1行目:フック→2行目:具体例→3行目:締め）",
    "構造パターン2",
    "構造パターン3"
  ]
}

【重要】
- characteristicsは最低10個以上、具体的に
- avoidPatternsは最低5個以上
- samplePhrasesは実際の投稿から抜き出す（そのままコピー可）
- promptは完全なプロンプトとして書く（AIに直接渡せる形式）`,
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
        characteristics: result.characteristics || [],
        avoidPatterns: result.avoidPatterns || [],
        samplePhrases: result.samplePhrases || [],
        structurePatterns: result.structurePatterns || [],
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
