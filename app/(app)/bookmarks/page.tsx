"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Quote,
  Plus,
  Trash2,
  Link as LinkIcon,
  X,
  Play,
  CheckCircle2,
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

export default function BookmarksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile: xProfile, isConnected: xConnected } = useXProfile();

  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

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

    // Check if already added
    if (posts.some((p) => p.id === tweetId)) {
      setError("この投稿は既に追加されています");
      return;
    }

    setIsAddingUrl(true);
    setError(null);

    try {
      // Fetch tweet details
      const tweetResponse = await fetch(`/api/x/tweet?id=${tweetId}`);
      const tweetData = await tweetResponse.json();

      if (!tweetResponse.ok) {
        throw new Error(tweetData.error || "ツイートの取得に失敗しました");
      }

      const tweet = tweetData.tweet;

      // Save to Firestore
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

      // Add to local state
      setPosts((prev) => [saveData.post, ...prev]);
      setUrlInput("");
      setShowUrlInput(false);
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

  // Translate post
  const handleTranslate = async (postId: string) => {
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post || post.translatedText) return;

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isTranslating: true } : p))
    );

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: post.text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Update in Firestore
      await fetch("/api/x/saved-posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          postId,
          updates: { translatedText: data.translated },
        }),
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, translatedText: data.translated, isTranslating: false }
            : p
        )
      );
    } catch (err) {
      console.error("Translation error:", err);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isTranslating: false } : p))
      );
    }
  };

  // Create quote post
  const handleCreateQuotePost = (post: SavedPost) => {
    const quoteData = {
      tweetId: post.id,
      text: post.translatedText || post.text,
      author: post.authorName,
      username: post.authorUsername,
      likes: post.likes,
      media: post.media,
    };
    sessionStorage.setItem("quoteTweetFromBookmark", JSON.stringify(quoteData));
    router.push("/compose/editor");
  };

  // AI Generate - translates first if needed, then goes to compose
  const handleAIGenerate = async (post: SavedPost) => {
    // If not translated yet and likely English, translate first
    const isLikelyEnglish = (text: string): boolean => {
      const japaneseRatio =
        (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length /
        text.length;
      return japaneseRatio < 0.2;
    };

    let textToUse = post.translatedText || post.text;

    if (!post.translatedText && isLikelyEnglish(post.text)) {
      // Translate first
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isTranslating: true } : p))
      );

      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: post.text }),
        });

        const data = await response.json();

        if (response.ok && data.translated) {
          textToUse = data.translated;

          // Update in Firestore
          await fetch("/api/x/saved-posts", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user?.uid,
              postId: post.id,
              updates: { translatedText: data.translated },
            }),
          });

          setPosts((prev) =>
            prev.map((p) =>
              p.id === post.id
                ? { ...p, translatedText: data.translated, isTranslating: false }
                : p
            )
          );
        }
      } catch (err) {
        console.error("Translation error:", err);
      }

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, isTranslating: false } : p))
      );
    }

    // Store reference data and go to compose
    const referenceData = {
      text: textToUse,
      source: "saved_post",
      author: post.authorName,
      likes: post.likes,
      tweetId: post.id,
      media: post.media,
    };
    sessionStorage.setItem("bookmarkReference", JSON.stringify(referenceData));
    router.push("/compose");
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const isLikelyEnglish = (text: string): boolean => {
    const japaneseRatio =
      (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length /
      text.length;
    return japaneseRatio < 0.2;
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">保存済み投稿</h1>
            <p className="text-sm text-zinc-500">
              {xProfile ? `@${xProfile.username}` : "X未連携"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              URL追加
            </button>
            <button
              onClick={loadPosts}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-zinc-100 transition-colors disabled:opacity-50"
              title="再読み込み"
            >
              <RefreshCw
                className={`w-5 h-5 text-zinc-600 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* URL Input Section */}
        {showUrlInput && (
          <div className="px-4 pb-3 border-t border-zinc-100">
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://x.com/username/status/..."
                  className="w-full h-10 pl-10 pr-4 bg-zinc-100 border border-zinc-200 rounded-full text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleAddFromUrl()}
                />
              </div>
              <button
                onClick={handleAddFromUrl}
                disabled={isAddingUrl || !urlInput.trim()}
                className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-full hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {isAddingUrl ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "追加"
                )}
              </button>
              <button
                onClick={() => {
                  setShowUrlInput(false);
                  setUrlInput("");
                }}
                className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              X/TwitterのURLを貼り付けて保存できます（動画も対応）
            </p>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
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

      {/* Loading State */}
      {isLoading && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p className="text-zinc-500">読み込み中...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-zinc-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">
            保存済み投稿がありません
          </h2>
          <p className="text-zinc-500 max-w-sm mb-6">
            上の「URL追加」ボタンからX/Twitterの投稿URLを貼り付けて追加できます。
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200">
          {posts.map((post) => (
            <article key={post.id} className="px-4 py-4 hover:bg-zinc-50/50">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {post.authorProfileImageUrl ? (
                    <Image
                      src={post.authorProfileImageUrl}
                      alt={post.authorName}
                      width={48}
                      height={48}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 font-bold">
                      {post.authorName?.[0] || "?"}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Author row */}
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-bold text-zinc-900 truncate">
                      {post.authorName}
                    </span>
                    <span className="text-zinc-500 truncate">
                      @{post.authorUsername}
                    </span>
                  </div>

                  {/* Tweet text with line breaks */}
                  <p className="text-[15px] text-zinc-900 whitespace-pre-wrap break-words leading-relaxed">
                    {post.text}
                  </p>

                  {/* Translated text */}
                  {post.translatedText && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-xl">
                      <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        日本語訳
                      </p>
                      <p className="text-[15px] text-zinc-800 whitespace-pre-wrap leading-relaxed">
                        {post.translatedText}
                      </p>
                    </div>
                  )}

                  {/* Media */}
                  {post.media && post.media.length > 0 && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200">
                      {post.media[0].type === "video" ? (
                        <div className="relative aspect-video bg-zinc-900">
                          <video
                            src={post.media[0].url}
                            poster={post.media[0].thumbnailUrl}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <Image
                          src={post.media[0].url || post.media[0].thumbnailUrl || ""}
                          alt="メディア"
                          width={500}
                          height={300}
                          className="w-full object-cover"
                          unoptimized
                        />
                      )}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="flex items-center gap-6 mt-3 text-zinc-500 text-sm">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {formatNumber(post.replies)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-4 h-4" />
                      {formatNumber(post.retweets)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {formatNumber(post.likes)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {/* AI Generate Button - Primary Action */}
                    <button
                      onClick={() => handleAIGenerate(post)}
                      disabled={post.isTranslating}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50"
                    >
                      {post.isTranslating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          翻訳中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          AI投稿生成
                        </>
                      )}
                    </button>

                    {/* Quote Post */}
                    <button
                      onClick={() => handleCreateQuotePost(post)}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors"
                    >
                      <Quote className="w-4 h-4" />
                      引用投稿
                    </button>

                    {/* Translate Button (if English and not yet translated) */}
                    {isLikelyEnglish(post.text) && !post.translatedText && (
                      <button
                        onClick={() => handleTranslate(post.id)}
                        disabled={post.isTranslating}
                        className="flex items-center gap-2 px-3 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-full hover:bg-zinc-50 transition-colors disabled:opacity-50"
                      >
                        {post.isTranslating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Languages className="w-4 h-4" />
                        )}
                        翻訳
                      </button>
                    )}

                    {/* View on X */}
                    <a
                      href={`https://x.com/${post.authorUsername}/status/${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-full hover:bg-zinc-50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Xで見る
                    </a>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
