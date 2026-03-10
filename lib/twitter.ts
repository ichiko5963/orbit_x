import crypto from "crypto";

// X (Twitter) API v2 Client
// Uses OAuth 1.0a for authentication

interface TwitterConfig {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface TweetResponse {
  data?: {
    id: string;
    text: string;
  };
  errors?: Array<{
    message: string;
    code?: number;
  }>;
}

class TwitterClient {
  private config: TwitterConfig;

  constructor(config: TwitterConfig) {
    this.config = config;
  }

  // Generate OAuth 1.0a signature
  private generateOAuthSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    oauthParams: Record<string, string>
  ): string {
    const allParams = { ...params, ...oauthParams };
    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join("&");

    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(url),
      encodeURIComponent(paramString),
    ].join("&");

    const signingKey = `${encodeURIComponent(this.config.apiSecret)}&${encodeURIComponent(
      this.config.accessTokenSecret
    )}`;

    const signature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBaseString)
      .digest("base64");

    return signature;
  }

  // Generate OAuth 1.0a header
  private generateOAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.config.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString("hex"),
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.config.accessToken,
      oauth_version: "1.0",
    };

    const signature = this.generateOAuthSignature(method, url, params, oauthParams);
    oauthParams.oauth_signature = signature;

    const headerParts = Object.keys(oauthParams)
      .sort()
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(", ");

    return `OAuth ${headerParts}`;
  }

  // Upload media (image) to Twitter
  async uploadMedia(imageData: Buffer | string, mimeType: string = "image/jpeg"): Promise<string> {
    const url = "https://upload.twitter.com/1.1/media/upload.json";

    // Convert to base64 if Buffer
    const base64Data = Buffer.isBuffer(imageData)
      ? imageData.toString("base64")
      : imageData;

    // For media upload, we need to include params in signature
    const params = { media_data: base64Data };
    const authHeader = this.generateOAuthHeader("POST", url, params);

    const formBody = new URLSearchParams();
    formBody.append("media_data", base64Data);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twitter media upload error:", data);
      throw new Error(data.errors?.[0]?.message || "Failed to upload media");
    }

    return data.media_id_string;
  }

  // Upload media from URL
  async uploadMediaFromUrl(imageUrl: string): Promise<string | null> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error("Failed to fetch image:", imageUrl);
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/jpeg";

      return await this.uploadMedia(buffer, contentType);
    } catch (error) {
      console.error("Error uploading media from URL:", error);
      return null;
    }
  }

  // Post a tweet with optional media and quote_tweet_id
  async postTweet(text: string, options?: {
    quoteTweetId?: string;
    mediaIds?: string[];
  }): Promise<TweetResponse> {
    const url = "https://api.twitter.com/2/tweets";
    const authHeader = this.generateOAuthHeader("POST", url);

    const payload: {
      text: string;
      quote_tweet_id?: string;
      media?: { media_ids: string[] };
    } = { text };

    if (options?.quoteTweetId) {
      payload.quote_tweet_id = options.quoteTweetId;
    }

    if (options?.mediaIds && options.mediaIds.length > 0) {
      payload.media = { media_ids: options.mediaIds };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Twitter API non-JSON response:", response.status, responseText.slice(0, 500));
      throw new Error(`X API returned non-JSON (HTTP ${response.status}): ${responseText.slice(0, 200)}`);
    }

    if (!response.ok) {
      console.error("Twitter API error:", response.status, data);
      throw new Error(data.detail || data.title || data.errors?.[0]?.message || `HTTP ${response.status}`);
    }

    return data as TweetResponse;
  }

  // Post a tweet with reply
  async postReply(text: string, replyToTweetId: string, options?: {
    mediaIds?: string[];
  }): Promise<TweetResponse> {
    const url = "https://api.twitter.com/2/tweets";
    const authHeader = this.generateOAuthHeader("POST", url);

    const payload: {
      text: string;
      reply: { in_reply_to_tweet_id: string };
      media?: { media_ids: string[] };
    } = {
      text,
      reply: { in_reply_to_tweet_id: replyToTweetId },
    };

    if (options?.mediaIds && options.mediaIds.length > 0) {
      payload.media = { media_ids: options.mediaIds };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twitter API error:", data);
      throw new Error(data.detail || data.title || "Failed to post reply");
    }

    return data as TweetResponse;
  }

  // Verify credentials and get profile
  async verifyCredentials(): Promise<{
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
  } | null> {
    // Request user fields including profile_image_url
    const url = "https://api.twitter.com/2/users/me?user.fields=profile_image_url";
    const authHeader = this.generateOAuthHeader("GET", url.split("?")[0]);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        console.error("Failed to verify credentials:", await response.text());
        return null;
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error verifying credentials:", error);
      return null;
    }
  }
}

// Create client from environment variables
export function createTwitterClient(): TwitterClient | null {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    console.warn("Twitter API credentials not configured");
    return null;
  }

  return new TwitterClient({
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
  });
}

// Export for direct use
export { TwitterClient };
