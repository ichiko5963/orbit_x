"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Edit3,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  saveScheduledPost,
  getScheduledPosts,
  updateScheduledPost,
  deleteScheduledPost,
} from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

interface ScheduledPost {
  id: string;
  text: string;
  scheduledAt: Date;
  status: "scheduled" | "posted" | "failed";
}

const daysOfWeek = ["日", "月", "火", "水", "木", "金", "土"];
const months = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function SchedulePage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [newPostTime, setNewPostTime] = useState("09:00");
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  // Load posts from Firestore
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const fetchedPosts = await getScheduledPosts(user.uid);
        const formattedPosts: ScheduledPost[] = fetchedPosts.map((post: any) => ({
          id: post.id,
          text: post.text,
          scheduledAt: post.scheduledAt instanceof Timestamp
            ? post.scheduledAt.toDate()
            : new Date(post.scheduledAt),
          status: post.status || "scheduled",
        }));
        setPosts(formattedPosts);
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [user]);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [daysInMonth, firstDayOfMonth]);

  const getPostsForDate = (day: number) => {
    return posts.filter((post) => {
      const postDate = new Date(post.scheduledAt);
      return (
        postDate.getFullYear() === year &&
        postDate.getMonth() === month &&
        postDate.getDate() === day
      );
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(year, month, day));
    setIsModalOpen(true);
  };

  const handleAddPost = async () => {
    if (!newPostText || !selectedDate || !user) return;

    setIsSaving(true);

    try {
      const [hours, minutes] = newPostTime.split(":").map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      if (editingPost) {
        await updateScheduledPost(user.uid, editingPost.id, {
          text: newPostText,
          scheduledAt: Timestamp.fromDate(scheduledAt),
        });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === editingPost.id
              ? { ...p, text: newPostText, scheduledAt }
              : p
          )
        );
      } else {
        const postId = await saveScheduledPost(user.uid, {
          text: newPostText,
          scheduledAt: Timestamp.fromDate(scheduledAt),
          status: "scheduled",
        });
        const newPost: ScheduledPost = {
          id: postId,
          text: newPostText,
          scheduledAt,
          status: "scheduled",
        };
        setPosts((prev) => [...prev, newPost]);
      }

      setNewPostText("");
      setNewPostTime("09:00");
      setEditingPost(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save post:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPost = (post: ScheduledPost) => {
    setEditingPost(post);
    setNewPostText(post.text);
    setNewPostTime(
      `${String(post.scheduledAt.getHours()).padStart(2, "0")}:${String(
        post.scheduledAt.getMinutes()
      ).padStart(2, "0")}`
    );
    setSelectedDate(post.scheduledAt);
    setIsModalOpen(true);
  };

  const handleDeletePost = async (id: string) => {
    if (!user) return;

    try {
      await deleteScheduledPost(user.uid, id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  const selectedDatePosts = selectedDate
    ? posts.filter((post) => {
        const postDate = new Date(post.scheduledAt);
        return (
          postDate.getFullYear() === selectedDate.getFullYear() &&
          postDate.getMonth() === selectedDate.getMonth() &&
          postDate.getDate() === selectedDate.getDate()
        );
      })
    : [];

  const upcomingPosts = posts
    .filter((p) => p.status === "scheduled" && new Date(p.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            予約投稿
          </h1>
          <p className="text-lg text-zinc-500">
            投稿をカレンダーで予約・管理
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedDate(new Date());
            setEditingPost(null);
            setNewPostText("");
            setNewPostTime("09:00");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
        >
          <Plus className="w-5 h-5" />
          予約を追加
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-100">
            <h2 className="text-xl font-semibold text-zinc-900">
              {year}年 {months[month]}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                今日
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 mb-2">
              {daysOfWeek.map((day, i) => (
                <div
                  key={day}
                  className={`p-2 text-center text-sm font-medium ${
                    i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-zinc-500"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="h-24" />;
                }

                const dayPosts = getPostsForDate(day);
                const dayOfWeek = (firstDayOfMonth + day - 1) % 7;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-24 p-2 rounded-xl text-left transition-all hover:bg-zinc-50 ${
                      isToday(day)
                        ? "bg-emerald-50 border-2 border-emerald-500"
                        : "border border-zinc-100"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        isToday(day)
                          ? "text-emerald-600"
                          : isSunday
                          ? "text-red-500"
                          : isSaturday
                          ? "text-blue-500"
                          : "text-zinc-700"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayPosts.slice(0, 2).map((post) => (
                        <div
                          key={post.id}
                          className={`px-1.5 py-0.5 text-xs rounded truncate ${
                            post.status === "posted"
                              ? "bg-zinc-100 text-zinc-500"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {new Date(post.scheduledAt).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-xs text-zinc-400 px-1">
                          +{dayPosts.length - 2}件
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar - Upcoming Posts */}
        <div className="space-y-6">
          {/* Upcoming Posts */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              予定の投稿
            </h3>
            {upcomingPosts.length > 0 ? (
              <div className="space-y-3">
                {upcomingPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 bg-zinc-50 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-emerald-600">
                        {new Date(post.scheduledAt).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditPost(post)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600 line-clamp-2">
                      {post.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-zinc-400" />
                </div>
                <p className="text-base text-zinc-600 mb-1">予定なし</p>
                <p className="text-sm text-zinc-400">
                  カレンダーから日付を選択して追加
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              今月の統計
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base text-zinc-500">予約済み</span>
                <span className="text-xl font-bold text-zinc-900">
                  {posts.filter((p) => p.status === "scheduled").length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base text-zinc-500">投稿済み</span>
                <span className="text-xl font-bold text-emerald-600">
                  {posts.filter((p) => p.status === "posted").length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsModalOpen(false);
              setEditingPost(null);
            }}
          />
          <div className="relative w-full max-w-lg p-8 bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-zinc-900">
                {editingPost ? "投稿を編集" : "投稿を予約"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPost(null);
                }}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDate && (
              <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-xl mb-6">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span className="text-base font-medium text-emerald-700">
                  {selectedDate.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  投稿内容
                </label>
                <textarea
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="投稿内容を入力..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                />
                <div className="flex justify-end mt-2">
                  <span
                    className={`text-sm ${
                      newPostText.length > 280 ? "text-red-500" : "text-zinc-400"
                    }`}
                  >
                    {newPostText.length}/280
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  投稿時刻
                </label>
                <input
                  type="time"
                  value={newPostTime}
                  onChange={(e) => setNewPostTime(e.target.value)}
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Posts for selected date */}
            {selectedDatePosts.length > 0 && !editingPost && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-zinc-500 mb-3">
                  この日の予約 ({selectedDatePosts.length}件)
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedDatePosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-emerald-600">
                          {new Date(post.scheduledAt).toLocaleTimeString(
                            "ja-JP",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                        <span className="text-sm text-zinc-600 truncate">
                          {post.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingPost(null);
                }}
                className="flex-1 px-4 py-3 text-zinc-600 text-base font-medium rounded-xl hover:bg-zinc-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddPost}
                disabled={!newPostText || newPostText.length > 280 || isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    {editingPost ? "更新" : "予約する"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
