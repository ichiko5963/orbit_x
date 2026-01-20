"use client";

import { useState, useRef } from "react";
import {
  Users,
  Search,
  Plus,
  X,
  ExternalLink,
  Heart,
  MessageCircle,
  RefreshCw,
  Eye,
  Copy,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Link as LinkIcon,
  Calendar,
  Upload,
  FileText,
  AlertCircle,
} from "lucide-react";

interface ViralPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  createdAt: string;
  category: string;
  saved: boolean;
}

const sampleViralPosts: ViralPost[] = [
  {
    id: "1",
    text: "エンジニアとして10年働いて気づいた真実\n\n・コードを書く能力より、人に説明する能力のほうが重要\n・完璧なコードより、動くコードを早く出すほうが価値がある\n・一人で抱え込むより、チームに頼るほうが成長できる\n\nこれが分かるまでに5年かかった。",
    author: "プログラマーさん",
    authorHandle: "@programmer_san",
    url: "https://x.com/programmer_san/status/123456789",
    likes: 15000,
    retweets: 3200,
    replies: 450,
    impressions: 2500000,
    createdAt: "2024-01-14",
    category: "マインド",
    saved: true,
  },
  {
    id: "2",
    text: "【永久保存版】フリーランスエンジニアの確定申告完全ガイド\n\n今年初めて確定申告する人向けに、必要な書類から節税テクニックまで全部まとめた。\n\n保存しておくと、来年の確定申告シーズンに役立つはず。\n\n↓詳細はリプ欄",
    author: "フリーランス太郎",
    authorHandle: "@freelance_taro",
    url: "https://x.com/freelance_taro/status/234567890",
    likes: 8500,
    retweets: 2100,
    replies: 180,
    impressions: 1200000,
    createdAt: "2024-01-13",
    category: "ノウハウ",
    saved: false,
  },
  {
    id: "3",
    text: "ChatGPTに「私は〇〇のエキスパートです」と言わせてから質問すると、回答の質が劇的に上がる。\n\n例：「あなたはReactの専門家です。次の質問に答えてください」\n\nこれだけで、初心者向けの説明じゃなく、実務レベルの回答が返ってくる。",
    author: "AI活用マスター",
    authorHandle: "@ai_master",
    url: "https://x.com/ai_master/status/345678901",
    likes: 25000,
    retweets: 5500,
    replies: 320,
    impressions: 4000000,
    createdAt: "2024-01-12",
    category: "技術",
    saved: true,
  },
];

const categories = ["すべて", "マインド", "ノウハウ", "技術", "キャリア", "その他"];

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function ViralPage() {
  const [posts, setPosts] = useState<ViralPost[]>(sampleViralPosts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [newPostUrl, setNewPostUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImportResult, setCsvImportResult] = useState<{ imported: number; filtered: number } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddPost = async () => {
    if (!newPostUrl) return;

    setIsAdding(true);

    try {
      const response = await fetch("/api/viral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newPostUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "投稿の追加に失敗しました");
      }

      setPosts((prev) => [data.post, ...prev]);
      setNewPostUrl("");
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Add post error:", error);
      alert(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setIsAdding(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;

    setIsImporting(true);
    setCsvImportResult(null);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n");
      const header = lines[0];
      const dataLines = lines.slice(1);

      let importedCount = 0;
      let filteredCount = 0;
      const newPosts: ViralPost[] = [];

      for (const line of dataLines) {
        if (!line.trim()) continue;

        // @を含む行を除外
        if (line.includes("@")) {
          filteredCount++;
          continue;
        }

        // CSV解析（簡易版）
        const columns = line.split(",").map(col => col.trim().replace(/^"|"$/g, ""));

        if (columns.length >= 1 && columns[0]) {
          const post: ViralPost = {
            id: `csv-${Date.now()}-${importedCount}`,
            text: columns[0] || "",
            author: columns[1] || "不明",
            authorHandle: columns[2] || "@unknown",
            url: columns[3] || "",
            likes: parseInt(columns[4]) || 0,
            retweets: parseInt(columns[5]) || 0,
            replies: parseInt(columns[6]) || 0,
            impressions: parseInt(columns[7]) || 0,
            createdAt: columns[8] || new Date().toISOString().split("T")[0],
            category: columns[9] || "その他",
            saved: true,
          };
          newPosts.push(post);
          importedCount++;
        }
      }

      setPosts((prev) => [...newPosts, ...prev]);
      setCsvImportResult({ imported: importedCount, filtered: filteredCount });
    } catch (error) {
      console.error("CSV import error:", error);
      alert("CSVの読み込みに失敗しました");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCopy = (post: ViralPost) => {
    navigator.clipboard.writeText(post.text);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSave = (id: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, saved: !post.saved } : post
      )
    );
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "すべて" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            バズ投稿参考
          </h1>
          <p className="text-lg text-zinc-500">
            他アカウントのバズ投稿を収集・分析。構文の参考に。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-100 text-zinc-700 text-base font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
          >
            <Upload className="w-5 h-5" />
            CSVインポート
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
          >
            <Plus className="w-5 h-5" />
            投稿を追加
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">{posts.length}</p>
              <p className="text-base text-zinc-500">保存済み投稿</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
              <Heart className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">
                {formatNumber(posts.reduce((sum, p) => sum + p.likes, 0))}
              </p>
              <p className="text-base text-zinc-500">合計いいね</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">
                {formatNumber(posts.reduce((sum, p) => sum + p.impressions, 0))}
              </p>
              <p className="text-base text-zinc-500">合計インプレッション</p>
            </div>
          </div>
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

        {/* Category Filter */}
        <div className="flex items-center gap-2 p-1.5 bg-zinc-100 rounded-xl overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2.5 rounded-lg text-base font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map((post) => (
          <div
            key={post.id}
            className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white text-lg font-semibold">
                  {post.author[0]}
                </div>
                <div>
                  <p className="font-semibold text-zinc-900 text-lg">{post.author}</p>
                  <p className="text-base text-zinc-500">{post.authorHandle}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 text-sm bg-zinc-100 text-zinc-600 rounded-lg font-medium">
                  {post.category}
                </span>
                <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {post.createdAt}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 bg-zinc-50 rounded-xl mb-4">
              <p className="text-base text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {post.text}
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 mb-4">
              <span className="flex items-center gap-2 text-base text-zinc-500">
                <Eye className="w-5 h-5" />
                {formatNumber(post.impressions)}
              </span>
              <span className="flex items-center gap-2 text-base text-zinc-500">
                <Heart className="w-5 h-5" />
                {formatNumber(post.likes)}
              </span>
              <span className="flex items-center gap-2 text-base text-zinc-500">
                <RefreshCw className="w-4 h-4" />
                {formatNumber(post.retweets)}
              </span>
              <span className="flex items-center gap-2 text-base text-zinc-500">
                <MessageCircle className="w-5 h-5" />
                {formatNumber(post.replies)}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
              <button
                onClick={() => handleCopy(post)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-700 text-base font-medium rounded-xl hover:bg-zinc-200 transition-colors"
              >
                {copiedId === post.id ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    コピー完了
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    コピー
                  </>
                )}
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-base font-medium rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25">
                <Sparkles className="w-5 h-5" />
                模倣して生成
              </button>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-700 text-base font-medium rounded-xl hover:bg-zinc-200 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                元投稿を見る
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-lg text-zinc-600 mb-1">投稿が見つかりません</p>
          <p className="text-base text-zinc-400">検索条件を変更してください</p>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-lg p-8 bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-zinc-900">
                バズ投稿を追加
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-base font-medium text-zinc-700 mb-2">
                投稿URL
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                <input
                  type="url"
                  value={newPostUrl}
                  onChange={(e) => setNewPostUrl(e.target.value)}
                  placeholder="https://x.com/username/status/..."
                  className="w-full h-12 pl-12 pr-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                X (Twitter) の投稿URLを貼り付けてください
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex-1 px-4 py-3 text-zinc-600 text-base font-medium rounded-xl hover:bg-zinc-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddPost}
                disabled={!newPostUrl || isAdding}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
              >
                {isAdding ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    取得中...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    追加
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsCsvModalOpen(false);
              setCsvFile(null);
              setCsvImportResult(null);
            }}
          />
          <div className="relative w-full max-w-lg p-8 bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-zinc-900">
                バズ投稿をCSVインポート
              </h3>
              <button
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvFile(null);
                  setCsvImportResult(null);
                }}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {csvImportResult ? (
              <div className="mb-6">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-800">
                      インポート完了
                    </p>
                    <p className="text-sm text-emerald-700">
                      {csvImportResult.imported}件の投稿をインポートしました
                    </p>
                  </div>
                </div>
                {csvImportResult.filtered > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800">
                        @を含む行を除外
                      </p>
                      <p className="text-sm text-amber-700">
                        {csvImportResult.filtered}件の行を除外しました（リプライ等）
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvFile(null);
                    setCsvImportResult(null);
                  }}
                  className="w-full mt-6 px-4 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                >
                  閉じる
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full p-8 border-2 border-dashed border-zinc-200 rounded-xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                  >
                    {csvFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-emerald-500" />
                        <div className="text-left">
                          <p className="font-semibold text-zinc-900">{csvFile.name}</p>
                          <p className="text-sm text-zinc-500">
                            {(csvFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                        <p className="font-semibold text-zinc-900 mb-1">
                          CSVファイルを選択
                        </p>
                        <p className="text-sm text-zinc-500">
                          クリックしてファイルを選択
                        </p>
                      </div>
                    )}
                  </button>
                  <p className="mt-3 text-sm text-zinc-500">
                    @を含む行（リプライ等）は自動的に除外されます
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsCsvModalOpen(false);
                      setCsvFile(null);
                    }}
                    className="flex-1 px-4 py-3 text-zinc-600 text-base font-medium rounded-xl hover:bg-zinc-100 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleCsvImport}
                    disabled={!csvFile || isImporting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        インポート中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        インポート
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
