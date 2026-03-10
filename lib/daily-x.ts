/**
 * Daily X - Core logic for keyword-based post generation, trending posts, and account monitoring
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
    authorProfileImage?: string | null;
    url: string;
    likes: number;
    retweets: number;
    replies: number;
    createdAt: string;
    hasVideo: boolean;
    hasImage: boolean;
    imageUrls: string[];
    videoUrl?: string | null;
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
  source: "keyword" | "trending" | "account_monitor";
  sourceKeyword?: string | null;
  sourceAccount?: string | null;
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
// The Prompt (一言一句変えない)
// ==============================

const VIRAL_POST_PROMPT = `目的
AI・テック・ビジネス関連の情報を 思わず保存・拡散したくなる投稿としてまとめる。
投稿は以下の要素を満たすこと。

① 投稿構造
投稿は必ず以下の構造にする。
① フック ② 何が起きたか（超簡潔） ③ 解説 ④ 何がヤバいのか ⑤ 具体例 ⑥ 未来の示唆 ⑦ 行動誘導

② フックの作り方
投稿の冒頭は必ず以下のどれかから始める。
【海外で話題】 【速報】 【衝撃】 【注意喚起】 【保存版】 【実は】 【知らないと損】
このフックの目的は
・スクロール停止 ・信頼感 ・情報価値
を一瞬で伝えること。

③ 読みやすい文章設計
以下を徹底する。
・1行15〜25文字 ・改行多め ・句読点少なめ ・スマホ可読性重視
例
悪い例 OpenClawというAIエージェントは最近海外で話題になっていて様々な使い方が可能です
良い例 OpenClawというAIエージェントが 海外でかなり話題になっています。
理由はシンプル。
「AIが自律で働く」から。

④ 情報密度
必ず
・何が起きたのか ・何ができるのか ・何が変わるのか
この3つを入れる。

⑤ 箇条書き
途中で必ず箇条書きを入れる。
例
できること👇
・Web自動リサーチ ・競合分析 ・ニュース収集 ・企業リスト作成 ・レポート生成
など。

⑥ ヤバさの言語化
単なる紹介ではなく
「これ何がヤバいの？」
を説明する。
例
つまり何が起きるかというと…
AIが
「調べるツール」 ↓ 「作るツール」 ↓ 「働くツール」
になり始めています。

⑦ 未来予測
必ず最後に未来視点を入れる。
例
これ 本当に数年以内に
「AIエージェントが当たり前」
になる可能性あります。

⑧ 拡散トリガー
投稿には必ず
・保存 ・引用 ・コメント
を誘発する要素を入れる。
例
正直これ かなり気になってるので
実際に触ってみて レビューしようと思います。

⑨ 情報の信頼感
必要に応じて
・企業名 ・技術名 ・GitHub ・研究者 ・数値
を入れる。
例
・GitHubで1300スター ・72%トークン削減 ・24時間自律稼働

⑩ 投稿の長さ
理想
120〜300文字
ただし
・スレッド型 ・情報まとめ
の場合は
400〜800文字でも可。

⑪ よく使うパターン
直人さんの投稿では以下の型が多い。
型1
海外トレンド
【海外で話題】
〜が登場。
これ何かというと👇
〜説明
つまり…
〜解説
これ かなりヤバいです。

型2
速報
【速報】
〜が公開。
結論👇
〜
できること👇
・ ・ ・

型3
注意喚起
【注意喚起】
〜で事故が起きました。
結論👇
〜

型4
技術解説
【保存版】
〜の仕組みを わかりやすく解説👇

⑫ 投稿トーン
トーンは
・フラット ・断定しすぎない ・でもワクワク感
例
正直 かなり面白いです。

⑬ 最後の一文
直人さんの投稿ではよく
・レビュー予定 ・使ってみる ・解説する
を入れる。
例
これはさすがに気になるので 実際に触ってみてレビューします。

⑭ 投稿例（再現）
【海外で話題】
OpenClawで Web情報収集を強化する
プラグインが登場。
その名も ーーScrapling
これ何ができるかというと👇
・AIがWebを自動巡回 ・ページ構造を解析 ・複数サイトから情報収集 ・そのままレポート生成
つまり何が起きるかというと…
AIが
「聞かれたら答えるツール」
から
「自分で調べるAI」
になります。
例えば👇
・市場リサーチ ・競合分析 ・ニュース収集 ・企業リスト作成
全部
AIが自動で クロール → 収集 → 整理。
AIエージェント どんどんヤバくなってます。
これは 実際に触ってみてレビューします。

⑮ 絵文字の使い方
使用可能な絵文字セット（これ以外は使わない）:
方向・誘導: 👇 → ↓ ▶
驚き・注目: 😳 🤯 ⚡ 🔥 💥 ❗
ポジティブ: ✅ ✨ 💡 🎯 🚀 💪 👀 🙌
警告・注意: ⚠️ 🚨 ❌
技術: 🤖 🧠 💻 🔧 ⚙️ 🔗 📊
その他: 📌 📝 🎁 🆕 🏆 💰

ルール:
- 基本は少なめ（1投稿2〜4個程度）
- フック冒頭には使わない（【速報】等のテキストフックを優先）
- 箇条書きの前の見出し行に1個（例: できること👇）
- 驚き・インパクトのある箇所に1個
- 最後の行動誘導に1個
- 過去のバズ投稿の絵文字配置パターンを参考にする

⑯ このプロンプトの本質
このプロンプトの設計思想は
Xでバズる投稿の原理
①スクロール停止 ②情報価値 ③理解しやすさ ④保存価値 ⑤未来示唆
を全部満たすこと。

正直に言うと
直人さんの投稿がバズりやすい理由は
投稿構造がかなり強いからです。
特にこの3つ。
1 冒頭フック
2 箇条書き
3 つまり何が起きるか`;

// ==============================
// Post Generation
// ==============================

/**
 * Search the web for additional context about a tweet's topic
 */
/**
 * Extract URLs from tweet text (excluding t.co shortened URLs that point to twitter itself)
 */
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s)]+/g;
  return (text.match(urlRegex) || []).filter((url) => {
    // Keep t.co URLs (they redirect to real URLs) and direct URLs
    return true;
  });
}

/**
 * Fetch and extract text content from a URL
 */
async function fetchUrlContent(url: string): Promise<string> {
  try {
    // Resolve t.co redirects
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return "";

    const finalUrl = response.url;
    // Skip if it redirects to twitter/x.com (profile pages, tweet pages)
    if (/^https?:\/\/(twitter\.com|x\.com)\//i.test(finalUrl)) return "";

    const html = await response.text();
    // Extract text from HTML (simple approach: strip tags, decode entities)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Return first 3000 chars of meaningful content
    return text.slice(0, 3000);
  } catch {
    return "";
  }
}

export async function deepResearchTweet(tweetText: string): Promise<string> {
  const serperKey = process.env.SERPER_API_KEY;
  const researchParts: string[] = [];

  try {
    // Phase 1: Extract and fetch URLs from the tweet (primary source)
    const urls = extractUrls(tweetText);
    if (urls.length > 0) {
      console.log(`[DailyX] Fetching ${urls.length} URLs from tweet...`);
      const urlContents = await Promise.all(
        urls.slice(0, 5).map(async (url) => {
          const content = await fetchUrlContent(url);
          if (content && content.length > 50) {
            return `[URL: ${url}]\n${content}`;
          }
          return "";
        })
      );

      const validContents = urlContents.filter((c) => c.length > 0);
      if (validContents.length > 0) {
        researchParts.push("=== ツイート内URLの情報 ===");
        researchParts.push(...validContents);
      }
    }

    // Phase 2: If URL content is insufficient (< 500 chars total) or no URLs, do web search
    const urlContentLength = researchParts.join("\n").length;
    if (urlContentLength < 500 && serperKey) {
      console.log(`[DailyX] URL content insufficient (${urlContentLength} chars), doing web search...`);

      // Extract key terms from the tweet for search
      const searchQuery = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "ツイートの内容から、Google検索に最適な英語の検索クエリを1つだけ生成してください。技術名・製品名・企業名を優先してください。検索クエリのみを出力してください。",
          },
          { role: "user", content: tweetText },
        ],
        temperature: 0,
        max_tokens: 50,
      });
      const query = searchQuery.choices[0]?.message?.content?.trim() || "";

      if (query) {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": serperKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query, num: 5 }),
        });

        if (res.ok) {
          const data = await res.json();
          const snippets: string[] = [];
          if (data.knowledgeGraph) {
            const kg = data.knowledgeGraph;
            if (kg.description) snippets.push(`[${kg.title || ""}] ${kg.description}`);
          }
          for (const result of (data.organic || []).slice(0, 5)) {
            if (result.snippet) {
              snippets.push(`[${result.title}] ${result.snippet}`);
            }
          }
          if (snippets.length > 0) {
            researchParts.push("=== Web検索結果 ===");
            researchParts.push(...snippets);
          }
        }
      }
    }

    return researchParts.join("\n");
  } catch (e) {
    console.error("[DailyX] Deep research error:", e);
    return researchParts.join("\n") || "";
  }
}

/**
 * Generate a viral-format post from an original tweet using the exact prompt
 */
export async function generateViralPost(params: {
  originalTweet: XTweetWithMedia;
  factCheck?: boolean;
  researchContext?: string;
}): Promise<string> {
  const { originalTweet, factCheck = true, researchContext } = params;

  const researchSection = researchContext
    ? `
━━━━━━━━━━━━━━━━━━━━
■ 追加リサーチ情報（Web検索結果）
━━━━━━━━━━━━━━━━━━━━
以下の情報を活用して、より正確で情報量の多い投稿を作成してください。
${researchContext}
`
    : "";

  const userPrompt = `以下の元投稿の情報を使って、上記のルールに従ってバズるX投稿を日本語で作成してください。

━━━━━━━━━━━━━━━━━━━━
■ 元投稿
━━━━━━━━━━━━━━━━━━━━
@${originalTweet.author_username}:
${originalTweet.text}

いいね: ${originalTweet.likes.toLocaleString()}
リツイート: ${originalTweet.retweets.toLocaleString()}
${originalTweet.has_video ? "※動画付き投稿" : ""}
${originalTweet.has_image ? "※画像付き投稿" : ""}
${researchSection}
━━━━━━━━━━━━━━━━━━━━
■ 重要な前提
━━━━━━━━━━━━━━━━━━━━
この投稿は他人のツイートを引用・参照して作成するものです。
自分が発見・体験したかのように書くのではなく、「海外で話題になっている」「〜が公開された」「〜が登場した」のように、他者の情報を紹介・引用するスタンスで書いてください。

━━━━━━━━━━━━━━━━━━━━
■ ルール
━━━━━━━━━━━━━━━━━━━━
- 元投稿が英語の場合は内容を日本語で伝える
- 元投稿の核心的な情報・数字・技術名を正確に反映する
- Web検索で得た追加情報があれば、具体的な数値・機能・事実を盛り込む
- URLは絶対に含めない
- 投稿本文のみを出力する
- 自分の体験談として書かない（他者の投稿の引用・紹介として書く）

投稿本文のみを出力:`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: VIRAL_POST_PROMPT,
      },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 1000,
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
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content?.trim() || generatedText;
  } catch (error) {
    console.error("[DailyX] Fact check error:", error);
    return generatedText;
  }
}

/**
 * Translate a tweet to Japanese using free Google Translate
 */
export async function translateToJapanese(text: string): Promise<string> {
  // Detect Japanese-specific characters (hiragana + katakana only, NOT kanji which is shared with Chinese)
  const hiraganaKatakana = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  // If text has significant hiragana/katakana, it's Japanese - skip translation
  if (hiraganaKatakana / text.length > 0.1) return text;

  try {
    // Use Google Translate with auto-detect to handle ALL languages (English, Chinese, Korean, etc.)
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    // Google returns detected language as data[2] (e.g. "en", "zh-CN", "ko")
    const detectedLang = data[2] as string;
    // If already Japanese, return original
    if (detectedLang === "ja") return text;
    // Response format: [[["translated text","original text",null,null,X],...],null,"en"]
    const translated = (data[0] as any[])
      .map((segment: any) => segment[0])
      .join("");
    return translated || text;
  } catch {
    return text;
  }
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
      authorProfileImage: tweet.author_profile_image || null,
      url: tweet.original_url,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      createdAt: tweet.created_at,
      hasVideo: tweet.has_video,
      hasImage: tweet.has_image,
      imageUrls,
      videoUrl: tweet.has_video ? buildVideoUrl(tweet.original_url) : null,
    },
    generatedText,
    finalPostText,
    mediaImageUrls: imageUrls,
    status: "pending",
    source,
    sourceKeyword: sourceDetail?.keyword || null,
    sourceAccount: sourceDetail?.account || null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Build X search query for a keyword
 * Note: min_faves requires Pro tier ($5000+), so we filter client-side instead
 * Example: ("Claude Code" OR ClaudeCode) -is:retweet
 */
export function buildKeywordQuery(keyword: string): string {
  const trimmed = keyword.trim();
  const noSpace = trimmed.replace(/\s+/g, "");
  const lowerNoSpace = noSpace.toLowerCase();

  let keywordPart: string;
  if (trimmed.includes(" ")) {
    keywordPart = `("${trimmed}" OR ${noSpace} OR ${lowerNoSpace})`;
  } else {
    keywordPart = trimmed;
  }

  return `${keywordPart} -is:retweet`;
}

/**
 * Build a single keyword part (without -is:retweet) for batching
 */
function buildKeywordPart(keyword: string): string {
  const trimmed = keyword.trim();
  const noSpace = trimmed.replace(/\s+/g, "");
  const lowerNoSpace = noSpace.toLowerCase();

  if (trimmed.includes(" ")) {
    return `"${trimmed}" OR ${noSpace} OR ${lowerNoSpace}`;
  }
  return trimmed;
}

/**
 * Batch keywords into combined queries to minimize API calls
 * X Basic tier query limit: 512 chars
 * Returns array of { query, keywords[] } objects
 */
export function batchKeywordQueries(
  keywords: string[],
  maxQueryLength: number = 480
): { query: string; keywords: string[] }[] {
  const batches: { query: string; keywords: string[] }[] = [];
  const suffix = " -is:retweet";

  let currentParts: string[] = [];
  let currentKeywords: string[] = [];
  let currentLength = 0;

  for (const keyword of keywords) {
    const part = buildKeywordPart(keyword);
    // Account for " OR " separator + parentheses + suffix
    const addedLength = currentParts.length === 0
      ? part.length + 2 + suffix.length  // (part) -is:retweet
      : part.length + 4;                  // " OR " + part

    if (currentLength + addedLength > maxQueryLength && currentParts.length > 0) {
      // Flush current batch
      const query = `(${currentParts.join(" OR ")})${suffix}`;
      batches.push({ query, keywords: currentKeywords });
      currentParts = [];
      currentKeywords = [];
      currentLength = 0;
    }

    currentParts.push(part);
    currentKeywords.push(keyword);
    currentLength = `(${currentParts.join(" OR ")})${suffix}`.length;
  }

  if (currentParts.length > 0) {
    const query = `(${currentParts.join(" OR ")})${suffix}`;
    batches.push({ query, keywords: currentKeywords });
  }

  return batches;
}
