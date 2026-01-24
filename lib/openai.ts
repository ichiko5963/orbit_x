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
  researchData?: string; // 5000字程度の包括的なリサーチ情報
  queryAxis?: string; // 検索クエリの軸（情報自動補足時に使用）
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
 * THREE-STEP PROCESS:
 * 1. Extract key elements from input content
 * 2. Analyze reference structure
 * 3. Generate with structure + all elements included
 */
export async function generateWithReference(
  options: GenerateWithReferenceOptions
): Promise<string> {
  const { content, referenceText, researchData, queryAxis } = options;

  // Step 1: Extract key elements from input content (most important!)
  const extractPrompt = `以下の内容から、投稿に必ず含めるべき「キー要素」を全て抽出してください。

【入力内容】
${content}

以下を箇条書きで列挙：
- 固有名詞（人名、サービス名、会社名など）
- 数字・統計データ
- 主張・結論
- 重要なキーワード
- 独自の表現・言い回し

【注意】URLやリンク（https://〜）は抽出しない。`;

  const elementsResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "コンテンツから重要な要素を抽出するエキスパート。漏れなく抽出する。" },
      { role: "user", content: extractPrompt },
    ],
    temperature: 0.1,
    max_tokens: 500,
  });

  const keyElements = elementsResponse.choices[0]?.message?.content || "";

  // Step 2: Analyze the reference post structure in detail
  const structureAnalysis = await analyzeStructureForCopy(referenceText);
  let structureInfo;
  try {
    structureInfo = JSON.parse(structureAnalysis);
  } catch {
    structureInfo = {};
  }

  // Step 3: Generate - different prompts based on whether research data is available
  let prompt: string;

  if (researchData) {
    // リサーチデータがある場合: 情報を活用して価値のある投稿を作成
    // queryAxisが指定されている場合は、その軸に沿った情報を重視
    const axisInstruction = queryAxis
      ? `\n★★★ 【この投稿の軸】★★★\n「${queryAxis}」に関連する情報をリサーチから選んで使用すること！\nこの軸に沿った具体的な情報を投稿の中心に据える。\n`
      : "";

    prompt = `【ミッション】リサーチ情報から最適な内容を選び、参考投稿の構造を【絶対に守りつつ】、一貫性のある有益な投稿を作成する。

━━━━━━━━━━━━━━━━━━━━
■ 投稿のテーマ
━━━━━━━━━━━━━━━━━━━━
${content}
${axisInstruction}
★ 抽出したキー要素：
${keyElements}

━━━━━━━━━━━━━━━━━━━━
■ 参考投稿（この構造を【絶対に守る】）
━━━━━━━━━━━━━━━━━━━━
${referenceText}

【参考投稿の構造 - 完全にコピーすること】
- 行数: ${structureInfo.lineCount || "不明"}行 → 同じ行数にする
- 絵文字: ${structureInfo.hasEmoji ? `あり（${structureInfo.emojiPositions}）→ 同じ位置に` : "なし → 入れない"}
- 箇条書き: ${structureInfo.hasBullets ? `${structureInfo.bulletStyle}を${structureInfo.bulletCount}個使用 → 同じ数を同じ位置に` : "なし → 追加しない"}
- 書き出し: ${structureInfo.openingPattern || "不明"} → 同じパターンで始める
- 終わり方: ${structureInfo.closingPattern || "不明"} → 同じパターンで終わる

━━━━━━━━━━━━━━━━━━━━
■ リサーチ情報（5000字の包括的な情報）
━━━━━━━━━━━━━━━━━━━━
${researchData.slice(0, 4000)}${researchData.length > 4000 ? "...（続きあり）" : ""}

━━━━━━━━━━━━━━━━━━━━
■ 【最重要】作成のポイント
━━━━━━━━━━━━━━━━━━━━
1. 【構造は絶対】参考投稿の構造（行数、改行位置、箇条書き）を完全にコピー
2. 【情報の選択】リサーチ情報から${queryAxis ? `「${queryAxis}」に関連する` : ""}具体的な情報を2-3個選ぶ
3. 【具体性】リサーチから具体的な数字・事実・データを使う
4. 【一貫性】投稿全体で1つのメッセージを伝える
5. 【価値提供】読者が「知らなかった」「役立つ」と思える情報を入れる

━━━━━━━━━━━━━━━━━━━━
■ 禁止事項
━━━━━━━━━━━━━━━━━━━━
- 参考投稿と異なる構造
- 薄っぺらい情報の羅列
- AIっぽい表現（〜ですね、素晴らしい、ぜひ）
- URL/リンク（https://〜）は絶対に入れない
- 絵文字: ${structureInfo.hasEmoji ? "参考投稿と同じ位置にのみ使用" : "絶対に入れない"}

投稿本文のみを出力。`;
  } else {
    // リサーチデータがない場合: 従来通りの構造重視
    prompt = `【最重要】投稿内容の要素を全て含めつつ、参考投稿の構造を完コピする。

━━━━━━━━━━━━━━━━━━━━
■ 投稿内容（これが主役！全ての要素を含める）
━━━━━━━━━━━━━━━━━━━━
${content}

★ 抽出したキー要素（全て含めること！）：
${keyElements}

━━━━━━━━━━━━━━━━━━━━
■ 参考投稿（この構造を【最初から最後まで完全】コピー）
━━━━━━━━━━━━━━━━━━━━
${referenceText}

━━━━━━━━━━━━━━━━━━━━
■ 構造分析結果
━━━━━━━━━━━━━━━━━━━━
- 行数: ${structureInfo.lineCount || "不明"}行
- 絵文字: ${structureInfo.hasEmoji ? `あり（位置: ${structureInfo.emojiPositions}）` : "なし→絶対入れるな"}
- 箇条書き: ${structureInfo.hasBullets ? `あり（${structureInfo.bulletStyle}を${structureInfo.bulletCount}個）` : "なし"}
- 書き出し: ${structureInfo.openingPattern || "不明"}
- 終わり方: ${structureInfo.closingPattern || "不明"}
- 文字数: 約${structureInfo.totalLength || 200}文字

━━━━━━━━━━━━━━━━━━━━
■ 【最重要】完結した投稿を作る
━━━━━━━━━━━━━━━━━━━━
★ 参考投稿の構造を【最初から最後まで】完全に再現する
★ 途中で切れたり、尻切れトンボにならない
★ 参考投稿と同じ「終わり方」で締める
★ 全体として1つの完結した投稿になる

【構造の流れを守る】
- 参考投稿が「導入→本題→結論」なら、同じ流れで作る
- 参考投稿が「問題提起→解説→まとめ」なら、同じ流れで作る
- 参考投稿の最後の行の役割（結論/CTA/余韻）を同じにする

━━━━━━━━━━━━━━━━━━━━
■ 生成ルール【優先順位順】
━━━━━━━━━━━━━━━━━━━━
1. 投稿内容のキー要素を【全て】含める
2. 参考投稿の構造を【最初から最後まで】コピー
3. 【完結した投稿】になるまで書く - 途中で終わらない
4. 絵文字: ${structureInfo.hasEmoji ? "同じ位置に1つだけ" : "絶対入れない"}

━━━━━━━━━━━━━━━━━━━━
■ 絶対禁止
━━━━━━━━━━━━━━━━━━━━
- 途中で切れる・尻切れトンボ
- 投稿内容の要素を省略する
- 参考投稿にない絵文字/「！」を追加
- AIっぽい表現（〜ですね、素晴らしい、ぜひ）
- 【URL/リンク禁止】参考投稿にURLがあっても絶対に入れない。https://t.co/〜 のようなリンクは一切含めない。URLは後でユーザーが追加する。

投稿本文のみを出力。完結した投稿として。URLは含めない。`;
  }

  // System message depends on whether research data is available
  const systemMessage = researchData
    ? `あなたは「情報価値最大化の投稿生成マシン」です。

【最重要ミッション】
1. リサーチ情報から【最も価値のある情報】を選んで投稿に組み込む
2. 投稿全体で【一貫したメッセージ】を伝える
3. 参考投稿の構造は【参考程度】に。内容の一貫性を優先
4. 【URL禁止】絶対にURLを含めない

【情報活用のポイント】
- リサーチから「これは知らなかった」と思える情報を選ぶ
- 具体的な数字・データ・事実を使う
- 情報を詰め込みすぎない。2-3個の重要ポイントに絞る
- 「〜によると」「公式では」など出典を自然に入れる

【一貫性のポイント】
- 1つの投稿で1つのメッセージ
- 話題が飛ばない
- 導入→展開→結論が自然につながる
- 薄っぺらい情報の羅列にしない

★ 価値のある投稿を作る！
★ URLは絶対に入れない！`
    : `あなたは「投稿生成マシン」です。

【最重要ミッション】
1. 【完結した投稿】を作る - 途中で切れない、尻切れトンボにしない
2. 投稿内容の要素を【全て】含める
3. 参考投稿の構造を【最初から最後まで】完全にコピーする
4. 【URL禁止】参考投稿にURLがあっても絶対にコピーしない

【構造コピーのポイント】
- 参考投稿の「流れ」を再現（導入→展開→結論）
- 参考投稿の「終わり方」を再現（最後の行の役割を同じにする）
- 参考投稿と同じくらいの文字数で完結させる
- URLは絶対に含めない（https://t.co/〜 等は入れない）

★ 最後まで書く！途中で終わらない！
★ URLは絶対に入れない！`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const responseContent = response.choices[0]?.message?.content?.trim();
  if (!responseContent) {
    throw new Error("AIからの応答がありませんでした");
  }

  return responseContent;
}

// ============================================
// User Style Analysis (ユーザースタイル詳細分析)
// ============================================

interface PostForAnalysis {
  text: string;
  likes: number;
  tier: string;
}

/**
 * Analyze user's posting style from their top performing posts
 * Called during CSV import to create a detailed style profile
 */
export async function analyzeUserStyle(posts: PostForAnalysis[]): Promise<any> {
  // Filter to top performers (S/A tier)
  const topPosts = posts
    .filter(p => p.tier === "S" || p.tier === "A")
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 20);

  if (topPosts.length === 0) {
    return null;
  }

  const postsText = topPosts.map((p, i) =>
    `[${i + 1}] (${p.likes}いいね/${p.tier}ティア)\n${p.text}`
  ).join("\n\n---\n\n");

  const prompt = `以下はあるXアカウントの高パフォーマンス投稿（いいね数が多い投稿）です。
このアカウントの投稿スタイルを超詳細に分析してください。

【分析対象投稿】
${postsText}

【分析項目 - 超詳細に】

1. 文体・トーン
- 口調（カジュアル/フォーマル/熱量高い/落ち着き など）
- 一人称の使い方（僕/私/俺/自分 など、または使わない）
- 語尾パターン（〜だ/〜です/〜だよね/〜じゃん など）
- 敬語の使用有無と程度

2. 構造パターン
- よく使う投稿構造（フック→本題→結論 など）
- 改行パターン（多め/少なめ/段落ごと など）
- 箇条書きの使用頻度とスタイル
- 文の長さの傾向

3. 表現スタイル
- 絵文字の使用（なし/少なめ/多め、どんな絵文字か）
- 「！」「?」の使用頻度
- 特殊記号（→、↓、【】など）の使用
- 強調表現の使い方

4. バズの法則
- バズっている投稿の共通パターン
- フック（書き出し）のパターン
- 締め方のパターン
- 読者を引き込む技法

5. 禁止パターン
- このアカウントが絶対使わない表現
- 避けている言い回し

JSON形式で回答：
{
  "tone": "カジュアルで親しみやすい口調。熱量は中程度。",
  "personalPronouns": ["僕", "自分"],
  "endingPatterns": ["〜だ", "〜だよね", "〜なんだよ"],
  "avgLength": 200,
  "emojiUsage": "なし または 少なめ（どんな絵文字か）",
  "exclamationUsage": "少なめ（1投稿に0-1個）",
  "preferredStructures": ["問題提起→解決策", "気づき共有→具体例"],
  "bulletPointStyle": "「・」を使用、3-5項目",
  "lineBreakPattern": "2-3文ごとに改行",
  "buzzPatterns": ["逆説的な気づきから始める", "具体的な数字を入れる"],
  "hookPatterns": ["〇〇って実は△△", "多くの人が誤解している〇〇"],
  "closingPatterns": ["これ知ってるだけで違う", "マジで大事"],
  "avoidPatterns": ["〜ですね", "素晴らしい", "ぜひ", "必見"],
  "samplePhrases": ["実際の投稿から抜粋したフレーズ3-5個"],
  "promptSummary": "このアカウントの投稿を生成する際の要約指示（100-200文字）"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたはSNS投稿の文体分析エキスパートです。投稿群から詳細なスタイルパターンを抽出し、再現可能な形式で分析結果を出力します。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const analysis = JSON.parse(content);
      return {
        ...analysis,
        analyzedAt: new Date().toISOString(),
        postsAnalyzed: topPosts.length,
        samplePosts: topPosts.slice(0, 5).map(p => p.text),
      };
    }
  } catch (error) {
    console.error("User style analysis error:", error);
  }

  return null;
}

// ============================================
// AI Auto-Select References (AIおまかせ)
// ============================================

interface ReferencePostForAutoSelect {
  id: string;
  text: string;
  likes: number;
  tier: string;
  category: string;
  source: "myPosts" | "othersPosts";
}

/**
 * AI automatically selects the best 6 reference posts based on content
 */
export async function autoSelectReferences(
  content: string,
  allPosts: ReferencePostForAutoSelect[]
): Promise<ReferencePostForAutoSelect[]> {
  if (allPosts.length === 0) return [];

  // Filter S/A tier only
  const eligiblePosts = allPosts.filter(p => p.tier === "S" || p.tier === "A");
  if (eligiblePosts.length === 0) return [];

  // If 6 or fewer posts, return all
  if (eligiblePosts.length <= 6) return eligiblePosts;

  const postsForPrompt = eligiblePosts.slice(0, 30).map((p, i) => ({
    index: i,
    text: p.text.slice(0, 150),
    likes: p.likes,
    tier: p.tier,
    category: p.category,
    source: p.source === "myPosts" ? "自分" : "他者",
  }));

  const prompt = `以下の投稿内容に最も適した参考投稿を6つ選んでください。

【投稿内容】
${content.slice(0, 500)}

【選定基準】
1. 投稿内容の分量に合った構造（長い内容→長めの構造、短い内容→短めの構造）
2. 投稿内容のトーンに合った雰囲気
3. バラエティ（6つ全部違う構造になるように）
4. 高いいいね数の投稿を優先

【参考投稿候補】
${postsForPrompt.map(p =>
  `[${p.index}] (${p.source}/${p.tier}/${p.likes}いいね/${p.category}) ${p.text}`
).join("\n")}

最も適した6つの投稿のindex番号をJSON配列で回答：
{"selected": [0, 5, 12, 18, 22, 29]}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "参考投稿選定のエキスパート。投稿内容に最適な参考投稿を選ぶ。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const result = response.choices[0]?.message?.content;
    if (result) {
      const parsed = JSON.parse(result);
      const selectedIndices = parsed.selected || [];
      return selectedIndices
        .filter((i: number) => i >= 0 && i < eligiblePosts.length)
        .slice(0, 6)
        .map((i: number) => eligiblePosts[i]);
    }
  } catch (error) {
    console.error("Auto select references error:", error);
  }

  // Fallback: return top 6 by likes
  return eligiblePosts.slice(0, 6);
}

// ============================================
// AI Enhance Post (AI強化)
// ============================================

interface EnhancePostOptions {
  currentText: string;
  originalContent: string;
  referenceText: string;
  userStyle?: any; // UserStyleAnalysis
  researchData?: string; // 5000字程度のリサーチ情報
}

/**
 * Enhance a generated post by refining it - keep the good parts, improve the weak parts
 * Add missing elements from original content while preserving the current structure
 *
 * KEY PRINCIPLE: Preserve 70%+ of original text, maintain structure (line count, breaks, bullets)
 */
export async function enhancePost(options: EnhancePostOptions): Promise<string> {
  const { currentText, originalContent, referenceText, userStyle, researchData } = options;

  // Analyze current structure
  const lineCount = currentText.split("\n").length;
  const hasBullets = currentText.includes("・") || currentText.includes("-") || currentText.includes("•");
  const bulletCount = (currentText.match(/[・\-•]/g) || []).length;
  const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(currentText);

  // Step 1: Analyze what's good and what's missing in the current text
  const analysisPrompt = `以下の2つを比較して、現在の投稿の「良い点」と「足りない要素」を分析してください。

【元の内容（情報ソース）】
${originalContent}

【現在の投稿】
${currentText}

【重要】最小限の改善点だけを特定してください。大幅な変更は不要です。

JSON形式で回答：
{
  "goodParts": ["良い表現1", "良い表現2"],
  "missingElements": ["足りない情報1（あれば）"],
  "awkwardParts": ["違和感のある表現（あれば）"],
  "keepAsIs": "そのまま残すべき部分（ほとんど全部）"
}`;

  const analysisResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "投稿分析のエキスパート。最小限の改善点のみを特定する。過剰な変更は提案しない。" },
      { role: "user", content: analysisPrompt },
    ],
    temperature: 0.1,
    max_tokens: 800,
  });

  let analysis = { goodParts: [], missingElements: [], awkwardParts: [], keepAsIs: "" };
  try {
    const analysisText = analysisResponse.choices[0]?.message?.content || "{}";
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Analysis parse failed:", e);
  }

  // Build user style instructions
  let styleInstructions = "";
  if (userStyle) {
    styleInstructions = `
【ユーザーのスタイル】
- 口調: ${userStyle.tone || "カジュアル"}
- 絵文字: ${userStyle.emojiUsage || "控えめ"}`;
  }

  // Step 2: Refine the post - minimal changes only
  const refinePrompt = `【投稿リファイン】現在の投稿を【最小限の変更】で改善してください。

━━━━━━━━━━━━━━━━━━━━
■ 構造維持ルール【絶対厳守】
━━━━━━━━━━━━━━━━━━━━
- 行数: ${lineCount}行を維持（増やさない、減らさない）
- 改行位置: 元の改行位置をそのまま維持
- 箇条書き: ${hasBullets ? `「・」を${bulletCount}個維持` : "箇条書きなし→追加しない"}
- 絵文字: ${hasEmoji ? "現状維持" : "追加しない"}
- 元の投稿の70%以上をそのまま残す

━━━━━━━━━━━━━━━━━━━━
■ 現在の投稿【ほぼそのまま残す】
━━━━━━━━━━━━━━━━━━━━
${currentText}

━━━━━━━━━━━━━━━━━━━━
■ 分析結果
━━━━━━━━━━━━━━━━━━━━
★ 良い点（そのまま残す）:
${(analysis.goodParts || []).map((p: string) => `・${p}`).join("\n") || "（なし）"}

★ 足りない要素（自然に溶け込ませる）:
${(analysis.missingElements || []).map((p: string) => `・${p}`).join("\n") || "（なし）"}

★ 違和感のある表現（最小限の修正）:
${(analysis.awkwardParts || []).map((p: string) => `・${p}`).join("\n") || "（なし）"}

━━━━━━━━━━━━━━━━━━━━
■ 元の内容（情報ソース）
━━━━━━━━━━━━━━━━━━━━
${originalContent}
${researchData ? `
━━━━━━━━━━━━━━━━━━━━
■ リサーチ情報（信頼できる情報源から収集）
━━━━━━━━━━━━━━━━━━━━
${researchData.slice(0, 3000)}
${researchData.length > 3000 ? "（続きあり...）" : ""}

★ リサーチ情報から具体的な数字・データを活用して投稿の説得力を高める
` : ""}${styleInstructions}

━━━━━━━━━━━━━━━━━━━━
■ リファインのルール【重要】
━━━━━━━━━━━━━━━━━━━━
1. 現在の投稿の70%以上をそのまま残す
2. 構造（行数、改行位置、箇条書き）は100%維持
3. 変更箇所は最大3箇所まで
4. 足りない要素は既存の文に自然に溶け込ませる
5. 違和感のある表現のみ最小限の修正
6. AIっぽい表現（〜ですね、素晴らしい、ぜひ）は禁止

★ コンセプト: 「書き直し」ではなく「ちょっとした改善」

リファインした投稿本文のみを出力：`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは投稿の「微調整」専門家です。

【絶対ルール】
- 元の投稿の構造（行数、改行、箇条書き）を100%維持
- 元の投稿の70%以上をそのまま残す
- 変更箇所は最大3箇所まで
- 「書き直し」ではなく「ちょっとした改善」

あなたの仕事は「編集」であって「執筆」ではない。
ユーザーが書いた投稿を尊重し、最小限の変更で最大の効果を。`,
      },
      {
        role: "user",
        content: refinePrompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const enhanced = response.choices[0]?.message?.content?.trim();
  if (!enhanced) {
    throw new Error("AI強化に失敗しました");
  }

  return enhanced;
}
