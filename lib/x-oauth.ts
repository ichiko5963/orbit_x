/**
 * X (Twitter) OAuth 2.0 PKCE Utilities
 *
 * This module handles the OAuth 2.0 with PKCE flow for X API authentication.
 * Required for accessing user's bookmarks and other user-specific data.
 */

// X API OAuth 2.0 endpoints
const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";

// Required scopes for bookmarks and posting
const REQUIRED_SCOPES = [
  "bookmark.read",
  "bookmark.write",
  "tweet.read",
  "tweet.write",  // Required for posting with quote_tweet_id
  "users.read",
  "offline.access",
];

/**
 * Generate a cryptographically random string for code verifier
 */
export function generateCodeVerifier(length: number = 64): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join("");
}

/**
 * Generate code challenge from code verifier using SHA-256
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);

  // Convert to base64url encoding
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate a random state string for CSRF protection
 */
export function generateState(length: number = 32): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues)
    .map((v) => charset[v % charset.length])
    .join("");
}

/**
 * Build the authorization URL for X OAuth 2.0
 */
export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes?: string[];
}): string {
  const { clientId, redirectUri, state, codeChallenge, scopes = REQUIRED_SCOPES } = params;

  const url = new URL(X_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}> {
  const { code, codeVerifier, clientId, clientSecret, redirectUri } = params;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    client_id: clientId,
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Add Basic auth if client secret is provided
  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(params: {
  refreshToken: string;
  clientId: string;
  clientSecret?: string;
}): Promise<{
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope: string;
}> {
  const { refreshToken, clientId, clientSecret } = params;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
  }

  return response.json();
}

/**
 * Revoke an access token
 */
export async function revokeToken(params: {
  token: string;
  clientId: string;
  clientSecret?: string;
}): Promise<boolean> {
  const { token, clientId, clientSecret } = params;

  const body = new URLSearchParams({
    token,
    client_id: clientId,
  });

  const headers: HeadersInit = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (clientSecret) {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${credentials}`;
  }

  const response = await fetch("https://api.twitter.com/2/oauth2/revoke", {
    method: "POST",
    headers,
    body: body.toString(),
  });

  return response.ok;
}

/**
 * X Auth Token stored in Firestore
 */
export interface XAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope: string;
  userId: string;
}

/**
 * Check if token is expired (with 5 minute buffer)
 */
export function isTokenExpired(expiresAt: Date): boolean {
  const bufferMs = 5 * 60 * 1000; // 5 minutes
  return new Date().getTime() > expiresAt.getTime() - bufferMs;
}
