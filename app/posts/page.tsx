"use client";

import { useState } from "react";
import {
  Eye,
  Heart,
  Repeat2,
  MessageCircle,
  Search,
  Calendar,
  ArrowUpRight,
  Copy,
  Sparkles,
  Quote,
  X,
  TrendingUp,
} from "lucide-react";
import { Badge, Input } from "../components/ui";

interface Post {
  id: string;
  text: string;
  createdAt: string;
  tier: "S" | "A" | "B" | "C";
  genre: string;
  category: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  structure: {
    role: string;
    text: string;
  }[];
}

const samplePosts: Post[] = [
  {
    id: "1",
    text: "プログラミング学習で最も大切なのは「毎日続けること」じゃない。\n\n本当に大切なのは「わからないを楽しむこと」。\n\nわからない → 調べる → わかる\n\nこのサイクルが回り始めたら、あなたは既に一人前のエンジニアへの道を歩んでいる。",
    createdAt: "2024-01-15T10:30:00Z",
    tier: "S",
    genre: "技術",
    category: "マインド",
    impressions: 25000,
    likes: 350,
    retweets: 85,
    replies: 42,
    structure: [
      { role: "problem", text: "プログラミング学習で最も大切なのは「毎日続けること」じゃない。" },
      { role: "insight", text: "本当に大切なのは「わからないを楽しむこと」。" },
      { role: "solution", text: "わからない → 調べる → わかる" },
      { role: "conclusion", text: "このサイクルが回り始めたら、あなたは既に一人前のエンジニアへの道を歩んでいる。" },
    ],
  },
  {
    id: "2",
    text: "【朗報】GitHub Copilot が日本語対応強化\n\nコメントを日本語で書いても、かなり精度高くコード補完してくれるようになった。\n\n特にReact + TypeScriptの組み合わせが最強。\n\nまだ使ってない人は今すぐ試すべき。",
    createdAt: "2024-01-14T15:20:00Z",
    tier: "A",
    genre: "技術",
    category: "速報",
    impressions: 12000,
    likes: 180,
    retweets: 45,
    replies: 28,
    structure: [
      { role: "headline", text: "【朗報】GitHub Copilot が日本語対応強化" },
      { role: "detail", text: "コメントを日本語で書いても、かなり精度高くコード補完してくれるようになった。" },
      { role: "insight", text: "特にReact + TypeScriptの組み合わせが最強。" },
      { role: "cta", text: "まだ使ってない人は今すぐ試すべき。" },
    ],
  },
  {
    id: "3",
    text: "エンジニア3年目で気づいたこと\n\n・コードを書く時間より、読む時間のほうが長い\n・完璧を目指すより、動くものを早く出すほうが価値がある\n・一人で抱え込まず、早めに相談するほうが結果的に速い\n\n全部、先輩に言われてたけど、実感するまで時間かかった。",
    createdAt: "2024-01-13T09:00:00Z",
    tier: "A",
    genre: "キャリア",
    category: "ノウハウ",
    impressions: 9500,
    likes: 145,
    retweets: 32,
    replies: 18,
    structure: [
      { role: "headline", text: "エンジニア3年目で気づいたこと" },
      { role: "list", text: "・コードを書く時間より、読む時間のほうが長い\n・完璧を目指すより、動くものを早く出すほうが価値がある\n・一人で抱え込まず、早めに相談するほうが結果的に速い" },
      { role: "reflection", text: "全部、先輩に言われてたけど、実感するまで時間かかった。" },
    ],
  },
  {
    id: "4",
    text: "【記事紹介】Next.js 15の新機能まとめ\n\nPartial Prerenderingがついに安定版に。\n\nこれでSSRとSSGのいいとこ取りができるようになった。\n\nVercelのブログで詳細解説されてるので要チェック。",
    createdAt: "2024-01-12T18:45:00Z",
    tier: "B",
    genre: "技術",
    category: "記事紹介",
    impressions: 5200,
    likes: 78,
    retweets: 22,
    replies: 8,
    structure: [
      { role: "headline", text: "【記事紹介】Next.js 15の新機能まとめ" },
      { role: "highlight", text: "Partial Prerenderingがついに安定版に。" },
      { role: "benefit", text: "これでSSRとSSGのいいとこ取りができるようになった。" },
      { role: "cta", text: "Vercelのブログで詳細解説されてるので要チェック。" },
    ],
  },
];

const tierVariants = {
  S: "tier-s" as const,
  A: "tier-a" as const,
  B: "tier-b" as const,
  C: "tier-c" as const,
};

const roleColors: Record<string, string> = {
  problem: "bg-red-500/20 text-red-400 border-red-500/30",
  headline: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  insight: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  solution: "bg-green-500/20 text-green-400 border-green-500/30",
  conclusion: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cta: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  detail: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  list: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  reflection: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  highlight: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  benefit: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  context: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PostsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const filteredPosts = samplePosts.filter((post) => {
    const matchesSearch = post.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "all" || post.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-sm text-zinc-500">Posts</span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
          投稿ランキング
        </h1>
        <p className="text-lg text-zinc-400">
          過去の投稿をインプレッション順で確認・分析
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="投稿を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1.5">
          {["all", "S", "A", "B", "C"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedTier === tier
                  ? "bg-white text-zinc-900"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tier === "all" ? "すべて" : `Tier ${tier}`}
            </button>
          ))}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => setSelectedPost(post)}
              className={`group bg-zinc-900/50 border rounded-2xl p-5 cursor-pointer transition-all duration-300 card-hover ${
                selectedPost?.id === post.id
                  ? "border-violet-500/50 bg-violet-500/5"
                  : "border-zinc-800/50 hover:border-zinc-700/50"
              }`}
            >
              <div className="flex items-start gap-4">
                <Badge variant={tierVariants[post.tier]} className="text-base px-3 py-1.5">
                  {post.tier}
                </Badge>

                <div className="flex-1 min-w-0">
                  <p className="text-base text-zinc-300 leading-relaxed line-clamp-3 mb-4">
                    {post.text}
                  </p>

                  <div className="flex items-center flex-wrap gap-3 mb-4">
                    <span className="px-2.5 py-1 text-xs bg-zinc-800/50 text-zinc-400 rounded-lg">
                      {post.genre}
                    </span>
                    <span className="px-2.5 py-1 text-xs bg-zinc-800/50 text-zinc-400 rounded-lg">
                      {post.category}
                    </span>
                    <span className="text-xs text-zinc-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(post.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm font-medium text-zinc-400">
                        {formatNumber(post.impressions)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium text-zinc-400">
                        {formatNumber(post.likes)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Repeat2 className="w-4 h-4" />
                      <span className="text-sm text-zinc-500">
                        {formatNumber(post.retweets)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm text-zinc-500">
                        {formatNumber(post.replies)}
                      </span>
                    </div>
                  </div>
                </div>

                <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          {selectedPost ? (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-zinc-800/50">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant={tierVariants[selectedPost.tier]} className="text-lg px-4 py-2">
                    Tier {selectedPost.tier}
                  </Badge>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-2 text-zinc-400">
                    <Eye className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">{formatNumber(selectedPost.impressions)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-zinc-400">
                    <Heart className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium">{formatNumber(selectedPost.likes)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-zinc-400">
                    <Repeat2 className="w-4 h-4 text-zinc-500" />
                    {formatNumber(selectedPost.retweets)}
                  </span>
                </div>
              </div>

              {/* Original Text */}
              <div className="p-6 border-b border-zinc-800/50">
                <h4 className="text-sm font-medium text-zinc-500 mb-3">投稿本文</h4>
                <div className="p-4 bg-zinc-800/30 rounded-xl">
                  <p className="text-base text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {selectedPost.text}
                  </p>
                </div>
              </div>

              {/* Structure */}
              <div className="p-6 border-b border-zinc-800/50">
                <h4 className="text-sm font-medium text-zinc-500 mb-3">構造分析</h4>
                <div className="space-y-3">
                  {selectedPost.structure.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-xl"
                    >
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                          roleColors[item.role] || "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {item.role}
                      </span>
                      <p className="text-sm text-zinc-300 flex-1 whitespace-pre-wrap">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-6">
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-white text-zinc-900 font-medium rounded-xl hover:bg-zinc-100 transition-colors btn-press">
                    <Copy className="w-4 h-4" />
                    同文
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors btn-press">
                    <Sparkles className="w-4 h-4" />
                    模倣
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-medium rounded-xl hover:bg-zinc-700 transition-colors btn-press">
                    <Quote className="w-4 h-4" />
                    Quote
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-lg font-medium text-zinc-400 mb-2">
                投稿を選択してください
              </p>
              <p className="text-sm text-zinc-600">
                左の一覧から投稿をクリックすると詳細が表示されます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
