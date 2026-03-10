/**
 * Daily X - Core logic for daily post generation, trending posts, and account monitoring
 */

import OpenAI from "openai";
import { XTweetWithMedia, getImageUrls, formatPostWithMedia, buildVideoUrl } from "./x-api";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==============================
// Types
// ==============================

export interface DailyXPost {
  id: string;
  // Original tweet info
  originalTweet: {
    id: string;
    text: string;
    authorName: string;
    authorUsername: string;
    authorProfileImage?: string;
    url: string;
    likes: number;
    retweets: number;
    replies: number;
    createdAt: string;
    hasVideo: boolean;
    hasImage: boolean;
    imageUrls: string[];
    videoUrl?: string;
  };
  // Generated post
  generatedText: string;
  // Final post text (with video URL prepended if needed)
  finalPostText: string;
  // Media to attach
  mediaImageUrls: string[];
  // Status
  status: "pending" | "posted" | "drafted" | "skipped";
  postedAt?: string;
  tweetId?: string;
  // Source type
  source: "bookmark" | "trending" | "account_monitor";
  sourceKeyword?: string;
  sourceAccount?: string;
  // Metadata
  createdAt: string;
  category?: string;
}

export interface DailyXSettings {
  // Keywords for trending search
  keywords: string[];
  // Monitored accounts
  monitoredAccounts: string[];
  // Discord webhook URL
  discordWebhookUrl?: string;
  // Last checked tweet IDs per account
  lastCheckedTweetIds: Record<string, string>;
}

export const DEFAULT_KEYWORDS = [
  "ClaudeCode",
  "Claude Code",
  "Opus",
  "Antigravity",
  "GeminiCLI",
  "Gemini CLI",
  "Codex",
  "Cursor",
  "Vercel",
  "Supabase",
  "Next.js",
  "React",
  "Vibe Coding",
  "OpenClaw",
];

export const DEFAULT_MONITORED_ACCOUNTS = [
  "openclaw",
  "cursor_ai",
  "vercel",
  "antigravity",
  "AnthropicAI",
  "geminicli",
  "OpenAI",
];

// ==============================
// Post Generation
// ==============================

/**
 * Generate a viral-format post from an original tweet
 * Uses the structure of viral posts but creates new content based on the original
 */
export async function generateViralPost(params: {
  originalTweet: XTweetWithMedia;
  viralPatterns: string[]; // Sample viral post texts for structure reference
  userStyle?: string; // User's posting style summary
  factCheck?: boolean;
}): Promise<string> {
  const { originalTweet, viralPatterns, userStyle, factCheck = true } = params;

  // Select a random viral pattern for structure reference
  const patternIndex = Math.floor(Math.random() * viralPatterns.length);
  const referencePattern = viralPatterns[patternIndex] || "";

  const prompt = `以下の元投稿の内容を参考にして、バズるX投稿を日本語で作成してください。

━━━━━━━━━━━━━━━━━━━━
■ 元投稿（内容の参考）
━━━━━━━━━━━━━━━━━━━━
@${originalTweet.author_username}:
${originalTweet.text}

いいね: ${originalTweet.likes.toLocaleString()}
${originalTweet.has_video ? "※動画付き投稿" : ""}
${originalTweet.has_image ? "※画像付き投稿" : ""}

${referencePattern ? `━━━━━━━━━━━━━━━━━━━━
■ 参考にする投稿の型（構造のみ参考）
━━━━━━━━━━━━━━━━━━━━
${referencePattern}` : ""}

${userStyle ? `━━━━━━━━━━━━━━━━━━━━
■ 投稿スタイル
━━━━━━━━━━━━━━━━━━━━
${userStyle}` : ""}

━━━━━━━━━━━━━━━━━━━━
■ 生成ルール
━━━━━━━━━━━━━━━━━━━━
1. 元投稿の核心的な情報を日本語で伝える
2. 情報量を詰め込む（具体的な数字、機能名、技術名を入れる）
3. ${referencePattern ? "参考投稿の「構造」（行数、改行、箇条書き）を真似する" : "読みやすい構造にする"}
4. バズる要素を入れる（驚き、具体性、有用性）
5. 280文字以内に収める
6. 日本語で書く
7. 元投稿が英語の場合は内容を翻訳して伝える
8. URLは絶対に含めない

■ 禁止事項
- 絵文字の多用（最大1-2個）
- AIっぽい表現（〜ですね、素晴らしい、ぜひ）
- URL/リンク
- 「〜しましょう」「〜してみてください」

投稿本文のみを出力:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたはXでバズる投稿を作成する専門家です。
情報量が濃く、読者が思わず保存したくなる投稿を作ります。
AIっぽい表現は絶対に使いません。事実ベースで淡々と、でもインパクトのある書き方をします。
URLは絶対に含めません。`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 500,
  });

  let generatedText = response.choices[0]?.message?.content?.trim() || "";

  // Fact check if enabled
  if (factCheck && generatedText) {
    generatedText = await factCheckPost(generatedText, originalTweet.text);
  }

  return generatedText;
}

/**
 * Fact-check a generated post against the original content
 */
async function factCheckPost(generatedText: string, originalText: string): Promise<string> {
  const prompt = `以下の生成された投稿を元の投稿と比較して、事実誤認やハルシネーションがないか確認してください。

【生成された投稿】
${generatedText}

【元の投稿（事実の根拠）】
${originalText}

問題がある場合は修正した投稿本文を出力してください。
問題がない場合はそのまま投稿本文を出力してください。

投稿本文のみを出力:`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "ファクトチェッカー。生成された投稿に元の情報と矛盾する内容がないか確認し、問題があれば最小限の修正を行う。URLは含めない。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content?.trim() || generatedText;
  } catch (error) {
    console.error("[DailyX] Fact check error:", error);
    return generatedText;
  }
}

/**
 * Translate a tweet to Japanese
 */
export async function translateToJapanese(text: string): Promise<string> {
  // If already mostly Japanese, return as-is
  const japaneseRatio = (text.match(/[\u3000-\u9fff\uff00-\uffef]/g) || []).length / text.length;
  if (japaneseRatio > 0.3) return text;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "技術ドキュメントの翻訳者。自然な日本語に翻訳する。技術用語は英語のまま残す。",
      },
      {
        role: "user",
        content: `以下の英語のツイートを自然な日本語に翻訳してください。技術用語（製品名、サービス名、技術名）は英語のまま残してください。\n\n${text}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content?.trim() || text;
}

/**
 * Build a DailyXPost object from a tweet and generated text
 */
export function buildDailyXPost(
  tweet: XTweetWithMedia,
  generatedText: string,
  source: DailyXPost["source"],
  sourceDetail?: { keyword?: string; account?: string }
): DailyXPost {
  const imageUrls = getImageUrls(tweet);
  const finalPostText = formatPostWithMedia(generatedText, tweet);

  return {
    id: `${source}_${tweet.id}_${Date.now()}`,
    originalTweet: {
      id: tweet.id,
      text: tweet.text,
      authorName: tweet.author_name,
      authorUsername: tweet.author_username,
      authorProfileImage: tweet.author_profile_image,
      url: tweet.original_url,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      createdAt: tweet.created_at,
      hasVideo: tweet.has_video,
      hasImage: tweet.has_image,
      imageUrls,
      videoUrl: tweet.has_video ? buildVideoUrl(tweet.original_url) : undefined,
    },
    generatedText,
    finalPostText,
    mediaImageUrls: imageUrls,
    status: "pending",
    source,
    sourceKeyword: sourceDetail?.keyword,
    sourceAccount: sourceDetail?.account,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get viral post patterns from user's stored posts
 * Returns S/A tier posts as structural references
 */
export async function getViralPatterns(
  db: FirebaseFirestore.Firestore,
  userId: string
): Promise<string[]> {
  const patterns: string[] = [];

  // Get S-tier posts from user's posts
  const postsSnap = await db
    .collection("users")
    .doc(userId)
    .collection("posts")
    .where("tier", "in", ["S", "A"])
    .limit(30)
    .get();

  for (const doc of postsSnap.docs) {
    const data = doc.data();
    if (data.text && data.likes >= 100) {
      patterns.push(data.text);
    }
  }

  // Also get from context posts
  const contextSnap = await db
    .collection("users")
    .doc(userId)
    .collection("contextPosts")
    .where("tier", "in", ["S", "A"])
    .limit(20)
    .get();

  for (const doc of contextSnap.docs) {
    const data = doc.data();
    if (data.text && data.likes >= 100) {
      patterns.push(data.text);
    }
  }

  // Shuffle and return top patterns
  return patterns.sort(() => Math.random() - 0.5).slice(0, 15);
}
