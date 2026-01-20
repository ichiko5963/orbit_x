import { NextRequest, NextResponse } from "next/server";
import { batchCategorizePosts } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { posts } = await request.json();

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json(
        { error: "投稿データが必要です" },
        { status: 400 }
      );
    }

    // Prepare posts for categorization (id and text required)
    const postsForCategorization = posts.map((post: any, idx: number) => ({
      id: post.id || String(idx),
      text: post.text || "",
    }));

    // Call AI batch categorization
    const categoryResults = await batchCategorizePosts(postsForCategorization);

    return NextResponse.json({
      success: true,
      categories: categoryResults,
    });
  } catch (error) {
    console.error("Categorization error:", error);
    const message =
      error instanceof Error ? error.message : "カテゴリ分類中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
