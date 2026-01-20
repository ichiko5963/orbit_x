import { NextRequest, NextResponse } from "next/server";
import { generatePost, imitatePost, generateWithReference } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, template, templateId, topic, content, category, tone, emojiSet, referenceText } = body;

    // New mode: reference - uses template + reference post
    if (mode === "reference" && referenceText && templateId) {
      if (!content) {
        return NextResponse.json(
          { error: "コンテンツを入力してください" },
          { status: 400 }
        );
      }

      const generatedText = await generateWithReference({
        content,
        templateId,
        referenceText,
        category,
        tone,
      });

      return NextResponse.json({
        success: true,
        text: generatedText,
      });
    }

    // Backward compatible: use topic or content
    const inputContent = topic || content;
    if (!inputContent) {
      return NextResponse.json(
        { error: "トピックまたはコンテンツを入力してください" },
        { status: 400 }
      );
    }

    let generatedText: string;

    if (mode === "imitate" && referenceText) {
      // Imitate mode - copy structure from reference post
      generatedText = await imitatePost(referenceText, inputContent, tone);
    } else {
      // Generate mode - use template
      if (!template && !templateId) {
        return NextResponse.json(
          { error: "テンプレートを選択してください" },
          { status: 400 }
        );
      }

      // Support templateId-based generation
      const templateMapping: Record<string, string> = {
        insight: "〇〇で最も大切なのは「△△」じゃない。\n\n本当に大切なのは「□□」。\n\nなぜなら...",
        news: "【速報】〇〇が△△に対応\n\n□□の組み合わせが最強。\n\n詳しくはスレッドで↓",
        list: "エンジニア3年目で気づいたこと\n\n・〇〇より△△\n・□□より■■\n・▲▲より●●",
        thread: "〇〇について解説します\n\n多くの人が誤解している△△。\n\n実は...\n\n↓",
        "problem-solving": "「〇〇がうまくいかない」\n\nこの悩み、よく聞きます。\n\n解決策は△△。\n\n具体的には...",
      };

      const templateText = template || templateMapping[templateId] || templateMapping.insight;

      generatedText = await generatePost({
        template: templateText,
        topic: inputContent,
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
