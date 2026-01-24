import { NextRequest, NextResponse } from "next/server";
import { enhancePost } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentText, originalContent, referenceText, userStyle, researchData } = body;

    if (!currentText || !originalContent) {
      return NextResponse.json(
        { error: "現在のテキストと元のコンテンツが必要です" },
        { status: 400 }
      );
    }

    const enhancedText = await enhancePost({
      currentText,
      originalContent,
      referenceText: referenceText || currentText,
      userStyle,
      researchData, // 5000字のリサーチ情報
    });

    return NextResponse.json({
      success: true,
      text: enhancedText,
    });
  } catch (error) {
    console.error("Enhance error:", error);
    const message =
      error instanceof Error ? error.message : "AI強化中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
