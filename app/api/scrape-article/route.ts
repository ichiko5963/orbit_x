import { NextRequest, NextResponse } from "next/server";

interface ScrapeResult {
  title: string;
  content: string;
  author: string;
  publishedAt: string;
  tags: string[];
  source: string;
}

/**
 * Scrape article content from Qiita, Zenn, or other supported sources
 * This API fetches the full article text for AI post generation
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const result = await scrapeArticle(url);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to scrape article" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      article: result,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function scrapeArticle(url: string): Promise<ScrapeResult | null> {
  try {
    // Determine source from URL
    if (url.includes("qiita.com")) {
      return scrapeQiita(url);
    } else if (url.includes("zenn.dev")) {
      return scrapeZenn(url);
    } else if (url.includes("github.com")) {
      return scrapeGitHub(url);
    } else if (url.includes("openai.com")) {
      return scrapeOpenAI(url);
    } else if (url.includes("anthropic.com")) {
      return scrapeAnthropic(url);
    } else if (url.includes("blog.google")) {
      return scrapeGoogleAI(url);
    } else if (url.includes("cursor.com")) {
      return scrapeCursor(url);
    } else if (url.includes("vercel.com")) {
      return scrapeVercel(url);
    } else if (url.includes("medium.com") || url.includes("towardsdatascience.com")) {
      return scrapeMedium(url);
    } else if (url.includes("dev.to")) {
      return scrapeDevTo(url);
    } else if (url.includes("hashnode.com") || url.includes("hashnode.dev")) {
      return scrapeHashnode(url);
    } else if (url.includes("supabase.com")) {
      return scrapeSupabase(url);
    } else {
      // Generic scraping for other sources
      return scrapeGeneric(url);
    }
  } catch (error) {
    console.error("Scrape error:", error);
    return null;
  }
}

async function scrapeQiita(url: string): Promise<ScrapeResult | null> {
  try {
    // Extract article ID from URL
    // URL format: https://qiita.com/username/items/article_id
    const match = url.match(/qiita\.com\/[^/]+\/items\/([a-z0-9]+)/i);
    if (!match) return null;

    const articleId = match[1];
    const apiUrl = `https://qiita.com/api/v2/items/${articleId}`;

    const response = await fetch(apiUrl, {
      headers: {
        "Content-Type": "application/json",
        ...(process.env.QIITA_ACCESS_TOKEN && {
          Authorization: `Bearer ${process.env.QIITA_ACCESS_TOKEN}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Qiita API error: ${response.status}`);
    }

    const data = await response.json();

    // Clean markdown content
    const content = cleanMarkdown(data.body);

    return {
      title: data.title,
      content: content,
      author: data.user.name || data.user.id,
      publishedAt: data.created_at.split("T")[0],
      tags: data.tags.map((t: { name: string }) => t.name),
      source: "qiita",
    };
  } catch (error) {
    console.error("Qiita scrape error:", error);
    return null;
  }
}

async function scrapeZenn(url: string): Promise<ScrapeResult | null> {
  try {
    // Extract slug from URL
    // URL format: https://zenn.dev/username/articles/slug
    const match = url.match(/zenn\.dev\/([^/]+)\/articles\/([^/]+)/);
    if (!match) return null;

    const username = match[1];
    const slug = match[2];

    // Zenn doesn't have a public API for article content
    // We'll fetch the HTML page and extract content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Zenn fetch error: ${response.status}`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<h1[^>]*class="[^"]*article[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : extractMetaContent(html, "og:title") || slug;

    // Extract description/content from meta
    const description = extractMetaContent(html, "og:description") || "";

    // Try to extract article body from the page
    // Zenn uses article content in a specific div
    const contentMatch = html.match(/<div[^>]*class="[^"]*znc[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let content = "";
    if (contentMatch) {
      // Strip HTML tags
      content = contentMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000), // More content for better AI generation
      author: username,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: [],
      source: "zenn",
    };
  } catch (error) {
    console.error("Zenn scrape error:", error);
    return null;
  }
}

async function scrapeGitHub(url: string): Promise<ScrapeResult | null> {
  try {
    // Extract owner/repo from URL
    // URL format: https://github.com/owner/repo
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, "");

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Also fetch README for more content
    let readmeContent = "";
    try {
      const readmeResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        {
          headers: {
            Accept: "application/vnd.github.v3.raw",
            ...(process.env.GITHUB_TOKEN && {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            }),
          },
        }
      );
      if (readmeResponse.ok) {
        readmeContent = await readmeResponse.text();
        readmeContent = cleanMarkdown(readmeContent);
      }
    } catch {
      // README not available
    }

    const content = `${data.description || ""}\n\n${readmeContent}`.slice(0, 8000);

    return {
      title: data.full_name,
      content: content,
      author: data.owner.login,
      publishedAt: data.created_at.split("T")[0],
      tags: data.topics || [],
      source: "github",
    };
  } catch (error) {
    console.error("GitHub scrape error:", error);
    return null;
  }
}

async function scrapeGeneric(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch error: ${response.status}`);
    }

    const html = await response.text();

    // Extract title from og:title or <title>
    const title =
      extractMetaContent(html, "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      "Untitled";

    // Extract description from og:description or meta description
    const description =
      extractMetaContent(html, "og:description") ||
      extractMetaContent(html, "description") ||
      "";

    // Try to extract main content
    // This is a simplified approach - real scraping would need more sophisticated parsing
    const bodyMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let content = "";
    if (bodyMatch) {
      content = bodyMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: new URL(url).hostname,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: [],
      source: new URL(url).hostname,
    };
  } catch (error) {
    console.error("Generic scrape error:", error);
    return null;
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // Try og: property
  const ogMatch = html.match(
    new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, "i")
  );
  if (ogMatch) return ogMatch[1];

  // Try name attribute
  const nameMatch = html.match(
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i")
  );
  if (nameMatch) return nameMatch[1];

  // Try reversed order (content before property/name)
  const reversedMatch = html.match(
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:)?${property}["']`, "i")
  );
  if (reversedMatch) return reversedMatch[1];

  return null;
}

function cleanMarkdown(text: string): string {
  return text
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`[^`]+`/g, "")
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers markup
    .replace(/^#+\s*/gm, "")
    // Remove bold/italic
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, "")
    // Remove blockquotes
    .replace(/^>\s*/gm, "")
    // Remove list markers
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
}

/**
 * Scrape OpenAI news/blog articles
 */
async function scrapeOpenAI(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`OpenAI fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "OpenAI Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract article content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let content = "";
    if (articleMatch) {
      content = articleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: "OpenAI",
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["ChatGPT", "OpenAI", "AI"],
      source: "openai",
    };
  } catch (error) {
    console.error("OpenAI scrape error:", error);
    return null;
  }
}

/**
 * Scrape Anthropic news articles
 */
async function scrapeAnthropic(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`Anthropic fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "Anthropic Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract main content
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let content = "";
    if (mainMatch) {
      content = mainMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: "Anthropic",
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["Claude", "Anthropic", "AI"],
      source: "anthropic",
    };
  } catch (error) {
    console.error("Anthropic scrape error:", error);
    return null;
  }
}

/**
 * Scrape Google AI Blog articles
 */
async function scrapeGoogleAI(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`Google AI fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "Google AI Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract article content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let content = "";
    if (articleMatch) {
      content = articleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: "Google AI",
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["Gemini", "Google AI", "AI"],
      source: "google-ai",
    };
  } catch (error) {
    console.error("Google AI scrape error:", error);
    return null;
  }
}

/**
 * Scrape Cursor blog articles
 */
async function scrapeCursor(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`Cursor fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "Cursor Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract article content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                         html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    let content = "";
    if (articleMatch) {
      content = articleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: "Cursor",
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["Cursor", "AI Editor", "Code"],
      source: "cursor",
    };
  } catch (error) {
    console.error("Cursor scrape error:", error);
    return null;
  }
}

/**
 * Scrape Vercel blog articles
 */
async function scrapeVercel(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`Vercel fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "Vercel Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract article content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let content = "";
    if (articleMatch) {
      content = articleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: "Vercel",
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["Vercel", "AI SDK", "v0"],
      source: "vercel",
    };
  } catch (error) {
    console.error("Vercel scrape error:", error);
    return null;
  }
}

/**
 * Scrape Medium articles
 */
async function scrapeMedium(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`Medium fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "Medium Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract author
    const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i);
    const author = authorMatch ? authorMatch[1] : "Medium";

    // Extract article content
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let content = "";
    if (articleMatch) {
      content = articleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: author,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["AI", "Machine Learning"],
      source: "medium",
    };
  } catch (error) {
    console.error("Medium scrape error:", error);
    return null;
  }
}

/**
 * Scrape DEV.to articles
 */
async function scrapeDevTo(url: string): Promise<ScrapeResult | null> {
  try {
    // DEV.to has an API we can use
    // URL format: https://dev.to/username/article-slug-1234
    const match = url.match(/dev\.to\/([^/]+)\/([^/]+)/);
    if (!match) {
      return scrapeGeneric(url);
    }

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`DEV.to fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "DEV.to Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract author from URL
    const author = match[1];

    // Extract article content
    const articleMatch = html.match(/<div[^>]*class="[^"]*crayons-article__body[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let content = "";
    if (articleMatch) {
      content = articleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    // Extract tags
    const tagsMatch = html.matchAll(/<a[^>]*class="[^"]*crayons-tag[^"]*"[^>]*>([^<]+)<\/a>/gi);
    const tags = Array.from(tagsMatch).map(m => m[1].replace("#", "").trim()).slice(0, 5);

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: author,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: tags.length > 0 ? tags : ["AI", "Development"],
      source: "devto",
    };
  } catch (error) {
    console.error("DEV.to scrape error:", error);
    return null;
  }
}

/**
 * Scrape Hashnode articles
 */
async function scrapeHashnode(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`Hashnode fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "Hashnode Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract author
    const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i);
    const author = authorMatch ? authorMatch[1] : "Hashnode";

    // Extract article content - Hashnode uses a specific structure
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                         html.match(/<div[^>]*id="post-content"[^>]*>([\s\S]*?)<\/div>/i);
    let content = "";
    if (articleMatch) {
      content = articleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    } else {
      content = description;
    }

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000),
      author: author,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["AI"],
      source: "hashnode",
    };
  } catch (error) {
    console.error("Hashnode scrape error:", error);
    return null;
  }
}

/**
 * Scrape Supabase blog articles
 */
async function scrapeSupabase(url: string): Promise<ScrapeResult | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)" },
    });

    if (!response.ok) {
      throw new Error(`Supabase fetch error: ${response.status}`);
    }

    const html = await response.text();

    const title = extractMetaContent(html, "title") ||
                  html.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] ||
                  "Supabase Article";

    const description = extractMetaContent(html, "description") || "";

    // Extract author from meta or structured data
    const authorMatch = html.match(/<meta[^>]*name="author"[^>]*content="([^"]+)"/i) ||
                        html.match(/"author"[^}]*"name"\s*:\s*"([^"]+)"/i);
    const author = authorMatch ? authorMatch[1] : "Supabase";

    // Extract article content - Supabase blog uses article or main tags
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                         html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    let content = "";
    if (articleMatch) {
      // Clean up the content
      content = articleMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<nav[\s\S]*?<\/nav>/gi, "")
        .replace(/<header[\s\S]*?<\/header>/gi, "")
        .replace(/<footer[\s\S]*?<\/footer>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } else {
      content = description;
    }

    // Extract published date if available
    const dateMatch = html.match(/<time[^>]*datetime="([^"]+)"/i) ||
                      html.match(/"datePublished"\s*:\s*"([^"]+)"/i);
    const publishedAt = dateMatch
      ? new Date(dateMatch[1]).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return {
      title: decodeHtmlEntities(title),
      content: content.slice(0, 8000), // More content for Supabase
      author: author,
      publishedAt: publishedAt,
      tags: ["Supabase", "Database", "Backend", "PostgreSQL"],
      source: "supabase",
    };
  } catch (error) {
    console.error("Supabase scrape error:", error);
    return null;
  }
}
