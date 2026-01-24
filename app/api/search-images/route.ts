import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImageResult {
  url: string;
  title: string;
  source: string;
}

// Extract keywords and search queries from content using AI
async function extractSearchQueries(content: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `あなたは投稿内容を分析し、関連する画像を検索するためのキーワードを抽出する専門家です。

以下のルールに従ってキーワードを抽出してください：
1. 投稿で言及されているツール名、サービス名、プロダクト名を最優先で抽出
2. 公式ロゴや公式画像が存在しそうな固有名詞を特定
3. 投稿のメインテーマに関連する視覚的要素を特定

JSON形式で回答：
{
  "queries": [
    "検索クエリ1 公式ロゴ",
    "検索クエリ2 screenshot",
    "検索クエリ3 アイコン"
  ],
  "mainTopic": "メインのトピック名",
  "brands": ["ブランド/ツール名1", "ブランド/ツール名2"]
}

最大5つの検索クエリを生成してください。`,
      },
      {
        role: "user",
        content: `以下の投稿内容から画像検索用のキーワードを抽出してください：

${content}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result.queries || [];
  } catch {
    return [];
  }
}

// Search Google Images using Custom Search API
async function searchGoogleImages(query: string): Promise<ImageResult[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.log("[ImageSearch] Google Custom Search not configured, using fallback");
    return [];
  }

  try {
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", searchEngineId);
    url.searchParams.set("q", query);
    url.searchParams.set("searchType", "image");
    url.searchParams.set("num", "3");
    url.searchParams.set("safe", "active");
    url.searchParams.set("imgSize", "large");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.items) {
      return data.items.map((item: any) => ({
        url: item.link,
        title: item.title || query,
        source: item.displayLink || "Google Images",
      }));
    }
  } catch (error) {
    console.error("[ImageSearch] Google search error:", error);
  }

  return [];
}

// Fallback: Generate placeholder suggestions based on content
async function generateFallbackSuggestions(content: string, queries: string[]): Promise<ImageResult[]> {
  // Use known logo/image sources
  const results: ImageResult[] = [];

  // Common tech/AI tools and their logo sources
  const knownBrands: Record<string, string> = {
    "chatgpt": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png",
    "openai": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/512px-OpenAI_Logo.svg.png",
    "claude": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_AI_logo.svg/512px-Claude_AI_logo.svg.png",
    "anthropic": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/512px-Anthropic_logo.svg.png",
    "gemini": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png",
    "google": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/512px-Google_2015_logo.svg.png",
    "notion": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Notion-logo.svg/512px-Notion-logo.svg.png",
    "figma": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/512px-Figma-logo.svg.png",
    "github": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/512px-Octicons-mark-github.svg.png",
    "slack": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/512px-Slack_icon_2019.svg.png",
    "discord": "https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Discord_logo.svg/512px-Discord_logo.svg.png",
    "twitter": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png",
    "x": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/X_logo_2023.svg/512px-X_logo_2023.svg.png",
    "vercel": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Vercel_logo_black.svg/512px-Vercel_logo_black.svg.png",
    "nextjs": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nextjs-logo.svg/512px-Nextjs-logo.svg.png",
    "react": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png",
    "typescript": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Typescript_logo_2020.svg/512px-Typescript_logo_2020.svg.png",
    "python": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/512px-Python-logo-notext.svg.png",
    "aws": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/512px-Amazon_Web_Services_Logo.svg.png",
    "microsoft": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/512px-Microsoft_logo_%282012%29.svg.png",
    "copilot": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/GitHub_Copilot_logo.svg/512px-GitHub_Copilot_logo.svg.png",
    "cursor": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Cursor_AI_logo.svg/512px-Cursor_AI_logo.svg.png",
    "perplexity": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Perplexity_AI_logo.svg/512px-Perplexity_AI_logo.svg.png",
    "midjourney": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Midjourney_Emblem.png/512px-Midjourney_Emblem.png",
    "stable diffusion": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Stability_AI_Logo.svg/512px-Stability_AI_Logo.svg.png",
    "dall-e": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png",
  };

  // Check content and queries for known brands
  const contentLower = content.toLowerCase();

  for (const [brand, logoUrl] of Object.entries(knownBrands)) {
    if (contentLower.includes(brand) || queries.some(q => q.toLowerCase().includes(brand))) {
      results.push({
        url: logoUrl,
        title: `${brand.charAt(0).toUpperCase() + brand.slice(1)} ロゴ`,
        source: "Wikimedia Commons",
      });
    }
  }

  // Add some generic AI/tech related images if we don't have enough
  if (results.length < 4) {
    const genericImages = [
      {
        url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800",
        title: "AI テクノロジー",
        source: "Unsplash",
      },
      {
        url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800",
        title: "ロボット AI",
        source: "Unsplash",
      },
      {
        url: "https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800",
        title: "デジタル テクノロジー",
        source: "Unsplash",
      },
      {
        url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800",
        title: "コード プログラミング",
        source: "Unsplash",
      },
    ];

    for (const img of genericImages) {
      if (results.length >= 10) break;
      results.push(img);
    }
  }

  return results.slice(0, 10);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "投稿内容を入力してください" },
        { status: 400 }
      );
    }

    // Step 1: Extract search queries from content
    console.log("[ImageSearch] Extracting keywords from content...");
    const queries = await extractSearchQueries(content);
    console.log("[ImageSearch] Queries:", queries);

    // Step 2: Search for images
    let allResults: ImageResult[] = [];

    // Try Google Custom Search first
    for (const query of queries.slice(0, 3)) {
      const results = await searchGoogleImages(query);
      allResults = [...allResults, ...results];
    }

    // If no results from Google, use fallback
    if (allResults.length === 0) {
      console.log("[ImageSearch] Using fallback suggestions");
      allResults = await generateFallbackSuggestions(content, queries);
    }

    // Remove duplicates by URL
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.url, item])).values()
    ).slice(0, 10);

    return NextResponse.json({
      success: true,
      images: uniqueResults,
      queries,
    });
  } catch (error) {
    console.error("[ImageSearch] Error:", error);
    const message =
      error instanceof Error ? error.message : "画像検索に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
