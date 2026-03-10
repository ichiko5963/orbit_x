import { NextRequest, NextResponse } from "next/server";
import { createTwitterClient } from "@/lib/twitter";

/**
 * GET /api/daily-x/test-post
 * Test X API posting capability - returns detailed diagnostics
 */
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {};

  // Check env vars
  results.envVars = {
    X_API_KEY: !!process.env.X_API_KEY,
    X_API_SECRET: !!process.env.X_API_SECRET,
    X_ACCESS_TOKEN: !!process.env.X_ACCESS_TOKEN,
    X_ACCESS_TOKEN_SECRET: !!process.env.X_ACCESS_TOKEN_SECRET,
    X_BEARER_TOKEN: !!process.env.X_BEARER_TOKEN,
    X_CLIENT_ID: !!process.env.X_CLIENT_ID,
    X_CLIENT_SECRET: !!process.env.X_CLIENT_SECRET,
  };

  // Test OAuth 1.0a - verify credentials
  const client = createTwitterClient();
  if (client) {
    try {
      const me = await client.verifyCredentials();
      results.oauth1_verify = { success: true, user: me };
    } catch (e) {
      results.oauth1_verify = {
        success: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    // Test actual tweet post (dry run - post then immediately delete not possible with v2)
    // Instead, just test the API connectivity by hitting the endpoint with invalid payload
    try {
      // Try posting a test tweet
      const testText = `API接続テスト ${Date.now()}`;
      const tweetResult = await client.postTweet(testText);
      results.oauth1_post = {
        success: true,
        tweetId: tweetResult.data?.id,
        message: "テスト投稿成功！（実際にXに投稿されました）",
      };
    } catch (e) {
      results.oauth1_post = {
        success: false,
        error: e instanceof Error ? e.message : String(e),
        hint: "アプリの権限が 'Read and Write' になっているか確認してください",
      };
    }
  } else {
    results.oauth1 = { error: "createTwitterClient returned null - env vars missing" };
  }

  return NextResponse.json(results);
}
