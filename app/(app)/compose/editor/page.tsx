"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Image as ImageIcon,
  Quote,
  Calendar,
  ExternalLink,
  Copy,
  CheckCircle2,
  Loader2,
  Plus,
  X,
  Sparkles,
  Clock,
  Trash2,
  MessageSquare,
  Eye,
  Link as LinkIcon,
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

interface ThreadPost {
  id: number;
  text: string;
  images: string[];
}

export default function PostEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  // Auto-resize textarea based on content
  const autoResizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(150, textarea.scrollHeight)}px`;
  }, []);

  // Get initial text from URL params (from generate page)
  const initialText = searchParams.get("text") || "";
  const initialThread = searchParams.get("thread") === "true";

  // Thread posts state
  const [threadPosts, setThreadPosts] = useState<ThreadPost[]>([
    { id: 1, text: initialText, images: [] },
  ]);
  const [activePostId, setActivePostId] = useState(1);

  // Quote tweet state
  const [quoteTweetUrl, setQuoteTweetUrl] = useState<string>("");
  const [selectedQuoteTweet, setSelectedQuoteTweet] = useState<QuoteTweet | null>(null);

  // Quote tweets modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteTweets, setQuoteTweets] = useState<QuoteTweet[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [newQuoteUrl, setNewQuoteUrl] = useState("");
  const [newQuoteTitle, setNewQuoteTitle] = useState("");
  const [newQuotePreview, setNewQuotePreview] = useState("");
  const [isAddingQuote, setIsAddingQuote] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [suggestedTime, setSuggestedTime] = useState<Date | null>(null);
  const [suggestedReason, setSuggestedReason] = useState("");
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [existingSchedules, setExistingSchedules] = useState<any[]>([]);

  // Preview mode
  const [showPreview, setShowPreview] = useState(false);

  // Actions
  const [copied, setCopied] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Current active post
  const activePost = threadPosts.find(p => p.id === activePostId) || threadPosts[0];

  // Auto-resize textareas on initial load and when thread posts change
  useEffect(() => {
    // Small timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      textareaRefs.current.forEach((textarea) => {
        autoResizeTextarea(textarea);
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [threadPosts, autoResizeTextarea]);

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

  // Update post text
  const updatePostText = (id: number, text: string) => {
    setThreadPosts(prev => prev.map(p => p.id === id ? { ...p, text } : p));
  };

  // Add thread post
  const addThreadPost = () => {
    const newId = Math.max(...threadPosts.map(p => p.id)) + 1;
    setThreadPosts(prev => [...prev, { id: newId, text: "", images: [] }]);
    setActivePostId(newId);
  };

  // Remove thread post
  const removeThreadPost = (id: number) => {
    if (threadPosts.length <= 1) return;
    setThreadPosts(prev => prev.filter(p => p.id !== id));
    if (activePostId === id) {
      setActivePostId(threadPosts[0].id);
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentImages = activePost.images;
    if (currentImages.length >= 4) {
      alert("画像は最大4枚までです");
      return;
    }

    Array.from(files).slice(0, 4 - currentImages.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setThreadPosts(prev => prev.map(p =>
          p.id === activePostId
            ? { ...p, images: [...p.images, dataUrl].slice(0, 4) }
            : p
        ));
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove image
  const removeImage = (postId: number, imageIndex: number) => {
    setThreadPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, images: p.images.filter((_, i) => i !== imageIndex) }
        : p
    ));
  };

  // Add new quote tweet
  const handleAddQuoteTweet = async () => {
    if (!user || !newQuoteUrl.trim() || !newQuoteTitle.trim()) return;

    setIsAddingQuote(true);
    try {
      await saveQuoteTweet(user.uid, {
        url: newQuoteUrl.trim(),
        title: newQuoteTitle.trim(),
        previewText: newQuotePreview.trim() || undefined,
      });
      const qts = await getQuoteTweets(user.uid);
      setQuoteTweets(qts);
      setNewQuoteUrl("");
      setNewQuoteTitle("");
      setNewQuotePreview("");
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
    const fullText = threadPosts.map(p => p.text).join("\n\n---\n\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Post to X
  const handlePost = () => {
    let postUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(activePost.text)}`;
    if (quoteTweetUrl) {
      postUrl += `&url=${encodeURIComponent(quoteTweetUrl)}`;
    }
    window.open(postUrl, "_blank");
  };

  // Schedule post
  const handleSchedule = async () => {
    if (!user || !activePost.text.trim() || !scheduledDate || !scheduledTime) return;

    setIsScheduling(true);
    try {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

      // Save main post
      await saveScheduledPost(user.uid, {
        text: activePost.text,
        scheduledAt,
        status: "scheduled",
        imageUrls: activePost.images,
        quoteTweetUrl: quoteTweetUrl || undefined,
        aiSuggestedTime: !!suggestedTime,
        suggestedReason: suggestedReason || undefined,
        threadPosts: threadPosts.length > 1 ? threadPosts.slice(1).map(p => p.text) : undefined,
      });

      setShowScheduleModal(false);
      router.push("/calendar?scheduled=true");
    } catch (error) {
      console.error("Schedule failed:", error);
    } finally {
      setIsScheduling(false);
    }
  };

  const charCount = activePost.text.length;
  const totalCharCount = threadPosts.reduce((acc, p) => acc + p.text.length, 0);

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
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              showPreview
                ? "bg-emerald-100 text-emerald-700"
                : "text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <Eye className="w-4 h-4" />
            プレビュー
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Column */}
        <div>
          {/* Thread Posts */}
          {threadPosts.map((post, index) => (
            <div
              key={post.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden mb-4 ${
                activePostId === post.id ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-zinc-200"
              }`}
              onClick={() => setActivePostId(post.id)}
            >
              {/* Thread indicator */}
              {threadPosts.length > 1 && (
                <div className="px-4 pt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-400">
                    {index === 0 ? "メイン投稿" : `スレッド ${index}`}
                  </span>
                  {index > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeThreadPost(post.id); }}
                      className="p-1 text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Text Editor */}
              <div className="p-4">
                <textarea
                  ref={(el) => {
                    if (el) {
                      textareaRefs.current.set(post.id, el);
                      autoResizeTextarea(el);
                    }
                  }}
                  value={post.text}
                  onChange={(e) => {
                    updatePostText(post.id, e.target.value);
                    autoResizeTextarea(e.target);
                  }}
                  placeholder={index === 0 ? "いまどうしてる？" : "スレッドを続ける..."}
                  className="w-full min-h-[150px] text-base text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed overflow-hidden"
                  style={{ lineHeight: "1.8" }}
                />
              </div>

              {/* Images Preview */}
              {post.images.length > 0 && (
                <div className="px-4 pb-4">
                  <div className={`grid gap-2 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                    {post.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(post.id, idx); }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Character count */}
              <div className="px-4 pb-3 flex items-center justify-between text-sm text-zinc-500">
                <span>{post.text.length}文字</span>
                {post.id === activePostId && post.images.length < 4 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1 text-zinc-500 hover:text-zinc-700"
                  >
                    <ImageIcon className="w-4 h-4" />
                    画像を追加
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Thread Button */}
          <button
            onClick={addThreadPost}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            スレッドを追加
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Selected Quote Tweet Preview */}
          {selectedQuoteTweet && (
            <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <Quote className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{selectedQuoteTweet.title}</p>
                    {selectedQuoteTweet.previewText && (
                      <p className="text-sm text-zinc-600 mt-1 line-clamp-2">{selectedQuoteTweet.previewText}</p>
                    )}
                    <a
                      href={selectedQuoteTweet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                    >
                      {selectedQuoteTweet.url}
                    </a>
                  </div>
                </div>
                <button onClick={handleRemoveQuote} className="p-1 text-zinc-400 hover:text-zinc-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
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
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">
                {threadPosts.length > 1 ? `合計 ${totalCharCount}文字` : `${charCount}文字`}
              </span>
              <button
                onClick={handleCopy}
                disabled={!activePost.text.trim()}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
              </button>
              <button
                onClick={handlePost}
                disabled={!activePost.text.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                ポストする
              </button>
            </div>
          </div>
        </div>

        {/* Preview Column */}
        <div className={`${showPreview ? "block" : "hidden lg:block"}`}>
          <div className="sticky top-24">
            <h3 className="text-sm font-semibold text-zinc-500 mb-3">投稿プレビュー</h3>

            {/* X-style Preview */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              {threadPosts.map((post, index) => (
                <div key={post.id} className={`p-4 ${index > 0 ? "border-t border-zinc-100" : ""}`}>
                  {/* User info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">あなた</span>
                        <span className="text-zinc-500 text-sm">@username</span>
                      </div>

                      {/* Post text */}
                      <p className="text-zinc-900 mt-1 whitespace-pre-wrap leading-relaxed">
                        {post.text || <span className="text-zinc-400">投稿内容を入力...</span>}
                      </p>

                      {/* Images */}
                      {post.images.length > 0 && (
                        <div className={`mt-3 grid gap-1 rounded-xl overflow-hidden ${
                          post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        }`}>
                          {post.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt=""
                              className={`w-full object-cover ${
                                post.images.length === 1 ? "max-h-80" : "aspect-square"
                              }`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Quote Tweet Preview (only on first post) */}
                      {index === 0 && selectedQuoteTweet && (
                        <div className="mt-3 p-3 border border-zinc-200 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-zinc-300" />
                            <span className="text-sm font-medium text-zinc-900">{selectedQuoteTweet.title}</span>
                          </div>
                          {selectedQuoteTweet.previewText && (
                            <p className="text-sm text-zinc-600 line-clamp-2">{selectedQuoteTweet.previewText}</p>
                          )}
                        </div>
                      )}

                      {/* Engagement placeholder */}
                      <div className="flex items-center gap-8 mt-3 text-zinc-400">
                        <span className="text-sm">💬 0</span>
                        <span className="text-sm">🔄 0</span>
                        <span className="text-sm">❤️ 0</span>
                        <span className="text-sm">📊 0</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="mt-4 p-4 bg-zinc-50 rounded-xl">
              <p className="text-sm text-zinc-600">
                💡 引用ツイートを追加すると、投稿と一緒に引用元が表示されます
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Tweet Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowQuoteModal(false)} />

          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl mx-4 mb-20 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-xl font-semibold text-zinc-900">引用ツイート</h2>
              <button onClick={() => setShowQuoteModal(false)} className="p-2 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
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
                <div className="space-y-3 mb-6">
                  {quoteTweets.map((qt) => (
                    <div
                      key={qt.id}
                      className="border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 transition-colors cursor-pointer"
                      onClick={() => handleSelectQuote(qt)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-zinc-900">{qt.title}</h3>
                            {qt.previewText && (
                              <p className="text-sm text-zinc-600 mt-1 line-clamp-2">{qt.previewText}</p>
                            )}
                            <a
                              href={qt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-500 hover:underline mt-2 inline-flex items-center gap-1"
                            >
                              <LinkIcon className="w-3 h-3" />
                              元ツイートを見る
                            </a>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteQuote(qt.id!); }}
                            className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {qt.usageCount > 0 && (
                          <p className="text-xs text-zinc-400">{qt.usageCount}回使用</p>
                        )}
                      </div>
                      <div className="px-4 py-2 bg-blue-50 text-sm font-medium text-blue-600 text-center">
                        この引用ツイートを使用
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Quote Tweet */}
              <div className="border-t border-zinc-200 pt-6">
                <h3 className="text-sm font-semibold text-zinc-700 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
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
                  <textarea
                    value={newQuotePreview}
                    onChange={(e) => setNewQuotePreview(e.target.value)}
                    placeholder="プレビュー用テキスト（元ツイートの内容を貼り付け）"
                    rows={3}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowScheduleModal(false)} />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl mx-4 mb-20 overflow-hidden">
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
                    AIが選んだ最適な投稿日時
                  </div>
                  <p className="text-xl font-bold text-zinc-900">
                    {suggestedTime.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })} {suggestedTime.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-sm text-zinc-600 mt-1">{suggestedReason}</p>
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

              {/* Thread info */}
              {threadPosts.length > 1 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-700">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    {threadPosts.length}件のスレッド投稿を予約します
                  </p>
                </div>
              )}

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
                  予約する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
