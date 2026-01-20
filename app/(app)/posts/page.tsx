"use client";

import { useState } from "react";
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
} from "lucide-react";

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
}

const samplePosts: Post[] = [
  {
    id: "1",
    text: "プログラミング学習で最も大切なのは「毎日続けること」じゃない。\n\n本当に大切なのは「わからないを楽しむこと」。\n\nわからない → 調べる → わかる\n\nこのサイクルが回り始めたら、あなたは既に一人前のエンジニアへの道を歩んでいる。",
    createdAt: "2024-01-15",
    tier: "S",
    category: "マインド",
    impressions: 25000,
    likes: 350,
    retweets: 85,
    replies: 42,
    structure: [
      { role: "problem", text: "プログラミング学習で最も大切なのは「毎日続けること」じゃない。" },
      { role: "insight", text: "本当に大切なのは「わからないを楽しむこと」。" },
      { role: "process", text: "わからない → 調べる → わかる" },
      { role: "conclusion", text: "このサイクルが回り始めたら、あなたは既に一人前のエンジニアへの道を歩んでいる。" },
    ],
  },
  {
    id: "2",
    text: "【朗報】GitHub Copilot が日本語対応強化\n\nコメントを日本語で書いても、かなり精度高くコード補完してくれるようになった。\n\n特にReact + TypeScriptの組み合わせが最強。\n\nまだ使ってない人は今すぐ試すべき。",
    createdAt: "2024-01-14",
    tier: "A",
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
    text: "エンジニア3年目で気づいたこと\n\n・コードを書く時間より、読む時間のほうが長い\n・完璧を目指すより、動くものを早く出すほうが価値がある\n・一人で抱え込まず、早めに相談するほうが結果的に速い",
    createdAt: "2024-01-13",
    tier: "A",
    category: "ノウハウ",
    impressions: 9500,
    likes: 145,
    retweets: 32,
    replies: 18,
    structure: [
      { role: "headline", text: "エンジニア3年目で気づいたこと" },
      { role: "list", text: "・コードを書く時間より、読む時間のほうが長い\n・完璧を目指すより、動くものを早く出すほうが価値がある\n・一人で抱え込まず、早めに相談するほうが結果的に速い" },
    ],
  },
];

const tierConfig = {
  S: { label: "Tier S", bgColor: "bg-amber-100", textColor: "text-amber-700", description: "同文再投稿OK" },
  A: { label: "Tier A", bgColor: "bg-violet-100", textColor: "text-violet-700", description: "構文模倣" },
  B: { label: "Tier B", bgColor: "bg-blue-100", textColor: "text-blue-700", description: "参考程度" },
  C: { label: "Tier C", bgColor: "bg-zinc-100", textColor: "text-zinc-700", description: "保存のみ" },
};

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

export default function PostsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPosts = samplePosts.filter((post) => {
    const matchesSearch = post.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = selectedTier === "all" || post.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            投稿ランキング
          </h1>
          <p className="text-lg text-zinc-500">
            過去の投稿をティア別に分析・管理
          </p>
        </div>
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

        {/* Tier Filter */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-100 rounded-xl">
          {["all", "S", "A", "B", "C"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2.5 rounded-lg text-base font-medium transition-all ${
                selectedTier === tier
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tier === "all" ? "すべて" : `Tier ${tier}`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts List */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
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
                <span className={`${tierConfig[post.tier].bgColor} ${tierConfig[post.tier].textColor} text-sm font-bold px-3 py-1.5 rounded-lg`}>
                  {post.tier}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-base text-zinc-700 leading-relaxed line-clamp-3 mb-3">
                    {post.text}
                  </p>

                  <div className="flex items-center flex-wrap gap-3 mb-3">
                    <span className="px-3 py-1 text-sm bg-zinc-100 text-zinc-600 rounded-lg">
                      {post.category}
                    </span>
                    <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {post.createdAt}
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

          {filteredPosts.length === 0 && (
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

              {/* Structure */}
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
                        完了
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        同文
                      </>
                    )}
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25">
                    <Sparkles className="w-5 h-5" />
                    模倣
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-colors">
                    <Quote className="w-5 h-5" />
                    Quote
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
    </div>
  );
}
