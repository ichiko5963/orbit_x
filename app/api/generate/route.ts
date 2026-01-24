import { NextRequest, NextResponse } from "next/server";
import { generatePost, imitatePost, generateWithReference } from "@/lib/openai";

/**
 * Fetch content from URLs using internal scrape API
 */
async function fetchUrlContents(urls: string[], baseUrl: string): Promise<string> {
  if (!urls || urls.length === 0) return "";

  const contents: string[] = [];

  for (const url of urls.slice(0, 3)) { // Limit to 3 URLs
    try {
      const response = await fetch(`${baseUrl}/api/scrape-article`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.article) {
          contents.push(`【${data.article.title}】\n${data.article.content.slice(0, 2000)}`);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch URL content: ${url}`, error);
    }
  }

  return contents.length > 0 ? `\n\n━━━━━━━━━━━━━━━━━━━━\n■ 参考URL内容\n━━━━━━━━━━━━━━━━━━━━\n${contents.join("\n\n")}` : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode, template, templateId, topic, content, category, tone, emojiSet, referenceText, userStyle, referenceUrls } = body;

    // Get base URL for internal API calls
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    // Reference mode - uses reference post structure + user's content + optional user style
    if (mode === "reference" && referenceText) {
      if (!content) {
        return NextResponse.json(
          { error: "コンテンツを入力してください" },
          { status: 400 }
        );
      }

      // Fetch URL contents if provided
      const urlContent = await fetchUrlContents(referenceUrls, baseUrl);

      // Combine user content with URL content
      const enrichedContent = urlContent ? `${content}${urlContent}` : content;

      const generatedText = await generateWithReference({
        content: enrichedContent,
        templateId: templateId || "reference", // Default if not provided
        referenceText,
        category,
        tone,
        userStyle, // Pass user's learned style
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
        insight: `〇〇で最も大切なのは「△△」じゃない。

本当に大切なのは「□□」。

なぜなら...

・理由1
・理由2
・理由3`,
        news: `【速報】〇〇が△△に対応

ポイントをまとめると:

・ポイント1
・ポイント2
・ポイント3

詳しくは元記事で`,
        list: `〇〇で気づいたこと

・△△より□□
・■■より▲▲
・●●より◆◆

これ知ってるだけで全然違う`,
        thread: `〇〇について解説します

多くの人が誤解している△△。

実は...

・ポイント1
・ポイント2

↓`,
        "problem-solving": `「〇〇がうまくいかない」

この悩み、よく聞きます。

解決策は△△。

具体的には:
・方法1
・方法2
・方法3`,
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
