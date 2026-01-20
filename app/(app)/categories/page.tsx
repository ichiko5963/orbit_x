"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  Edit3,
  X,
  CheckCircle2,
  BarChart3,
  Hash,
  Eye,
  Heart,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Copy,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPosts } from "@/lib/firebase";

interface Post {
  id: string;
  text: string;
  createdAt: string;
  tier: "S" | "A" | "B" | "C";
  category: string;
  impressions: number;
  likes: number;
  retweets: number;
}

interface CategoryData {
  name: string;
  color: string;
  posts: Post[];
  description: string;
}

// Practical X post categories with colors (AI determines proper category - no "その他")
const CATEGORY_CONFIG: Record<string, { color: string; description: string }> = {
  "速報・ニュース系": { color: "#ef4444", description: "最新ニュース・話題の速報" },
  "Tips・ノウハウ系": { color: "#10b981", description: "コツ・方法・テクニック" },
  "記事・コンテンツ紹介系": { color: "#6366f1", description: "ブログ・note・Zenn記事" },
  "ツール・サービス紹介系": { color: "#ec4899", description: "便利ツール・サービス紹介" },
  "動画・メディア紹介系": { color: "#f59e0b", description: "YouTube・Podcast紹介" },
  "プロンプト・AI活用系": { color: "#8b5cf6", description: "ChatGPT・Claude活用" },
  "プロダクト・リリース系": { color: "#3b82f6", description: "新機能・サービスリリース" },
  "イベント・登壇系": { color: "#06b6d4", description: "勉強会・カンファレンス" },
  "プレゼント・キャンペーン系": { color: "#f97316", description: "RT企画・プレゼント" },
  "採用・メンバー募集系": { color: "#84cc16", description: "求人・チームメンバー募集" },
  "日常・つぶやき系": { color: "#a1a1aa", description: "日記・感想・つぶやき" },
};

const tierConfig = {
  S: { bgColor: "bg-amber-100", textColor: "text-amber-700" },
  A: { bgColor: "bg-violet-100", textColor: "text-violet-700" },
  B: { bgColor: "bg-blue-100", textColor: "text-blue-700" },
  C: { bgColor: "bg-zinc-100", textColor: "text-zinc-700" },
};

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Group posts by category
  const categoriesData: CategoryData[] = Object.entries(CATEGORY_CONFIG).map(([name, config]) => {
    const categoryPosts = posts.filter((p) => p.category === name);
    return {
      name,
      color: config.color,
      description: config.description,
      posts: categoryPosts.sort((a, b) => b.likes - a.likes),
    };
  }).filter((cat) => cat.posts.length > 0 || Object.keys(CATEGORY_CONFIG).slice(0, 10).includes(cat.name));

  const totalPosts = posts.length;
  const totalCategories = categoriesData.filter((c) => c.posts.length > 0).length;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedCategoryData = selectedCategory
    ? categoriesData.find((c) => c.name === selectedCategory)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // Category Detail View
  if (selectedCategory && selectedCategoryData) {
    return (
      <div className="animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: selectedCategoryData.color + "20" }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedCategoryData.color }}
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">{selectedCategory}</h1>
              <p className="text-zinc-500">{selectedCategoryData.description}</p>
            </div>
          </div>
          <div className="ml-auto px-4 py-2 bg-zinc-100 rounded-xl">
            <span className="text-lg font-bold text-zinc-900">{selectedCategoryData.posts.length}</span>
            <span className="text-zinc-500 ml-1">件</span>
          </div>
        </div>

        {/* Posts List */}
        {selectedCategoryData.posts.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-lg text-zinc-600 mb-2">このカテゴリーに投稿がありません</p>
            <p className="text-sm text-zinc-400">CSVをインポートして投稿を追加してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedCategoryData.posts.map((post, index) => (
              <div
                key={post.id}
                className="bg-white p-5 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-all"
              >
                <div className="flex items-start gap-4">
                  {/* Rank & Tier */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span className="text-sm text-zinc-400">#{index + 1}</span>
                    <span className={`${tierConfig[post.tier].bgColor} ${tierConfig[post.tier].textColor} text-xs font-bold px-2 py-1 rounded`}>
                      {post.tier}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap mb-3">
                      {post.text}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {formatNumber(post.impressions)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {formatNumber(post.likes)}
                      </span>
                    </div>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(post.text, post.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors flex-shrink-0"
                  >
                    {copiedId === post.id ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Categories List View
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
          カテゴリー管理
        </h1>
        <p className="text-lg text-zinc-500">
          投稿をカテゴリー別に閲覧・管理
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <Hash className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">{totalCategories}</p>
              <p className="text-sm text-zinc-500">使用中カテゴリー</p>
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">{totalPosts}</p>
              <p className="text-sm text-zinc-500">総投稿数</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {categoriesData.map((category) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(category.name)}
            className="w-full group flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-md transition-all text-left"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: category.color + "20" }}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-zinc-900">{category.name}</h3>
                <span className="px-2.5 py-1 text-sm font-medium bg-zinc-100 text-zinc-600 rounded-lg">
                  {category.posts.length}件
                </span>
              </div>
              <p className="text-sm text-zinc-500 truncate mt-0.5">
                {category.description}
              </p>
            </div>

            {/* Tier breakdown */}
            {category.posts.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {(["S", "A", "B", "C"] as const).map((tier) => {
                  const count = category.posts.filter((p) => p.tier === tier).length;
                  if (count === 0) return null;
                  return (
                    <span
                      key={tier}
                      className={`px-2 py-0.5 text-xs font-medium rounded ${tierConfig[tier].bgColor} ${tierConfig[tier].textColor}`}
                    >
                      {tier}:{count}
                    </span>
                  );
                })}
              </div>
            )}

            <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center mt-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-lg text-zinc-600 mb-2">投稿がありません</p>
          <p className="text-sm text-zinc-400 mb-6">CSVをインポートして投稿を追加してください</p>
          <a
            href="/import"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
          >
            CSVをインポート
          </a>
        </div>
      )}
    </div>
  );
}
