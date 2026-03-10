"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Send,
  BookmarkPlus,
  ExternalLink,
  Image as ImageIcon,
  Video,
  Eye,
  Heart,
  RefreshCw,
  Search,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Plus,
  Trash2,
  Calendar,
  Filter,
  Copy,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

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
  status: "pending" | "posted" | "drafted" | "skipped";
  postedAt?: string;
  tweetId?: string;
  source: "bookmark" | "trending" | "account_monitor";
  sourceKeyword?: string;
  sourceAccount?: string;
  createdAt: string;
  category?: string;
}

interface DailyXSettings {
  keywords: string[];
  monitoredAccounts: string[];
  discordWebhookUrl: string;
}

type SourceFilter = "all" | "bookmark" | "trending" | "account_monitor";

export default function DailyXPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<DailyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<DailyXSettings>({
    keywords: [],
    monitoredAccounts: [],
    discordWebhookUrl: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newAccount, setNewAccount] = useState("");
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/daily-x/posts?userId=${user.uid}&date=${date}&source=${sourceFilter}`
      );
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  }, [user, date, sourceFilter]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/daily-x/settings?userId=${user.uid}`);
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (showSettings) fetchSettings();
  }, [showSettings, fetchSettings]);

  const handlePostToX = async (post: DailyPost) => {
    if (!user) return;
    setActionLoading((prev) => ({ ...prev, [post.id]: "posting" }));
    try {
      const res = await fetch("/api/daily-x/post-to-x", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          date,
          postId: post.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, status: "posted", tweetId: data.tweetId }
              : p
          )
        );
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to post");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
    }
  };

  const handleSaveDraft = async (post: DailyPost) => {
    if (!user) return;
    setActionLoading((prev) => ({ ...prev, [post.id]: "drafting" }));
    try {
      const res = await fetch("/api/daily-x/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          date,
          postId: post.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, status: "drafted" } : p
          )
        );
      }
    } catch (error) {
      alert("Failed to save draft");
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSettingsLoading(true);
    try {
      await fetch("/api/daily-x/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          keywords: settings.keywords,
          monitoredAccounts: settings.monitoredAccounts,
          discordWebhookUrl: settings.discordWebhookUrl,
        }),
      });
    } catch (error) {
      alert("Failed to save settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (kw && !settings.keywords.includes(kw)) {
      setSettings((s) => ({ ...s, keywords: [...s.keywords, kw] }));
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setSettings((s) => ({
      ...s,
      keywords: s.keywords.filter((k) => k !== kw),
    }));
  };

  const addAccount = () => {
    const acc = newAccount.trim().replace("@", "");
    if (acc && !settings.monitoredAccounts.includes(acc)) {
      setSettings((s) => ({
        ...s,
        monitoredAccounts: [...s.monitoredAccounts, acc],
      }));
      setNewAccount("");
    }
  };

  const removeAccount = (acc: string) => {
    setSettings((s) => ({
      ...s,
      monitoredAccounts: s.monitoredAccounts.filter((a) => a !== acc),
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredPosts = posts;
  const pendingCount = posts.filter((p) => p.status === "pending").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;
  const draftedCount = posts.filter((p) => p.status === "drafted").length;

  const sourceLabel = {
    all: "All",
    bookmark: "Bookmarks",
    trending: "Trending",
    account_monitor: "Monitored",
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Daily X</h1>
            <p className="text-zinc-500 text-sm mt-1">
              AI-generated post suggestions from your bookmarks and trends
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={fetchPosts}
              disabled={loading}
              className="p-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 rounded-xl bg-white border border-zinc-200">
            <h2 className="font-semibold mb-4">Settings</h2>

            {/* Keywords */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-500 mb-2">
                Trending Keywords (500+ likes search)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settings.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm"
                  >
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  placeholder="Add keyword..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={addKeyword}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Monitored Accounts */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-500 mb-2">
                Monitored Accounts (15-min check)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {settings.monitoredAccounts.map((acc) => (
                  <span
                    key={acc}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-sm"
                  >
                    @{acc}
                    <button
                      onClick={() => removeAccount(acc)}
                      className="hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAccount}
                  onChange={(e) => setNewAccount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAccount()}
                  placeholder="@username..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-green-500"
                />
                <button
                  onClick={addAccount}
                  className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Discord Webhook */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-500 mb-2">
                Discord Webhook URL (Daily X channel)
              </label>
              <input
                type="text"
                value={settings.discordWebhookUrl}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    discordWebhookUrl: e.target.value,
                  }))
                }
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={settingsLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {settingsLoading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        )}

        {/* Date & Filter Controls */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2">
            <Calendar size={16} className="text-zinc-500" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-1">
            {(
              ["all", "bookmark", "trending", "account_monitor"] as SourceFilter[]
            ).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  sourceFilter === src
                    ? "bg-blue-600 text-white"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {sourceLabel[src]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm text-zinc-500 ml-auto">
            <span>{pendingCount} pending</span>
            <span className="text-green-400">{postedCount} posted</span>
            <span className="text-yellow-400">{draftedCount} drafted</span>
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin mr-2" size={20} />
            <span className="text-zinc-500">Loading posts...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            <p className="text-lg mb-2">No posts for this date</p>
            <p className="text-sm">
              Posts are automatically generated every morning from your bookmarks.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                expanded={expandedPosts.has(post.id)}
                onToggleExpand={() => toggleExpand(post.id)}
                onPostToX={() => handlePostToX(post)}
                onSaveDraft={() => handleSaveDraft(post)}
                onCopy={(text) => handleCopy(text, post.id)}
                actionLoading={actionLoading[post.id]}
                copied={copiedId === post.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({
  post,
  expanded,
  onToggleExpand,
  onPostToX,
  onSaveDraft,
  onCopy,
  actionLoading,
  copied,
}: {
  post: DailyPost;
  expanded: boolean;
  onToggleExpand: () => void;
  onPostToX: () => void;
  onSaveDraft: () => void;
  onCopy: (text: string) => void;
  actionLoading?: string;
  copied: boolean;
}) {
  const sourceBadge = {
    bookmark: { label: "Bookmark", color: "bg-blue-100 text-blue-700" },
    trending: { label: "Trending", color: "bg-orange-100 text-orange-700" },
    account_monitor: {
      label: `@${post.sourceAccount || "monitor"}`,
      color: "bg-green-100 text-green-700",
    },
  };

  const statusBadge = {
    pending: { label: "Pending", color: "text-zinc-500" },
    posted: { label: "Posted", color: "text-green-400" },
    drafted: { label: "Drafted", color: "text-yellow-400" },
    skipped: { label: "Skipped", color: "text-red-400" },
  };

  const badge = sourceBadge[post.source];
  const status = statusBadge[post.status];

  return (
    <div className="rounded-xl bg-white border border-zinc-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs ${badge.color}`}>
            {badge.label}
          </span>
          {post.sourceKeyword && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
              {post.sourceKeyword}
            </span>
          )}
          <span className={`text-xs ${status.color}`}>{status.label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {post.originalTweet.likes.toLocaleString()}
          </span>
          {post.originalTweet.hasVideo && (
            <Video size={12} className="text-purple-400" />
          )}
          {post.originalTweet.hasImage && (
            <ImageIcon size={12} className="text-blue-400" />
          )}
        </div>
      </div>

      {/* Generated Post */}
      <div className="px-4 py-3">
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {post.finalPostText}
        </div>

        {/* Images */}
        {post.mediaImageUrls.length > 0 && !post.originalTweet.hasVideo && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {post.mediaImageUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Media ${i + 1}`}
                className="h-32 rounded-lg object-cover flex-shrink-0"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Video indicator */}
        {post.originalTweet.hasVideo && post.originalTweet.videoUrl && (
          <div className="mt-3 flex items-center gap-2 text-xs text-purple-400 bg-purple-50 rounded-lg px-3 py-2">
            <Video size={14} />
            <span>Video URL will be prepended: {post.originalTweet.videoUrl}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-200">
        {post.status === "pending" && (
          <>
            <button
              onClick={onPostToX}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {actionLoading === "posting" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Post to X
            </button>
            <button
              onClick={onSaveDraft}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {actionLoading === "drafting" ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <BookmarkPlus size={14} />
              )}
              Save Draft
            </button>
          </>
        )}
        {post.status === "posted" && (
          <span className="flex items-center gap-1 text-sm text-green-400">
            <Check size={14} /> Posted
            {post.tweetId && (
              <a
                href={`https://x.com/i/status/${post.tweetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-blue-400 hover:underline"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </span>
        )}
        {post.status === "drafted" && (
          <span className="flex items-center gap-1 text-sm text-yellow-400">
            <BookmarkPlus size={14} /> Saved as Draft
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => onCopy(post.finalPostText)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Original
          </button>
        </div>
      </div>

      {/* Expanded: Original Tweet */}
      {expanded && (
        <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200">
          <div className="flex items-center gap-2 mb-2">
            {post.originalTweet.authorProfileImage && (
              <img
                src={post.originalTweet.authorProfileImage}
                alt=""
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-sm font-medium">
              {post.originalTweet.authorName}
            </span>
            <a
              href={post.originalTweet.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline"
            >
              @{post.originalTweet.authorUsername}
            </a>
          </div>
          <p className="text-sm text-zinc-500 whitespace-pre-wrap">
            {post.originalTweet.text}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
            <span>{post.originalTweet.likes.toLocaleString()} likes</span>
            <span>{post.originalTweet.retweets.toLocaleString()} RTs</span>
            <span>{new Date(post.originalTweet.createdAt).toLocaleString("ja-JP")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
