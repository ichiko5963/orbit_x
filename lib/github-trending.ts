import { ExternalArticle } from "./types";

const GITHUB_API_BASE = "https://api.github.com";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

/**
 * Fetch trending AI/LLM repositories from GitHub
 * Uses GitHub Search API to find popular AI-related repos
 */
export async function fetchGitHubAIRepos(
  page: number = 1,
  perPage: number = 10
): Promise<ExternalArticle[]> {
  try {
    // Search for AI/LLM related repositories
    // Sort by stars, filter by recent activity
    const queries = [
      "llm+in:name,description",
      "ai+agent+in:name,description",
      "chatgpt+in:name,description",
      "claude+in:name,description",
      "langchain+in:name,description",
      "openai+in:name,description",
      "machine-learning+in:name,description",
    ];

    // Rotate through queries based on page
    const queryIndex = (page - 1) % queries.length;
    const query = queries[queryIndex];

    // Calculate date 30 days ago for recent repos
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFilter = thirtyDaysAgo.toISOString().split("T")[0];

    const searchUrl = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}+pushed:>${dateFilter}&sort=stars&order=desc&page=${page}&per_page=${perPage}`;

    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        ...(process.env.GITHUB_TOKEN && {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
        }),
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const repos: GitHubRepo[] = data.items || [];

    return repos.map((repo) => ({
      id: `github_${repo.id}`,
      title: repo.full_name,
      description: repo.description || `${repo.full_name} - GitHub repository`,
      url: repo.html_url,
      source: "github" as const,
      author: repo.owner.login,
      likes: repo.stargazers_count,
      publishedAt: repo.pushed_at.split("T")[0],
      tags: [
        ...(repo.language ? [repo.language] : []),
        ...repo.topics.slice(0, 3),
      ],
      imageUrl: null,
      saved: false,
      stars: repo.stargazers_count,
      language: repo.language || undefined,
      forks: repo.forks_count,
    }));
  } catch (error) {
    console.error("GitHub fetch error:", error);
    return [];
  }
}

/**
 * Fetch specific popular AI repositories
 * Curated list of well-known AI/LLM repositories
 */
export async function fetchCuratedAIRepos(): Promise<ExternalArticle[]> {
  const curatedRepos = [
    "openai/openai-cookbook",
    "langchain-ai/langchain",
    "anthropics/anthropic-cookbook",
    "microsoft/autogen",
    "run-llama/llama_index",
    "huggingface/transformers",
    "guidance-ai/guidance",
    "deepseek-ai/DeepSeek-V3",
    "Pythagora-io/gpt-pilot",
    "comfyanonymous/ComfyUI",
  ];

  try {
    const promises = curatedRepos.map(async (repoPath) => {
      try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${repoPath}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            ...(process.env.GITHUB_TOKEN && {
              Authorization: `token ${process.env.GITHUB_TOKEN}`,
            }),
          },
          next: { revalidate: 3600 },
        });

        if (!response.ok) return null;

        const repo: GitHubRepo = await response.json();

        return {
          id: `github_${repo.id}`,
          title: repo.full_name,
          description: repo.description || `${repo.full_name} - GitHub repository`,
          url: repo.html_url,
          source: "github" as const,
          author: repo.owner.login,
          likes: repo.stargazers_count,
          publishedAt: repo.pushed_at.split("T")[0],
          tags: [
            ...(repo.language ? [repo.language] : []),
            ...repo.topics.slice(0, 3),
          ],
          imageUrl: null,
          saved: false,
          stars: repo.stargazers_count,
          language: repo.language || undefined,
          forks: repo.forks_count,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    return results.filter((r) => r !== null) as ExternalArticle[];
  } catch (error) {
    console.error("Curated repos fetch error:", error);
    return [];
  }
}

/**
 * Fetch all GitHub AI repos (search + curated)
 */
export async function fetchAllGitHubRepos(): Promise<ExternalArticle[]> {
  const [searchRepos, curatedRepos] = await Promise.all([
    fetchGitHubAIRepos(1, 10),
    fetchCuratedAIRepos(),
  ]);

  // Merge and deduplicate by id
  const seen = new Set<string>();
  const allRepos: ExternalArticle[] = [];

  for (const repo of [...curatedRepos, ...searchRepos]) {
    if (!seen.has(repo.id)) {
      seen.add(repo.id);
      allRepos.push(repo);
    }
  }

  // Sort by stars
  allRepos.sort((a, b) => (b.stars || 0) - (a.stars || 0));

  return allRepos.slice(0, 20);
}
