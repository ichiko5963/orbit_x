"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  Quote,
  Calendar,
  Settings,
  ExternalLink,
  Copy,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  Sparkles,
  Clock,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  saveScheduledPost,
  getQuoteTweets,
  saveQuoteTweet,
  incrementQuoteTweetUsage,
  deleteQuoteTweet,
  getScheduledPosts,
  QuoteTweet,
} from "@/lib/firebase";

export default function PostEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Get initial text from URL params (from generate page)
  const initialText = searchParams.get("text") || "";

  // Editor state
  const [text, setText] = useState(initialText);
  const [images, setImages] = useState<string[]>([]);
  const [quoteTweetUrl, setQuoteTweetUrl] = useState<string>("");
  const [selectedQuoteTweet, setSelectedQuoteTweet] = useState<QuoteTweet | null>(null);

  // Quote tweets modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteTweets, setQuoteTweets] = useState<QuoteTweet[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [newQuoteUrl, setNewQuoteUrl] = useState("");
  const [newQuoteTitle, setNewQuoteTitle] = useState("");
  const [isAddingQuote, setIsAddingQuote] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState<Date | null>(null);
  const [suggestedReason, setSuggestedReason] = useState("");
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [existingSchedules, setExistingSchedules] = useState<any[]>([]);

  // Actions
  const [copied, setCopied] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Load quote tweets
  useEffect(() => {
    const loadQuoteTweets = async () => {
      if (!user) return;
      setIsLoadingQuotes(true);
      try {
        const qts = await getQuoteTweets(user.uid);
        setQuoteTweets(qts);
      } catch (error) {
        console.error("Failed to load quote tweets:", error);
      } finally {
        setIsLoadingQuotes(false);
      }
    };
    loadQuoteTweets();
  }, [user]);

  // Load existing scheduled posts for AI suggestion
  useEffect(() => {
    const loadSchedules = async () => {
      if (!user) return;
      try {
        const posts = await getScheduledPosts(user.uid);
        setExistingSchedules(posts);
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    };
    loadSchedules();
  }, [user]);

  // Get AI time suggestion
  const getAISuggestion = async () => {
    setIsLoadingSuggestion(true);
    try {
      const response = await fetch("/api/suggest-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingSchedules: existingSchedules.map(s => ({
            scheduledAt: s.scheduledAt,
            status: s.status,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const suggested = new Date(data.suggestedTime);
        setSuggestedTime(suggested);
        setSuggestedReason(data.reason);
        setScheduledDate(suggested.toISOString().split("T")[0]);
        setScheduledTime(suggested.toTimeString().slice(0, 5));
      }
    } catch (error) {
      console.error("AI suggestion failed:", error);
      // Fallback to default
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1);
      defaultTime.setMinutes(0);
      setSuggestedTime(defaultTime);
      setSuggestedReason("デフォルト（1時間後）");
      setScheduledDate(defaultTime.toISOString().split("T")[0]);
      setScheduledTime(defaultTime.toTimeString().slice(0, 5));
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  // Handle schedule modal open
  const handleOpenScheduleModal = () => {
    setShowScheduleModal(true);
    getAISuggestion();
  };

  // Add new quote tweet
  const handleAddQuoteTweet = async () => {
    if (!user || !newQuoteUrl.trim() || !newQuoteTitle.trim()) return;

    setIsAddingQuote(true);
    try {
      await saveQuoteTweet(user.uid, {
        url: newQuoteUrl.trim(),
        title: newQuoteTitle.trim(),
      });
      // Reload
      const qts = await getQuoteTweets(user.uid);
      setQuoteTweets(qts);
      setNewQuoteUrl("");
      setNewQuoteTitle("");
    } catch (error) {
      console.error("Failed to add quote tweet:", error);
    } finally {
      setIsAddingQuote(false);
    }
  };

  // Select quote tweet
  const handleSelectQuote = async (qt: QuoteTweet) => {
    setSelectedQuoteTweet(qt);
    setQuoteTweetUrl(qt.url);
    if (user && qt.id) {
      await incrementQuoteTweetUsage(user.uid, qt.id);
    }
    setShowQuoteModal(false);
  };

  // Remove selected quote
  const handleRemoveQuote = () => {
    setSelectedQuoteTweet(null);
    setQuoteTweetUrl("");
  };

  // Delete quote tweet
  const handleDeleteQuote = async (qtId: string) => {
    if (!user) return;
    try {
      await deleteQuoteTweet(user.uid, qtId);
      setQuoteTweets(prev => prev.filter(q => q.id !== qtId));
    } catch (error) {
      console.error("Failed to delete quote tweet:", error);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Post to X
  const handlePost = () => {
    let postUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    if (quoteTweetUrl) {
      postUrl += `&url=${encodeURIComponent(quoteTweetUrl)}`;
    }
    window.open(postUrl, "_blank");
  };

  // Schedule post
  const handleSchedule = async () => {
    if (!user || !text.trim() || !scheduledDate || !scheduledTime) return;

    setIsScheduling(true);
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

      await saveScheduledPost(user.uid, {
        text,
        scheduledAt,
        status: "scheduled",
        imageUrls: images,
        quoteTweetUrl: quoteTweetUrl || undefined,
        aiSuggestedTime: !!suggestedTime,
        suggestedReason: suggestedReason || undefined,
      });

      setShowScheduleModal(false);
      router.push("/calendar");
    } catch (error) {
      console.error("Schedule failed:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  // Image upload (placeholder - would need actual upload logic)
  const handleImageUpload = () => {
    // TODO: Implement actual image upload
    alert("画像アップロード機能は今後実装予定です");
  };

  const charCount = text.length;

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/compose/generate"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900">投稿を作成</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50">
            構文
          </button>
          <button className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50">
            下書き
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Editor Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          {/* Text Editor */}
          <div className="p-6">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="いまどうしてる？"
              className="w-full min-h-[200px] text-lg text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed"
              style={{ lineHeight: "1.8" }}
            />
          </div>

          {/* Images Preview */}
          {images.length > 0 && (
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Quote Tweet Preview */}
          {selectedQuoteTweet && (
            <div className="px-6 pb-4">
              <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <Quote className="w-5 h-5 text-zinc-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{selectedQuoteTweet.title}</p>
                    <p className="text-xs text-zinc-500 truncate max-w-xs">{selectedQuoteTweet.url}</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveQuote}
                  className="p-1 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={handleImageUpload}
                className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                title="画像を追加"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowQuoteModal(true)}
                className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                title="引用ツイート"
              >
                <Quote className="w-5 h-5" />
              </button>
              <button
                onClick={handleOpenScheduleModal}
                className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                title="予約投稿"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors" title="設定">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500">{charCount}文字</span>
              <button
                onClick={handleCopy}
                disabled={!text.trim()}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={handlePost}
                disabled={!text.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                ポストする
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-zinc-50 rounded-xl">
          <p className="text-sm text-zinc-600">
            💡 引用ツイートアイコンをクリックして、よく使う引用元を登録・選択できます
          </p>
        </div>
      </div>

      {/* Quote Tweet Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowQuoteModal(false)} />

          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-xl font-semibold text-zinc-900">引用ツイート</h2>
              <button onClick={() => setShowQuoteModal(false)} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Quote Tweets List */}
              {isLoadingQuotes ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : quoteTweets.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <Quote className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                  <p>登録された引用ツイートがありません</p>
                  <p className="text-sm mt-1">下のフォームから追加してください</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {quoteTweets.map((qt) => (
                    <div key={qt.id} className="border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 transition-colors">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-zinc-900 line-clamp-1">{qt.title}</h3>
                          <button
                            onClick={() => handleDeleteQuote(qt.id!)}
                            className="p-1 text-zinc-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-zinc-500 truncate mb-3">{qt.url}</p>
                        {qt.usageCount > 0 && (
                          <p className="text-xs text-zinc-400 mb-3">{qt.usageCount}回使用</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectQuote(qt)}
                        className="w-full py-3 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        この引用ツイートを使用
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Quote Tweet */}
              <div className="border-t border-zinc-200 pt-6">
                <h3 className="text-sm font-semibold text-zinc-700 mb-4">
                  <Plus className="w-4 h-4 inline mr-1" />
                  よく使う引用元ツイートを登録
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newQuoteTitle}
                    onChange={(e) => setNewQuoteTitle(e.target.value)}
                    placeholder="タイトル（例：X運用実績）"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="url"
                    value={newQuoteUrl}
                    onChange={(e) => setNewQuoteUrl(e.target.value)}
                    placeholder="XのポストURL（https://x.com/...）"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleAddQuoteTweet}
                    disabled={!newQuoteUrl.trim() || !newQuoteTitle.trim() || isAddingQuote}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {isAddingQuote ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                    登録する
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-xl font-semibold text-zinc-900">投稿を予約</h2>
              <button onClick={() => setShowScheduleModal(false)} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* AI Suggested Time */}
              {isLoadingSuggestion ? (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  <span className="text-amber-800">最適な時間を分析中...</span>
                </div>
              ) : suggestedTime && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                  <div className="flex items-center gap-2 text-amber-600 text-sm mb-2">
                    <Sparkles className="w-4 h-4" />
                    自動で選ばれた最適な投稿日時
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-zinc-900">
                        {suggestedTime.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })} {suggestedTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-sm text-zinc-600 mt-1">{suggestedReason}</p>
                    </div>
                    <button
                      onClick={() => {/* Allow manual change */}}
                      className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      日時を変更
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Date/Time Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">日付</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">時間</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Post Preview */}
              <div className="mt-6 p-4 bg-zinc-50 rounded-xl">
                <p className="text-sm text-zinc-500 mb-2">プレビュー</p>
                <p className="text-sm text-zinc-700 line-clamp-3">{text}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 py-3 text-zinc-600 font-medium rounded-xl hover:bg-zinc-100 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSchedule}
                  disabled={!scheduledDate || !scheduledTime || isScheduling}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {isScheduling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                  スケジュール設定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
