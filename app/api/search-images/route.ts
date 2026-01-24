import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImageResult {
  url: string;
  title: string;
  source: string;
  type?: "logo" | "screenshot" | "illustration" | "photo";
}

// Extract 4-5 search keywords from content
async function extractSearchKeywords(content: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `投稿内容から画像検索用のキーワードを4〜5個抽出してください。

【抽出ルール】
1. ツール名、サービス名、プロダクト名を優先
2. 抽象的な語句より具体的な名詞を選ぶ
3. 各キーワードは1〜3単語以内
4. 公式ロゴが見つかりやすい形で（例: "ChatGPT logo", "Claude AI icon"）

【出力形式】
JSON: {"keywords": ["キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"]}

例:
投稿: "ChatGPTとClaudeを比較してみた。正直Claudeの方が使いやすい"
出力: {"keywords": ["ChatGPT logo", "Claude AI logo", "OpenAI icon", "Anthropic logo", "AI comparison"]}`,
      },
      {
        role: "user",
        content: content,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result.keywords || [];
  } catch {
    return [];
  }
}

// Search images using Serper API (Google Images)
async function searchSerperImages(query: string, num: number = 3): Promise<ImageResult[]> {
  const apiKey = process.env.SERPER_API_KEY;
  const baseUrl = process.env.SERPER_BASE_URL || "https://google.serper.dev";

  if (!apiKey) {
    console.log("[ImageSearch] Serper API key not configured");
    return [];
  }

  try {
    const response = await fetch(`${baseUrl}/images`, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: num,
      }),
    });

    if (!response.ok) {
      console.error(`[ImageSearch] Serper API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.images && Array.isArray(data.images)) {
      return data.images.slice(0, num).map((img: any) => ({
        url: img.imageUrl,
        title: img.title || query,
        source: img.source || "Google Images",
        type: "photo" as const,
      }));
    }
  } catch (error) {
    console.error("[ImageSearch] Serper search error:", error);
  }

  return [];
}

// Check if Serper API is configured
function isSerperConfigured(): boolean {
  return !!process.env.SERPER_API_KEY;
}

// Known brand logos from reliable sources (fallback)
const knownBrands: Record<string, { url: string; title: string }> = {
  // AI/LLM
  "chatgpt": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png", title: "ChatGPT" },
  "openai": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/512px-OpenAI_Logo.svg.png", title: "OpenAI" },
  "gpt-4": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png", title: "GPT-4" },
  "gpt": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/512px-ChatGPT_logo.svg.png", title: "GPT" },
  "claude": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Claude_AI_logo.svg/512px-Claude_AI_logo.svg.png", title: "Claude" },
  "anthropic": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Anthropic_logo.svg/512px-Anthropic_logo.svg.png", title: "Anthropic" },
  "gemini": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/512px-Google_Gemini_logo.svg.png", title: "Gemini" },
  "perplexity": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Perplexity_AI_logo.svg/512px-Perplexity_AI_logo.svg.png", title: "Perplexity" },
  "copilot": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/GitHub_Copilot_logo.svg/512px-GitHub_Copilot_logo.svg.png", title: "GitHub Copilot" },
  "cursor": { url: "https://www.cursor.com/brand/icon.svg", title: "Cursor" },
  "midjourney": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Midjourney_Emblem.png/512px-Midjourney_Emblem.png", title: "Midjourney" },

  // Tech Giants
  "google": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/512px-Google_2015_logo.svg.png", title: "Google" },
  "microsoft": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/512px-Microsoft_logo_%282012%29.svg.png", title: "Microsoft" },
  "apple": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/512px-Apple_logo_black.svg.png", title: "Apple" },
  "amazon": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/512px-Amazon_logo.svg.png", title: "Amazon" },
  "meta": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/512px-Meta_Platforms_Inc._logo.svg.png", title: "Meta" },

  // Dev Tools
  "github": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/512px-Octicons-mark-github.svg.png", title: "GitHub" },
  "vscode": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/512px-Visual_Studio_Code_1.35_icon.svg.png", title: "VS Code" },
  "vercel": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Vercel_logo_black.svg/512px-Vercel_logo_black.svg.png", title: "Vercel" },
  "docker": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Docker_%28container_engine%29_logo.svg/512px-Docker_%28container_engine%29_logo.svg.png", title: "Docker" },

  // Frameworks
  "react": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/512px-React-icon.svg.png", title: "React" },
  "nextjs": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nextjs-logo.svg/512px-Nextjs-logo.svg.png", title: "Next.js" },
  "next.js": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Nextjs-logo.svg/512px-Nextjs-logo.svg.png", title: "Next.js" },
  "vue": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Vue.js_Logo_2.svg/512px-Vue.js_Logo_2.svg.png", title: "Vue.js" },
  "typescript": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Typescript_logo_2020.svg/512px-Typescript_logo_2020.svg.png", title: "TypeScript" },
  "python": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/512px-Python-logo-notext.svg.png", title: "Python" },
  "node": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Node.js_logo.svg/512px-Node.js_logo.svg.png", title: "Node.js" },
  "tailwind": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Tailwind_CSS_Logo.svg/512px-Tailwind_CSS_Logo.svg.png", title: "Tailwind CSS" },

  // Databases
  "postgresql": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Postgresql_elephant.svg/512px-Postgresql_elephant.svg.png", title: "PostgreSQL" },
  "mongodb": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/MongoDB_Logo.svg/512px-MongoDB_Logo.svg.png", title: "MongoDB" },
  "supabase": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Supabase_Logo.svg/512px-Supabase_Logo.svg.png", title: "Supabase" },
  "firebase": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Firebase_Logo.svg/512px-Firebase_Logo.svg.png", title: "Firebase" },

  // Cloud
  "aws": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Amazon_Web_Services_Logo.svg/512px-Amazon_Web_Services_Logo.svg.png", title: "AWS" },
  "azure": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Microsoft_Azure.svg/512px-Microsoft_Azure.svg.png", title: "Azure" },
  "gcp": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/512px-Google_Cloud_logo.svg.png", title: "Google Cloud" },

  // Apps
  "notion": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Notion-logo.svg/512px-Notion-logo.svg.png", title: "Notion" },
  "figma": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Figma-logo.svg/512px-Figma-logo.svg.png", title: "Figma" },
  "slack": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Slack_icon_2019.svg/512px-Slack_icon_2019.svg.png", title: "Slack" },
  "discord": { url: "https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Discord_logo.svg/512px-Discord_logo.svg.png", title: "Discord" },
  "twitter": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_of_Twitter.svg/512px-Logo_of_Twitter.svg.png", title: "Twitter" },
  "x": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/X_logo_2023.svg/512px-X_logo_2023.svg.png", title: "X" },
  "youtube": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/YouTube_full-color_icon_%282017%29.svg/512px-YouTube_full-color_icon_%282017%29.svg.png", title: "YouTube" },
  "spotify": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Spotify_logo_without_text.svg/512px-Spotify_logo_without_text.svg.png", title: "Spotify" },
  "netflix": { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Netflix_2015_logo.svg/512px-Netflix_2015_logo.svg.png", title: "Netflix" },
};

// Find matching known brand logos from content (fallback only)
function findKnownBrandLogos(content: string, keywords: string[]): ImageResult[] {
  const results: ImageResult[] = [];
  const contentLower = content.toLowerCase();
  const keywordsLower = keywords.map(k => k.toLowerCase()).join(" ");
  const searchText = contentLower + " " + keywordsLower;
  const matchedBrands = new Set<string>();

  for (const [brand, data] of Object.entries(knownBrands)) {
    if (searchText.includes(brand) && !matchedBrands.has(brand)) {
      matchedBrands.add(brand);
      results.push({
        url: data.url,
        title: `${data.title} ロゴ`,
        source: "公式ロゴ",
        type: "logo",
      });
    }
  }

  return results;
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

    const serperConfigured = isSerperConfigured();
    console.log("[ImageSearch] Serper API configured:", serperConfigured);

    // Step 1: Extract 4-5 keywords from content
    console.log("[ImageSearch] Extracting keywords...");
    const keywords = await extractSearchKeywords(content);
    console.log("[ImageSearch] Keywords:", keywords);

    let allResults: ImageResult[] = [];

    if (serperConfigured && keywords.length > 0) {
      // Serper API is configured - do real Google image search
      console.log("[ImageSearch] Using Serper API for Google Images");

      // Search for each keyword (top 3 per keyword × 4-5 keywords = 12-15 images)
      const searchPromises = keywords.slice(0, 5).map(keyword =>
        searchSerperImages(keyword, 3)
      );

      const searchResults = await Promise.all(searchPromises);
      for (const results of searchResults) {
        allResults.push(...results);
      }

      console.log("[ImageSearch] Serper returned:", allResults.length, "images");
    }

    // If no results from Serper, use known brand logos as fallback
    if (allResults.length === 0) {
      console.log("[ImageSearch] Using fallback brand logos");
      allResults = findKnownBrandLogos(content, keywords);
    }

    // Remove duplicates by URL
    allResults = Array.from(
      new Map(allResults.map(item => [item.url, item])).values()
    );

    // Limit to 15 results
    const finalResults = allResults.slice(0, 15);
    console.log("[ImageSearch] Final results:", finalResults.length);

    return NextResponse.json({
      success: true,
      images: finalResults,
      keywords,
      serperSearchUsed: serperConfigured && finalResults.length > 0,
      message: !serperConfigured
        ? "Serper APIが設定されていないため、登録済みロゴのみを表示しています。"
        : undefined,
    });
  } catch (error) {
    console.error("[ImageSearch] Error:", error);
    const message =
      error instanceof Error ? error.message : "画像検索に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
