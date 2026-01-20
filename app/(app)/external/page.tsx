"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Search,
  RefreshCw,
  ExternalLink,
  Heart,
  Clock,
  Bookmark,
  BookmarkCheck,
  FileText,
  Calendar,
  X,
  Sparkles,
  Copy,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveScheduledPost, getArticlePatterns, initializeArticlePatterns, ArticlePattern, DEFAULT_ARTICLE_PATTERNS } from "@/lib/firebase";

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
    description: "ViteとTypeScriptを使った最新のReact開発環境を、ゼロから丁寧に解説。ESLint、Prettier、テスト環境まで完全網羅。初心者でも迷わない手順で、プロダクションレディな開発環境を構築できます。",
    url: "https://qiita.com/example/react-typescript-2024",
    source: "qiita",
    author: "tech_writer",
    likes: 1250,
    publishedAt: "2024-01-15",
    tags: ["React", "TypeScript", "Vite"],
    imageUrl: null,
    saved: false,
  },
  {
    id: "2",
    title: "Next.js 14 App RouterでCRUDアプリを作る",
    description: "Server ActionsとPrismaを使った、モダンなCRUDアプリケーションの作り方を解説します。認証、バリデーション、エラーハンドリングまで含めた実践的な内容です。",
    url: "https://zenn.dev/example/nextjs-crud",
    source: "zenn",
    author: "nextjs_master",
    likes: 890,
    publishedAt: "2024-01-14",
    tags: ["Next.js", "Prisma", "Server Actions"],
    imageUrl: null,
    saved: true,
  },
  {
    id: "3",
    title: "GitHub Copilot Chatの実践的な使い方10選",
    description: "コードレビュー、リファクタリング、テスト生成など、Copilot Chatを最大限活用するテクニックを紹介。日々の開発効率が格段に上がる使い方を厳選しました。",
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
    description: "SaaSを個人で開発・運営し、副業として安定した収入を得るまでの道のりを赤裸々に公開。マーケティング、価格設定、カスタマーサポートまで。",
    url: "https://zenn.dev/example/indie-hacker",
    source: "zenn",
    author: "indie_dev",
    likes: 3500,
    publishedAt: "2024-01-12",
    tags: ["個人開発", "SaaS", "副業"],
    imageUrl: null,
    saved: false,
  },
  {
    id: "5",
    title: "エンジニア採用面接で聞かれる質問50選",
    description: "技術面接、カルチャーフィット面接、逆質問まで。転職活動に必須の質問集をまとめました。回答例と面接官の意図も解説。",
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
  qiita: { name: "Qiita", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  zenn: { name: "Zenn", color: "bg-blue-100 text-blue-700 border-blue-200" },
};

function formatNumber(num: number): string {
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

interface GeneratedPattern {
  id: number;
  name: string;
  text: string;
  isLoading: boolean;
  error?: string;
}

export default function ExternalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>(sampleArticles);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Patterns from Firebase
  const [articlePatterns, setArticlePatterns] = useState<ArticlePattern[]>([]);
  const [isPatternsLoading, setIsPatternsLoading] = useState(true);

  // Modal State
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [generatedPatterns, setGeneratedPatterns] = useState<GeneratedPattern[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [schedulingId, setSchedulingId] = useState<number | null>(null);

  // Load patterns from Firebase
  useEffect(() => {
    const loadPatterns = async () => {
      if (!user) return;
      setIsPatternsLoading(true);
      try {
        // Initialize patterns if first time
        await initializeArticlePatterns(user.uid);
        // Load patterns
        const patterns = await getArticlePatterns(user.uid);
        setArticlePatterns(patterns);
      } catch (error) {
        console.error("Failed to load patterns:", error);
        // Fallback to defaults
        setArticlePatterns(DEFAULT_ARTICLE_PATTERNS.map((p, i) => ({ ...p, id: `default_${i + 1}` })));
      } finally {
        setIsPatternsLoading(false);
      }
    };
    loadPatterns();
  }, [user]);

  const fetchArticles = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`/api/external?source=${selectedSource}`);
      const data = await response.json();

      if (data.success && data.articles.length > 0) {
        const savedIds = new Set(articles.filter((a) => a.saved).map((a) => a.id));
        const updatedArticles = data.articles.map((article: Article) => ({
          ...article,
          saved: savedIds.has(article.id),
        }));
        setArticles(updatedArticles);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedSource, articles]);

  useEffect(() => {
    fetchArticles();
  }, [selectedSource]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Generate patterns for the article (use patterns from Firebase)
  const handleGenerateFromArticle = async (article: Article) => {
    setSelectedArticle(article);

    // Use up to 6 patterns
    const patternsToUse = articlePatterns.slice(0, 6);

    // Initialize patterns with loading state
    const initialPatterns: GeneratedPattern[] = patternsToUse.map((p, index) => ({
      id: index + 1,
      name: p.name,
      text: "",
      isLoading: true,
    }));
    setGeneratedPatterns(initialPatterns);

    // Generate all in parallel
    const promises = patternsToUse.map(async (pattern, index) => {
      try {
        const response = await fetch("/api/generate-article-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patternId: index + 1,
            patternTemplate: pattern.template,
            article: {
              title: article.title,
              description: article.description,
              url: article.url,
              source: article.source,
              author: article.author,
              tags: article.tags,
            },
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "生成に失敗しました");
        }

        return { id: index + 1, text: data.text, error: undefined };
      } catch (err) {
        const message = err instanceof Error ? err.message : "エラー";
        return { id: index + 1, text: "", error: message };
      }
    });

    const results = await Promise.all(promises);

    setGeneratedPatterns((prev) =>
      prev.map((p) => {
        const result = results.find((r) => r.id === p.id);
        return {
          ...p,
          text: result?.text || "",
          error: result?.error,
          isLoading: false,
        };
      })
    );
  };

  // Regenerate single pattern
  const handleRegeneratePattern = async (patternId: number) => {
    if (!selectedArticle) return;

    const patternIndex = patternId - 1;
    const pattern = articlePatterns[patternIndex];
    if (!pattern) return;

    setGeneratedPatterns((prev) =>
      prev.map((p) =>
        p.id === patternId ? { ...p, isLoading: true, error: undefined } : p
      )
    );

    try {
      const response = await fetch("/api/generate-article-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patternId: patternId,
          patternTemplate: pattern.template,
          article: {
            title: selectedArticle.title,
            description: selectedArticle.description,
            url: selectedArticle.url,
            source: selectedArticle.source,
            author: selectedArticle.author,
            tags: selectedArticle.tags,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      setGeneratedPatterns((prev) =>
        prev.map((p) =>
          p.id === patternId ? { ...p, text: data.text, isLoading: false } : p
        )
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラー";
      setGeneratedPatterns((prev) =>
        prev.map((p) =>
          p.id === patternId ? { ...p, error: message, isLoading: false } : p
        )
      );
    }
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePost = (text: string) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleSchedule = async (id: number, text: string) => {
    if (!user) return;

    setSchedulingId(id);
    try {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      await saveScheduledPost(user.uid, {
        text,
        scheduledAt,
        status: "scheduled",
        category: "記事",
      });

      alert("1時間後に予約投稿しました");
    } catch (err) {
      console.error("Schedule failed:", err);
    } finally {
      setSchedulingId(null);
    }
  };

  const closeModal = () => {
    setSelectedArticle(null);
    setGeneratedPatterns([]);
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
  const isAnyLoading = generatedPatterns.some((p) => p.isLoading);

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            外部コンテンツ
          </h1>
          <p className="text-lg text-zinc-500">
            Qiita・Zennの記事からAIで投稿を作成
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "取得中..." : "最新を取得"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{articles.filter(a => a.source === "qiita").length}</p>
              <p className="text-sm text-zinc-500">Qiita記事</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{articles.filter(a => a.source === "zenn").length}</p>
              <p className="text-sm text-zinc-500">Zenn記事</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{savedCount}</p>
              <p className="text-sm text-zinc-500">保存済み</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="タイトル・タグで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 p-1.5 bg-zinc-100 rounded-xl">
          {["all", "qiita", "zenn"].map((source) => (
            <button
              key={source}
              onClick={() => setSelectedSource(source)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                selectedSource === source
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {source === "all" ? "すべて" : source === "qiita" ? "Qiita" : "Zenn"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSavedOnly(!showSavedOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            showSavedOnly
              ? "bg-amber-100 text-amber-700 border border-amber-200"
              : "bg-white text-zinc-500 border border-zinc-200 hover:text-zinc-900"
          }`}
        >
          {showSavedOnly ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          保存済み
        </button>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            className="group bg-white border border-zinc-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
          >
            {/* AI Button at TOP - Primary action */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200">
              <button
                onClick={() => handleGenerateFromArticle(article)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
              >
                <Sparkles className="w-5 h-5" />
                AIで6パターン生成
              </button>
            </div>

            {/* Article Header */}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${sourceConfig[article.source].color}`}>
                    {sourceConfig[article.source].name}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-zinc-400">
                    <Heart className="w-3.5 h-3.5" />
                    {formatNumber(article.likes)}
                  </span>
                </div>
                <button
                  onClick={() => toggleSave(article.id)}
                  className={`p-2 rounded-lg transition-all ${
                    article.saved
                      ? "bg-amber-100 text-amber-600"
                      : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  {article.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>

              <h3 className="text-lg font-semibold text-zinc-900 leading-snug mb-2 line-clamp-2">
                {article.title}
              </h3>

              <p className="text-sm text-zinc-500 leading-relaxed line-clamp-3">
                {article.description}
              </p>
            </div>

            {/* Tags */}
            <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50">
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-white text-zinc-600 rounded border border-zinc-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 flex items-center justify-between border-t border-zinc-100">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Calendar className="w-4 h-4" />
                {article.publishedAt}
                <span className="text-zinc-300">•</span>
                <span>{article.author}</span>
              </div>

              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                記事を読む
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-lg text-zinc-600 mb-1">記事が見つかりません</p>
          <p className="text-sm text-zinc-400">検索条件を変更してください</p>
        </div>
      )}

      {/* 6 Patterns Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-xl mx-4 my-8">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">6パターン生成</h2>
                  <p className="text-sm text-zinc-500 line-clamp-1">{selectedArticle.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isAnyLoading && (
                  <button
                    onClick={() => handleGenerateFromArticle(selectedArticle)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    全て再生成
                  </button>
                )}
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Article Preview (Compact) */}
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${sourceConfig[selectedArticle.source].color}`}>
                  {sourceConfig[selectedArticle.source].name}
                </span>
                <span className="text-sm text-zinc-600 line-clamp-1 flex-1">{selectedArticle.description}</span>
                <a
                  href={selectedArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:underline flex-shrink-0"
                >
                  記事を読む <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Pattern Cards */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-zinc-500">
                  {articlePatterns.length}パターンで生成中
                </p>
                <Link
                  href="/settings/patterns"
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                >
                  <Settings className="w-4 h-4" />
                  パターン設定
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {generatedPatterns.map((pattern) => {
                  const patternInfo = articlePatterns[pattern.id - 1];

                  return (
                    <div
                      key={pattern.id}
                      className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                            {pattern.id}
                          </span>
                          <div>
                            <span className="text-sm font-medium text-zinc-900">{pattern.name}</span>
                            <p className="text-xs text-zinc-500">{patternInfo?.description}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="flex-1 p-4">
                        {pattern.isLoading ? (
                          <div className="h-36 flex flex-col items-center justify-center text-zinc-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-sm">生成中...</span>
                          </div>
                        ) : pattern.error ? (
                          <div className="h-36 flex flex-col items-center justify-center text-red-500">
                            <span className="text-sm mb-2">{pattern.error}</span>
                            <button
                              onClick={() => handleRegeneratePattern(pattern.id)}
                              className="text-sm text-emerald-600 hover:underline"
                            >
                              再試行
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed line-clamp-[7]">
                            {pattern.text}
                          </p>
                        )}
                      </div>

                      {/* Card Footer - Stats */}
                      {!pattern.isLoading && !pattern.error && pattern.text && (
                        <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
                          <span className="text-xs text-zinc-500">{pattern.text.length}文字</span>
                        </div>
                      )}

                      {/* Card Actions */}
                      {!pattern.isLoading && !pattern.error && pattern.text && (
                        <div className="flex border-t border-zinc-100">
                          <button
                            onClick={() => handleCopy(pattern.id, pattern.text)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors border-r border-zinc-100"
                          >
                            {copiedId === pattern.id ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-600">コピー済み</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                コピー
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleSchedule(pattern.id, pattern.text)}
                            disabled={schedulingId === pattern.id}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors border-r border-zinc-100 disabled:opacity-50"
                          >
                            {schedulingId === pattern.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Calendar className="w-4 h-4" />
                            )}
                            予約
                          </button>
                          <button
                            onClick={() => handlePost(pattern.text)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            投稿
                          </button>
                        </div>
                      )}

                      {/* Regenerate single */}
                      {!pattern.isLoading && pattern.text && (
                        <button
                          onClick={() => handleRegeneratePattern(pattern.id)}
                          className="flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                        >
                          <RotateCcw className="w-3 h-3" />
                          再生成
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
