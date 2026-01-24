"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Heart,
  MessageCircle,
  Search,
  ArrowUpRight,
  Copy,
  Sparkles,
  Quote,
  X,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Filter,
  Loader2,
  Tag,
  Plus,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  Send,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getPosts, clearPosts } from "@/lib/firebase";

interface Post {
  id: string;
  text: string;
  createdAt: string;
  tier: "S" | "A" | "B" | "C";
  category: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  structure: { role: string; text: string }[];
  urls?: string[];
}

const tierConfig = {
  S: { label: "Tier S", bgColor: "bg-amber-100", textColor: "text-amber-700", borderColor: "border-amber-300", description: "同文再投稿OK" },
  A: { label: "Tier A", bgColor: "bg-violet-100", textColor: "text-violet-700", borderColor: "border-violet-300", description: "構文模倣" },
  B: { label: "Tier B", bgColor: "bg-blue-100", textColor: "text-blue-700", borderColor: "border-blue-300", description: "参考程度" },
  C: { label: "Tier C", bgColor: "bg-zinc-100", textColor: "text-zinc-700", borderColor: "border-zinc-300", description: "保存のみ" },
};

// Practical X post categories (AI determines proper category - no "その他")
const CATEGORIES = [
  "すべて",
  "速報・ニュース系",
  "Tips・ノウハウ系",
  "記事・コンテンツ紹介系",
  "ツール・サービス紹介系",
  "動画・メディア紹介系",
  "プロンプト・AI活用系",
  "プロダクト・リリース系",
  "イベント・登壇系",
  "プレゼント・キャンペーン系",
  "採用・メンバー募集系",
  "日常・つぶやき系",
];

const roleColors: Record<string, string> = {
  problem: "bg-red-50 text-red-700 border-red-200",
  headline: "bg-amber-50 text-amber-700 border-amber-200",
  insight: "bg-purple-50 text-purple-700 border-purple-200",
  process: "bg-cyan-50 text-cyan-700 border-cyan-200",
  conclusion: "bg-emerald-50 text-emerald-700 border-emerald-200",
  detail: "bg-blue-50 text-blue-700 border-blue-200",
  list: "bg-indigo-50 text-indigo-700 border-indigo-200",
  cta: "bg-pink-50 text-pink-700 border-pink-200",
};

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

export default function PostsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Load posts from Firebase
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const fetchedPosts = await getPosts(user.uid);
        setPosts(fetchedPosts as Post[]);
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, [user]);

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "all" || post.tier === selectedTier;
    const matchesCategory = selectedCategory === "すべて" || post.category === selectedCategory;
    return matchesSearch && matchesTier && matchesCategory;
  });

  // Sort by likes (tier ranking)
  const sortedPosts = [...filteredPosts].sort((a, b) => b.likes - a.likes);

  // Stats
  const stats = {
    total: posts.length,
    tierS: posts.filter(p => p.tier === "S").length,
    tierA: posts.filter(p => p.tier === "A").length,
    tierB: posts.filter(p => p.tier === "B").length,
    tierC: posts.filter(p => p.tier === "C").length,
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Repost to X
  const handleRepost = (post: Post) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.text)}`;
    window.open(tweetUrl, "_blank");
  };

  // Schedule post
  const handleSchedule = (post: Post) => {
    // Store the post text in sessionStorage and navigate to schedule page
    sessionStorage.setItem("schedule_post_text", post.text);
    router.push("/schedule?action=new");
  };

  // Reset all posts
  const handleResetPosts = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      "本当にすべての過去投稿を削除しますか？\n\nこの操作は取り消せません。Googleアカウントに紐づいているすべての過去投稿データが完全に削除されます。"
    );

    if (!confirmed) return;

    // Double confirmation
    const doubleConfirmed = window.confirm(
      "最終確認：本当に削除してよろしいですか？"
    );

    if (!doubleConfirmed) return;

    setIsLoading(true);
    try {
      await clearPosts(user.uid);
      setPosts([]);
      alert("すべての過去投稿を削除しました");
    } catch (error) {
      console.error("Failed to reset posts:", error);
      alert("削除に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            過去投稿一覧
          </h1>
          <p className="text-lg text-zinc-500">
            インポートした投稿をティア別に分析・管理
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-xl">
            <span className="text-sm text-zinc-500">総投稿数:</span>
            <span className="text-lg font-bold text-zinc-900">{stats.total}</span>
          </div>
          {posts.length > 0 && (
            <button
              onClick={handleResetPosts}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="すべての投稿を削除"
            >
              <Trash2 className="w-3.5 h-3.5" />
              リセット
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(["S", "A", "B", "C"] as const).map((tier) => (
          <div
            key={tier}
            onClick={() => setSelectedTier(selectedTier === tier ? "all" : tier)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              selectedTier === tier
                ? `${tierConfig[tier].bgColor} ${tierConfig[tier].borderColor}`
                : "bg-white border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${tierConfig[tier].textColor}`}>
                {tier}
              </span>
              <span className="text-2xl font-bold text-zinc-900">
                {stats[`tier${tier}` as keyof typeof stats]}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-1">{tierConfig[tier].description}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="投稿を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="flex items-center gap-2 h-12 px-4 bg-white border border-zinc-200 rounded-xl text-zinc-700 hover:border-zinc-300 transition-all"
          >
            <Tag className="w-5 h-5" />
            {selectedCategory}
            <Filter className="w-4 h-4" />
          </button>
          {showCategoryFilter && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-zinc-200 rounded-xl shadow-lg z-10 max-h-80 overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowCategoryFilter(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-50 first:rounded-t-xl last:rounded-b-xl ${
                    selectedCategory === cat ? "bg-emerald-50 text-emerald-700" : "text-zinc-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {(selectedTier !== "all" || selectedCategory !== "すべて" || searchQuery) && (
          <button
            onClick={() => {
              setSelectedTier("all");
              setSelectedCategory("すべて");
              setSearchQuery("");
            }}
            className="flex items-center gap-2 h-12 px-4 text-zinc-500 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
            クリア
          </button>
        )}
      </div>

      {/* Content */}
      {posts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900 mb-3">
            投稿データがありません
          </h3>
          <p className="text-base text-zinc-500 mb-6">
            CSVをインポートして、過去の投稿を分析しましょう
          </p>
          <a
            href="/import"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            CSVをインポート
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Posts List */}
          <div className="space-y-4">
            {sortedPosts.map((post, index) => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`group bg-white p-6 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                  selectedPost?.id === post.id
                    ? "border-emerald-500 ring-2 ring-emerald-500/20"
                    : "border-zinc-200"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Rank */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm text-zinc-400">#{index + 1}</span>
                    <span className={`${tierConfig[post.tier].bgColor} ${tierConfig[post.tier].textColor} text-sm font-bold px-3 py-1.5 rounded-lg`}>
                      {post.tier}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base text-zinc-700 leading-relaxed line-clamp-3 mb-3">
                      {post.text}
                    </p>

                    <div className="flex items-center flex-wrap gap-3 mb-3">
                      <span className="px-3 py-1 text-sm bg-zinc-100 text-zinc-600 rounded-lg">
                        {post.category}
                      </span>
                      {post.urls && post.urls.length > 0 && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" />
                          URL
                        </span>
                      )}
                      <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {formatDate(post.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="flex items-center gap-1.5 text-base text-zinc-500">
                        <Eye className="w-5 h-5" />
                        {formatNumber(post.impressions)}
                      </span>
                      <span className="flex items-center gap-1.5 text-base text-zinc-500">
                        <Heart className="w-5 h-5" />
                        {formatNumber(post.likes)}
                      </span>
                      <span className="flex items-center gap-1.5 text-base text-zinc-500">
                        <RefreshCw className="w-4 h-4" />
                        {formatNumber(post.retweets)}
                      </span>
                    </div>
                  </div>

                  <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors flex-shrink-0" />
                </div>
              </div>
            ))}

            {filteredPosts.length === 0 && posts.length > 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-lg text-zinc-600 mb-1">投稿が見つかりません</p>
                <p className="text-base text-zinc-400">検索条件を変更してください</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {selectedPost ? (
              <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-zinc-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`${tierConfig[selectedPost.tier].bgColor} ${tierConfig[selectedPost.tier].textColor} text-base font-bold px-4 py-2 rounded-lg`}>
                        Tier {selectedPost.tier}
                      </span>
                      <span className="text-base text-zinc-500">
                        {tierConfig[selectedPost.tier].description}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-6 text-base">
                    <span className="flex items-center gap-2 text-zinc-500">
                      <Eye className="w-5 h-5" />
                      {formatNumber(selectedPost.impressions)}
                    </span>
                    <span className="flex items-center gap-2 text-zinc-500">
                      <Heart className="w-5 h-5" />
                      {formatNumber(selectedPost.likes)}
                    </span>
                    <span className="flex items-center gap-2 text-zinc-500">
                      <RefreshCw className="w-4 h-4" />
                      {formatNumber(selectedPost.retweets)}
                    </span>
                    <span className="flex items-center gap-2 text-zinc-500">
                      <MessageCircle className="w-5 h-5" />
                      {formatNumber(selectedPost.replies)}
                    </span>
                  </div>
                </div>

                {/* Category & Date */}
                <div className="px-6 py-3 border-b border-zinc-100 flex items-center gap-4">
                  <span className="px-3 py-1 text-sm bg-zinc-100 text-zinc-600 rounded-lg">
                    {selectedPost.category}
                  </span>
                  <span className="text-sm text-zinc-400">
                    {formatDate(selectedPost.createdAt)}
                  </span>
                </div>

                {/* Original Text */}
                <div className="p-6 border-b border-zinc-100">
                  <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    投稿本文
                  </h4>
                  <div className="p-4 bg-zinc-50 rounded-xl">
                    <p className="text-base text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {selectedPost.text}
                    </p>
                  </div>
                </div>

                {/* URLs (if available) */}
                {selectedPost.urls && selectedPost.urls.length > 0 && (
                  <div className="p-6 border-b border-zinc-100">
                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      含まれるURL
                    </h4>
                    <div className="space-y-2">
                      {selectedPost.urls.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg group"
                        >
                          <span className="flex-1 text-sm text-blue-600 truncate font-mono">
                            {url}
                          </span>
                          <button
                            onClick={() => handleCopy(url, `url_${index}`)}
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 transition-colors"
                            title="URLをコピー"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-100 transition-colors"
                            title="URLを開く"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Structure (if available) */}
                {selectedPost.structure && selectedPost.structure.length > 0 && (
                  <div className="p-6 border-b border-zinc-100">
                    <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                      構造分析
                    </h4>
                    <div className="space-y-2">
                      {selectedPost.structure.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 bg-zinc-50 rounded-xl"
                        >
                          <span
                            className={`px-2.5 py-1 text-sm font-medium rounded-lg border ${
                              roleColors[item.role] || "bg-zinc-50 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            {item.role}
                          </span>
                          <p className="text-base text-zinc-700 flex-1 whitespace-pre-wrap">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleCopy(selectedPost.text, selectedPost.id)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-colors"
                    >
                      {copiedId === selectedPost.id ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          コピー済み
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          コピー
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRepost(selectedPost)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                      再投稿
                    </button>
                    <button
                      onClick={() => handleSchedule(selectedPost)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors"
                    >
                      <Clock className="w-5 h-5" />
                      予約
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <a
                      href={`/compose/imitate?post=${selectedPost.id}`}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-violet-100 text-violet-700 font-medium rounded-xl hover:bg-violet-200 transition-colors"
                    >
                      <Sparkles className="w-5 h-5" />
                      この構造で生成
                    </a>
                    <button className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-colors">
                      <Quote className="w-5 h-5" />
                      引用投稿
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                  <ArrowUpRight className="w-8 h-8 text-amber-500" />
                </div>
                <p className="text-xl font-medium text-zinc-700 mb-2">
                  投稿を選択
                </p>
                <p className="text-base text-zinc-500">
                  左の一覧から投稿をクリックすると詳細が表示されます
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
