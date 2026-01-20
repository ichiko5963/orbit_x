import { NextRequest, NextResponse } from "next/server";
import { fetchTweetData, parseTweetUrl, extractHandleFromUrl } from "@/lib/viral-posts";
import { analyzePostStructure, categorizePost } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URLを入力してください" },
        { status: 400 }
      );
    }

    // Validate URL
    const tweetId = parseTweetUrl(url);
    if (!tweetId) {
      return NextResponse.json(
        { error: "有効なX (Twitter) URLを入力してください" },
        { status: 400 }
      );
    }

    // For now, create a placeholder post
    // In production, this would fetch actual data from X API
    const handle = extractHandleFromUrl(url) || "@user";

    const post = {
      id: `viral_${Date.now()}`,
      text: "X API連携後に投稿内容が取得されます。現在は手動で投稿テキストを入力してください。",
      author: handle.replace("@", ""),
      authorHandle: handle,
      url: url,
      likes: 0,
      retweets: 0,
      replies: 0,
      impressions: 0,
      createdAt: new Date().toISOString().split("T")[0],
      category: "その他",
      saved: false,
    };

    return NextResponse.json({
      success: true,
      post,
      message: "投稿URLが登録されました。X API連携後に詳細データが取得されます。",
    });
  } catch (error) {
    console.error("Viral post error:", error);
    const message =
      error instanceof Error ? error.message : "投稿の取得中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Analyze a viral post's structure
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: "投稿テキストを入力してください" },
        { status: 400 }
      );
    }

    // Analyze structure and categorize
    const [structure, category] = await Promise.all([
      analyzePostStructure(text),
      categorizePost(text),
    ]);

    return NextResponse.json({
      success: true,
      structure,
      category,
    });
  } catch (error) {
    console.error("Analyze viral post error:", error);
    const message =
      error instanceof Error ? error.message : "分析中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
