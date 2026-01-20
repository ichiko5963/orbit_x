import { NextRequest, NextResponse } from "next/server";
import { generatePost, imitatePost } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, template, topic, category, tone, emojiSet, referenceText } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "トピックを入力してください" },
        { status: 400 }
      );
    }

    let generatedText: string;

    if (mode === "imitate" && referenceText) {
      // Imitate mode - copy structure from reference post
      generatedText = await imitatePost(referenceText, topic, tone);
    } else {
      // Generate mode - use template
      if (!template) {
        return NextResponse.json(
          { error: "テンプレートを選択してください" },
          { status: 400 }
        );
      }

      generatedText = await generatePost({
        template,
        topic,
        category,
        tone,
        emojiSet,
      });
    }

    return NextResponse.json({
      success: true,
      text: generatedText,
    });
  } catch (error) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error ? error.message : "生成中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
