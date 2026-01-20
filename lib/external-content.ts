import { ExternalArticle } from "./types";

const QIITA_API_BASE = "https://qiita.com/api/v2";
const ZENN_API_BASE = "https://zenn.dev/api";

interface QiitaArticle {
  id: string;
  title: string;
  body: string;
  url: string;
  user: {
    id: string;
    name: string;
  };
  likes_count: number;
  created_at: string;
  tags: { name: string }[];
}

interface ZennArticle {
  id: number;
  title: string;
  slug: string;
  path: string;
  emoji: string;
  user: {
    username: string;
    name: string;
  };
  liked_count: number;
  published_at: string;
  topics?: { name: string }[];
}

/**
 * Fetch trending articles from Qiita
 */
export async function fetchQiitaArticles(
  page: number = 1,
  perPage: number = 10
): Promise<ExternalArticle[]> {
  try {
    // Fetch items sorted by likes count
    const response = await fetch(
      `${QIITA_API_BASE}/items?page=${page}&per_page=${perPage}&query=stocks:>10`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(process.env.QIITA_ACCESS_TOKEN && {
            Authorization: `Bearer ${process.env.QIITA_ACCESS_TOKEN}`,
          }),
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`Qiita API error: ${response.status}`);
    }

    const articles: QiitaArticle[] = await response.json();

    return articles.map((article) => ({
      id: `qiita_${article.id}`,
      title: article.title,
      description: article.body.substring(0, 200).replace(/[#*`\n]/g, " ").trim() + "...",
      url: article.url,
      source: "qiita" as const,
      author: article.user.name || article.user.id,
      likes: article.likes_count,
      publishedAt: article.created_at.split("T")[0],
      tags: article.tags.map((t) => t.name).slice(0, 5),
      imageUrl: extractOgImage(article.body) || getQiitaOgImage(article.id),
      saved: false,
    }));
  } catch (error) {
    console.error("Qiita fetch error:", error);
    return [];
  }
}

/**
 * Fetch trending articles from Zenn
 */
export async function fetchZennArticles(
  page: number = 1,
  perPage: number = 10
): Promise<ExternalArticle[]> {
  try {
    const response = await fetch(
      `${ZENN_API_BASE}/articles?order=trend&page=${page}&count=${perPage}`,
      {
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error(`Zenn API error: ${response.status}`);
    }

    const data = await response.json();
    const articles: ZennArticle[] = data.articles || [];

    return articles.map((article) => ({
      id: `zenn_${article.id}`,
      title: article.title,
      description: `${article.emoji} ${article.title}`,
      url: `https://zenn.dev${article.path}`,
      source: "zenn" as const,
      author: article.user.name || article.user.username,
      likes: article.liked_count,
      publishedAt: article.published_at.split("T")[0],
      tags: article.topics?.map((t) => t.name).slice(0, 5) || [],
      imageUrl: getZennOgImage(article.slug, article.user.username),
      saved: false,
    }));
  } catch (error) {
    console.error("Zenn fetch error:", error);
    return [];
  }
}

/**
 * Fetch articles from both Qiita and Zenn
 */
export async function fetchAllArticles(): Promise<ExternalArticle[]> {
  const [qiitaArticles, zennArticles] = await Promise.all([
    fetchQiitaArticles(1, 10),
    fetchZennArticles(1, 10),
  ]);

  // Merge and sort by likes
  const allArticles = [...qiitaArticles, ...zennArticles];
  allArticles.sort((a, b) => b.likes - a.likes);

  return allArticles;
}

/**
 * Extract OG image from article body (markdown)
 */
function extractOgImage(body: string): string | null {
  // Try to find image in markdown
  const imageMatch = body.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (imageMatch) {
    return imageMatch[1];
  }
  return null;
}

/**
 * Get Qiita OG image URL
 */
function getQiitaOgImage(articleId: string): string {
  return `https://qiita-user-contents.imgix.net/https%3A%2F%2Fcdn.qiita.com%2Fassets%2Fpublic%2Farticle-ogp-background.png?ixlib=rb-4.0.0&w=1200&mark64=aHR0cHM6Ly9xaWl0YS11c2VyLWNvbnRlbnRzLmltZ2l4Lm5ldC9-dGV4dD9peGxpYj1yYi00LjAuMCZ3PTkxNiZ0eHQ9UWlpdGElMjBBcnRpY2xlJnR4dC1jb2xvcj0lMjMyMzI4MkMmdHh0LWZvbnQ9SGlyYWdpbm8lMjBTYW5zJTIwVzYmdHh0LXNpemU9NTYmdHh0LWNsaXA9ZWxsaXBzaXMmdHh0LWFsaWduPWxlZnQlMkN0b3A`;
}

/**
 * Get Zenn OG image URL
 */
function getZennOgImage(slug: string, username: string): string {
  return `https://res.cloudinary.com/zenn/image/upload/s--${slug}--/c_fit,g_north_west,l_text:notosansjp-medium.otf_55:${encodeURIComponent(slug)},w_1010,x_90,y_100/og-base_z4sxah.png`;
}
