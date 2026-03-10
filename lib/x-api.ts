/**
 * X (Twitter) API v2 - Search, User Timeline, Bookmarks with Media
 * Uses Bearer Token (OAuth 2.0 App-Only) for search
 * Uses User OAuth 2.0 for bookmarks
 */

const X_API_BASE = "https://api.twitter.com/2";

// ==============================
// Types
// ==============================

export interface XMedia {
  media_key: string;
  type: "photo" | "video" | "animated_gif";
  url?: string; // For photos
  preview_image_url?: string; // For videos
  variants?: Array<{
    bit_rate?: number;
    content_type: string;
    url: string;
  }>;
}

export interface XTweetData {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count?: number;
  };
  attachments?: {
    media_keys?: string[];
  };
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to";
    id: string;
  }>;
  note_tweet?: {
    text: string;
  };
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

export interface XTweetWithMedia {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_username: string;
  author_profile_image?: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  media: XMedia[];
  has_video: boolean;
  has_image: boolean;
  is_retweet: boolean;
  is_quote: boolean;
  original_url: string;
  video_url?: string; // /video/1 形式のURL
  video_mp4_url?: string; // 直接再生可能なmp4 URL
  video_preview_url?: string; // 動画サムネイル
}

// ==============================
// Helper functions
// ==============================

function getBearerToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN not configured");
  return token;
}

const TWEET_FIELDS = "created_at,public_metrics,author_id,attachments,referenced_tweets,note_tweet";
const USER_FIELDS = "name,username,profile_image_url";
const MEDIA_FIELDS = "url,preview_image_url,type,variants";
const EXPANSIONS = "author_id,attachments.media_keys";

function buildTweetWithMedia(
  tweet: XTweetData,
  users: Map<string, XUser>,
  mediaMap: Map<string, XMedia>
): XTweetWithMedia {
  const author = users.get(tweet.author_id);
  const mediaKeys = tweet.attachments?.media_keys || [];
  const media = mediaKeys.map((key) => mediaMap.get(key)).filter(Boolean) as XMedia[];

  const hasVideo = media.some((m) => m.type === "video" || m.type === "animated_gif");
  const hasImage = media.some((m) => m.type === "photo");
  const isRetweet = tweet.referenced_tweets?.some((r) => r.type === "retweeted") || false;
  const isQuote = tweet.referenced_tweets?.some((r) => r.type === "quoted") || false;

  const originalUrl = `https://x.com/${author?.username || "unknown"}/status/${tweet.id}`;
  const videoUrl = hasVideo ? `${originalUrl}/video/1` : undefined;
  const videoMedia = media.find(
    (m) => (m.type === "video" || m.type === "animated_gif")
  );
  const videoPreviewUrl = videoMedia?.preview_image_url;
  // Get highest quality mp4 variant for autoplay
  const videoMp4Url = videoMedia?.variants
    ?.filter((v) => v.content_type === "video/mp4")
    ?.sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))
    ?.[0]?.url;

  // Use note_tweet.text for full text of long tweets (>280 chars)
  const fullText = tweet.note_tweet?.text || tweet.text;

  return {
    id: tweet.id,
    text: fullText,
    created_at: tweet.created_at,
    author_id: tweet.author_id,
    author_name: author?.name || "Unknown",
    author_username: author?.username || "unknown",
    author_profile_image: author?.profile_image_url,
    likes: tweet.public_metrics?.like_count || 0,
    retweets: tweet.public_metrics?.retweet_count || 0,
    replies: tweet.public_metrics?.reply_count || 0,
    impressions: tweet.public_metrics?.impression_count || 0,
    media,
    has_video: hasVideo,
    has_image: hasImage,
    is_retweet: isRetweet,
    is_quote: isQuote,
    original_url: originalUrl,
    video_url: videoUrl,
    video_mp4_url: videoMp4Url,
    video_preview_url: videoPreviewUrl,
  };
}

function parseResponse(data: any): {
  tweets: XTweetWithMedia[];
  meta?: any;
} {
  if (!data.data) return { tweets: [], meta: data.meta };

  const users = new Map<string, XUser>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      users.set(user.id, user);
    }
  }

  const mediaMap = new Map<string, XMedia>();
  if (data.includes?.media) {
    for (const m of data.includes.media) {
      mediaMap.set(m.media_key, m);
    }
  }

  const tweets = (data.data as XTweetData[]).map((tweet) =>
    buildTweetWithMedia(tweet, users, mediaMap)
  );

  return { tweets, meta: data.meta };
}

// ==============================
// Search Tweets
// ==============================

/**
 * Search recent tweets (last 7 days) using X API v2
 * Requires Basic plan ($100/month) for search/recent
 */
export async function searchRecentTweets(params: {
  query: string;
  maxResults?: number;
  paginationToken?: string;
  sortOrder?: "recency" | "relevancy";
  startTime?: string; // ISO 8601
}): Promise<{ tweets: XTweetWithMedia[]; nextToken?: string }> {
  const { query, maxResults = 100, paginationToken, sortOrder = "relevancy", startTime } = params;
  const bearerToken = getBearerToken();

  const url = new URL(`${X_API_BASE}/tweets/search/recent`);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", String(Math.min(maxResults, 100)));
  url.searchParams.set("tweet.fields", TWEET_FIELDS);
  url.searchParams.set("user.fields", USER_FIELDS);
  url.searchParams.set("media.fields", MEDIA_FIELDS);
  url.searchParams.set("expansions", EXPANSIONS);
  url.searchParams.set("sort_order", sortOrder);
  if (startTime) {
    url.searchParams.set("start_time", startTime);
  }

  if (paginationToken) {
    url.searchParams.set("next_token", paginationToken);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[X-API] Search error:", response.status, error);
    throw new Error(`X API search failed: ${response.status} - ${error?.detail || error?.title || "Unknown error"}`);
  }

  const data = await response.json();
  const { tweets, meta } = parseResponse(data);

  return {
    tweets,
    nextToken: meta?.next_token,
  };
}

/**
 * Search tweets with keyword and minimum likes filter
 * Combines query with min_faves operator
 */
export async function searchTweetsWithMinLikes(params: {
  keyword: string;
  minLikes: number;
  maxResults?: number;
  lang?: string;
}): Promise<XTweetWithMedia[]> {
  const { keyword, minLikes, maxResults = 100, lang } = params;

  // Build query: keyword + min likes + exclude retweets
  let query = `${keyword} min_faves:${minLikes} -is:retweet`;
  if (lang) {
    query += ` lang:${lang}`;
  }

  const allTweets: XTweetWithMedia[] = [];
  let nextToken: string | undefined;

  // Paginate to get all results (up to maxResults)
  while (allTweets.length < maxResults) {
    const remaining = maxResults - allTweets.length;
    const batchSize = Math.min(remaining, 100);

    const result = await searchRecentTweets({
      query,
      maxResults: batchSize,
      paginationToken: nextToken,
    });

    allTweets.push(...result.tweets);
    nextToken = result.nextToken;

    if (!nextToken) break;

    // Rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  return allTweets;
}

// ==============================
// User Timeline
// ==============================

/**
 * Get recent tweets from a specific user (excluding retweets by default)
 */
export async function getUserTweets(params: {
  userId?: string;
  username?: string;
  maxResults?: number;
  excludeRetweets?: boolean;
  sinceId?: string;
}): Promise<XTweetWithMedia[]> {
  const { maxResults = 10, excludeRetweets = true, sinceId } = params;
  const bearerToken = getBearerToken();

  // If username provided, resolve to userId first
  let userId = params.userId;
  if (!userId && params.username) {
    userId = await resolveUserId(params.username);
  }
  if (!userId) throw new Error("userId or username required");

  const url = new URL(`${X_API_BASE}/users/${userId}/tweets`);
  url.searchParams.set("max_results", String(Math.min(maxResults, 100)));
  url.searchParams.set("tweet.fields", TWEET_FIELDS);
  url.searchParams.set("user.fields", USER_FIELDS);
  url.searchParams.set("media.fields", MEDIA_FIELDS);
  url.searchParams.set("expansions", EXPANSIONS);

  if (excludeRetweets) {
    url.searchParams.set("exclude", "retweets");
  }

  if (sinceId) {
    url.searchParams.set("since_id", sinceId);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("[X-API] User tweets error:", response.status, error);
    throw new Error(`X API user tweets failed: ${response.status}`);
  }

  const data = await response.json();
  const { tweets } = parseResponse(data);
  return tweets;
}

/**
 * Resolve a username to a user ID
 */
export async function resolveUserId(username: string): Promise<string> {
  const bearerToken = getBearerToken();
  const cleanUsername = username.replace("@", "");

  const response = await fetch(`${X_API_BASE}/users/by/username/${cleanUsername}`, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve username @${cleanUsername}`);
  }

  const data = await response.json();
  return data.data.id;
}

// ==============================
// Bookmarks (requires user OAuth 2.0)
// ==============================

/**
 * Get user's bookmarks with media information
 * Requires user-level OAuth 2.0 token
 */
export async function getBookmarksWithMedia(params: {
  accessToken: string;
  maxResults?: number;
  paginationToken?: string;
}): Promise<{ tweets: XTweetWithMedia[]; nextToken?: string }> {
  const { accessToken, maxResults = 100, paginationToken } = params;

  // First get the user's ID
  const meResponse = await fetch(`${X_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!meResponse.ok) {
    const errBody = await meResponse.text().catch(() => "");
    if (meResponse.status === 401) {
      throw new Error("X認証が無効です。設定ページでXと再連携してください。");
    } else if (meResponse.status === 403) {
      throw new Error("ブックマークAPIはX API Basic以上のプラン($100/月)が必要です。Freeプランでは利用できません。");
    } else if (meResponse.status === 429) {
      throw new Error("X APIのレート制限に達しました。しばらく待ってから再試行してください。");
    }
    throw new Error(`ユーザー情報の取得に失敗しました (${meResponse.status}): ${errBody.slice(0, 200)}`);
  }

  const meData = await meResponse.json();
  const xUserId = meData.data.id;

  const url = new URL(`${X_API_BASE}/users/${xUserId}/bookmarks`);
  url.searchParams.set("max_results", String(Math.min(maxResults, 100)));
  url.searchParams.set("tweet.fields", TWEET_FIELDS);
  url.searchParams.set("user.fields", USER_FIELDS);
  url.searchParams.set("media.fields", MEDIA_FIELDS);
  url.searchParams.set("expansions", EXPANSIONS);

  if (paginationToken) {
    url.searchParams.set("pagination_token", paginationToken);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Bookmarks fetch failed: ${response.status} - ${error?.detail || ""}`);
  }

  const data = await response.json();
  const { tweets, meta } = parseResponse(data);

  return {
    tweets,
    nextToken: meta?.next_token,
  };
}

/**
 * Get all bookmarks (paginate through all pages)
 */
export async function getAllBookmarks(params: {
  accessToken: string;
  limit?: number;
}): Promise<XTweetWithMedia[]> {
  const { accessToken, limit = 200 } = params;
  const allTweets: XTweetWithMedia[] = [];
  let nextToken: string | undefined;

  while (allTweets.length < limit) {
    const result = await getBookmarksWithMedia({
      accessToken,
      maxResults: Math.min(100, limit - allTweets.length),
      paginationToken: nextToken,
    });

    allTweets.push(...result.tweets);
    nextToken = result.nextToken;

    if (!nextToken) break;
    await new Promise((r) => setTimeout(r, 300));
  }

  return allTweets;
}

// ==============================
// Utility
// ==============================

/**
 * Build a /video/1 URL from a tweet URL
 * Strips query params, trailing slashes, and existing /video/ paths
 */
export function buildVideoUrl(tweetUrl: string): string {
  let url = tweetUrl.split("?")[0]; // Remove query params
  url = url.replace(/\/+$/, ""); // Remove trailing slashes
  url = url.replace(/\/video\/\d+$/, ""); // Remove existing /video/N
  url = url.replace(/\/photo\/\d+$/, ""); // Remove existing /photo/N
  return `${url}/video/1`;
}

/**
 * Build a /photo/N URL from a tweet URL
 */
export function buildPhotoUrl(tweetUrl: string, index: number = 1): string {
  let url = tweetUrl.split("?")[0];
  url = url.replace(/\/+$/, "");
  url = url.replace(/\/video\/\d+$/, "");
  url = url.replace(/\/photo\/\d+$/, "");
  return `${url}/photo/${index}`;
}

/**
 * Extract tweet ID from a tweet URL
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Format post text with video URL at the beginning if video exists
 */
export function formatPostWithMedia(
  postText: string,
  originalTweet: XTweetWithMedia
): string {
  if (originalTweet.has_video && originalTweet.video_url) {
    return `${originalTweet.video_url}\n\n${postText}`;
  }
  return postText;
}

/**
 * Get image URLs from a tweet
 */
export function getImageUrls(tweet: XTweetWithMedia): string[] {
  return tweet.media
    .filter((m) => m.type === "photo" && m.url)
    .map((m) => m.url!);
}
