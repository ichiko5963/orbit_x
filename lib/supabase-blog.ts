import { ExternalArticle } from "./types";

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

/**
 * Parse RSS/Atom feed XML
 */
function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

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

    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, ""),
        link: link.replace(/<[^>]+>/g, ""),
        pubDate,
        description: description.replace(/<[^>]+>/g, "").substring(0, 300),
      });
    }
  }

  return items;
}

/**
 * Fetch Supabase Blog articles
 * RSS: https://supabase.com/blog/rss.xml
 */
export async function fetchSupabaseArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    // Try RSS feed first
    const response = await fetch("https://supabase.com/blog/rss.xml", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (response.ok) {
      const xml = await response.text();
      const items = parseRSSFeed(xml).slice(0, limit);

      return items.map((item, index) => ({
        id: `supabase_${index}_${Date.now()}`,
        title: item.title,
        description: item.description || "",
        url: item.link,
        source: "supabase" as const,
        author: "Supabase",
        likes: 0,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        tags: ["Supabase", "Database", "Backend"],
        imageUrl: null,
        saved: false,
      }));
    }

    // Fallback: scrape the blog page
    const htmlResponse = await fetch("https://supabase.com/blog", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!htmlResponse.ok) {
      console.error("Supabase blog fetch error:", htmlResponse.status);
      return [];
    }

    const html = await htmlResponse.text();
    const articles: ExternalArticle[] = [];

    // Extract blog posts from the page
    const articleRegex = /<a[^>]*href="(\/blog\/[^"]+)"[^>]*>[\s\S]*?<h[234][^>]*>([^<]+)<\/h[234]>/gi;
    let match;
    let index = 0;

    while ((match = articleRegex.exec(html)) !== null && index < limit) {
      const url = `https://supabase.com${match[1]}`;
      const title = match[2].trim();

      if (title && !articles.find(a => a.url === url)) {
        articles.push({
          id: `supabase_${index}_${Date.now()}`,
          title,
          description: "",
          url,
          source: "supabase" as const,
          author: "Supabase",
          likes: 0,
          publishedAt: new Date().toISOString().split("T")[0],
          tags: ["Supabase", "Database", "Backend"],
          imageUrl: null,
          saved: false,
        });
        index++;
      }
    }

    return articles;
  } catch (error) {
    console.error("Supabase fetch error:", error);
    return [];
  }
}
