"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  Send,
  BookmarkPlus,
  ExternalLink,
  Image as ImageIcon,
  Video,
  Heart,
  RefreshCw,
  Search,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Plus,
  Calendar,
  Copy,
  AlertTriangle,
  Sparkles,
  Repeat2,
  MessageCircle,
  Bookmark,
  ArrowUpDown,
  Play,
  Pencil,
  ShieldCheck,
  Wand2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDailyX } from "@/lib/daily-x-context";

// ==============================
// Types
// ==============================

interface OriginalTweet {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorProfileImage?: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
  createdAt: string;
  hasVideo: boolean;
  hasImage: boolean;
  imageUrls: string[];
  videoUrl?: string;
}

interface DailyPost {
  id: string;
  originalTweet: OriginalTweet;
  generatedText: string;
  finalPostText: string;
  mediaImageUrls: string[];
  status: "pending" | "posted" | "drafted" | "skipped" | "scheduled";
  postedAt?: string;
  scheduledAt?: string;
  tweetId?: string;
  source: "keyword" | "trending" | "account_monitor";
  sourceKeyword?: string;
  sourceAccount?: string;
  createdAt: string;
}

interface SearchTweet {
  id: string;
  text: string;
  translatedText?: string;
  authorName: string;
  authorUsername: string;
  authorProfileImage?: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
  createdAt: string;
  hasVideo: boolean;
  hasImage: boolean;
  imageUrls: string[];
  videoUrl?: string;
  videoMp4Url?: string;
  videoPreviewUrl?: string;
  keyword: string;
}

interface DailyXSettings {
  keywords: string[];
  monitoredAccounts: string[];
  discordWebhookUrl: string;
  minLikes: number | "";
  maxTweets: number | "";
}

type SourceFilter = "all" | "keyword" | "trending" | "account_monitor";
type ViewMode = "posts" | "search" | "bookmarks";
type SortMode = "likes" | "retweets" | "keyword";

const DEFAULT_KEYWORDS = [
  "ClaudeCode", "Claude Code", "Opus", "Antigravity",
  "GeminiCLI", "Gemini CLI", "Codex", "Cursor",
  "Vercel", "Supabase", "Next.js", "React",
  "Vibe Coding", "OpenClaw",
];

// ==============================
// Main Page
// ==============================

export default function DailyXPage() {
  const { user } = useAuth();
  const { progress, generateProgress, startSearch, setGenerateProgress } = useDailyX();

  // Posts
  const [posts, setPosts] = useState<DailyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<DailyXSettings>({
    keywords: [], monitoredAccounts: [], discordWebhookUrl: "", minLikes: 100, maxTweets: 20,
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newAccount, setNewAccount] = useState("");

  // Actions
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingTweetId, setGeneratingTweetId] = useState<string | null>(null);
  const [inlineGeneratedPosts, setInlineGeneratedPosts] = useState<Record<string, DailyPost>>({});

  // Search (loaded from Firestore cache)
  const [viewMode, setViewMode] = useState<ViewMode>("posts");
  const [searchResults, setSearchResults] = useState<SearchTweet[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("likes");
  const [filterKeyword, setFilterKeyword] = useState<string>("all");

  // Bookmarks
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [bookmarkTweets, setBookmarkTweets] = useState<SearchTweet[]>([]);

  // Banner
  const [resultBanner, setResultBanner] = useState<{
    type: "success" | "error"; message: string;
  } | null>(null);


  // ==============================
  // Load cached data on mount
  // ==============================

  const loadCachedSearch = useCallback(async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `/api/daily-x/search-cache?userId=${user.uid}&date=${today}`
      );
      const data = await res.json();
      if (data.success && data.tweets?.length > 0) {
        setSearchResults(data.tweets);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const loadCachedBookmarks = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(
        `/api/daily-x/search-cache?userId=${user.uid}&date=bookmarks`
      );
      const data = await res.json();
      if (data.success && data.tweets?.length > 0) {
        setBookmarkTweets(data.tweets);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/daily-x/posts?userId=${user.uid}&date=${date}&source=${sourceFilter}`
      );
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user, date, sourceFilter]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/daily-x/settings?userId=${user.uid}`);
      const data = await res.json();
      if (data.success) setSettings(data.settings);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
    fetchSettings();
    loadCachedSearch();
    loadCachedBookmarks();
  }, [fetchPosts, fetchSettings, loadCachedSearch, loadCachedBookmarks]);

  // Reload cache when search completes
  useEffect(() => {
    if (!progress.isActive && progress.current > 0) {
      loadCachedSearch();
    }
  }, [progress.isActive, progress.current, loadCachedSearch]);

  // ==============================
  // Search (via context - per-keyword)
  // ==============================

  const handleSearch = () => {
    if (!user) return;
    setViewMode("search");
    setResultBanner(null);
    const keywords =
      settings.keywords.length > 0 ? settings.keywords : DEFAULT_KEYWORDS;
    startSearch(user.uid, keywords, () => {
      loadCachedSearch();
    }, (typeof settings.maxTweets === "number" && settings.maxTweets > 0) ? settings.maxTweets : 20, (typeof settings.minLikes === "number" && settings.minLikes > 0) ? settings.minLikes : 0);
  };

  // ==============================
  // Bookmarks
  // ==============================

  const handleFetchBookmarks = async () => {
    if (!user) return;
    setBookmarkLoading(true);
    setViewMode("bookmarks");
    setResultBanner(null);

    try {
      const res = await fetch("/api/daily-x/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        setBookmarkTweets(data.tweets);
        // Save to cache
        await fetch("/api/daily-x/search-cache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            tweets: data.tweets,
            source: "bookmarks",
          }),
        });
        setResultBanner({
          type: data.tweets.length > 0 ? "success" : "error",
          message: `${data.tweets.length}件の保存済みポストを取得しました`,
        });
      } else {
        setResultBanner({ type: "error", message: data.error });
      }
    } catch {
      setResultBanner({ type: "error", message: "ブックマーク取得失敗" });
    } finally {
      setBookmarkLoading(false);
    }
  };

  // ==============================
  // Generate
  // ==============================

  const handleGenerateAll = async () => {
    if (!user) return;
    setGenerating(true);
    setResultBanner(null);
    setViewMode("posts");

    try {
      const res = await fetch("/api/cron/daily-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        const r = data.results?.[0];
        const count = r?.postsGenerated || 0;
        const errs = r?.errors || [];
        let msg = `${count}件の投稿を生成しました`;
        if (errs.length > 0) msg += `（${errs.length}件エラー）`;
        setResultBanner({ type: count > 0 ? "success" : "error", message: msg });
        await fetchPosts();
      } else {
        setResultBanner({ type: "error", message: `生成失敗: ${data.error}` });
      }
    } catch {
      setResultBanner({ type: "error", message: "生成リクエスト失敗" });
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromTweet = async (tweet: SearchTweet) => {
    if (!user) return;
    setGeneratingTweetId(tweet.id);
    setGenerateProgress({
      isActive: true,
      tweetAuthor: tweet.authorUsername,
      status: "generating",
      message: "",
    });
    try {
      const res = await fetch("/api/daily-x/generate-from-tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, tweet }),
      });
      const data = await res.json();
      if (data.success) {
        // Add generated post to the posts list AND show inline
        if (data.post) {
          setPosts((prev) => [data.post, ...prev]);
          setInlineGeneratedPosts((prev) => ({ ...prev, [tweet.id]: data.post }));
        }
        setGenerateProgress({
          isActive: false,
          tweetAuthor: tweet.authorUsername,
          status: "done",
          message: `生成完了: @${tweet.authorUsername}`,
        });
        // Auto-clear generate progress after 5s
        setTimeout(() => {
          setGenerateProgress({ isActive: false, tweetAuthor: "", status: "done", message: "" });
        }, 5000);
      } else {
        setGenerateProgress({
          isActive: false,
          tweetAuthor: tweet.authorUsername,
          status: "error",
          message: `生成失敗: ${data.error}`,
        });
        setResultBanner({ type: "error", message: `生成失敗: ${data.error}` });
      }
    } catch {
      setGenerateProgress({
        isActive: false,
        tweetAuthor: tweet.authorUsername,
        status: "error",
        message: "生成に失敗しました",
      });
      setResultBanner({ type: "error", message: "生成に失敗しました" });
    } finally {
      setGeneratingTweetId(null);
    }
  };

  // ==============================
  // Post Actions
  // ==============================

  const handlePostToX = async (post: DailyPost, customText?: string) => {
    if (!user) return;
    setActionLoading((p) => ({ ...p, [post.id]: "posting" }));
    try {
      const res = await fetch("/api/daily-x/post-to-x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          date,
          postId: post.id,
          ...(customText ? { text: customText } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Remove from list after successful posting
        setPosts((p) => p.filter((x) => x.id !== post.id));
        setResultBanner({
          type: "success",
          message: "Xに投稿しました！",
        });
      } else {
        setResultBanner({ type: "error", message: `投稿失敗: ${data.error}` });
      }
    } catch {
      setResultBanner({ type: "error", message: "投稿に失敗しました" });
    } finally {
      setActionLoading((p) => { const n = { ...p }; delete n[post.id]; return n; });
    }
  };

  const handleSaveDraft = async (post: DailyPost) => {
    if (!user) return;
    setActionLoading((p) => ({ ...p, [post.id]: "drafting" }));
    try {
      const res = await fetch("/api/daily-x/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, date, postId: post.id }),
      });
      const data = await res.json();
      if (data.success)
        setPosts((p) => p.map((x) => x.id === post.id ? { ...x, status: "drafted" } : x));
    } catch { alert("下書き保存失敗"); }
    finally { setActionLoading((p) => { const n = { ...p }; delete n[post.id]; return n; }); }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ==============================
  // Settings
  // ==============================

  const handleSaveSettings = async () => {
    if (!user) return;
    setSettingsLoading(true);
    try {
      await fetch("/api/daily-x/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, ...settings }),
      });
      setResultBanner({ type: "success", message: "設定を保存しました" });
    } catch { alert("設定保存失敗"); }
    finally { setSettingsLoading(false); }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !settings.keywords.includes(kw)) {
      setSettings((s) => ({ ...s, keywords: [...s.keywords, kw] }));
      setNewKeyword("");
    }
  };
  const removeKeyword = (kw: string) =>
    setSettings((s) => ({ ...s, keywords: s.keywords.filter((k) => k !== kw) }));
  const addAccount = () => {
    const acc = newAccount.trim().replace("@", "");
    if (acc && !settings.monitoredAccounts.includes(acc)) {
      setSettings((s) => ({ ...s, monitoredAccounts: [...s.monitoredAccounts, acc] }));
      setNewAccount("");
    }
  };
  const removeAccount = (acc: string) =>
    setSettings((s) => ({ ...s, monitoredAccounts: s.monitoredAccounts.filter((a) => a !== acc) }));
  const toggleExpand = (id: string) =>
    setExpandedPosts((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ==============================
  // Sort / Filter
  // ==============================

  const currentTweets = viewMode === "bookmarks" ? bookmarkTweets : searchResults;
  const availableKeywords = [...new Set(currentTweets.map((t) => t.keyword))];
  const effectiveMinLikes = (typeof settings.minLikes === "number" && settings.minLikes > 0) ? settings.minLikes : 0;
  const sortedTweets = [...currentTweets]
    .filter((t) => filterKeyword === "all" || t.keyword === filterKeyword)
    .filter((t) => t.likes >= effectiveMinLikes)
    .sort((a, b) => {
      if (sortMode === "likes") return b.likes - a.likes;
      if (sortMode === "retweets") return b.retweets - a.retweets;
      if (sortMode === "keyword") return a.keyword.localeCompare(b.keyword);
      return 0;
    });

  // Sort posts by creation order (newest first)
  const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingCount = posts.filter((p) => p.status === "pending").length;
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;
  const draftedCount = posts.filter((p) => p.status === "drafted").length;

  const sourceLabel: Record<SourceFilter, string> = {
    all: "すべて", keyword: "キーワード", trending: "トレンド", account_monitor: "監視",
  };

  const searchPct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // ==============================
  // Render
  // ==============================

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Daily X</h1>
            <p className="text-zinc-500 text-sm mt-1">
              キーワード検索・ブックマークからポストを自動生成
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSearch}
              disabled={progress.isActive || generating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {progress.isActive ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              {progress.isActive ? "検索中..." : "検索する"}
            </button>
            <button
              onClick={handleGenerateAll}
              disabled={generating || progress.isActive}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {generating ? "生成中..." : "一括生成"}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors"
              title="設定"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Search Progress (inline on this page) */}
        {progress.isActive && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                検索中: {progress.currentKeyword}
              </span>
              <span className="text-xs text-blue-500">
                {progress.current}/{progress.total} ({searchPct}%)
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${searchPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Bulk Generate Progress */}
        {generating && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              <span className="text-sm text-blue-700">
                AI一括生成中（時間がかかる場合があります）...
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Per-tweet Generate Progress */}
        {generateProgress.isActive && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-purple-50 border border-purple-200">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-purple-600" />
              <span className="text-sm text-purple-700">
                @{generateProgress.tweetAuthor} のツイートからAI生成中...
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-purple-600 h-1.5 rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}

        {/* Banner */}
        {resultBanner && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
              resultBanner.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {resultBanner.type === "success" ? <Check size={16} /> : <AlertTriangle size={16} />}
            {resultBanner.message}
            <button onClick={() => setResultBanner(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="mb-6 p-4 rounded-xl bg-white border border-zinc-200">
            <h2 className="font-semibold mb-4">設定</h2>
            <div className="mb-4 flex items-center gap-6">
              <div>
                <label className="block text-sm text-zinc-500 mb-2">取得件数（いいね上位N件）</label>
                <input type="number" value={settings.maxTweets}
                  onChange={(e) => setSettings((s) => ({ ...s, maxTweets: e.target.value === "" ? "" : parseInt(e.target.value) }))}
                  min={5} max={100} className="w-32 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-zinc-500 mb-2">最低いいね数</label>
                <input type="number" value={settings.minLikes}
                  onChange={(e) => setSettings((s) => ({ ...s, minLikes: e.target.value === "" ? "" : parseInt(e.target.value) }))}
                  min={0} className="w-32 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-zinc-500 mb-2">検索キーワード</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settings.keywords.map((kw) => (
                  <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
                    {kw}
                    <button onClick={() => removeKeyword(kw)} className="hover:text-red-400"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()} placeholder="キーワードを追加..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-blue-500" />
                <button onClick={addKeyword} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"><Plus size={14} /></button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-zinc-500 mb-2">監視アカウント</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settings.monitoredAccounts.map((acc) => (
                  <span key={acc} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                    @{acc}
                    <button onClick={() => removeAccount(acc)} className="hover:text-red-400"><X size={12} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newAccount} onChange={(e) => setNewAccount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAccount()} placeholder="@username..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-green-500" />
                <button onClick={addAccount} className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm"><Plus size={14} /></button>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-zinc-500 mb-2">Discord Webhook URL</label>
              <input type="text" value={settings.discordWebhookUrl}
                onChange={(e) => setSettings((s) => ({ ...s, discordWebhookUrl: e.target.value }))}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-purple-500" />
            </div>
            <button onClick={handleSaveSettings} disabled={settingsLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50">
              {settingsLoading ? "保存中..." : "設定を保存"}
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
            <button onClick={() => setViewMode("posts")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === "posts" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
              生成済み {posts.length > 0 && `(${posts.length})`}
            </button>
            <button onClick={() => setViewMode("search")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${viewMode === "search" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
              検索 {searchResults.length > 0 && `(${searchResults.length})`}
            </button>
            <button onClick={() => { setViewMode("bookmarks"); if (bookmarkTweets.length === 0 && !bookmarkLoading) handleFetchBookmarks(); }}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1 ${viewMode === "bookmarks" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-900"}`}
              title="X API Basic以上のプラン($100/月)が必要です">
              <Bookmark size={14} />
              保存済み {bookmarkTweets.length > 0 && `(${bookmarkTweets.length})`}
            </button>
          </div>
        </div>

        {/* Sub-controls */}
        {viewMode === "posts" && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2">
              <Calendar size={16} className="text-zinc-500" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-sm focus:outline-none" />
            </div>
            <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
              {(["all", "keyword", "trending", "account_monitor"] as SourceFilter[]).map((src) => (
                <button key={src} onClick={() => setSourceFilter(src)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${sourceFilter === src ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
                  {sourceLabel[src]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm text-zinc-500 ml-auto">
              <span>{pendingCount} 未投稿</span>
              {scheduledCount > 0 && <span className="text-orange-600">{scheduledCount} 予約</span>}
              <span className="text-green-600">{postedCount} 投稿済</span>
              <span className="text-yellow-600">{draftedCount} 下書き</span>
            </div>
          </div>
        )}

        {(viewMode === "search" || viewMode === "bookmarks") && currentTweets.length > 0 && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
              <ArrowUpDown size={14} className="text-zinc-400 ml-2" />
              {([{ key: "likes", label: "いいね順" }, { key: "retweets", label: "リポスト順" }, { key: "keyword", label: "キーワード順" }] as const).map((s) => (
                <button key={s.key} onClick={() => setSortMode(s.key)}
                  className={`px-2 py-1 rounded-md text-xs transition-colors ${sortMode === s.key ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {availableKeywords.length > 1 && (
              <select value={filterKeyword} onChange={(e) => setFilterKeyword(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-sm focus:outline-none">
                <option value="all">全キーワード</option>
                {availableKeywords.map((kw) => <option key={kw} value={kw}>{kw}</option>)}
              </select>
            )}
            <span className="text-xs text-zinc-400 ml-auto">{sortedTweets.length}件表示</span>
          </div>
        )}

        {/* ============ CONTENT ============ */}

        {viewMode === "posts" && (
          loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span className="text-zinc-500">読み込み中...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 text-zinc-400">
              <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-2">この日付のポストはありません</p>
              <p className="text-sm">「検索する」で元ツイートを確認し、個別に「AI生成」できます</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedPosts.map((post) => (
                <PostCard key={post.id} post={post}
                  expanded={expandedPosts.has(post.id)}
                  onToggleExpand={() => toggleExpand(post.id)}
                  onPostToX={(customText) => handlePostToX(post, customText)}
                  onSaveDraft={() => handleSaveDraft(post)}
                  onCopy={(t) => handleCopy(t, post.id)}
                  actionLoading={actionLoading[post.id]}
                  copied={copiedId === post.id}
                  onSchedule={async (scheduledAt, text) => {
                    if (!user) return;
                    setActionLoading((p) => ({ ...p, [post.id]: "scheduling" }));
                    try {
                      const res = await fetch("/api/daily-x/schedule", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid, date, postId: post.id, scheduledAt, text }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setPosts((p) => p.map((x) => x.id === post.id ? { ...x, status: "scheduled", scheduledAt } : x));
                        setResultBanner({ type: "success", message: `${new Date(scheduledAt).toLocaleString("ja-JP")} に予約しました` });
                      } else {
                        setResultBanner({ type: "error", message: `予約失敗: ${data.error}` });
                      }
                    } catch { setResultBanner({ type: "error", message: "予約に失敗しました" }); }
                    finally { setActionLoading((p) => { const n = { ...p }; delete n[post.id]; return n; }); }
                  }}
                  onCancelSchedule={async () => {
                    if (!user) return;
                    try {
                      const res = await fetch("/api/daily-x/schedule", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid, date, postId: post.id }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setPosts((p) => p.map((x) => x.id === post.id ? { ...x, status: "pending", scheduledAt: undefined } : x));
                      }
                    } catch { /* skip */ }
                  }}
                  onUpdateText={async (text) => {
                    if (!user) return;
                    try {
                      await fetch("/api/daily-x/save-draft", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid, date, postId: post.id, text, keepStatus: true }),
                      });
                    } catch { /* skip */ }
                  }} />
              ))}
            </div>
          )
        )}

        {(viewMode === "search" || viewMode === "bookmarks") && (
          bookmarkLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span className="text-zinc-500">ブックマーク取得中...</span>
            </div>
          ) : sortedTweets.length === 0 && !progress.isActive ? (
            <div className="text-center py-20 text-zinc-400">
              {viewMode === "bookmarks" ? (
                <>
                  <Bookmark size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-lg mb-2">ブックマーク機能は利用できません</p>
                  <p className="text-sm text-zinc-500">X API Basicプラン以上（$100/月）が必要です。</p>
                  <p className="text-sm text-zinc-500 mt-1">Freeプランではキーワード検索をご利用ください。</p>
                </>
              ) : (
                <>
                  <Search size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="text-lg mb-2">検索結果なし</p>
                  <p className="text-sm">「検索する」ボタンで直近7日間のツイートを検索します</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedTweets.map((tweet) => (
                <SearchTweetCard key={tweet.id} tweet={tweet}
                  onCopy={(t) => handleCopy(t, tweet.id)}
                  copied={copiedId === tweet.id}
                  onInstantGenerate={() => handleGenerateFromTweet(tweet)}
                  isGenerating={generatingTweetId === tweet.id}
                  generatedPost={inlineGeneratedPosts[tweet.id]}
                  onPostToX={async (text) => {
                    const post = inlineGeneratedPosts[tweet.id];
                    if (!post || !user) return;
                    try {
                      const res = await fetch("/api/daily-x/post-to-x", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.uid, date, postId: post.id, ...(text ? { text } : {}) }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setInlineGeneratedPosts((prev) => { const n = { ...prev }; delete n[tweet.id]; return n; });
                        setPosts((p) => p.filter((x) => x.id !== post.id));
                        setResultBanner({ type: "success", message: "Xに投稿しました" });
                      } else {
                        setResultBanner({ type: "error", message: `投稿失敗: ${data.error}` });
                      }
                    } catch { setResultBanner({ type: "error", message: "投稿に失敗しました" }); }
                  }}
                  onDismissGenerated={() => setInlineGeneratedPosts((prev) => { const n = { ...prev }; delete n[tweet.id]; return n; })} />
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
}

// ==============================
// Search Tweet Card
// ==============================

function SearchTweetCard({ tweet, onCopy, copied, onInstantGenerate, isGenerating, generatedPost, onPostToX, onDismissGenerated }: {
  tweet: SearchTweet; onCopy: (t: string) => void; copied: boolean;
  onInstantGenerate: () => void; isGenerating: boolean;
  generatedPost?: DailyPost; onPostToX?: (text?: string) => void; onDismissGenerated?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [inlineEditText, setInlineEditText] = useState("");
  const [inlineEditing, setInlineEditing] = useState(false);
  const [inlinePostLoading, setInlinePostLoading] = useState(false);

  // Sync inline edit text with generated post
  useEffect(() => {
    if (generatedPost) setInlineEditText(generatedPost.finalPostText);
  }, [generatedPost]);
  const isLong = tweet.text.length > 140;

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden flex flex-col">
      <div className="px-3 py-2.5 flex-1">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-1.5">
          {tweet.authorProfileImage && <img src={tweet.authorProfileImage} alt="" className="w-6 h-6 rounded-full" />}
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium truncate">{tweet.authorName}</span>
            <a href={tweet.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline ml-1">@{tweet.authorUsername}</a>
          </div>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700 flex-shrink-0">
            {tweet.keyword === "bookmark" ? "BM" : tweet.keyword}
          </span>
        </div>

        {/* Text */}
        <p className={`text-xs whitespace-pre-wrap leading-relaxed mb-1.5 ${!expanded && isLong ? "line-clamp-4" : ""}`}>{tweet.text}</p>
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-blue-500 mb-1.5">
            {expanded ? "折りたたむ" : "続きを読む"}
          </button>
        )}

        {/* Translation */}
        {tweet.translatedText && tweet.translatedText !== tweet.text && (
          <div className="mb-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-[10px] text-blue-500 mb-0.5 font-medium">日本語訳</p>
            <p className="text-xs text-blue-900 whitespace-pre-wrap leading-relaxed">{tweet.translatedText}</p>
          </div>
        )}

        {/* Images */}
        {tweet.imageUrls.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto mb-2">
            {tweet.imageUrls.map((url, i) => (
              <img key={i} src={url} alt="" className="h-20 rounded-lg object-cover flex-shrink-0" loading="lazy" />
            ))}
          </div>
        )}

        {/* Video */}
        {tweet.hasVideo && (
          <div className="mb-2">
            {tweet.videoMp4Url ? (
              <video
                src={tweet.videoMp4Url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full max-h-40 rounded-lg object-cover"
              />
            ) : tweet.videoPreviewUrl ? (
              <a href={tweet.videoUrl || tweet.url} target="_blank" rel="noopener noreferrer" className="block relative group">
                <img src={tweet.videoPreviewUrl} alt="動画" className="w-full max-h-32 rounded-lg object-cover" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg group-hover:bg-black/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <Play size={16} className="text-zinc-800 ml-0.5" />
                  </div>
                </div>
              </a>
            ) : (
              <a href={tweet.videoUrl || tweet.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-purple-600 bg-purple-50 rounded-lg px-2 py-1.5 hover:bg-purple-100">
                <Video size={12} /> 動画を再生 →
              </a>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-zinc-400">
          <span className="flex items-center gap-0.5"><Heart size={10} />{tweet.likes.toLocaleString()}</span>
          <span className="flex items-center gap-0.5"><Repeat2 size={10} />{tweet.retweets.toLocaleString()}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={10} />{tweet.replies.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onInstantGenerate} disabled={isGenerating}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium disabled:opacity-50 transition-colors">
            {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            {isGenerating ? "生成中" : "瞬時に生成"}
          </button>
          <a href={`/compose/generate?content=${encodeURIComponent(tweet.translatedText || tweet.text)}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-medium transition-colors">
            <Sparkles size={10} />AI生成
          </a>
          <button onClick={() => onCopy(tweet.text)}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700">
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          <a href={tweet.url} target="_blank" rel="noopener noreferrer"
            className="p-1 rounded text-zinc-400 hover:text-zinc-700">
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Inline Generated Post Preview */}
      {generatedPost && (
        <div className="border-t-2 border-emerald-300 bg-emerald-50 px-3 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Check size={12} /> 生成完了
            </span>
            <button onClick={onDismissGenerated} className="text-zinc-400 hover:text-zinc-600">
              <X size={14} />
            </button>
          </div>
          {inlineEditing ? (
            <div>
              <textarea
                value={inlineEditText}
                onChange={(e) => setInlineEditText(e.target.value)}
                className="w-full text-xs leading-relaxed p-2 rounded-lg border border-zinc-300 focus:border-blue-500 focus:outline-none resize-none bg-white"
                rows={Math.max(4, inlineEditText.split("\n").length + 1)}
              />
              <div className="flex gap-1 mt-1">
                <button onClick={() => setInlineEditing(false)} className="px-2 py-0.5 text-[10px] rounded bg-zinc-200 text-zinc-600">完了</button>
              </div>
            </div>
          ) : (
            <p className="text-xs whitespace-pre-wrap leading-relaxed text-zinc-800 mb-2">{inlineEditText}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={async () => {
                if (!onPostToX) return;
                setInlinePostLoading(true);
                await onPostToX(inlineEditText !== generatedPost.finalPostText ? inlineEditText : undefined);
                setInlinePostLoading(false);
              }}
              disabled={inlinePostLoading}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium disabled:opacity-50">
              {inlinePostLoading ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
              Xに投稿
            </button>
            <button onClick={() => setInlineEditing(!inlineEditing)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-[10px] font-medium">
              <Pencil size={10} />{inlineEditing ? "プレビュー" : "編集"}
            </button>
            <button onClick={() => { onCopy(inlineEditText); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 hover:bg-zinc-300 text-zinc-700 text-[10px] font-medium">
              <Copy size={10} />コピー
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================
// Post Card
// ==============================

function PostCard({ post, expanded, onToggleExpand, onPostToX, onSaveDraft, onCopy, actionLoading, copied, onSchedule, onCancelSchedule, onUpdateText }: {
  post: DailyPost; expanded: boolean; onToggleExpand: () => void; onPostToX: (customText?: string) => void;
  onSaveDraft: () => void; onCopy: (t: string) => void; actionLoading?: string; copied: boolean;
  onSchedule?: (scheduledAt: string, text?: string) => void;
  onCancelSchedule?: () => void;
  onUpdateText?: (text: string) => void;
}) {
  const [editText, setEditText] = useState(post.finalPostText);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save on text change (debounced)
  const handleTextChange = (text: string) => {
    setEditText(text);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onUpdateText?.(text);
    }, 1000);
  };

  const sourceBadge = {
    keyword: { label: "KW", color: "bg-blue-100 text-blue-700" },
    trending: { label: "TR", color: "bg-orange-100 text-orange-700" },
    account_monitor: { label: `@${post.sourceAccount || "監視"}`, color: "bg-green-100 text-green-700" },
  };
  const statusBadge: Record<string, { label: string; color: string }> = {
    pending: { label: "未投稿", color: "text-zinc-500" },
    scheduled: { label: "予約", color: "text-orange-600" },
    posted: { label: "投稿済", color: "text-green-600" },
    drafted: { label: "下書き", color: "text-yellow-600" },
    skipped: { label: "スキップ", color: "text-red-400" },
  };
  const badge = sourceBadge[post.source];
  const status = statusBadge[post.status] || statusBadge.pending;

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100">
        <div className="flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${badge.color}`}>{badge.label}</span>
          {post.sourceKeyword && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-700">{post.sourceKeyword}</span>}
          <span className={`text-[10px] ${status.color}`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="flex items-center gap-0.5"><Heart size={10} />{post.originalTweet.likes.toLocaleString()}</span>
          {post.originalTweet.hasVideo && <Video size={10} className="text-purple-400" />}
          {post.originalTweet.hasImage && <ImageIcon size={10} className="text-blue-400" />}
        </div>
      </div>

      {/* Editable text - always a textarea */}
      <div className="px-3 py-2 flex-1">
        <textarea
          value={editText}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={post.status === "posted"}
          className="w-full text-xs leading-relaxed p-0 border-0 focus:outline-none resize-none bg-transparent disabled:text-zinc-500"
          rows={Math.min(8, Math.max(3, editText.split("\n").length))}
        />
        {/* Images */}
        {post.mediaImageUrls.length > 0 && !post.originalTweet.hasVideo && (
          <div className="flex gap-1.5 overflow-x-auto mt-1">
            {post.mediaImageUrls.map((url, i) => <img key={i} src={url} alt="" className="h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />)}
          </div>
        )}
      </div>

      {/* Scheduled time display */}
      {post.status === "scheduled" && post.scheduledAt && (
        <div className="px-3 py-1.5 bg-orange-50 border-t border-orange-100 flex items-center justify-between">
          <span className="text-[10px] text-orange-700 flex items-center gap-1">
            <Clock size={10} /> {new Date(post.scheduledAt).toLocaleString("ja-JP")} に投稿予定
          </span>
          <button onClick={onCancelSchedule} className="text-[10px] text-orange-600 hover:text-orange-800">取消</button>
        </div>
      )}

      {/* Schedule picker */}
      {showSchedule && (
        <div className="px-3 py-2 bg-zinc-50 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <input type="datetime-local" value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="flex-1 px-2 py-1 rounded-lg border border-zinc-300 text-[10px] focus:outline-none focus:border-blue-500" />
            <button onClick={() => {
              if (scheduleDate && onSchedule) {
                onSchedule(new Date(scheduleDate).toISOString(), editText !== post.finalPostText ? editText : undefined);
                setShowSchedule(false);
              }
            }} disabled={!scheduleDate}
              className="px-2 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-[10px] font-medium disabled:opacity-50">予約</button>
            <button onClick={() => setShowSchedule(false)} className="text-zinc-400 hover:text-zinc-600"><X size={12} /></button>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="px-3 py-2 border-t border-zinc-100">
        <div className="flex items-center gap-1 flex-wrap">
          {(post.status === "pending" || post.status === "scheduled") && (
            <>
              <button onClick={() => onPostToX(editText !== post.finalPostText ? editText : undefined)} disabled={!!actionLoading || !!aiLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-medium disabled:opacity-50 transition-colors">
                {actionLoading === "posting" ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                投稿
              </button>
              <button onClick={() => setShowSchedule(!showSchedule)} disabled={!!actionLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 text-[10px] font-medium disabled:opacity-50 transition-colors">
                {actionLoading === "scheduling" ? <Loader2 size={10} className="animate-spin" /> : <Clock size={10} />}
                予約
              </button>
              <button onClick={onSaveDraft} disabled={!!actionLoading}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[10px] font-medium disabled:opacity-50">
                <BookmarkPlus size={10} />下書き
              </button>
            </>
          )}
          {post.status === "posted" && (
            <span className="flex items-center gap-1 text-[10px] text-green-600">
              <Check size={10} /> 投稿済
              {post.tweetId && <a href={`https://x.com/i/status/${post.tweetId}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline"><ExternalLink size={10} /></a>}
            </span>
          )}
          {post.status === "drafted" && <span className="flex items-center gap-1 text-[10px] text-yellow-600"><BookmarkPlus size={10} /> 下書き</span>}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => onCopy(editText)} className="p-1 rounded text-zinc-400 hover:text-zinc-700">
              {copied ? <Check size={10} /> : <Copy size={10} />}
            </button>
            <button onClick={onToggleExpand} className="p-1 rounded text-zinc-400 hover:text-zinc-700">
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
          </div>
        </div>
        {/* AI buttons */}
        {(post.status === "pending" || post.status === "scheduled") && (
          <div className="flex items-center gap-1 mt-1.5">
            <button onClick={async () => {
              setAiLoading("hallucination");
              try {
                const res = await fetch("/api/daily-x/ai-enhance", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: editText, originalTweet: post.originalTweet.text, mode: "hallucination-check" }),
                });
                const data = await res.json();
                if (data.success) { setEditText(data.text); onUpdateText?.(data.text); }
              } catch { /* skip */ } finally { setAiLoading(null); }
            }} disabled={!!aiLoading}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] disabled:opacity-50 transition-colors">
              {aiLoading === "hallucination" ? <Loader2 size={10} className="animate-spin" /> : <ShieldCheck size={10} />}
              HC
            </button>
            <button onClick={async () => {
              setAiLoading("enhance");
              try {
                const res = await fetch("/api/daily-x/ai-enhance", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: editText, originalTweet: post.originalTweet.text, mode: "enhance" }),
                });
                const data = await res.json();
                if (data.success) { setEditText(data.text); onUpdateText?.(data.text); }
              } catch { /* skip */ } finally { setAiLoading(null); }
            }} disabled={!!aiLoading}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] disabled:opacity-50 transition-colors">
              {aiLoading === "enhance" ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
              AI強化
            </button>
          </div>
        )}
      </div>

      {/* Original tweet */}
      {expanded && (
        <div className="px-3 py-2 bg-zinc-50 border-t border-zinc-100">
          <div className="flex items-center gap-1.5 mb-1">
            {post.originalTweet.authorProfileImage && <img src={post.originalTweet.authorProfileImage} alt="" className="w-5 h-5 rounded-full" />}
            <span className="text-[10px] font-medium">{post.originalTweet.authorName}</span>
            <a href={post.originalTweet.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline">@{post.originalTweet.authorUsername}</a>
          </div>
          <p className="text-[10px] text-zinc-500 whitespace-pre-wrap leading-relaxed">{post.originalTweet.text}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
            <span>{post.originalTweet.likes.toLocaleString()} likes</span>
            <span>{post.originalTweet.retweets.toLocaleString()} RT</span>
          </div>
        </div>
      )}
    </div>
  );
}
