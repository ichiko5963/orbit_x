import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllArticles,
  fetchQiitaArticles,
  fetchZennArticles,
} from "@/lib/external-content";

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
      default:
        articles = await fetchAllArticles();
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
