import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PostStructureItem {
  role: string;
  text: string;
}

/**
 * Analyze the structure of a post
 */
export async function analyzePostStructure(
  text: string
): Promise<PostStructureItem[]> {
  const prompt = `以下のX（Twitter）の投稿を構造分析してください。各部分の役割（role）と対応するテキスト（text）を抽出してください。

役割の例：
- problem: 問題提起
- headline: 見出し・タイトル
- insight: インサイト・気づき
- process: プロセス・流れ
- conclusion: 結論・まとめ
- detail: 詳細説明
- list: 箇条書きリスト
- cta: 行動喚起

投稿本文：
"""
${text}
"""

JSON形式で回答してください。例：
[
  {"role": "headline", "text": "見出しのテキスト"},
  {"role": "detail", "text": "詳細のテキスト"}
]`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "あなたはSNS投稿の構造を分析するエキスパートです。投稿を構造的に分解し、各部分の役割を特定してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("AIからの応答がありませんでした");
  }

  try {
    const parsed = JSON.parse(content);
    // Handle both array and object with structure key
    return Array.isArray(parsed) ? parsed : parsed.structure || [];
  } catch {
    throw new Error("AIの応答を解析できませんでした");
  }
}

// Practical X post categories
const PRACTICAL_CATEGORIES = [
  "速報・ニュース系",
  "Tips・ノウハウ系",
  "記事・コンテンツ紹介系",
  "ツール・サービス紹介系",
  "動画・メディア紹介系",
  "プロンプト・AI活用系",
  "プロダクト・リリース系",
  "イベント・登壇系",
  "プレゼント・キャンペーン系",
  "採用・メンバー募集系",
  "日常・つぶやき系",
];

const CATEGORY_DESCRIPTIONS = `
- 速報・ニュース系: 最新ニュース、話題の速報、〇〇が発表、朗報/悲報など
- Tips・ノウハウ系: コツ、方法、やり方、テクニック、〇〇選、効率化など
- 記事・コンテンツ紹介系: ブログ記事、note、Zenn、Qiita、書きました、まとめ記事の紹介など
- ツール・サービス紹介系: 便利ツール、サービス、アプリ、拡張機能の紹介など
- 動画・メディア紹介系: YouTube動画、Podcast、配信、ライブ、動画コンテンツの紹介など
- プロンプト・AI活用系: ChatGPT、Claude、プロンプト、AI活用法、LLM関連など
- プロダクト・リリース系: 新サービスリリース、新機能公開、作りました、ローンチなど
- イベント・登壇系: 勉強会、カンファレンス、セミナー、登壇、イベント告知など
- プレゼント・キャンペーン系: RT企画、フォロー&RT、プレゼント、抽選、キャンペーンなど
- 採用・メンバー募集系: 求人、採用、メンバー募集、一緒に働きませんか、hiring など
- 日常・つぶやき系: 日記、感想、つぶやき、今日〜した、おはよう、個人的な内容など
`;

/**
 * Categorize a single post based on its content using AI
 */
export async function categorizePost(text: string): Promise<string> {
  const prompt = `以下のX（Twitter）の投稿を最も適切なカテゴリーに分類してください。

【カテゴリー一覧と判定基準】
${CATEGORY_DESCRIPTIONS}

【重要な判定ルール】
1. URLが含まれている場合は記事・動画・ツールの紹介系である可能性が高い
2. 「RT」「フォロー」「プレゼント」「抽選」が含まれていたらほぼ確実にプレゼント・キャンペーン系
3. 「募集」「採用」「hiring」が含まれていたらほぼ確実に採用・メンバー募集系
4. 「リリース」「公開しました」「作りました」が含まれていたらプロダクト・リリース系
5. 迷ったら投稿の主目的を考える（何を伝えたいのか）

投稿本文：
"""
${text}
"""

カテゴリー名のみを回答してください（上記リストから1つだけ選ぶ）。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "あなたはX（Twitter）投稿のカテゴリー分類エキスパートです。投稿内容を正確に分析し、最も適切なカテゴリーに分類してください。必ず指定されたカテゴリーの中から1つだけ選んでください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1,
    max_tokens: 50,
  });

  const content = response.choices[0]?.message?.content?.trim();
  // Ensure we return a valid category
  if (content && PRACTICAL_CATEGORIES.includes(content)) {
    return content;
  }
  // Try to find a partial match
  for (const cat of PRACTICAL_CATEGORIES) {
    if (content?.includes(cat) || cat.includes(content || "")) {
      return cat;
    }
  }
  return "日常・つぶやき系"; // Default to つぶやき instead of その他
}

/**
 * Batch categorize multiple posts using AI (more efficient)
 */
export async function batchCategorizePosts(
  posts: { id: string; text: string }[]
): Promise<Record<string, string>> {
  if (posts.length === 0) return {};

  // Process in batches of 20 for efficiency
  const batchSize = 20;
  const results: Record<string, string> = {};

  for (let i = 0; i < posts.length; i += batchSize) {
    const batch = posts.slice(i, i + batchSize);

    const postsText = batch
      .map((p, idx) => `[${idx}] ${p.text.slice(0, 300)}`)
      .join("\n\n---\n\n");

    const prompt = `以下の複数のX（Twitter）投稿をそれぞれ最も適切なカテゴリーに分類してください。

【カテゴリー一覧と判定基準】
${CATEGORY_DESCRIPTIONS}

【重要な判定ルール】
1. URLが含まれている場合は記事・動画・ツールの紹介系である可能性が高い
2. 「RT」「フォロー」「プレゼント」「抽選」が含まれていたらほぼ確実にプレゼント・キャンペーン系
3. 「募集」「採用」「hiring」が含まれていたらほぼ確実に採用・メンバー募集系
4. 「リリース」「公開しました」「作りました」が含まれていたらプロダクト・リリース系
5. 迷ったら投稿の主目的を考える（何を伝えたいのか）

【投稿一覧】
${postsText}

JSON形式で回答してください。例：
{"0": "速報・ニュース系", "1": "Tips・ノウハウ系", "2": "記事・コンテンツ紹介系"}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたはX（Twitter）投稿のカテゴリー分類エキスパートです。各投稿を正確に分析し、最も適切なカテゴリーに分類してください。必ず指定されたカテゴリーの中から選んでください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        batch.forEach((post, idx) => {
          const category = parsed[String(idx)];
          if (category && PRACTICAL_CATEGORIES.includes(category)) {
            results[post.id] = category;
          } else {
            results[post.id] = "日常・つぶやき系";
          }
        });
      }
    } catch (error) {
      console.error("Batch categorization error:", error);
      // Fallback: assign default category
      batch.forEach((post) => {
        results[post.id] = "日常・つぶやき系";
      });
    }
  }

  return results;
}

interface GeneratePostOptions {
  template: string;
  topic: string;
  category?: string;
  tone?: string;
  emojiSet?: string[];
}

/**
 * Generate a new post based on template and topic
 */
export async function generatePost(options: GeneratePostOptions): Promise<string> {
  const { template, topic, category, tone = "casual", emojiSet = [] } = options;

  // カテゴリー別の追加指示
  const categoryInstructions: Record<string, string> = {
    "記事": `
- 記事の要点を箇条書きで整理（「・」を使用）
- 記事から得られる学びを明確に`,
    "技術・プログラミング": `
- 技術的なポイントを箇条書きで整理
- 具体的なコード例や数値を含める`,
    "学習・勉強法": `
- 学びのポイントを箇条書きで整理
- 実践的なアドバイスを含める`,
  };

  const categoryInstruction = category && categoryInstructions[category] ? categoryInstructions[category] : "";

  const prompt = `X（Twitter）用の投稿を作成してください。

【最重要 - 入力コンテンツを必ず使う】
以下の入力コンテンツの情報・要点を必ず投稿に含めてください。
入力コンテンツの内容が投稿の主題です。

入力コンテンツ：
"""
${topic}
"""

テンプレート構造（このフォーマットに沿って書く）：
${template}

${category ? `カテゴリー：${category}` : ""}

【生成ルール - 絶対厳守】
1. 入力コンテンツの情報を投稿の中心にする（これが最も重要）
2. テンプレートの構造に沿って書く
3. 絵文字は一切使用禁止
4. 「！」は最小限（1-2個まで）
5. 箇条書きは「・」を使用
6. 改行を効果的に使用
${categoryInstruction}

【絶対禁止】
- 絵文字
- 「〜ですね」「〜しましょう」「〜してみてください」
- 「素晴らしい」「驚くべき」「画期的」「ぜひ」「必見」
- 入力コンテンツと関係ない内容

投稿本文のみを出力。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "あなたはX（Twitter）投稿を作成するライターです。【最重要】入力コンテンツの情報を必ず投稿に含める。絵文字は絶対禁止。「！」も最小限。淡々とした事実ベースの文体で書く。AIっぽい表現は絶対禁止。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.5,
    max_tokens: 600,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AIからの応答がありませんでした");
  }

  return content;
}

/**
 * Generate a post by imitating the structure of a reference post
 */
export async function imitatePost(
  referenceText: string,
  newTopic: string,
  tone?: string
): Promise<string> {
  const prompt = `以下の参考投稿の「構造」「文体」「口調」を完全に模倣して、新しいトピックで投稿を作成してください。

参考投稿：
"""
${referenceText}
"""

新しいトピック：${newTopic}

【絶対厳守】
- 参考投稿と同じ構造（段落構成、改行パターン、箇条書きの有無など）を完全維持
- 参考投稿に絵文字がなければ絶対に絵文字を入れない
- 参考投稿の口調を完全にコピー（熱量を上げない）
- 「〜ですね」「〜しましょう」「素晴らしい」「ぜひ」等のAI表現は絶対禁止

投稿本文のみを出力。絵文字禁止。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "参考投稿を完全に模倣するライター。絵文字は参考投稿にある場合のみ使用。AIっぽい表現は絶対禁止。淡々と書く。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.4,
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AIからの応答がありませんでした");
  }

  return content;
}

interface ReferencePostForSelection {
  id: string;
  text: string;
  tier: "S" | "A" | "B" | "C";
  category: string;
  likes: number;
}

/**
 * Automatically select the best reference post based on content and template
 */
export async function autoSelectBestReference(
  content: string,
  templateId: string,
  referencePosts: ReferencePostForSelection[]
): Promise<string | null> {
  if (referencePosts.length === 0) return null;

  const templateDescriptions: Record<string, string> = {
    insight: "逆説的な気づき、意外な視点を提供する投稿",
    news: "速報性のある情報、最新ニュースを共有する投稿",
    list: "箇条書き形式で情報を整理した投稿",
    thread: "スレッド形式で詳細に解説する導入投稿",
    "problem-solving": "問題提起から解決策を提示する投稿",
  };

  const templateDescription = templateDescriptions[templateId] || "一般的な投稿";

  // Only consider S/A tier posts
  const eligiblePosts = referencePosts.filter(
    (p) => p.tier === "S" || p.tier === "A"
  );

  if (eligiblePosts.length === 0) return null;

  const postsForPrompt = eligiblePosts.slice(0, 10).map((p, i) => ({
    index: i,
    id: p.id,
    text: p.text.slice(0, 200),
    tier: p.tier,
    category: p.category,
  }));

  const prompt = `以下のコンテンツと投稿テンプレートに最も適した参考投稿を選んでください。

コンテンツ概要：
${content.slice(0, 300)}

テンプレートタイプ：${templateDescription}

参考投稿候補：
${postsForPrompt.map((p) => `[${p.index}] (${p.tier}ティア/${p.category}) ${p.text}`).join("\n\n")}

最も適した投稿のindex番号のみを回答してください（例：0）`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "あなたはSNS投稿の構造マッチングのエキスパートです。与えられたコンテンツとテンプレートに最も適した参考投稿を選択してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const indexStr = response.choices[0]?.message?.content?.trim();
    const index = parseInt(indexStr || "", 10);

    if (!isNaN(index) && index >= 0 && index < postsForPrompt.length) {
      return postsForPrompt[index].id;
    }
  } catch (error) {
    console.error("Auto select reference error:", error);
  }

  return null;
}

interface GenerateWithReferenceOptions {
  content: string;
  templateId: string;
  referenceText: string;
  category?: string;
  tone?: string;
  userStyle?: string;
}

/**
 * Analyze the detailed structure of a reference post
 */
async function analyzeStructureForCopy(referenceText: string): Promise<string> {
  const prompt = `以下の投稿の構造を詳細に分析してください。

投稿：
"""
${referenceText}
"""

以下を分析して出力：
1. 行数と各行の役割（例：1行目=フック、2行目=空行、3行目=本題...）
2. 句読点パターン（「。」「！」「?」の使用頻度と位置）
3. 絵文字の有無と位置（なければ「なし」）
4. 箇条書きの有無とスタイル（「・」「-」など）
5. 特殊記号（→、↓、👇など）の有無と位置
6. 書き出しパターン（どんな形式で始まるか）
7. 終わり方パターン（どんな形式で終わるか）
8. 全体の文字数と各ブロックの文字数目安

JSON形式で回答：
{
  "lineCount": 数字,
  "lineRoles": ["フック", "空行", "本題", ...],
  "punctuation": {"period": 数, "exclamation": 数, "question": 数},
  "hasEmoji": true/false,
  "emojiPositions": "なし" または "1行目末、3行目末",
  "hasBullets": true/false,
  "bulletStyle": "・" または "なし",
  "bulletCount": 数字,
  "specialSymbols": ["→", "↓"] または [],
  "openingPattern": "〇〇が〜という形式" など,
  "closingPattern": "〜だ。で終わる" など,
  "totalLength": 数字,
  "blockLengths": [50, 30, 80, ...],
  "originalStructure": "投稿の構造テンプレート（内容を抽象化したもの）"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "投稿構造分析の専門家。投稿の構造を詳細に分析し、再現可能な形式で出力する。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  return response.choices[0]?.message?.content || "{}";
}

/**
 * Generate a post using reference post structure + user's own style
 * TWO-STEP PROCESS: First analyze structure, then generate with strict adherence
 */
export async function generateWithReference(
  options: GenerateWithReferenceOptions
): Promise<string> {
  const { content, referenceText } = options;

  // Step 1: Analyze the reference post structure in detail
  const structureAnalysis = await analyzeStructureForCopy(referenceText);
  let structureInfo;
  try {
    structureInfo = JSON.parse(structureAnalysis);
  } catch {
    structureInfo = {};
  }

  // Step 2: Generate with EXACT structure matching
  const prompt = `【超重要】参考投稿の構造を「文字通り完コピ」して、内容だけ入れ替える。

━━━━━━━━━━━━━━━━━━━━
■ 参考投稿（この構造を完全コピー）
━━━━━━━━━━━━━━━━━━━━
${referenceText}

━━━━━━━━━━━━━━━━━━━━
■ 構造分析結果
━━━━━━━━━━━━━━━━━━━━
- 行数: ${structureInfo.lineCount || "不明"}行
- 各行の役割: ${JSON.stringify(structureInfo.lineRoles || [])}
- 絵文字: ${structureInfo.hasEmoji ? `あり（位置: ${structureInfo.emojiPositions}）` : "なし→絶対入れるな"}
- 箇条書き: ${structureInfo.hasBullets ? `あり（${structureInfo.bulletStyle}を${structureInfo.bulletCount}個）` : "なし"}
- 特殊記号: ${(structureInfo.specialSymbols || []).length > 0 ? structureInfo.specialSymbols.join(", ") : "なし"}
- 書き出し: ${structureInfo.openingPattern || "不明"}
- 終わり方: ${structureInfo.closingPattern || "不明"}
- 文字数目安: ${structureInfo.totalLength || "不明"}文字

━━━━━━━━━━━━━━━━━━━━
■ 新しい内容（これを上の構造に当てはめる）
━━━━━━━━━━━━━━━━━━━━
${content}

━━━━━━━━━━━━━━━━━━━━
■ 生成ルール【絶対厳守】
━━━━━━━━━━━━━━━━━━━━
1. 参考投稿と【同じ行数】で書く
2. 参考投稿と【同じ改行位置】で改行する
3. 参考投稿に絵文字が${structureInfo.hasEmoji ? "【ある】→同じ位置に似た絵文字を1つだけ入れる" : "【ない】→絶対に絵文字を入れない"}
4. 参考投稿に箇条書きが${structureInfo.hasBullets ? `【ある】→「${structureInfo.bulletStyle}」で${structureInfo.bulletCount}項目書く` : "【ない】→箇条書きにしない"}
5. 参考投稿の書き出しパターン「${structureInfo.openingPattern}」を模倣
6. 参考投稿の終わり方パターン「${structureInfo.closingPattern}」を模倣
7. 文字数は参考投稿と同程度（${structureInfo.totalLength || 200}文字前後）

━━━━━━━━━━━━━━━━━━━━
■ 絶対禁止【これやったら0点】
━━━━━━━━━━━━━━━━━━━━
- 参考投稿にない絵文字を追加
- 参考投稿にない「！」を追加
- 参考投稿より行数を増やす/減らす
- 「〜ですね」「〜しましょう」「素晴らしい」「ぜひ」「必見」「驚き」
- 参考投稿より熱量を上げる
- 入力内容をそのまま出力（必ず構造に当てはめて変換する）

投稿本文のみを出力。説明不要。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは「構造完コピマシン」です。

【あなたの仕事】
参考投稿の「構造」を完全にコピーし、「内容」だけ入れ替える。

【具体例】
参考投稿が：
「〇〇って知ってた？

実は△△なんだよね。

・ポイント1
・ポイント2
・ポイント3

これマジで大事。」

なら、生成する投稿も：
「□□って知ってた？

実は■■なんだよね。

・ポイントA
・ポイントB
・ポイントC

これマジで大事。」

という形式になる。構造は完全一致。内容だけ違う。

【絶対ルール】
- 参考投稿に絵文字がなければ、生成投稿にも絵文字は入れない
- 参考投稿と同じ行数、同じ改行パターン
- 参考投稿と同じ句読点パターン
- AIっぽい言い回し（〜ですね、素晴らしい、ぜひ等）は絶対禁止`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 800,
  });

  const responseContent = response.choices[0]?.message?.content?.trim();
  if (!responseContent) {
    throw new Error("AIからの応答がありませんでした");
  }

  return responseContent;
}
