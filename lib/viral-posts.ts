import { ViralPost } from "./types";

/**
 * Parse X (Twitter) URL to extract tweet ID
 */
export function parseTweetUrl(url: string): string | null {
  // Match various X/Twitter URL formats
  const patterns = [
    /(?:twitter|x)\.com\/\w+\/status\/(\d+)/,
    /(?:twitter|x)\.com\/i\/web\/status\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch tweet data from X API (placeholder - requires X API credentials)
 * In production, this would use the X API v2
 */
export async function fetchTweetData(url: string): Promise<ViralPost | null> {
  const tweetId = parseTweetUrl(url);

  if (!tweetId) {
    throw new Error("無効なX (Twitter) URLです");
  }

  // In production, you would use the X API here:
  // const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?...`, {
  //   headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }
  // });

  // For now, return a placeholder that indicates the URL was valid
  // The actual data would come from the X API
  return {
    id: `viral_${tweetId}`,
    text: "この投稿のデータを取得するにはX API連携が必要です。設定画面からX APIを連携してください。",
    author: "ユーザー",
    authorHandle: "@user",
    url: url,
    likes: 0,
    retweets: 0,
    replies: 0,
    impressions: 0,
    createdAt: new Date().toISOString().split("T")[0],
    category: "その他",
    saved: false,
  };
}

/**
 * Extract author handle from X URL
 */
export function extractHandleFromUrl(url: string): string | null {
  const match = url.match(/(?:twitter|x)\.com\/(@?\w+)\/status/);
  return match ? (match[1].startsWith("@") ? match[1] : `@${match[1]}`) : null;
}
