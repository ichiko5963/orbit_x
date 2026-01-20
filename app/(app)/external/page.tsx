"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Search,
  RefreshCw,
  ExternalLink,
  Heart,
  Clock,
  Bookmark,
  BookmarkCheck,
  Image as ImageIcon,
  FileText,
  Calendar,
  X,
  Sparkles,
  Copy,
  CheckCircle2,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveScheduledPost } from "@/lib/firebase";

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

export default function ExternalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>(sampleArticles);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Preview Modal
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [copied, setCopied] = useState(false);

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

  // Auto-fetch on mount and when source changes
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

  const handleGenerateFromArticle = async (article: Article) => {
    setSelectedArticle(article);
    setIsGenerating(true);
    setGeneratedText("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "template",
          templateId: "news",
          content: `記事タイトル: ${article.title}\n\n記事概要: ${article.description}\n\nタグ: ${article.tags.join(", ")}`,
          category: "記事",
          tone: "casual",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      setGeneratedText(data.text);
    } catch (err) {
      console.error("Generate error:", err);
      setGeneratedText("生成中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePost = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedText)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleSchedulePost = async () => {
    if (!user || !generatedText) return;

    try {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      await saveScheduledPost(user.uid, {
        text: generatedText,
        scheduledAt,
        status: "scheduled",
        category: "記事",
      });

      alert("1時間後に予約投稿しました");
      setSelectedArticle(null);
      setGeneratedText("");
    } catch (err) {
      console.error("Schedule failed:", err);
    }
  };

  const handleRegenerate = () => {
    if (selectedArticle) {
      handleGenerateFromArticle(selectedArticle);
    }
  };

  const closeModal = () => {
    setSelectedArticle(null);
    setGeneratedText("");
    setIsGenerating(false);
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
            {/* Article Header */}
            <div className="p-5 border-b border-zinc-100">
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
            <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50">
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-xs bg-white text-zinc-600 rounded border border-zinc-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Calendar className="w-4 h-4" />
                {article.publishedAt}
                <span className="text-zinc-300">•</span>
                <span>{article.author}</span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                >
                  記事を読む
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleGenerateFromArticle(article)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  AIで投稿作成
                </button>
              </div>
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

      {/* Generation Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">AIで投稿作成</h2>
                  <p className="text-sm text-zinc-500">記事カテゴリー</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Article Preview */}
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${sourceConfig[selectedArticle.source].color}`}>
                    {sourceConfig[selectedArticle.source].name}
                  </span>
                  <span className="text-xs text-zinc-400">{selectedArticle.publishedAt}</span>
                </div>
                <h3 className="font-semibold text-zinc-900 mb-2">{selectedArticle.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{selectedArticle.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedArticle.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs bg-white text-zinc-500 rounded border border-zinc-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Generation Result */}
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                  <p className="text-zinc-600 font-medium">生成中...</p>
                  <p className="text-sm text-zinc-400 mt-1">AIが投稿を作成しています</p>
                </div>
              ) : generatedText ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900">生成結果</h3>
                    <span className="text-sm text-zinc-500">{generatedText.length}文字</span>
                  </div>
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <p className="text-zinc-900 whitespace-pre-wrap leading-relaxed">
                      {generatedText}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            {generatedText && !isGenerating && (
              <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={handleRegenerate}
                    className="flex items-center gap-2 px-4 py-2.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    再生成
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50 transition-colors"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          コピー
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleSchedulePost}
                      className="flex items-center gap-2 px-4 py-2.5 bg-violet-500 text-white font-medium rounded-xl hover:bg-violet-600 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      予約投稿
                    </button>
                    <button
                      onClick={handlePost}
                      className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Xで投稿
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
