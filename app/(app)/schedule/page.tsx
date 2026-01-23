"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  X as XIcon,
  Clock,
  Loader2,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Calendar,
  Save,
  GripVertical,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getScheduledPosts, updateScheduledPost, deleteScheduledPost, saveScheduledPost } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

interface ScheduledPost {
  id: string;
  text: string;
  scheduledAt: any;
  status: "scheduled" | "posted" | "failed";
  imageUrls?: string[];
  quoteTweetUrl?: string;
  threadPosts?: string[]; // Thread posts (2nd, 3rd, etc.)
}

// Time slots from 6:00 to 23:00 (main posting hours)
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => i + 6);

// Days of week in Japanese
const DAYS_JP = ["日", "月", "火", "水", "木", "金", "土"];

export default function SchedulePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Modal states
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New post modal
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostDate, setNewPostDate] = useState<Date | null>(null);
  const [newPostTime, setNewPostTime] = useState("12:00");
  const [newPostText, setNewPostText] = useState("");

  // Drag state
  const [draggedPost, setDraggedPost] = useState<ScheduledPost | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ day: number; hour: number } | null>(null);

  // Time picker modal (for 15-min intervals after drop)
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerPost, setTimePickerPost] = useState<ScheduledPost | null>(null);
  const [timePickerDate, setTimePickerDate] = useState<Date | null>(null);
  const [timePickerHour, setTimePickerHour] = useState(12);
  const [timePickerMinute, setTimePickerMinute] = useState(0);

  // Quick time change modal
  const [showQuickTimeChange, setShowQuickTimeChange] = useState(false);

  // Toast
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get 7 days starting from weekStart
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date;
    });
  }, [weekStart]);

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText, newPostText]);

  // Navigate weeks
  const goToPrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToThisWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setWeekStart(today);
  };

  // Helper to convert scheduledAt to Date (handles both Timestamp and Date)
  const toDate = (scheduledAt: any): Date => {
    if (!scheduledAt) return new Date(0);
    // Firebase Timestamp has toDate() method
    if (scheduledAt.toDate && typeof scheduledAt.toDate === "function") {
      return scheduledAt.toDate();
    }
    // If it's a Firestore Timestamp-like object with seconds
    if (scheduledAt.seconds !== undefined) {
      return new Date(scheduledAt.seconds * 1000);
    }
    // Otherwise try to create Date directly
    return new Date(scheduledAt);
  };

  // Get posts for a specific day and hour
  const getPostsForSlot = (day: Date, hour: number) => {
    return posts.filter((post) => {
      const postDate = toDate(post.scheduledAt);
      return (
        postDate.getFullYear() === day.getFullYear() &&
        postDate.getMonth() === day.getMonth() &&
        postDate.getDate() === day.getDate() &&
        postDate.getHours() === hour
      );
    }).sort((a, b) => {
      const dateA = toDate(a.scheduledAt);
      const dateB = toDate(b.scheduledAt);
      return dateA.getMinutes() - dateB.getMinutes();
    });
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    );
  };

  // Format time
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number) => {
    const firstLine = text.split("\n")[0];
    if (firstLine.length <= maxLength) return firstLine;
    return firstLine.slice(0, maxLength) + "...";
  };

  // Show success toast
  const showToast = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, post: ScheduledPost) => {
    setDraggedPost(post);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", post.id);
  };

  const handleDragEnd = () => {
    setDraggedPost(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot({ day: dayIndex, hour });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = (e: React.DragEvent, dayIndex: number, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);

    if (!draggedPost || !user) return;

    const targetDay = weekDays[dayIndex];
    const newDate = new Date(targetDay);
    newDate.setHours(hour, 0, 0, 0);

    // Show time picker modal for 15-minute selection
    const oldDate = toDate(draggedPost.scheduledAt);
    setTimePickerPost(draggedPost);
    setTimePickerDate(newDate);
    setTimePickerHour(hour);
    // Keep the original minutes if moving within same hour
    if (
      oldDate.getFullYear() === newDate.getFullYear() &&
      oldDate.getMonth() === newDate.getMonth() &&
      oldDate.getDate() === newDate.getDate() &&
      oldDate.getHours() === hour
    ) {
      setTimePickerMinute(oldDate.getMinutes());
    } else {
      setTimePickerMinute(0);
    }
    setShowTimePicker(true);
    setDraggedPost(null);
  };

  // Confirm time picker selection
  const handleConfirmTimePicker = async () => {
    if (!timePickerPost || !timePickerDate || !user) return;

    const newDate = new Date(timePickerDate);
    newDate.setHours(timePickerHour, timePickerMinute, 0, 0);

    try {
      await updateScheduledPost(user.uid, timePickerPost.id, {
        scheduledAt: Timestamp.fromDate(newDate),
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === timePickerPost.id ? { ...p, scheduledAt: newDate } : p
        )
      );

      showToast("投稿を移動しました");
    } catch (error) {
      console.error("Failed to move post:", error);
    }

    setShowTimePicker(false);
    setTimePickerPost(null);
  };

  // Quick time change for selected post
  const handleQuickTimeChange = async (minute: number) => {
    if (!selectedPost || !user) return;

    const currentDate = toDate(selectedPost.scheduledAt);
    const newDate = new Date(currentDate);
    newDate.setMinutes(minute);

    try {
      await updateScheduledPost(user.uid, selectedPost.id, {
        scheduledAt: Timestamp.fromDate(newDate),
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id ? { ...p, scheduledAt: newDate } : p
        )
      );

      setSelectedPost({ ...selectedPost, scheduledAt: newDate });
      setShowQuickTimeChange(false);
      showToast("時間を変更しました");
    } catch (error) {
      console.error("Failed to change time:", error);
    }
  };

  // Click empty slot to create new post
  const handleSlotClick = (day: Date, hour: number) => {
    const date = new Date(day);
    date.setHours(hour, 0, 0, 0);
    setNewPostDate(date);
    setNewPostTime(`${hour.toString().padStart(2, "0")}:00`);
    setNewPostText("");
    setShowNewPostModal(true);
  };

  // Create new post
  const handleCreatePost = async () => {
    if (!user || !newPostDate || !newPostText.trim()) return;
    setIsSaving(true);

    try {
      const [hours, minutes] = newPostTime.split(":").map(Number);
      const scheduledAt = new Date(newPostDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const postId = await saveScheduledPost(user.uid, {
        text: newPostText,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status: "scheduled",
      });

      setPosts((prev) => [
        ...prev,
        {
          id: postId,
          text: newPostText,
          scheduledAt,
          status: "scheduled",
        },
      ]);

      setShowNewPostModal(false);
      setNewPostText("");
      showToast("投稿を予約しました");
    } catch (error) {
      console.error("Failed to create post:", error);
      alert("予約に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete post
  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    if (!confirm("この予約投稿を削除しますか？")) return;

    try {
      await deleteScheduledPost(user.uid, postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setSelectedPost(null);
      showToast("投稿を削除しました");
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  // Start editing
  const handleStartEdit = () => {
    if (!selectedPost) return;
    const postDate = toDate(selectedPost.scheduledAt);
    setEditText(selectedPost.text);
    setEditDate(postDate.toISOString().split("T")[0]);
    setEditTime(postDate.toTimeString().slice(0, 5));
    setIsEditing(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!user || !selectedPost) return;
    setIsSaving(true);

    try {
      const newScheduledAt = new Date(`${editDate}T${editTime}`);
      await updateScheduledPost(user.uid, selectedPost.id, {
        text: editText,
        scheduledAt: Timestamp.fromDate(newScheduledAt),
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id
            ? { ...p, text: editText, scheduledAt: newScheduledAt }
            : p
        )
      );

      setSelectedPost({ ...selectedPost, text: editText, scheduledAt: newScheduledAt });
      setIsEditing(false);
      showToast("変更を保存しました");
    } catch (error) {
      console.error("Failed to save:", error);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // Post now
  const handlePostNow = (text: string) => {
    const encodedText = encodeURIComponent(text);
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, "_blank");
  };

  // Duplicate post
  const handleDuplicatePost = (post: ScheduledPost) => {
    const url = `/compose/editor?text=${encodeURIComponent(post.text)}`;
    window.location.href = url;
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
          {successMessage}
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
          AI投稿作成
        </Link>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={goToThisWeek}
          className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50"
        >
          今週
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900">
          {weekDays[0].getMonth() + 1}月{weekDays[0].getDate()}日 〜 {weekDays[6].getMonth() + 1}月{weekDays[6].getDate()}日
        </h2>
        <div className="ml-auto flex items-center gap-4 text-sm text-zinc-500">
          <span>予約中: {posts.filter((p) => p.status === "scheduled").length}件</span>
          <span className="text-emerald-600">投稿済: {posts.filter((p) => p.status === "posted").length}件</span>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-4 text-sm text-zinc-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <GripVertical className="w-4 h-4" />
          ドラッグ&ドロップで時間変更
        </span>
        <span>空きスロットをクリックで新規作成</span>
      </div>

      {/* Weekly Grid */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Header - Days */}
        <div className="grid grid-cols-8 border-b border-zinc-200">
          <div className="py-3 px-2 text-center text-sm font-medium text-zinc-400 border-r border-zinc-200 bg-zinc-50">
            時間
          </div>
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              className={`py-3 px-2 text-center border-r border-zinc-100 last:border-r-0 ${
                isToday(day) ? "bg-emerald-50" : ""
              }`}
            >
              <div
                className={`text-xs font-medium ${
                  day.getDay() === 0
                    ? "text-red-500"
                    : day.getDay() === 6
                    ? "text-blue-500"
                    : "text-zinc-500"
                }`}
              >
                {DAYS_JP[day.getDay()]}
              </div>
              <div
                className={`text-lg font-bold ${
                  isToday(day) ? "text-emerald-600" : "text-zinc-900"
                }`}
              >
                {day.getDate()}
              </div>
              {isToday(day) && (
                <span className="text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                  今日
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {TIME_SLOTS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-zinc-100 last:border-b-0">
              <div className="py-2 px-2 text-center text-sm text-zinc-400 border-r border-zinc-200 bg-zinc-50 font-medium">
                {hour}:00
              </div>

              {weekDays.map((day, dayIdx) => {
                const slotPosts = getPostsForSlot(day, hour);
                const isOver = dragOverSlot?.day === dayIdx && dragOverSlot?.hour === hour;
                const isPast = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour) < new Date();

                return (
                  <div
                    key={dayIdx}
                    className={`min-h-[70px] p-1 border-r border-zinc-100 last:border-r-0 transition-colors cursor-pointer ${
                      isToday(day) ? "bg-emerald-50/30" : ""
                    } ${isOver ? "bg-emerald-100" : ""} ${
                      isPast && !isToday(day) ? "bg-zinc-50/50" : ""
                    } hover:bg-zinc-50`}
                    onDragOver={(e) => handleDragOver(e, dayIdx, hour)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dayIdx, hour)}
                    onClick={() => {
                      if (slotPosts.length === 0) {
                        handleSlotClick(day, hour);
                      }
                    }}
                  >
                    {slotPosts.map((post) => {
                      const isPosted = post.status === "posted";
                      const isFailed = post.status === "failed";

                      return (
                        <div
                          key={post.id}
                          draggable={!isPosted && !isFailed}
                          onDragStart={(e) => handleDragStart(e, post)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPost(post);
                          }}
                          className={`group relative p-2 rounded-lg text-xs cursor-pointer mb-1 transition-all ${
                            draggedPost?.id === post.id ? "opacity-50" : ""
                          } ${
                            isPosted
                              ? "bg-emerald-100 text-emerald-700"
                              : isFailed
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-500 text-white hover:bg-emerald-600"
                          }`}
                        >
                          {!isPosted && !isFailed && (
                            <GripVertical className="absolute left-0.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-0 group-hover:opacity-50" />
                          )}

                          <div className="flex items-center gap-1 font-semibold pl-3">
                            <Clock className="w-3 h-3" />
                            {formatTime(toDate(post.scheduledAt))}
                            {/* Indicators for images and threads */}
                            <div className="flex items-center gap-1 ml-auto">
                              {post.imageUrls && post.imageUrls.length > 0 && (
                                <ImageIcon className="w-3 h-3 opacity-70" />
                              )}
                              {post.threadPosts && post.threadPosts.length > 0 && (
                                <MessageSquare className="w-3 h-3 opacity-70" />
                              )}
                              {isPosted && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          </div>

                          <div className="pl-3 mt-1 line-clamp-2 opacity-90 leading-snug">
                            {truncateText(post.text, 35)}
                          </div>
                        </div>
                      );
                    })}

                    {slotPosts.length === 0 && isOver && (
                      <div className="h-full flex items-center justify-center text-emerald-500 text-xs font-medium">
                        ここにドロップ
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
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

      {/* New Post Modal */}
      {showNewPostModal && newPostDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowNewPostModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Plus className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">新規投稿を予約</div>
                  <div className="text-sm text-zinc-500">
                    {newPostDate.toLocaleDateString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowNewPostModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-100"
              >
                <XIcon className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">投稿時間</label>
                <input
                  type="time"
                  value={newPostTime}
                  onChange={(e) => setNewPostTime(e.target.value)}
                  className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  投稿内容
                  <span className="ml-2 text-zinc-400 font-normal">{newPostText.length}文字</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder="投稿内容を入力..."
                  className="w-full min-h-[150px] p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  style={{ lineHeight: "1.8" }}
                />
              </div>

              <div className="text-center">
                <span className="text-sm text-zinc-400">または</span>
              </div>
              <Link
                href="/compose"
                className="block w-full py-3 text-center text-emerald-600 font-medium bg-emerald-50 rounded-xl hover:bg-emerald-100"
              >
                AIで投稿を作成 →
              </Link>

              <button
                onClick={handleCreatePost}
                disabled={isSaving || !newPostText.trim()}
                className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Calendar className="w-5 h-5" />
                )}
                予約する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setSelectedPost(null);
              setIsEditing(false);
            }}
          />

          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">
                    {toDate(selectedPost.scheduledAt).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {formatTime(toDate(selectedPost.scheduledAt))}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPost(null);
                  setIsEditing(false);
                }}
                className="p-2 rounded-lg hover:bg-zinc-100"
              >
                <XIcon className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
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

              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">日付</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-1">時間</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      投稿内容
                      <span className="ml-2 text-zinc-400 font-normal">{editText.length}文字</span>
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full min-h-[150px] p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                      style={{ lineHeight: "1.8" }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 text-zinc-600 font-medium bg-zinc-100 rounded-xl hover:bg-zinc-200"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Main Post */}
                  <div className="mb-4">
                    <div className="text-xs font-medium text-zinc-500 mb-2">メイン投稿</div>
                    <div className="p-4 bg-zinc-50 rounded-xl">
                      <p className="text-zinc-700 whitespace-pre-wrap leading-relaxed" style={{ lineHeight: "1.8" }}>
                        {selectedPost.text}
                      </p>
                    </div>
                    <div className="text-sm text-zinc-400 mt-2">{selectedPost.text.length}文字</div>
                  </div>

                  {/* Images */}
                  {selectedPost.imageUrls && selectedPost.imageUrls.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-zinc-500 mb-2">添付画像（{selectedPost.imageUrls.length}枚）</div>
                      <div className={`grid gap-2 ${selectedPost.imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                        {selectedPost.imageUrls.map((url, idx) => (
                          <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-zinc-100">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thread Posts */}
                  {selectedPost.threadPosts && selectedPost.threadPosts.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-medium text-blue-500 mb-2">スレッド投稿（{selectedPost.threadPosts.length}件）</div>
                      <div className="space-y-2">
                        {selectedPost.threadPosts.map((threadText, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="text-xs font-medium text-blue-600 mb-1">スレッド {idx + 1}</div>
                            <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                              {threadText}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!isEditing && (
              <div className="flex-shrink-0 border-t border-zinc-200 p-4">
                {/* Quick Time Change */}
                {showQuickTimeChange && (
                  <div className="mb-4 p-3 bg-violet-50 rounded-xl">
                    <p className="text-sm font-medium text-violet-700 mb-2">時間を選択（15分単位）</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 15, 30, 45].map((minute) => {
                        const currentDate = toDate(selectedPost.scheduledAt);
                        return (
                          <button
                            key={minute}
                            onClick={() => handleQuickTimeChange(minute)}
                            className={`py-2 text-sm font-medium rounded-lg transition-colors ${
                              currentDate.getMinutes() === minute
                                ? "bg-violet-500 text-white"
                                : "bg-white border border-violet-200 text-violet-700 hover:bg-violet-100"
                            }`}
                          >
                            {currentDate.getHours().toString().padStart(2, "0")}:{minute.toString().padStart(2, "0")}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => handleDeletePost(selectedPost.id)}
                    className="flex flex-col items-center gap-1 py-3 text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="text-xs">削除</span>
                  </button>
                  <button
                    onClick={() => setShowQuickTimeChange(!showQuickTimeChange)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl ${
                      showQuickTimeChange
                        ? "bg-violet-100 text-violet-600"
                        : "text-violet-600 hover:bg-violet-50"
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                    <span className="text-xs">時間変更</span>
                  </button>
                  <button
                    onClick={handleStartEdit}
                    className="flex flex-col items-center gap-1 py-3 text-zinc-600 hover:bg-zinc-100 rounded-xl"
                  >
                    <Pencil className="w-5 h-5" />
                    <span className="text-xs">編集</span>
                  </button>
                  <button
                    onClick={() => handleDuplicatePost(selectedPost)}
                    className="flex flex-col items-center gap-1 py-3 text-zinc-600 hover:bg-zinc-100 rounded-xl"
                  >
                    <Copy className="w-5 h-5" />
                    <span className="text-xs">複製</span>
                  </button>
                  <button
                    onClick={() => handlePostNow(selectedPost.text)}
                    className="flex flex-col items-center gap-1 py-3 text-emerald-600 hover:bg-emerald-50 rounded-xl"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span className="text-xs">今すぐ投稿</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Time Picker Modal (after drag & drop) */}
      {showTimePicker && timePickerPost && timePickerDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowTimePicker(false);
              setTimePickerPost(null);
            }}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Clock className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">時間を選択</div>
                  <div className="text-sm text-zinc-500">
                    {timePickerDate.toLocaleDateString("ja-JP", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTimePicker(false);
                  setTimePickerPost(null);
                }}
                className="p-2 rounded-lg hover:bg-zinc-100"
              >
                <XIcon className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6">
              {/* Hour selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-2">時</label>
                <select
                  value={timePickerHour}
                  onChange={(e) => setTimePickerHour(Number(e.target.value))}
                  className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {TIME_SLOTS.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}:00
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute selection (15-min intervals) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 mb-2">分（15分単位）</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 15, 30, 45].map((minute) => (
                    <button
                      key={minute}
                      onClick={() => setTimePickerMinute(minute)}
                      className={`py-3 text-lg font-semibold rounded-xl transition-colors ${
                        timePickerMinute === minute
                          ? "bg-violet-500 text-white"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                      }`}
                    >
                      :{minute.toString().padStart(2, "0")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-zinc-50 rounded-lg mb-4">
                <p className="text-center text-lg font-bold text-zinc-900">
                  {timePickerHour.toString().padStart(2, "0")}:{timePickerMinute.toString().padStart(2, "0")}
                </p>
              </div>

              {/* Post preview */}
              <div className="p-3 bg-emerald-50 rounded-lg mb-4">
                <p className="text-sm text-emerald-700 line-clamp-2">
                  {timePickerPost.text.slice(0, 80)}...
                </p>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirmTimePicker}
                className="w-full py-3 bg-violet-500 text-white font-medium rounded-xl hover:bg-violet-600 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                この時間に移動
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
