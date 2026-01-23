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

  // Post a tweet
  async postTweet(text: string): Promise<TweetResponse> {
    const url = "https://api.twitter.com/2/tweets";
    const authHeader = this.generateOAuthHeader("POST", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Twitter API error:", data);
      throw new Error(data.detail || data.title || "Failed to post tweet");
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
