import { NextRequest, NextResponse } from "next/server";
import { analyzePostStructure, categorizePost } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: "投稿テキストを入力してください" },
        { status: 400 }
      );
    }

    // Analyze structure and categorize in parallel
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
    console.error("Analyze error:", error);
    const message =
      error instanceof Error ? error.message : "分析中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
