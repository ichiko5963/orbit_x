"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bookmark,
  RefreshCw,
  Heart,
  MessageCircle,
  Repeat2,
  Globe,
  Sparkles,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Languages,
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
  };
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
        // Append to existing bookmarks
        setBookmarks((prev) => [...prev, ...data.bookmarks]);
      } else {
        setBookmarks(data.bookmarks);
      }

      // Handle pagination
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
    // Store bookmark in sessionStorage for use in compose
    const referenceData = {
      text: bookmark.translatedText || bookmark.text,
      source: "bookmark",
      author: bookmark.author?.name || "Unknown",
      likes: bookmark.public_metrics?.like_count || 0,
    };
    sessionStorage.setItem("bookmarkReference", JSON.stringify(referenceData));
    router.push("/compose");
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  // Check if text contains mostly non-Japanese characters (likely English)
  const isLikelyEnglish = (text: string): boolean => {
    const japaneseRatio = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length / text.length;
    return japaneseRatio < 0.2;
  };

  if (notConnected) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
              保存した投稿
            </h1>
            <p className="text-lg text-zinc-500">
              Xでブックマークした投稿を参照
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
            <Bookmark className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            Xアカウントと連携してください
          </h2>
          <p className="text-zinc-500 mb-6 max-w-md">
            ブックマークを表示するには、設定ページでXアカウントと連携する必要があります。
          </p>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            設定ページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            保存した投稿
          </h1>
          <p className="text-lg text-zinc-500">
            Xでブックマークした投稿を参照・活用
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "取得中..." : "更新"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{bookmarks.length}</p>
              <p className="text-sm text-zinc-500">ブックマーク</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">
                {bookmarks.filter((b) => isLikelyEnglish(b.text)).length}
              </p>
              <p className="text-sm text-zinc-500">英語投稿</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <p className="text-zinc-500">ブックマークを読み込み中...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-zinc-200">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
            <Bookmark className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-lg text-zinc-600 mb-1">ブックマークがありません</p>
          <p className="text-sm text-zinc-400">Xで投稿をブックマークすると表示されます</p>
        </div>
      ) : (
        <>
          {/* Bookmarks List */}
          <div className="space-y-4">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  {/* Author Info */}
                  <div className="flex items-center gap-3 mb-3">
                    {bookmark.author?.profile_image_url ? (
                      <img
                        src={bookmark.author.profile_image_url}
                        alt={bookmark.author.name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-200" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 truncate">
                        {bookmark.author?.name || "Unknown"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        @{bookmark.author?.username || "unknown"} • {formatDate(bookmark.created_at)}
                      </p>
                    </div>
                    {isLikelyEnglish(bookmark.text) && !bookmark.translatedText && (
                      <button
                        onClick={() => handleTranslate(bookmark.id)}
                        disabled={bookmark.isTranslating}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        {bookmark.isTranslating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Languages className="w-4 h-4" />
                        )}
                        翻訳
                      </button>
                    )}
                  </div>

                  {/* Tweet Text */}
                  <p className="text-zinc-900 whitespace-pre-wrap leading-relaxed mb-3">
                    {bookmark.text}
                  </p>

                  {/* Translated Text */}
                  {bookmark.translatedText && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-3">
                      <p className="text-xs font-medium text-blue-600 mb-1">日本語訳</p>
                      <p className="text-zinc-800 whitespace-pre-wrap leading-relaxed">
                        {bookmark.translatedText}
                      </p>
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="flex items-center gap-6 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {formatNumber(bookmark.public_metrics?.like_count || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-4 h-4" />
                      {formatNumber(bookmark.public_metrics?.retweet_count || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {formatNumber(bookmark.public_metrics?.reply_count || 0)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex border-t border-zinc-100">
                  <button
                    onClick={() => handleCopy(bookmark.id, bookmark.translatedText || bookmark.text)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors border-r border-zinc-100"
                  >
                    {copiedId === bookmark.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600">コピー済み</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        コピー
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleUseAsReference(bookmark)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors border-r border-zinc-100"
                  >
                    <Sparkles className="w-4 h-4" />
                    参考にする
                  </button>
                  <a
                    href={`https://twitter.com/${bookmark.author?.username}/status/${bookmark.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Xで見る
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-200 rounded-xl font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : null}
                もっと読み込む
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
