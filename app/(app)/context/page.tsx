"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Sparkles,
  Upload,
  Link as LinkIcon,
  Edit3,
  Trash2,
  Heart,
  Eye,
  Search,
  ChevronDown,
  Copy,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getContextPosts, saveContextPosts, deleteContextPost, clearContextPosts } from "@/lib/firebase";

interface ContextPost {
  id: string;
  text: string;
  tier: "S" | "A" | "B" | "C";
  category: string;
  likes: number;
  impressions: number;
  source?: string;
  createdAt?: string;
}

// 10+ categories
const CATEGORIES = [
  "マインドセット",
  "キャリア・転職",
  "技術・プログラミング",
  "ツール・サービス",
  "ニュース・速報",
  "学習・勉強法",
  "仕事術・生産性",
  "日常・雑談",
  "お知らせ・告知",
  "その他",
];

const tierConfig = {
  S: { bgColor: "bg-amber-100", textColor: "text-amber-700", condition: "200+いいね" },
  A: { bgColor: "bg-violet-100", textColor: "text-violet-700", condition: "100-199いいね" },
  B: { bgColor: "bg-blue-100", textColor: "text-blue-700", condition: "50-99いいね" },
  C: { bgColor: "bg-zinc-100", textColor: "text-zinc-700", condition: "49以下" },
};

function calculateTier(likes: number): "S" | "A" | "B" | "C" {
  if (likes >= 200) return "S";
  if (likes >= 100) return "A";
  if (likes >= 50) return "B";
  return "C";
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + "万";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

// Helper to map fetched posts to ContextPost type
function mapToContextPosts(fetchedPosts: any[]): ContextPost[] {
  return fetchedPosts.map((p: any) => ({
    id: p.id,
    text: p.text || "",
    tier: p.tier || "C",
    category: p.category || "その他",
    likes: p.likes || 0,
    impressions: p.impressions || 0,
    source: p.source,
    createdAt: p.createdAt || p.importedAt,
  }));
}

export default function ContextPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ContextPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "csv">("manual");
  const [manualText, setManualText] = useState("");
  const [manualLikes, setManualLikes] = useState("");
  const [manualImpressions, setManualImpressions] = useState("");
  const [manualCategory, setManualCategory] = useState(CATEGORIES[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Load posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const fetchedPosts = await getContextPosts(user.uid);
        setPosts(mapToContextPosts(fetchedPosts));
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, [user]);

  // AI Categorize
  const handleAICategorize = async () => {
    if (!manualText.trim()) return;

    setIsCategorizing(true);
    try {
      // Simple keyword-based categorization (can be replaced with API call)
      const text = manualText.toLowerCase();
      let category = "その他";

      if (/マインド|考え方|大切|重要|気づ|学んだ/.test(manualText)) category = "マインドセット";
      else if (/転職|キャリア|年収|副業|フリーランス/.test(manualText)) category = "キャリア・転職";
      else if (/react|typescript|javascript|python|api|コード|実装|開発|エンジニア/.test(text)) category = "技術・プログラミング";
      else if (/chatgpt|copilot|notion|figma|ツール|サービス|アプリ/.test(text)) category = "ツール・サービス";
      else if (/速報|朗報|悲報|発表|リリース|アップデート/.test(manualText)) category = "ニュース・速報";
      else if (/勉強|学習|読書|本|おすすめ|入門/.test(manualText)) category = "学習・勉強法";
      else if (/効率|時短|生産性|タスク|習慣|仕事/.test(manualText)) category = "仕事術・生産性";
      else if (/今日|日記|つぶやき|思った/.test(manualText)) category = "日常・雑談";
      else if (/お知らせ|告知|イベント|募集/.test(manualText)) category = "お知らせ・告知";

      setManualCategory(category);
    } finally {
      setIsCategorizing(false);
    }
  };

  // Add Single Post
  const handleAddPost = async () => {
    if (!user || !manualText.trim()) return;

    setIsAdding(true);
    try {
      const likes = parseInt(manualLikes) || 0;
      const impressions = parseInt(manualImpressions) || 0;

      const newPost = {
        text: manualText.trim(),
        likes,
        impressions,
        tier: calculateTier(likes),
        category: manualCategory,
        source: "manual",
        createdAt: new Date().toISOString(),
      };

      await saveContextPosts(user.uid, [newPost]);

      // Reload posts
      const fetchedPosts = await getContextPosts(user.uid);
      setPosts(mapToContextPosts(fetchedPosts));

      // Reset form
      setManualText("");
      setManualLikes("");
      setManualImpressions("");
      setManualCategory(CATEGORIES[0]);
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to add post:", error);
    } finally {
      setIsAdding(false);
    }
  };

  // CSV Import
  const handleCSVImport = async () => {
    if (!user || !csvFile) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n");
      const header = lines[0].toLowerCase();

      // Find column indices
      const cols = header.split(",").map(c => c.trim().replace(/"/g, ""));
      const textIdx = cols.findIndex(c => c.includes("本文") || c.includes("text") || c.includes("ポスト"));
      const likesIdx = cols.findIndex(c => c.includes("いいね") || c.includes("like"));
      const impressionsIdx = cols.findIndex(c => c.includes("インプレッション") || c.includes("impression"));

      if (textIdx === -1) {
        throw new Error("投稿本文のカラムが見つかりません");
      }

      const newPosts: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.includes("@")) continue; // Skip empty lines and replies

        // Parse CSV line properly
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const postText = values[textIdx]?.replace(/^"|"$/g, "");
        if (!postText) continue;

        const likes = parseInt(values[likesIdx]) || 0;
        const impressions = parseInt(values[impressionsIdx]) || 0;

        // AI Categorization
        let category = "その他";
        const lowerText = postText.toLowerCase();

        if (/マインド|考え方|大切|重要|気づ|学んだ/.test(postText)) category = "マインドセット";
        else if (/転職|キャリア|年収|副業|フリーランス/.test(postText)) category = "キャリア・転職";
        else if (/react|typescript|javascript|python|api|コード|実装|開発|エンジニア/.test(lowerText)) category = "技術・プログラミング";
        else if (/chatgpt|copilot|notion|figma|ツール|サービス|アプリ/.test(lowerText)) category = "ツール・サービス";
        else if (/速報|朗報|悲報|発表|リリース|アップデート/.test(postText)) category = "ニュース・速報";
        else if (/勉強|学習|読書|本|おすすめ|入門/.test(postText)) category = "学習・勉強法";
        else if (/効率|時短|生産性|タスク|習慣|仕事/.test(postText)) category = "仕事術・生産性";
        else if (/今日|日記|つぶやき|思った/.test(postText)) category = "日常・雑談";
        else if (/お知らせ|告知|イベント|募集/.test(postText)) category = "お知らせ・告知";

        newPosts.push({
          text: postText,
          likes,
          impressions,
          tier: calculateTier(likes),
          category,
          source: "csv",
          createdAt: new Date().toISOString(),
        });

        setImportProgress(Math.round((i / lines.length) * 100));
      }

      if (newPosts.length === 0) {
        throw new Error("インポートできる投稿が見つかりませんでした");
      }

      await saveContextPosts(user.uid, newPosts);

      // Reload posts
      const fetchedPosts = await getContextPosts(user.uid);
      setPosts(mapToContextPosts(fetchedPosts));

      setCsvFile(null);
      setShowAddModal(false);
      setImportProgress(100);
    } catch (error) {
      console.error("Failed to import:", error);
      alert(error instanceof Error ? error.message : "インポートに失敗しました");
    } finally {
      setIsImporting(false);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!user) return;

    try {
      await deleteContextPost(user.uid, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  // Copy Post
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "すべて" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Stats
  const stats = {
    total: posts.length,
    tierS: posts.filter(p => p.tier === "S").length,
    tierA: posts.filter(p => p.tier === "A").length,
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-zinc-500">ログインが必要です</p>
      </div>
    );
  }

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
            バズ投稿参考
          </h1>
          <p className="text-lg text-zinc-500">
            他アカウントのバズ投稿を追加して、AI生成の参考に
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-5 h-5" />
          投稿を追加
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
              <p className="text-sm text-zinc-500">参考投稿</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <span className="text-lg font-bold text-amber-700">S</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.tierS}</p>
              <p className="text-sm text-zinc-500">Sティア</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <span className="text-lg font-bold text-violet-700">A</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{stats.tierA}</p>
              <p className="text-sm text-zinc-500">Aティア</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="投稿を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-12 px-4 bg-white border border-zinc-200 rounded-xl text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="すべて">すべてのカテゴリー</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 mb-2">
            {posts.length === 0 ? "参考投稿がありません" : "検索結果がありません"}
          </h3>
          <p className="text-zinc-500 mb-6">
            {posts.length === 0 ? "他アカウントのバズ投稿を追加して、AI生成の参考にしましょう" : "検索条件を変更してください"}
          </p>
          {posts.length === 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              投稿を追加
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white p-5 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Tier Badge */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span className={`${tierConfig[post.tier].bgColor} ${tierConfig[post.tier].textColor} text-sm font-bold px-3 py-1.5 rounded-lg`}>
                    {post.tier}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap mb-3">
                    {post.text}
                  </p>
                  <div className="flex items-center flex-wrap gap-3">
                    <span className="px-3 py-1 text-sm bg-zinc-100 text-zinc-600 rounded-lg">
                      {post.category}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-zinc-400">
                      <Heart className="w-4 h-4" />
                      {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1 text-sm text-zinc-400">
                      <Eye className="w-4 h-4" />
                      {formatNumber(post.impressions)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => handleCopy(post.text, post.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    {copiedId === post.id ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Copy className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-xl font-semibold text-zinc-900">バズ投稿を追加</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-zinc-200">
              <button
                onClick={() => setAddMode("manual")}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  addMode === "manual"
                    ? "text-emerald-600 border-b-2 border-emerald-500"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  手動入力
                </span>
              </button>
              <button
                onClick={() => setAddMode("csv")}
                className={`flex-1 py-3 text-center font-medium transition-colors ${
                  addMode === "csv"
                    ? "text-emerald-600 border-b-2 border-emerald-500"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  CSV/Excelインポート
                </span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {addMode === "manual" ? (
                <div className="space-y-4">
                  {/* Post Text */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      投稿内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="バズった投稿の内容をコピペ..."
                      className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* AI Categorize Button */}
                  <button
                    onClick={handleAICategorize}
                    disabled={!manualText.trim() || isCategorizing}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 font-medium rounded-xl hover:bg-violet-200 disabled:opacity-50 transition-colors"
                  >
                    {isCategorizing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    AIでカテゴリー判定
                  </button>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">
                        いいね数
                      </label>
                      <input
                        type="number"
                        value={manualLikes}
                        onChange={(e) => setManualLikes(e.target.value)}
                        placeholder="例: 250"
                        className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">
                        インプレッション数
                      </label>
                      <input
                        type="number"
                        value={manualImpressions}
                        onChange={(e) => setManualImpressions(e.target.value)}
                        placeholder="例: 50000"
                        className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      カテゴリー
                    </label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tier Preview */}
                  {manualLikes && (
                    <div className="p-4 bg-zinc-50 rounded-xl">
                      <p className="text-sm text-zinc-500 mb-2">ティア判定:</p>
                      <span className={`${tierConfig[calculateTier(parseInt(manualLikes) || 0)].bgColor} ${tierConfig[calculateTier(parseInt(manualLikes) || 0)].textColor} text-sm font-bold px-3 py-1.5 rounded-lg`}>
                        Tier {calculateTier(parseInt(manualLikes) || 0)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* CSV Upload */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      csvFile ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    {csvFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-emerald-600" />
                        <div className="text-left">
                          <p className="font-medium text-zinc-900">{csvFile.name}</p>
                          <p className="text-sm text-zinc-500">{(csvFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={() => setCsvFile(null)}
                          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                        <p className="text-zinc-700 font-medium mb-2">CSVまたはExcelファイルをドロップ</p>
                        <p className="text-sm text-zinc-500 mb-4">または</p>
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="csv-file"
                        />
                        <label
                          htmlFor="csv-file"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
                        >
                          ファイルを選択
                        </label>
                      </>
                    )}
                  </div>

                  {/* Import Info */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium mb-1">CSVの必須カラム:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          <li>ポスト本文（または「text」）</li>
                          <li>いいね（または「likes」）- オプション</li>
                          <li>インプレッション数 - オプション</li>
                        </ul>
                        <p className="mt-2">AIが自動でカテゴリーを判定します</p>
                      </div>
                    </div>
                  </div>

                  {/* Import Progress */}
                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-700">インポート中...</span>
                        <span className="text-sm text-zinc-500">{importProgress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-zinc-600 font-medium rounded-xl hover:bg-zinc-100 transition-colors"
                >
                  キャンセル
                </button>
                {addMode === "manual" ? (
                  <button
                    onClick={handleAddPost}
                    disabled={!manualText.trim() || isAdding}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    追加
                  </button>
                ) : (
                  <button
                    onClick={handleCSVImport}
                    disabled={!csvFile || isImporting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {isImporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    インポート
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
