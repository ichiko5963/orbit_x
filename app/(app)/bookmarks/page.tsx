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
  BarChart2,
  Share,
  MoreHorizontal,
  Sparkles,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Languages,
  Quote,
  BadgeCheck,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface XBookmark {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
  author?: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
    verified?: boolean;
  };
  attachments?: {
    media_keys?: string[];
  };
  media?: Array<{
    type: "photo" | "video" | "animated_gif";
    url?: string;
    preview_image_url?: string;
  }>;
  translatedText?: string;
  isTranslating?: boolean;
}

export default function BookmarksPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [bookmarks, setBookmarks] = useState<XBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [paginationToken, setPaginationToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async (token?: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL("/api/x/bookmarks", window.location.origin);
      url.searchParams.set("userId", user.uid);
      if (token) {
        url.searchParams.set("pagination_token", token);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        if (data.code === "NOT_CONNECTED" || data.code === "TOKEN_EXPIRED") {
          setNotConnected(true);
          return;
        }
        throw new Error(data.error);
      }

      if (token) {
        setBookmarks((prev) => [...prev, ...data.bookmarks]);
      } else {
        setBookmarks(data.bookmarks);
      }

      if (data.meta?.next_token) {
        setPaginationToken(data.meta.next_token);
        setHasMore(true);
      } else {
        setPaginationToken(null);
        setHasMore(false);
      }
    } catch (err) {
      console.error("Fetch bookmarks error:", err);
      setError(err instanceof Error ? err.message : "ブックマークの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    }
  }, [user, fetchBookmarks]);

  const handleLoadMore = () => {
    if (paginationToken) {
      fetchBookmarks(paginationToken);
    }
  };

  const handleRefresh = () => {
    setPaginationToken(null);
    fetchBookmarks();
  };

  const handleTranslate = async (bookmarkId: string) => {
    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (!bookmark || bookmark.translatedText) return;

    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === bookmarkId ? { ...b, isTranslating: true } : b
      )
    );

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bookmark.text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setBookmarks((prev) =>
        prev.map((b) =>
          b.id === bookmarkId
            ? { ...b, translatedText: data.translated, isTranslating: false }
            : b
        )
      );
    } catch (err) {
      console.error("Translation error:", err);
      setBookmarks((prev) =>
        prev.map((b) =>
          b.id === bookmarkId ? { ...b, isTranslating: false } : b
        )
      );
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUseAsReference = (bookmark: XBookmark) => {
    const referenceData = {
      text: bookmark.translatedText || bookmark.text,
      source: "bookmark",
      author: bookmark.author?.name || "Unknown",
      likes: bookmark.public_metrics?.like_count || 0,
    };
    sessionStorage.setItem("bookmarkReference", JSON.stringify(referenceData));
    router.push("/compose");
  };

  const handleCreateQuotePost = (bookmark: XBookmark) => {
    const quoteData = {
      tweetId: bookmark.id,
      text: bookmark.translatedText || bookmark.text,
      author: bookmark.author?.name || "Unknown",
      username: bookmark.author?.username || "unknown",
      likes: bookmark.public_metrics?.like_count || 0,
    };
    sessionStorage.setItem("quoteTweetFromBookmark", JSON.stringify(quoteData));
    router.push("/compose/editor");
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "今";
    if (diffMins < 60) return `${diffMins}分`;
    if (diffHours < 24) return `${diffHours}時間`;
    if (diffDays < 7) return `${diffDays}日`;
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  const isLikelyEnglish = (text: string): boolean => {
    const japaneseRatio = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length / text.length;
    return japaneseRatio < 0.2;
  };

  // Parse URLs and mentions in text
  const parseText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const mentionRegex = /@(\w+)/g;
    const hashtagRegex = /#(\w+)/g;

    let result = text;

    // Replace URLs with styled links
    result = result.replace(urlRegex, '<span class="text-blue-500">$1</span>');
    // Replace mentions
    result = result.replace(mentionRegex, '<span class="text-blue-500">@$1</span>');
    // Replace hashtags
    result = result.replace(hashtagRegex, '<span class="text-blue-500">#$1</span>');

    return result;
  };

  if (notConnected) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        {/* X-style Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200">
          <div className="px-4 py-3">
            <h1 className="text-xl font-bold text-zinc-900">ブックマーク</h1>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">
            ブックマークを表示するには
          </h2>
          <p className="text-zinc-500 mb-8 max-w-sm">
            設定ページでXアカウントと連携すると、保存した投稿がここに表示されます。
          </p>
          <Link
            href="/settings"
            className="px-8 py-3 bg-zinc-900 text-white font-bold rounded-full hover:bg-zinc-800 transition-colors"
          >
            Xと連携する
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* X-style Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">ブックマーク</h1>
            <p className="text-sm text-zinc-500">@{user?.email?.split("@")[0] || "user"}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-600 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p className="text-zinc-500">読み込み中...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-6">
            <Bookmark className="w-10 h-10 text-zinc-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">
            ブックマークはまだありません
          </h2>
          <p className="text-zinc-500 max-w-sm">
            Xで投稿をブックマークすると、ここに表示されます。
          </p>
        </div>
      ) : (
        <>
          {/* Tweet List - X Style */}
          <div className="divide-y divide-zinc-200">
            {bookmarks.map((bookmark) => (
              <article
                key={bookmark.id}
                className="px-4 py-3 hover:bg-zinc-50 transition-colors cursor-pointer"
                onClick={() => setExpandedId(expandedId === bookmark.id ? null : bookmark.id)}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {bookmark.author?.profile_image_url ? (
                      <Image
                        src={bookmark.author.profile_image_url.replace("_normal", "_bigger")}
                        alt={bookmark.author.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-300" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Author row */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-zinc-900 truncate">
                        {bookmark.author?.name || "Unknown"}
                      </span>
                      {bookmark.author?.verified && (
                        <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                      <span className="text-zinc-500 truncate">
                        @{bookmark.author?.username || "unknown"}
                      </span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-500 flex-shrink-0">
                        {formatTimeAgo(bookmark.created_at)}
                      </span>
                      {isLikelyEnglish(bookmark.text) && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-600 rounded">
                          EN
                        </span>
                      )}
                    </div>

                    {/* Tweet text */}
                    <div className="mt-1">
                      <p
                        className="text-[15px] text-zinc-900 whitespace-pre-wrap break-words leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: parseText(bookmark.text) }}
                      />
                    </div>

                    {/* Translated text */}
                    {bookmark.translatedText && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-xl">
                        <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                          <Languages className="w-3 h-3" />
                          日本語訳
                        </p>
                        <p className="text-[15px] text-zinc-800 whitespace-pre-wrap leading-relaxed">
                          {bookmark.translatedText}
                        </p>
                      </div>
                    )}

                    {/* Media preview placeholder */}
                    {bookmark.media && bookmark.media.length > 0 && (
                      <div className="mt-3 rounded-2xl overflow-hidden border border-zinc-200">
                        {bookmark.media[0].type === "video" ? (
                          <div className="aspect-video bg-zinc-900 flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-blue-500/80 flex items-center justify-center">
                              <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video bg-zinc-100 flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-zinc-400" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Engagement metrics - X style */}
                    <div className="flex items-center justify-between mt-3 max-w-md">
                      <button className="flex items-center gap-1 text-zinc-500 hover:text-blue-500 group">
                        <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <span className="text-sm">{formatNumber(bookmark.public_metrics?.reply_count || 0)}</span>
                      </button>
                      <button className="flex items-center gap-1 text-zinc-500 hover:text-green-500 group">
                        <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                          <Repeat2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm">{formatNumber(bookmark.public_metrics?.retweet_count || 0)}</span>
                      </button>
                      <button className="flex items-center gap-1 text-zinc-500 hover:text-pink-500 group">
                        <div className="p-2 rounded-full group-hover:bg-pink-50 transition-colors">
                          <Heart className="w-4 h-4" />
                        </div>
                        <span className="text-sm">{formatNumber(bookmark.public_metrics?.like_count || 0)}</span>
                      </button>
                      <button className="flex items-center gap-1 text-zinc-500 hover:text-blue-500 group">
                        <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                          <BarChart2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm">{formatNumber(bookmark.public_metrics?.impression_count || 0)}</span>
                      </button>
                    </div>

                    {/* Expanded actions */}
                    {expandedId === bookmark.id && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleCreateQuotePost(bookmark)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-full hover:bg-blue-600 transition-colors"
                        >
                          <Quote className="w-4 h-4" />
                          引用投稿
                        </button>
                        <button
                          onClick={() => handleUseAsReference(bookmark)}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-full hover:bg-emerald-600 transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                          AI参考
                        </button>
                        {isLikelyEnglish(bookmark.text) && !bookmark.translatedText && (
                          <button
                            onClick={() => handleTranslate(bookmark.id)}
                            disabled={bookmark.isTranslating}
                            className="flex items-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-full hover:bg-zinc-50 transition-colors disabled:opacity-50"
                          >
                            {bookmark.isTranslating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Languages className="w-4 h-4" />
                            )}
                            翻訳
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(bookmark.id, bookmark.translatedText || bookmark.text)}
                          className="flex items-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-full hover:bg-zinc-50 transition-colors"
                        >
                          {copiedId === bookmark.id ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              コピー済み
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              コピー
                            </>
                          )}
                        </button>
                        <a
                          href={`https://x.com/${bookmark.author?.username}/status/${bookmark.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-medium rounded-full hover:bg-zinc-50 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Xで見る
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="p-4 border-t border-zinc-200">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="w-full py-3 text-blue-500 font-medium hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "さらに表示"
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
