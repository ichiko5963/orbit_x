"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  CheckCircle2,
  X as XIcon,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getScheduledPosts, updateScheduledPost, deleteScheduledPost } from "@/lib/firebase";

interface ScheduledPost {
  id: string;
  text: string;
  scheduledAt: any;
  status: "scheduled" | "posted" | "failed";
  imageUrls?: string[];
  quoteTweetUrl?: string;
  threadPost?: string;
}

// Days of week in Japanese
const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

// Get days in month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Get first day of month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load scheduled posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const fetchedPosts = await getScheduledPosts(user.uid);
        setPosts(fetchedPosts as ScheduledPost[]);
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPosts();
  }, [user]);

  // Check URL for success message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("scheduled") === "true") {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      // Remove param from URL
      window.history.replaceState({}, "", "/calendar");
    }
  }, []);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [year, month]);

  // Get posts for a specific day
  const getPostsForDay = (day: number) => {
    return posts.filter((post) => {
      const postDate = new Date(post.scheduledAt);
      return (
        postDate.getFullYear() === year &&
        postDate.getMonth() === month &&
        postDate.getDate() === day
      );
    }).sort((a, b) => {
      const dateA = new Date(a.scheduledAt);
      const dateB = new Date(b.scheduledAt);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Filter posts by search
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    return posts.filter((post) =>
      post.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [posts, searchQuery]);

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  // Check if date is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  // Check if date is weekend
  const isWeekend = (dayIndex: number) => {
    return dayIndex % 7 === 0 || dayIndex % 7 === 6;
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!confirm("この予約投稿を削除しますか？")) return;

    try {
      await deleteScheduledPost(user.uid, postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          投稿を予約しました
          <button onClick={() => setShowSuccess(false)} className="ml-2">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-zinc-900">投稿カレンダー</h1>
        <Link
          href="/compose"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新規作成
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          placeholder="投稿を検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={goToToday}
          className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
        >
          今日
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900">
          {year}年 {month + 1}月
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-zinc-200">
          {DAYS.map((day, idx) => (
            <div
              key={day}
              className={`py-3 text-center text-sm font-medium ${
                idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-zinc-600"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPosts = day ? getPostsForDay(day) : [];
            const displayPosts = dayPosts.slice(0, 3);
            const remainingCount = dayPosts.length - 3;

            return (
              <div
                key={idx}
                className={`min-h-[120px] border-b border-r border-zinc-100 p-2 ${
                  day === null ? "bg-zinc-50" : ""
                } ${isToday(day || 0) ? "bg-emerald-50" : ""}`}
              >
                {day && (
                  <>
                    {/* Day Number */}
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday(day)
                          ? "text-emerald-600"
                          : isWeekend(idx)
                          ? idx % 7 === 0
                            ? "text-red-500"
                            : "text-blue-500"
                          : "text-zinc-700"
                      }`}
                    >
                      {day}
                    </div>

                    {/* Posts */}
                    <div className="space-y-1">
                      {displayPosts.map((post) => {
                        const postDate = new Date(post.scheduledAt);
                        const isPast = postDate < new Date();
                        const isPosted = post.status === "posted";
                        const isFailed = post.status === "failed";

                        return (
                          <button
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className={`w-full text-left px-2 py-1 rounded text-xs truncate transition-colors ${
                              isPosted
                                ? "bg-emerald-100 text-emerald-700"
                                : isFailed
                                ? "bg-red-100 text-red-700"
                                : isPast
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-500 text-white hover:bg-emerald-600"
                            }`}
                          >
                            <span className="font-medium">{formatTime(postDate)}</span>
                            {isPosted && " ✓"}
                            {isFailed && " ✗"}
                            <span className="ml-1">{post.text.slice(0, 15)}...</span>
                          </button>
                        );
                      })}
                      {remainingCount > 0 && (
                        <div className="text-xs text-zinc-400 px-2">
                          +{remainingCount}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <p className="text-2xl font-bold text-zinc-900">
            {posts.filter((p) => p.status === "scheduled").length}
          </p>
          <p className="text-sm text-zinc-500">予約中</p>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <p className="text-2xl font-bold text-emerald-600">
            {posts.filter((p) => p.status === "posted").length}
          </p>
          <p className="text-sm text-zinc-500">投稿済み</p>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <p className="text-2xl font-bold text-red-500">
            {posts.filter((p) => p.status === "failed").length}
          </p>
          <p className="text-sm text-zinc-500">失敗</p>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl">
          <p className="text-2xl font-bold text-zinc-900">{posts.length}</p>
          <p className="text-sm text-zinc-500">合計</p>
        </div>
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedPost(null)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-500" />
                <span className="font-medium text-zinc-900">
                  {new Date(selectedPost.scheduledAt).toLocaleString("ja-JP")}
                </span>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
              >
                <XIcon className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Status Badge */}
              <div className="mb-4">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full ${
                    selectedPost.status === "posted"
                      ? "bg-emerald-100 text-emerald-700"
                      : selectedPost.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {selectedPost.status === "posted"
                    ? "投稿済み"
                    : selectedPost.status === "failed"
                    ? "失敗"
                    : "予約中"}
                </span>
              </div>

              {/* Post Text */}
              <div className="p-4 bg-zinc-50 rounded-xl mb-4">
                <p className="text-zinc-700 whitespace-pre-wrap">{selectedPost.text}</p>
              </div>

              {/* Quote Tweet */}
              {selectedPost.quoteTweetUrl && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mb-4">
                  <p className="text-sm text-blue-700">
                    引用ツイート: {selectedPost.quoteTweetUrl}
                  </p>
                </div>
              )}

              {/* Thread Post */}
              {selectedPost.threadPost && (
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl mb-4">
                  <p className="text-sm font-medium text-violet-700 mb-1">スレッド投稿:</p>
                  <p className="text-sm text-violet-600">{selectedPost.threadPost}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDeletePost(selectedPost.id)}
                  className="flex-1 py-3 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
                >
                  削除
                </button>
                <Link
                  href={`/compose/editor?text=${encodeURIComponent(selectedPost.text)}`}
                  className="flex-1 py-3 text-center text-zinc-600 font-medium bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  編集
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
