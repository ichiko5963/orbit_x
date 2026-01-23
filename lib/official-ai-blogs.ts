import { ExternalArticle } from "./types";

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  content?: string;
  author?: string;
}

/**
 * Parse RSS/Atom feed XML
 */
function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  // Try to find items (RSS) or entries (Atom)
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;

  const matches = xml.match(itemRegex) || xml.match(entryRegex) || [];

  for (const match of matches) {
    const title = match.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = match.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() ||
                 match.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
    const pubDate = match.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() ||
                    match.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim() ||
                    match.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1]?.trim() || "";
    const description = match.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() ||
                        match.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i)?.[1]?.trim() || "";
    const content = match.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i)?.[1]?.trim() ||
                    match.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i)?.[1]?.trim() || "";
    const author = match.match(/<author[^>]*>(?:<name>)?([\s\S]*?)(?:<\/name>)?<\/author>/i)?.[1]?.trim() ||
                   match.match(/<dc:creator[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/i)?.[1]?.trim() || "";

    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, ""),
        link: link.replace(/<[^>]+>/g, ""),
        pubDate,
        description: (description || content).replace(/<[^>]+>/g, "").substring(0, 300),
        author: author.replace(/<[^>]+>/g, ""),
      });
    }
  }

  return items;
}

/**
 * Fetch OpenAI News/Blog
 * RSS: https://openai.com/news/rss.xml
 */
export async function fetchOpenAIArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    const response = await fetch("https://openai.com/news/rss.xml", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("OpenAI RSS fetch error:", response.status);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml).slice(0, limit);

    return items.map((item, index) => ({
      id: `openai_${index}_${Date.now()}`,
      title: item.title,
      description: item.description || "",
      url: item.link,
      source: "openai" as const,
      author: "OpenAI",
      likes: 0,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      tags: ["ChatGPT", "OpenAI", "AI"],
      imageUrl: null,
      saved: false,
    }));
  } catch (error) {
    console.error("OpenAI fetch error:", error);
    return [];
  }
}

/**
 * Fetch Anthropic News
 * Scrape from: https://www.anthropic.com/news
 */
export async function fetchAnthropicArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    const response = await fetch("https://www.anthropic.com/news", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("Anthropic fetch error:", response.status);
      return [];
    }

    const html = await response.text();
    const articles: ExternalArticle[] = [];

    // Extract article cards from the page
    const articleRegex = /<a[^>]*href="(\/news\/[^"]+)"[^>]*>[\s\S]*?<h\d[^>]*>([^<]+)<\/h\d>/gi;
    let match;
    let index = 0;

    while ((match = articleRegex.exec(html)) !== null && index < limit) {
      const url = `https://www.anthropic.com${match[1]}`;
      const title = match[2].trim();

      if (title && !articles.find(a => a.url === url)) {
        articles.push({
          id: `anthropic_${index}_${Date.now()}`,
          title,
          description: "",
          url,
          source: "anthropic" as const,
          author: "Anthropic",
          likes: 0,
          publishedAt: new Date().toISOString().split("T")[0],
          tags: ["Claude", "Anthropic", "AI"],
          imageUrl: null,
          saved: false,
        });
        index++;
      }
    }

    return articles;
  } catch (error) {
    console.error("Anthropic fetch error:", error);
    return [];
  }
}

/**
 * Fetch Google AI Blog (Gemini focused)
 * URL: https://blog.google/technology/ai/
 */
export async function fetchGoogleAIArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    // Google AI blog RSS feed
    const response = await fetch("https://blog.google/technology/ai/rss/", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("Google AI RSS fetch error:", response.status);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml).slice(0, limit);

    return items.map((item, index) => ({
      id: `google-ai_${index}_${Date.now()}`,
      title: item.title,
      description: item.description || "",
      url: item.link,
      source: "google-ai" as const,
      author: "Google AI",
      likes: 0,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      tags: ["Gemini", "Google AI", "AI"],
      imageUrl: null,
      saved: false,
    }));
  } catch (error) {
    console.error("Google AI fetch error:", error);
    return [];
  }
}

/**
 * Fetch Cursor Blog/Changelog
 * URL: https://cursor.com/blog
 */
export async function fetchCursorArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    const response = await fetch("https://cursor.com/blog", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("Cursor fetch error:", response.status);
      return [];
    }

    const html = await response.text();
    const articles: ExternalArticle[] = [];

    // Extract blog posts from Cursor's blog page
    const articleRegex = /<a[^>]*href="(\/blog\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/gi;
    let match;
    let index = 0;

    while ((match = articleRegex.exec(html)) !== null && index < limit) {
      const url = `https://cursor.com${match[1]}`;
      const title = match[2].trim();

      if (title && !articles.find(a => a.url === url)) {
        articles.push({
          id: `cursor_${index}_${Date.now()}`,
          title,
          description: "",
          url,
          source: "cursor" as const,
          author: "Cursor",
          likes: 0,
          publishedAt: new Date().toISOString().split("T")[0],
          tags: ["Cursor", "AI Editor", "Code"],
          imageUrl: null,
          saved: false,
        });
        index++;
      }
    }

    return articles;
  } catch (error) {
    console.error("Cursor fetch error:", error);
    return [];
  }
}

/**
 * Fetch Vercel Blog (AI focused)
 * RSS: https://vercel.com/atom
 */
export async function fetchVercelArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    const response = await fetch("https://vercel.com/atom", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("Vercel Atom fetch error:", response.status);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml);

    // Filter for AI-related articles
    const aiKeywords = ["ai", "v0", "sdk", "model", "llm", "agent", "chatgpt", "openai", "anthropic"];
    const aiItems = items.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return aiKeywords.some(kw => text.includes(kw));
    }).slice(0, limit);

    return aiItems.map((item, index) => ({
      id: `vercel_${index}_${Date.now()}`,
      title: item.title,
      description: item.description || "",
      url: item.link,
      source: "vercel" as const,
      author: "Vercel",
      likes: 0,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      tags: ["Vercel", "AI SDK", "v0"],
      imageUrl: null,
      saved: false,
    }));
  } catch (error) {
    console.error("Vercel fetch error:", error);
    return [];
  }
}

/**
 * Fetch all official AI blog articles
 */
export async function fetchAllOfficialAIBlogs(): Promise<ExternalArticle[]> {
  const [openai, anthropic, googleAI, cursor, vercel] = await Promise.all([
    fetchOpenAIArticles(5),
    fetchAnthropicArticles(5),
    fetchGoogleAIArticles(5),
    fetchCursorArticles(5),
    fetchVercelArticles(5),
  ]);

  const all = [...openai, ...anthropic, ...googleAI, ...cursor, ...vercel];
  // Sort by date descending
  all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return all;
}
