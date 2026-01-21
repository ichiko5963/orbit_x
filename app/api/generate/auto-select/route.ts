import { NextRequest, NextResponse } from "next/server";
import { autoSelectReferences } from "@/lib/openai";

interface ReferencePost {
  id: string;
  text: string;
  likes: number;
  tier: string;
  category: string;
  source: "myPosts" | "othersPosts";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, allPosts } = body as {
      content: string;
      allPosts: ReferencePost[];
    };

    if (!content) {
      return NextResponse.json(
        { error: "投稿内容を入力してください" },
        { status: 400 }
      );
    }

    if (!allPosts || allPosts.length === 0) {
      return NextResponse.json(
        { error: "参考投稿が見つかりません" },
        { status: 400 }
      );
    }

    const selectedPosts = await autoSelectReferences(content, allPosts);

    return NextResponse.json({
      success: true,
      posts: selectedPosts,
    });
  } catch (error) {
    console.error("Auto-select error:", error);
    const message =
      error instanceof Error ? error.message : "自動選択中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
