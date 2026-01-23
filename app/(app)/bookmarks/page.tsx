"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Bookmark,
  RefreshCw,
  Heart,
  MessageCircle,
  Repeat2,
  Sparkles,
  Loader2,
  AlertCircle,
  ExternalLink,
  Languages,
  Plus,
  Trash2,
  Link as LinkIcon,
  X,
  CheckCircle2,
  Video,
  Clock,
  History,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useXProfile } from "@/lib/x-profile-context";

interface SavedPost {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  media: Array<{
    type: "photo" | "video";
    url: string;
    thumbnailUrl?: string;
  }>;
  likes: number;
  retweets: number;
  replies: number;
  savedAt: string;
  translatedText?: string;
  isTranslating?: boolean;
}

interface PostedHistory {
  id: string;
  text: string;
  tweetId?: string;
  tweetUrl?: string;
  postedAt: string;
  sourcePost?: {
    text: string;
    authorName: string;
    authorUsername: string;
    authorProfileImageUrl: string;
    media?: Array<{
      type: "photo" | "video";
      url: string;
      thumbnailUrl?: string;
    }>;
    originalUrl: string;
  };
}

export default function BookmarksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile: xProfile } = useXProfile();

  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [history, setHistory] = useState<PostedHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Manual URL input state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);

  // Load saved posts from Firestore
  const loadPosts = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/x/saved-posts?userId=${user.uid}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setPosts(data.posts || []);
    } catch (err) {
      console.error("Load posts error:", err);
      setError(err instanceof Error ? err.message : "読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load posted history
  const loadHistory = useCallback(async () => {
    if (!user) return;

    setIsLoadingHistory(true);

    try {
      const response = await fetch(`/api/x/posted-history?userId=${user.uid}`);
      const data = await response.json();

      if (response.ok) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Load history error:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    loadPosts();
    loadHistory();
  }, [loadPosts, loadHistory]);

  // Parse X/Twitter URL to extract tweet ID
  const parseTweetUrl = (url: string): string | null => {
    const patterns = [
      /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
      /(?:twitter\.com|x\.com)\/i\/web\/status\/(\d+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Add post from URL
  const handleAddFromUrl = async () => {
    if (!urlInput.trim() || !user) return;

    const tweetId = parseTweetUrl(urlInput.trim());
    if (!tweetId) {
      setError("有効なX/TwitterのURLを入力してください");
      return;
    }

    if (posts.some((p) => p.id === tweetId)) {
      setError("この投稿は既に追加されています");
      return;
    }

    setIsAddingUrl(true);
    setError(null);

    try {
      const tweetResponse = await fetch(`/api/x/tweet?id=${tweetId}`);
      const tweetData = await tweetResponse.json();

      if (!tweetResponse.ok) {
        throw new Error(tweetData.error || "ツイートの取得に失敗しました");
      }

      const tweet = tweetData.tweet;

      const saveResponse = await fetch("/api/x/saved-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          post: {
            id: tweet.id,
            text: tweet.text,
            authorName: tweet.author.name,
            authorUsername: tweet.author.username,
            authorProfileImageUrl: tweet.author.profileImageUrl,
            media: tweet.media,
            likes: tweet.likes,
            retweets: tweet.retweets,
            replies: tweet.replies,
          },
        }),
      });

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        if (saveData.code === "ALREADY_SAVED") {
          setError("この投稿は既に保存されています");
          return;
        }
        throw new Error(saveData.error);
      }

      setPosts((prev) => [saveData.post, ...prev]);
      setUrlInput("");
      setShowUrlInput(false);
      setSuccessMessage("投稿を保存しました");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Add from URL error:", err);
      setError(err instanceof Error ? err.message : "投稿の追加に失敗しました");
    } finally {
      setIsAddingUrl(false);
    }
  };

  // Delete post
  const handleDelete = async (postId: string) => {
    if (!user) return;

    try {
      const response = await fetch(
        `/api/x/saved-posts?userId=${user.uid}&postId=${postId}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  // Navigate to AI generation page
  const handleStartAIGenerate = (post: SavedPost) => {
    router.push(`/bookmarks/generate/${post.id}`);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">保存済み投稿</h1>
        <p className="text-zinc-500">
          {xProfile ? `@${xProfile.username}` : "X未連携"}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span className="text-emerald-700 text-sm">{successMessage}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Active Saved Posts */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-zinc-900">未投稿</span>
                <span className="text-sm text-zinc-500">({posts.length}件)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  URL追加
                </button>
                <button
                  onClick={loadPosts}
                  disabled={isLoading}
                  className="p-2 rounded-full hover:bg-zinc-100 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-zinc-600 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* URL Input */}
            {showUrlInput && (
              <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://x.com/username/status/..."
                      className="w-full h-10 pl-10 pr-4 bg-white border border-zinc-200 rounded-lg text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => e.key === "Enter" && handleAddFromUrl()}
                    />
                  </div>
                  <button
                    onClick={handleAddFromUrl}
                    disabled={isAddingUrl || !urlInput.trim()}
                    className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isAddingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : "追加"}
                  </button>
                  <button
                    onClick={() => { setShowUrlInput(false); setUrlInput(""); }}
                    className="p-2 rounded-lg hover:bg-zinc-200 transition-colors"
                  >
                    <X className="w-4 h-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            )}

            {/* Posts List */}
            {isLoading && posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                <p className="text-zinc-500">読み込み中...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                  <Bookmark className="w-8 h-8 text-zinc-400" />
                </div>
                <h2 className="text-lg font-bold text-zinc-900 mb-2">
                  保存済み投稿がありません
                </h2>
                <p className="text-zinc-500 text-sm max-w-sm">
                  「URL追加」からX/Twitterの投稿URLを追加してください
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-[70vh] overflow-y-auto">
                {posts.map((post) => {
                  const hasVideo = post.media?.some(m => m.type === "video");
                  const hasPhoto = post.media?.some(m => m.type === "photo");

                  return (
                    <article key={post.id} className="p-4 hover:bg-zinc-50 transition-colors">
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {post.authorProfileImageUrl ? (
                            <div className="w-10 h-10">
                              <Image
                                src={post.authorProfileImageUrl}
                                alt={post.authorName}
                                width={40}
                                height={40}
                                className="rounded-full w-10 h-10 object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 font-bold text-sm">
                              {post.authorName?.[0] || "?"}
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="font-bold text-zinc-900 text-sm truncate">
                              {post.authorName}
                            </span>
                            <span className="text-zinc-500 text-sm truncate">
                              @{post.authorUsername}
                            </span>
                          </div>

                          <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-3">
                            {post.translatedText || post.text}
                          </p>

                          {/* Media indicator */}
                          {(hasVideo || hasPhoto) && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                              <Video className="w-3 h-3" />
                              <span>{hasVideo ? "動画" : "画像"}付き</span>
                            </div>
                          )}

                          {/* Metrics */}
                          <div className="flex items-center gap-4 mt-2 text-zinc-400 text-xs">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {formatNumber(post.likes)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Repeat2 className="w-3 h-3" />
                              {formatNumber(post.retweets)}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => handleStartAIGenerate(post)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full hover:bg-emerald-600 transition-colors"
                            >
                              <Sparkles className="w-3 h-3" />
                              AI生成
                            </button>
                            <a
                              href={`https://x.com/${post.authorUsername}/status/${post.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 text-zinc-600 text-xs font-medium rounded-full hover:bg-zinc-50 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Xで見る
                            </a>
                            <button
                              onClick={() => handleDelete(post.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Completed Posts History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-emerald-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">完了済み投稿</span>
                <span className="text-sm text-emerald-600">({history.length}件)</span>
              </div>
              <button
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="p-2 rounded-full hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-600 ${isLoadingHistory ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* History List */}
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-3" />
                <p className="text-zinc-500 text-sm">読み込み中...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-zinc-500 text-sm">
                  投稿した内容がここに表示されます
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-[70vh] overflow-y-auto">
                {history.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-zinc-50 transition-colors">
                    {/* Posted content preview (like a tweet card) */}
                    <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-sm">
                      {/* Header with time */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-600">
                          投稿済み
                        </span>
                        <div className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.postedAt)}
                        </div>
                      </div>

                      {/* Posted text */}
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap mb-3">
                        {item.text}
                      </p>

                      {/* Media from source (if attached) */}
                      {item.sourcePost?.media && item.sourcePost.media.length > 0 && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-zinc-200">
                          {item.sourcePost.media[0].type === "video" ? (
                            <div className="relative aspect-video bg-zinc-900">
                              <video
                                src={item.sourcePost.media[0].url}
                                poster={item.sourcePost.media[0].thumbnailUrl}
                                controls
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <Image
                              src={item.sourcePost.media[0].url || item.sourcePost.media[0].thumbnailUrl || ""}
                              alt="メディア"
                              width={300}
                              height={200}
                              className="w-full object-cover max-h-40"
                              unoptimized
                            />
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {item.tweetUrl && (
                          <a
                            href={item.tweetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Xで見る
                          </a>
                        )}
                        {item.sourcePost?.originalUrl && (
                          <a
                            href={item.sourcePost.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 bg-zinc-100 rounded-lg hover:bg-zinc-200"
                          >
                            <ExternalLink className="w-3 h-3" />
                            参照元
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
