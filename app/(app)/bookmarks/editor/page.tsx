"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
  Copy,
  Calendar,
  Send,
  Video,
  Heart,
  MessageCircle,
  Repeat2,
  X as XIcon,
  Clock,
  RotateCcw,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useXProfile } from "@/lib/x-profile-context";
import { saveScheduledPost } from "@/lib/firebase";

/**
 * URLを除去する（t.co, x.com, twitter.com などすべて）
 * AI生成時に元ツイートのURLが混入しないようにする
 */
function removeUrls(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/t\.co\/[^\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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
}

export default function BookmarkEditorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile: xProfile, isConnected: xConnected } = useXProfile();

  const [text, setText] = useState("");
  const [savedPost, setSavedPost] = useState<SavedPost | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // AI enhance state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceOptions, setEnhanceOptions] = useState<string[]>([]);
  const [showEnhanceOptions, setShowEnhanceOptions] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load data from sessionStorage
  useEffect(() => {
    const savedText = sessionStorage.getItem("bookmark_editor_text");
    const savedPostData = sessionStorage.getItem("bookmark_editor_post");

    if (savedText) {
      setText(savedText);
    }
    if (savedPostData) {
      try {
        setSavedPost(JSON.parse(savedPostData));
      } catch (e) {
        console.error("Failed to parse saved post:", e);
      }
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`;
    }
  }, [text]);

  const hasVideo = savedPost?.media?.some(m => m.type === "video");

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Post with /video/1 URL (動画プレイヤー＋投稿者表示)
  const handlePost = async () => {
    if (!user || !text.trim() || !savedPost) return;

    setIsPosting(true);
    setPostError(null);

    try {
      const response = await fetch("/api/x/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          text: text.trim(),
          // 動画URLを末尾に追加（/video/1形式）
          videoInfo: hasVideo ? {
            tweetId: savedPost.id,
            username: savedPost.authorUsername,
          } : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "投稿に失敗しました");
      }

      setPostSuccess(true);

      // Clear sessionStorage
      sessionStorage.removeItem("bookmark_editor_text");
      sessionStorage.removeItem("bookmark_editor_post");

      // Redirect after success
      setTimeout(() => {
        router.push("/bookmarks");
      }, 2000);
    } catch (err) {
      console.error("Post error:", err);
      setPostError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setIsPosting(false);
    }
  };

  // AI Enhance - get options
  const handleGetEnhanceOptions = async () => {
    if (!text.trim()) return;

    setIsEnhancing(true);
    setShowEnhanceOptions(false);

    try {
      const response = await fetch("/api/generate/enhance-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // URLを除去してAIに渡す
          text: removeUrls(text.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI強化に失敗しました");
      }

      // 生成されたオプションからもURLを除去
      const cleanedOptions = (data.options || []).map((opt: string) => removeUrls(opt));
      setEnhanceOptions(cleanedOptions);
      setShowEnhanceOptions(true);
    } catch (err) {
      console.error("Enhance options error:", err);
      alert("AI強化オプションの取得に失敗しました");
    } finally {
      setIsEnhancing(false);
    }
  };

  // Apply enhance option
  const handleApplyEnhance = (newText: string) => {
    // URLを除去して設定
    setText(removeUrls(newText));
    setShowEnhanceOptions(false);
    setEnhanceOptions([]);
  };

  // Open schedule modal
  const handleOpenSchedule = () => {
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    defaultDate.setMinutes(0, 0, 0);

    setScheduleDate(defaultDate.toISOString().split("T")[0]);
    setScheduleTime(defaultDate.toTimeString().slice(0, 5));
    setShowScheduleModal(true);
  };

  // Save scheduled post with videoInfo (動画プレイヤー＋投稿者表示)
  const handleSaveSchedule = async () => {
    if (!user || !text.trim() || !savedPost) return;

    setIsSavingSchedule(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);

      await saveScheduledPost(user.uid, {
        text: text.trim(),
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status: "scheduled",
        // 動画URLを末尾に追加（/video/1形式）
        videoInfo: hasVideo ? {
          tweetId: savedPost.id,
          username: savedPost.authorUsername,
        } : undefined,
      });

      // Clear sessionStorage
      sessionStorage.removeItem("bookmark_editor_text");
      sessionStorage.removeItem("bookmark_editor_post");

      setShowScheduleModal(false);
      router.push("/schedule");
    } catch (err) {
      console.error("Schedule failed:", err);
      alert("予約に失敗しました");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  if (!savedPost) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">投稿データがありません</p>
        <Link href="/bookmarks" className="text-emerald-600 hover:underline mt-2 inline-block">
          保存済み投稿に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              // Go back and preserve state
              sessionStorage.setItem("came_from_editor", "true");
              router.back();
            }}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">投稿を編集</h1>
            <p className="text-zinc-500">
              {hasVideo ? "動画プレイヤー付きで投稿" : "投稿を作成"}
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {postSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          <div>
            <p className="font-medium text-emerald-700">投稿しました！</p>
            <p className="text-sm text-emerald-600">保存済み投稿に戻ります...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {postError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <div className="flex-1">
            <p className="font-medium text-red-700">投稿エラー</p>
            <p className="text-sm text-red-600">{postError}</p>
          </div>
          <button
            onClick={() => setPostError(null)}
            className="p-1 text-red-400 hover:text-red-600"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Editor Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Text Editor */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* User Profile */}
            {xConnected && xProfile && (
              <div className="p-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  {xProfile.profileImageUrl ? (
                    <Image
                      src={xProfile.profileImageUrl}
                      alt={xProfile.name}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {xProfile.name?.[0] || "X"}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-zinc-900">{xProfile.name}</p>
                    <p className="text-sm text-zinc-500">@{xProfile.username}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Textarea */}
            <div className="p-4">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="投稿内容を入力..."
                className="w-full min-h-[200px] text-lg text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed"
              />
            </div>

            {/* Character Count & Actions */}
            <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500">{text.length}文字</span>
                <button
                  onClick={handleCopy}
                  disabled={!text.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {copied ? (
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
              </div>

              <button
                onClick={handleGetEnhanceOptions}
                disabled={isEnhancing || !text.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isEnhancing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                AI強化
              </button>
            </div>
          </div>

          {/* AI Enhance Options */}
          {showEnhanceOptions && enhanceOptions.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-800">AI強化オプション</span>
                  </div>
                  <button
                    onClick={() => setShowEnhanceOptions(false)}
                    className="p-1 text-amber-400 hover:text-amber-600"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {enhanceOptions.map((option, index) => (
                  <div key={index} className="p-3 bg-zinc-50 rounded-xl">
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap mb-2">{option}</p>
                    <button
                      onClick={() => handleApplyEnhance(option)}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      この内容を使用 →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenSchedule}
              disabled={!text.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-violet-500 text-white font-semibold rounded-xl hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Calendar className="w-5 h-5" />
              予約投稿
            </button>
            <button
              onClick={handlePost}
              disabled={isPosting || !text.trim() || postSuccess}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  投稿中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {hasVideo ? "動画付きで投稿" : "投稿する"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quote Preview */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
              <h3 className="font-semibold text-zinc-900">引用元の投稿</h3>
            </div>
            <div className="p-4">
              <div className="flex gap-3">
                {savedPost.authorProfileImageUrl && (
                  <Image
                    src={savedPost.authorProfileImageUrl}
                    alt={savedPost.authorName}
                    width={40}
                    height={40}
                    className="rounded-full flex-shrink-0"
                    unoptimized
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-bold text-zinc-900 text-sm">{savedPost.authorName}</span>
                    <span className="text-zinc-500 text-sm">@{savedPost.authorUsername}</span>
                  </div>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-4">
                    {savedPost.text}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-zinc-400 text-xs">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {savedPost.replies}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-3 h-3" />
                      {savedPost.retweets}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {savedPost.likes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Preview */}
          {hasVideo && savedPost.media && savedPost.media[0].type === "video" && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 bg-emerald-50">
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-emerald-800">動画プレビュー</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="rounded-xl overflow-hidden border border-zinc-200">
                  <video
                    src={savedPost.media[0].url}
                    poster={savedPost.media[0].thumbnailUrl}
                    controls
                    className="w-full aspect-video object-contain bg-zinc-900"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  /video/1 URL形式で動画プレイヤーが表示されます
                </p>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
            <h4 className="font-semibold text-emerald-800 mb-2">/video/1形式のメリット</h4>
            <ul className="text-sm text-emerald-700 space-y-1">
              <li>• 動画プレイヤーがそのまま表示</li>
              <li>• 「投稿者: ◯◯」が表示される</li>
              <li>• 引用カードではなくプレビューで表示</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowScheduleModal(false)}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">予約投稿</div>
                  <div className="text-sm text-zinc-500">
                    {hasVideo ? "動画URL付きで予約" : "日時を選択"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 rounded-lg hover:bg-zinc-100"
              >
                <XIcon className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">日付</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">時間</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full h-11 px-3 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Quick time selection */}
              <div className="flex flex-wrap gap-2">
                {["09:00", "12:00", "18:00", "21:00"].map((time) => (
                  <button
                    key={time}
                    onClick={() => setScheduleTime(time)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      scheduleTime === time
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <Clock className="w-3 h-3 inline-block mr-1" />
                    {time}
                  </button>
                ))}
              </div>

              {/* Video badge */}
              {hasVideo && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    /video/1 URLで動画プレイヤーが表示されます
                  </span>
                </div>
              )}

              {/* Preview */}
              <div className="p-3 bg-zinc-50 rounded-lg">
                <p className="text-sm text-zinc-600">
                  <span className="font-medium">予約日時: </span>
                  {scheduleDate && scheduleTime
                    ? new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "日時を選択してください"}
                </p>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule || !text.trim() || !scheduleDate || !scheduleTime}
                className="w-full py-3 bg-violet-500 text-white font-medium rounded-xl hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingSchedule ? (
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
    </div>
  );
}
