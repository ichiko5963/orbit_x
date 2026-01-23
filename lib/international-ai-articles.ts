import { ExternalArticle } from "./types";

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  author?: string;
  categories?: string[];
}

/**
 * Parse RSS feed XML
 */
function parseRSSFeed(xml: string): RSSItem[] {
  const items: RSSItem[] = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const matches = xml.match(itemRegex) || [];

  for (const match of matches) {
    const title = match.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim() || "";
    const link = match.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1]?.trim() ||
                 match.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i)?.[1]?.trim() || "";
    const pubDate = match.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || "";
    const description = match.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim() || "";
    const author = match.match(/<dc:creator[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/i)?.[1]?.trim() ||
                   match.match(/<author[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/author>/i)?.[1]?.trim() || "";

    // Extract categories
    const categoryMatches = match.matchAll(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi);
    const categories = Array.from(categoryMatches).map(m => m[1].trim()).filter(Boolean);

    if (title && link) {
      items.push({
        title: title.replace(/<[^>]+>/g, "").trim(),
        link: link.replace(/<[^>]+>/g, "").trim(),
        pubDate,
        description: description.replace(/<[^>]+>/g, "").substring(0, 300).trim(),
        author: author.replace(/<[^>]+>/g, "").trim(),
        categories,
      });
    }
  }

  return items;
}

/**
 * Fetch Medium AI articles
 * RSS: https://medium.com/feed/tag/artificial-intelligence
 */
export async function fetchMediumArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    // Medium AI tag feed
    const response = await fetch("https://medium.com/feed/tag/artificial-intelligence", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("Medium RSS fetch error:", response.status);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml).slice(0, limit);

    return items.map((item, index) => ({
      id: `medium_${index}_${Date.now()}`,
      title: item.title,
      description: item.description || "",
      url: item.link,
      source: "medium" as const,
      author: item.author || "Medium",
      likes: 0,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      tags: item.categories?.slice(0, 5) || ["AI", "Machine Learning"],
      imageUrl: null,
      saved: false,
    }));
  } catch (error) {
    console.error("Medium fetch error:", error);
    return [];
  }
}

/**
 * Fetch DEV.to AI articles
 * RSS: https://dev.to/feed/tag/ai
 */
export async function fetchDevToArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    // DEV.to AI tag feed
    const response = await fetch("https://dev.to/feed/tag/ai", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("DEV.to RSS fetch error:", response.status);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml).slice(0, limit);

    return items.map((item, index) => ({
      id: `devto_${index}_${Date.now()}`,
      title: item.title,
      description: item.description || "",
      url: item.link,
      source: "devto" as const,
      author: item.author || "DEV.to",
      likes: 0,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      tags: item.categories?.slice(0, 5) || ["AI", "Development"],
      imageUrl: null,
      saved: false,
    }));
  } catch (error) {
    console.error("DEV.to fetch error:", error);
    return [];
  }
}

/**
 * Fetch Hashnode AI articles
 * GraphQL API or RSS
 */
export async function fetchHashnodeArticles(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    // Use Hashnode's GraphQL API for AI tag
    const query = `
      query {
        feed(first: ${limit}, filter: { tags: ["ai", "artificial-intelligence", "machine-learning"] }) {
          edges {
            node {
              id
              title
              brief
              url
              publishedAt
              author {
                username
                name
              }
              tags {
                name
              }
            }
          }
        }
      }
    `;

    const response = await fetch("https://gql.hashnode.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error("Hashnode GraphQL fetch error:", response.status);
      // Fallback to RSS
      return fetchHashnodeRSS(limit);
    }

    const data = await response.json();

    if (data.errors || !data.data?.feed?.edges) {
      console.error("Hashnode GraphQL error:", data.errors);
      return fetchHashnodeRSS(limit);
    }

    return data.data.feed.edges.map((edge: any, index: number) => {
      const node = edge.node;
      return {
        id: `hashnode_${node.id || index}_${Date.now()}`,
        title: node.title || "",
        description: node.brief || "",
        url: node.url || "",
        source: "hashnode" as const,
        author: node.author?.name || node.author?.username || "Hashnode",
        likes: 0,
        publishedAt: node.publishedAt ? new Date(node.publishedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        tags: node.tags?.map((t: any) => t.name).slice(0, 5) || ["AI"],
        imageUrl: null,
        saved: false,
      };
    });
  } catch (error) {
    console.error("Hashnode fetch error:", error);
    return fetchHashnodeRSS(limit);
  }
}

/**
 * Fallback: Fetch Hashnode articles via RSS
 */
async function fetchHashnodeRSS(limit: number = 10): Promise<ExternalArticle[]> {
  try {
    // Hashnode's AI tag RSS
    const response = await fetch("https://hashnode.com/n/artificial-intelligence/rss", {
      next: { revalidate: 3600 },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
      },
    });

    if (!response.ok) {
      console.error("Hashnode RSS fetch error:", response.status);
      return [];
    }

    const xml = await response.text();
    const items = parseRSSFeed(xml).slice(0, limit);

    return items.map((item, index) => ({
      id: `hashnode_rss_${index}_${Date.now()}`,
      title: item.title,
      description: item.description || "",
      url: item.link,
      source: "hashnode" as const,
      author: item.author || "Hashnode",
      likes: 0,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      tags: item.categories?.slice(0, 5) || ["AI"],
      imageUrl: null,
      saved: false,
    }));
  } catch (error) {
    console.error("Hashnode RSS fallback error:", error);
    return [];
  }
}

/**
 * Fetch all international AI article sites
 */
export async function fetchAllInternationalArticles(): Promise<ExternalArticle[]> {
  const [medium, devto, hashnode] = await Promise.all([
    fetchMediumArticles(10),
    fetchDevToArticles(10),
    fetchHashnodeArticles(10),
  ]);

  const all = [...medium, ...devto, ...hashnode];
  // Sort by date descending
  all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return all;
}
