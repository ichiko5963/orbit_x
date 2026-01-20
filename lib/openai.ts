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

/**
 * Categorize a post based on its content
 */
export async function categorizePost(text: string): Promise<string> {
  const categories = [
    "マインド",
    "速報",
    "ノウハウ",
    "キャリア",
    "技術",
    "ツール",
    "その他",
  ];

  const prompt = `以下のX（Twitter）の投稿を最も適切なカテゴリーに分類してください。

カテゴリー一覧：
${categories.map((c) => `- ${c}`).join("\n")}

投稿本文：
"""
${text}
"""

カテゴリー名のみを回答してください。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "あなたはSNS投稿のカテゴリー分類のエキスパートです。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
    max_tokens: 50,
  });

  const content = response.choices[0]?.message?.content?.trim();
  return content && categories.includes(content) ? content : "その他";
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
  const { template, topic, category, tone = "カジュアル", emojiSet = [] } = options;

  const toneDescriptions: Record<string, string> = {
    casual: "親しみやすく、フレンドリーな口調",
    professional: "専門的で信頼感のある口調",
    energetic: "熱量高めで、モチベーションを上げる口調",
  };

  const toneDescription = toneDescriptions[tone] || toneDescriptions.casual;

  const emojiInstruction =
    emojiSet.length > 0
      ? `以下の絵文字を適度に使用してください: ${emojiSet.join(" ")}`
      : "絵文字は控えめに、または使用しないでください";

  const prompt = `以下のテンプレートと条件に基づいて、X（Twitter）用の投稿を作成してください。

テンプレート構造：
${template}

トピック/キーワード：${topic}
${category ? `カテゴリー：${category}` : ""}
口調：${toneDescription}
${emojiInstruction}

条件：
- 280文字以内
- 改行を効果的に使用
- 読者の興味を引く内容
- 具体的で価値のある情報

投稿本文のみを出力してください。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "あなたはバズるX（Twitter）投稿を作成するエキスパートです。読者の心を掴む、シェアされやすい投稿を作成してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 500,
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
  const prompt = `以下の参考投稿の「構造」と「文体」を模倣して、新しいトピックで投稿を作成してください。

参考投稿：
"""
${referenceText}
"""

新しいトピック：${newTopic}
${tone ? `口調：${tone}` : ""}

条件：
- 参考投稿と同じ構造（段落構成、改行パターン、箇条書きの有無など）を維持
- 内容は完全に新しいものに置き換え
- 280文字以内

投稿本文のみを出力してください。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "あなたはバズる投稿の構造を分析し、同じ構造で新しいコンテンツを作成するエキスパートです。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
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
}

/**
 * Generate a post using both template structure and reference post style
 */
export async function generateWithReference(
  options: GenerateWithReferenceOptions
): Promise<string> {
  const { content, templateId, referenceText, category, tone = "casual" } = options;

  const templateStructures: Record<string, string> = {
    insight: "逆説的な気づき→本当に大切なこと→理由説明",
    news: "【速報/朗報】→メインニュース→補足情報→詳細への誘導",
    list: "タイトル（〇〇で気づいたこと等）→箇条書き（3-5項目）",
    thread: "導入文→問題提起or興味喚起→スレッド誘導",
    "problem-solving": "問題提起（「」で課題を表現）→共感→解決策→具体例",
  };

  const toneDescriptions: Record<string, string> = {
    casual: "親しみやすく、フレンドリーな口調",
    professional: "専門的で信頼感のある口調",
    energetic: "熱量高めで、モチベーションを上げる口調",
  };

  const structure = templateStructures[templateId] || "";
  const toneDescription = toneDescriptions[tone] || toneDescriptions.casual;

  const prompt = `以下の条件に基づいて、X（Twitter）用の投稿を作成してください。

入力コンテンツ：
${content}

テンプレート構造：${structure}

参考投稿（この投稿の「文体」「リズム」「改行パターン」を参考にする）：
"""
${referenceText}
"""

${category ? `カテゴリー：${category}` : ""}
口調：${toneDescription}

条件：
- 280文字以内
- 参考投稿の構造・リズム・文体を模倣
- テンプレートの型に従う
- 入力コンテンツの情報を元に作成
- 具体的で価値のある情報

投稿本文のみを出力してください。`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "あなたはバズるX（Twitter）投稿を作成するエキスパートです。参考投稿のスタイルを巧みに取り入れながら、オリジナルの価値ある投稿を作成してください。",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 500,
  });

  const responseContent = response.choices[0]?.message?.content?.trim();
  if (!responseContent) {
    throw new Error("AIからの応答がありませんでした");
  }

  return responseContent;
}
