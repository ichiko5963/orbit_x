import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllArticles,
  fetchQiitaArticles,
  fetchZennArticles,
} from "@/lib/external-content";
import { fetchAllGitHubRepos, fetchGitHubAIRepos } from "@/lib/github-trending";
import { fetchClaudeSkills } from "@/lib/claude-skills";
import {
  fetchOpenAIArticles,
  fetchAnthropicArticles,
  fetchGoogleAIArticles,
  fetchCursorArticles,
  fetchVercelArticles,
  fetchAllOfficialAIBlogs,
} from "@/lib/official-ai-blogs";
import { fetchSupabaseArticles } from "@/lib/supabase-blog";
import {
  fetchMediumArticles,
  fetchDevToArticles,
  fetchHashnodeArticles,
  fetchAllInternationalArticles,
} from "@/lib/international-ai-articles";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("per_page") || "10", 10);

    let articles;

    switch (source) {
      case "qiita":
        articles = await fetchQiitaArticles(page, perPage);
        break;
      case "zenn":
        articles = await fetchZennArticles(page, perPage);
        break;
      case "github":
        articles = await fetchGitHubAIRepos(page, perPage);
        break;
      case "claude-skills":
        articles = await fetchClaudeSkills();
        break;
      // Official AI blogs
      case "openai":
        articles = await fetchOpenAIArticles(perPage);
        break;
      case "anthropic":
        articles = await fetchAnthropicArticles(perPage);
        break;
      case "google-ai":
        articles = await fetchGoogleAIArticles(perPage);
        break;
      case "cursor":
        articles = await fetchCursorArticles(perPage);
        break;
      case "vercel":
        articles = await fetchVercelArticles(perPage);
        break;
      case "supabase":
        articles = await fetchSupabaseArticles(perPage);
        break;
      case "official":
        articles = await fetchAllOfficialAIBlogs();
        break;
      // International AI article sites
      case "medium":
        articles = await fetchMediumArticles(perPage);
        break;
      case "devto":
        articles = await fetchDevToArticles(perPage);
        break;
      case "hashnode":
        articles = await fetchHashnodeArticles(perPage);
        break;
      case "international":
        articles = await fetchAllInternationalArticles();
        break;
      default:
        // Fetch all sources in parallel
        const [qiitaZenn, github, skills, official, supabase, international] = await Promise.all([
          fetchAllArticles(),
          fetchAllGitHubRepos(),
          fetchClaudeSkills(),
          fetchAllOfficialAIBlogs(),
          fetchSupabaseArticles(5),
          fetchAllInternationalArticles(),
        ]);
        // Merge and sort by date (most recent first)
        articles = [...qiitaZenn, ...github, ...skills, ...official, ...supabase, ...international];
        articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }

    return NextResponse.json({
      success: true,
      articles,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("External content fetch error:", error);
    const message =
      error instanceof Error ? error.message : "記事の取得中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
