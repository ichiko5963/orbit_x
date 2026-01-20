"use client";

import { useState } from "react";
import { Search, Sparkles, Check, ChevronDown, Heart, Eye } from "lucide-react";

export interface ReferencePost {
  id: string;
  text: string;
  likes: number;
  impressions: number;
  tier: "S" | "A" | "B" | "C";
  category: string;
}

interface ReferencePostSelectorProps {
  posts: ReferencePost[];
  selectedPostId: string | null;
  onSelect: (postId: string | null) => void;
  onAutoSelect: () => void;
  isAutoSelecting?: boolean;
}

const tierColors = {
  S: "bg-amber-100 text-amber-700 border-amber-200",
  A: "bg-emerald-100 text-emerald-700 border-emerald-200",
  B: "bg-blue-100 text-blue-700 border-blue-200",
  C: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const categories = ["すべて", "マインド", "速報", "ノウハウ", "キャリア", "技術", "ツール", "その他"];

export function ReferencePostSelector({
  posts,
  selectedPostId,
  onSelect,
  onAutoSelect,
  isAutoSelecting = false,
}: ReferencePostSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter posts by tier S/A and category
  const filteredPosts = posts
    .filter((post) => post.tier === "S" || post.tier === "A")
    .filter((post) => selectedCategory === "すべて" || post.category === selectedCategory)
    .filter((post) =>
      searchQuery === "" ||
      post.text.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const selectedPost = posts.find((p) => p.id === selectedPostId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-zinc-700">
          参考投稿を選択（S/Aティアのみ）
        </label>
        <button
          onClick={onAutoSelect}
          disabled={isAutoSelecting}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
        >
          {isAutoSelecting ? (
            <>
              <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              選択中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              AIが最適を選択
            </>
          )}
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="投稿を検索..."
            className="w-full h-10 pl-10 pr-4 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 h-10 px-4 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            {selectedCategory}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showDropdown && (
            <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg z-10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 first:rounded-t-lg last:rounded-b-lg ${
                    selectedCategory === cat ? "bg-emerald-50 text-emerald-700" : "text-zinc-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Post Preview */}
      {selectedPost && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${tierColors[selectedPost.tier]}`}>
                {selectedPost.tier}ティア
              </span>
              <span className="text-xs text-zinc-500">{selectedPost.category}</span>
            </div>
            <button
              onClick={() => onSelect(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700"
            >
              選択解除
            </button>
          </div>
          <p className="text-sm text-zinc-700 line-clamp-3 whitespace-pre-line">
            {selectedPost.text}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {selectedPost.likes.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {selectedPost.impressions.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Posts List */}
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            S/Aティアの参考投稿がありません
          </div>
        ) : (
          filteredPosts.map((post) => (
            <button
              key={post.id}
              onClick={() => onSelect(post.id)}
              className={`w-full p-3 rounded-xl text-left transition-all ${
                selectedPostId === post.id
                  ? "bg-emerald-50 border-2 border-emerald-500"
                  : "bg-zinc-50 border-2 border-transparent hover:border-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${tierColors[post.tier]}`}>
                    {post.tier}
                  </span>
                  <span className="text-xs text-zinc-500">{post.category}</span>
                </div>
                {selectedPostId === post.id && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <p className="text-sm text-zinc-700 line-clamp-2">{post.text}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {post.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {post.impressions.toLocaleString()}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
