"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Search,
  RefreshCw,
  ExternalLink,
  Heart,
  Clock,
  Bookmark,
  BookmarkCheck,
  Filter,
  Image as ImageIcon,
  FileText,
  TrendingUp,
  Calendar,
  CheckCircle2,
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  description: string;
  url: string;
  source: "qiita" | "zenn";
  author: string;
  likes: number;
  publishedAt: string;
  tags: string[];
  imageUrl: string | null;
  saved: boolean;
}

const sampleArticles: Article[] = [
  {
    id: "1",
    title: "【2024年版】React + TypeScript 開発環境構築の決定版",
    description: "ViteとTypeScriptを使った最新のReact開発環境を、ゼロから丁寧に解説。ESLint、Prettier、テスト環境まで完全網羅。",
    url: "https://qiita.com/example/react-typescript-2024",
    source: "qiita",
    author: "tech_writer",
    likes: 1250,
    publishedAt: "2024-01-15",
    tags: ["React", "TypeScript", "Vite"],
    imageUrl: "https://qiita-user-contents.imgix.net/https%3A%2F%2Fcdn.qiita.com%2Fassets%2Fpublic%2Farticle-ogp-background.png",
    saved: false,
  },
  {
    id: "2",
    title: "Next.js 14 App RouterでCRUDアプリを作る",
    description: "Server ActionsとPrismaを使った、モダンなCRUDアプリケーションの作り方を解説します。",
    url: "https://zenn.dev/example/nextjs-crud",
    source: "zenn",
    author: "nextjs_master",
    likes: 890,
    publishedAt: "2024-01-14",
    tags: ["Next.js", "Prisma", "Server Actions"],
    imageUrl: "https://res.cloudinary.com/zenn/image/upload/s--example--/c_fit,g_north_west,l_text:notosansjp-medium.otf_55:Next.js%2014,w_1010,x_90,y_100/og-base_z4sxah.png",
    saved: true,
  },
  {
    id: "3",
    title: "GitHub Copilot Chatの実践的な使い方10選",
    description: "コードレビュー、リファクタリング、テスト生成など、Copilot Chatを最大限活用するテクニックを紹介。",
    url: "https://qiita.com/example/copilot-chat",
    source: "qiita",
    author: "ai_engineer",
    likes: 2100,
    publishedAt: "2024-01-13",
    tags: ["GitHub Copilot", "AI", "生産性"],
    imageUrl: null,
    saved: false,
  },
  {
    id: "4",
    title: "個人開発で月10万円稼ぐまでにやったこと",
    description: "SaaSを個人で開発・運営し、副業として安定した収入を得るまでの道のりを赤裸々に公開。",
    url: "https://zenn.dev/example/indie-hacker",
    source: "zenn",
    author: "indie_dev",
    likes: 3500,
    publishedAt: "2024-01-12",
    tags: ["個人開発", "SaaS", "副業"],
    imageUrl: "https://res.cloudinary.com/zenn/image/upload/s--example2--/og-base_z4sxah.png",
    saved: false,
  },
  {
    id: "5",
    title: "エンジニア採用面接で聞かれる質問50選",
    description: "技術面接、カルチャーフィット面接、逆質問まで。転職活動に必須の質問集をまとめました。",
    url: "https://qiita.com/example/interview",
    source: "qiita",
    author: "career_advisor",
    likes: 1800,
    publishedAt: "2024-01-11",
    tags: ["キャリア", "転職", "面接"],
    imageUrl: null,
    saved: true,
  },
];

const sourceConfig = {
  qiita: { name: "Qiita", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  zenn: { name: "Zenn", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

function formatNumber(num: number): string {
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function ExternalPage() {
  const [articles, setArticles] = useState<Article[]>(sampleArticles);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/external?source=${selectedSource}`);
      const data = await response.json();

      if (data.success && data.articles.length > 0) {
        // Preserve saved state from existing articles
        const savedIds = new Set(articles.filter((a) => a.saved).map((a) => a.id));
        const updatedArticles = data.articles.map((article: Article) => ({
          ...article,
          saved: savedIds.has(article.id),
        }));
        setArticles(updatedArticles);
        setLastUpdated(new Date().toLocaleString("ja-JP"));
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [selectedSource]);

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleRefresh = () => {
    fetchArticles();
  };

  const toggleSave = (id: string) => {
    setArticles((prev) =>
      prev.map((article) =>
        article.id === id ? { ...article, saved: !article.saved } : article
      )
    );
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSource = selectedSource === "all" || article.source === selectedSource;
    const matchesSaved = !showSavedOnly || article.saved;
    return matchesSearch && matchesSource && matchesSaved;
  });

  const savedCount = articles.filter((a) => a.saved).length;

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-zinc-500">External</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            外部コンテンツ
          </h1>
          <p className="text-zinc-500">
            Qiita・Zennのトレンド記事を自動取得。投稿ネタの参考に。
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors btn-press"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "取得中..." : "最新を取得"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{articles.filter(a => a.source === "qiita").length}</p>
              <p className="text-xs text-zinc-500">Qiita記事</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{articles.filter(a => a.source === "zenn").length}</p>
              <p className="text-xs text-zinc-500">Zenn記事</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{savedCount}</p>
              <p className="text-xs text-zinc-500">保存済み</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="タイトル・タグで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
          />
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-50 border border-zinc-200 rounded-xl">
          {["all", "qiita", "zenn"].map((source) => (
            <button
              key={source}
              onClick={() => setSelectedSource(source)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedSource === source
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {source === "all" ? "すべて" : source === "qiita" ? "Qiita" : "Zenn"}
            </button>
          ))}
        </div>

        {/* Saved Toggle */}
        <button
          onClick={() => setShowSavedOnly(!showSavedOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            showSavedOnly
              ? "bg-amber-500/20 text-amber-600 border border-amber-500/30"
              : "bg-zinc-50 text-zinc-500 border border-zinc-200 hover:text-zinc-900"
          }`}
        >
          {showSavedOnly ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          保存済み
        </button>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 mb-4 text-xs text-zinc-400">
        <Clock className="w-3.5 h-3.5" />
        最終更新: 2024年1月15日 6:00
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            className="group p-5 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 transition-all shadow-sm"
          >
            {/* Image Preview */}
            {article.imageUrl ? (
              <div className="relative h-40 mb-4 rounded-xl overflow-hidden bg-zinc-100">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${article.imageUrl})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-medium rounded-lg border ${
                    sourceConfig[article.source].color
                  }`}
                >
                  {sourceConfig[article.source].name}
                </span>
              </div>
            ) : (
              <div className="relative h-40 mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-100 to-zinc-200 flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-zinc-300" />
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-medium rounded-lg border ${
                    sourceConfig[article.source].color
                  }`}
                >
                  {sourceConfig[article.source].name}
                </span>
              </div>
            )}

            {/* Content */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-base font-semibold text-zinc-900 leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
                {article.title}
              </h3>
              <button
                onClick={() => toggleSave(article.id)}
                className={`flex-shrink-0 p-2 rounded-lg transition-all ${
                  article.saved
                    ? "bg-amber-500/20 text-amber-500"
                    : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                {article.saved ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-sm text-zinc-500 line-clamp-2 mb-4 leading-relaxed">
              {article.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-zinc-50 text-zinc-500 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <Heart className="w-3.5 h-3.5" />
                  {formatNumber(article.likes)}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {article.publishedAt}
                </span>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                記事を読む
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-zinc-500 mb-1">記事が見つかりません</p>
          <p className="text-sm text-zinc-400">検索条件を変更してください</p>
        </div>
      )}
    </div>
  );
}
