"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  Wand2,
  Zap,
  Target,
  TrendingUp,
  AlertCircle,
  Search,
  Check,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Type,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useXProfile } from "@/lib/x-profile-context";
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
  const { profile: xProfile, isConnected: xConnected } = useXProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRefs = useRef<Map<number, HTMLTextAreaElement>>(new Map());

  // AI Enhancement state
  const [showAIEnhance, setShowAIEnhance] = useState(false);
  const [aiEnhanceOptions, setAiEnhanceOptions] = useState<{id: string; text: string; label: string}[]>([]);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancingType, setEnhancingType] = useState<string | null>(null);

  // Auto-resize textarea based on content
  const autoResizeTextarea = useCallback((textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(150, textarea.scrollHeight)}px`;
  }, []);

  // Get initial text from URL params (from generate page)
  const initialText = searchParams.get("text") || "";
  const initialThread = searchParams.get("thread") === "true";
  const articleUrl = searchParams.get("articleUrl") || "";
  const articleTitle = searchParams.get("articleTitle") || "";

  // Thread posts state - if articleUrl exists, add it to a thread post
  const [threadPosts, setThreadPosts] = useState<ThreadPost[]>(() => {
    const posts: ThreadPost[] = [{ id: 1, text: initialText, images: [] }];
    if (articleUrl) {
      // Add thread post with article link
      posts.push({
        id: 2,
        text: `記事はこちら\n${articleUrl}`,
        images: [],
      });
    }
    return posts;
  });
  const [activePostId, setActivePostId] = useState(1);

  // Quote tweet state
  const [quoteTweetUrl, setQuoteTweetUrl] = useState<string>("");
  const [selectedQuoteTweet, setSelectedQuoteTweet] = useState<QuoteTweet | null>(null);

  // Quote tweet from bookmark (with quote_tweet_id)
  const [quoteTweetFromBookmark, setQuoteTweetFromBookmark] = useState<{
    tweetId: string;
    text: string;
    author: string;
    username: string;
    likes: number;
  } | null>(null);

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

  // Image search state
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<{url: string; title: string; source: string; selected?: boolean}[]>([]);
  const [imageSearchError, setImageSearchError] = useState<string | null>(null);

  // Hallucination check (fact-check) state
  const [showFactCheck, setShowFactCheck] = useState(false);
  const [isFactChecking, setIsFactChecking] = useState(false);
  const [factCheckResults, setFactCheckResults] = useState<{
    wasModified: boolean;
    correctedContent: string;
    summary: { totalClaims: number; accurateClaims: number; inaccurateClaims: number; flowIssues: number };
    details: {
      factCheckResults: { claim: string; isAccurate: boolean; correction: string | null; confidence: string }[];
      flowCheck: { hasIssues: boolean; issues: string[] };
    };
  } | null>(null);

  // AI Correction state
  const [showAICorrection, setShowAICorrection] = useState(false);
  const [isAICorrecting, setIsAICorrecting] = useState(false);
  const [aiCorrectionPatterns, setAiCorrectionPatterns] = useState<{
    type: string;
    text: string;
    changes: string;
    structureValid: boolean;
    warning?: string;
  }[]>([]);

  // Text selection enhancement state
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; postId: number } | null>(null);
  const [showTextEnhance, setShowTextEnhance] = useState(false);
  const [textEnhanceOptions, setTextEnhanceOptions] = useState<{ text: string; style: string; reason: string }[]>([]);
  const [isTextEnhancing, setIsTextEnhancing] = useState(false);
  const [textEnhancePosition, setTextEnhancePosition] = useState<{ x: number; y: number } | null>(null);

  // Actions
  const [copied, setCopied] = useState(false);
  const [copiedArticleUrl, setCopiedArticleUrl] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [postSuccess, setPostSuccess] = useState(false);

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

  // Load quote tweet from bookmark (sessionStorage)
  useEffect(() => {
    const stored = sessionStorage.getItem("quoteTweetFromBookmark");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setQuoteTweetFromBookmark(data);
        // Clear sessionStorage after loading
        sessionStorage.removeItem("quoteTweetFromBookmark");
      } catch (error) {
        console.error("Failed to parse bookmark quote data:", error);
      }
    }
  }, []);

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

  // Image paste handler for textareas
  const handleTextareaPaste = (postId: number, e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      const post = threadPosts.find(p => p.id === postId);
      const currentImages = post?.images || [];
      const remainingSlots = 4 - currentImages.length;
      const filesToProcess = imageFiles.slice(0, remainingSlots);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setThreadPosts(prev => prev.map(p =>
            p.id === postId
              ? { ...p, images: [...p.images, result].slice(0, 4) }
              : p
          ));
        };
        reader.readAsDataURL(file);
      });
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

  // AI Image Search
  const handleImageSearch = async () => {
    if (!activePost.text.trim()) {
      setImageSearchError("投稿内容を入力してください");
      return;
    }

    setShowImageSearch(true);
    setIsSearchingImages(true);
    setImageSearchError(null);
    setImageSearchResults([]);

    try {
      const response = await fetch("/api/search-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: activePost.text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "画像検索に失敗しました");
      }

      setImageSearchResults(data.images || []);
    } catch (error) {
      console.error("Image search failed:", error);
      setImageSearchError(error instanceof Error ? error.message : "画像検索に失敗しました");
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (index: number) => {
    setImageSearchResults(prev => prev.map((img, i) =>
      i === index ? { ...img, selected: !img.selected } : img
    ));
  };

  // Add selected images to active post
  const addSelectedImages = async () => {
    const selectedImages = imageSearchResults.filter(img => img.selected);
    const remainingSlots = 4 - activePost.images.length;
    const imagesToAdd = selectedImages.slice(0, remainingSlots);

    for (const img of imagesToAdd) {
      try {
        const response = await fetch("/api/proxy-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: img.url }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.base64) {
            setThreadPosts(prev => prev.map(p =>
              p.id === activePostId
                ? { ...p, images: [...p.images, data.base64].slice(0, 4) }
                : p
            ));
          }
        }
      } catch (error) {
        console.error("Failed to load image:", img.url, error);
      }
    }

    setShowImageSearch(false);
    setImageSearchResults([]);
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

  // Remove bookmark quote
  const handleRemoveBookmarkQuote = () => {
    setQuoteTweetFromBookmark(null);
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
  const handlePost = async () => {
    // If we have a bookmark quote, use the API with quote_tweet_id
    if (quoteTweetFromBookmark && user) {
      setIsPosting(true);
      setPostError(null);

      try {
        const response = await fetch("/api/x/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            text: activePost.text,
            quoteTweetId: quoteTweetFromBookmark.tweetId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.code === "NOT_CONNECTED" || data.code === "TOKEN_EXPIRED") {
            setPostError("X連携が切れています。設定ページで再連携してください。");
          } else if (data.code === "PERMISSION_DENIED") {
            setPostError("投稿権限がありません。設定ページでXを再連携してください。");
          } else {
            setPostError(data.error || "投稿に失敗しました");
          }
          return;
        }

        setPostSuccess(true);
        // Clear the quote and text after successful post
        setTimeout(() => {
          setQuoteTweetFromBookmark(null);
          setThreadPosts([{ id: 1, text: "", images: [] }]);
          setPostSuccess(false);
        }, 2000);
      } catch (error) {
        console.error("Post error:", error);
        setPostError("投稿に失敗しました。ネットワークを確認してください。");
      } finally {
        setIsPosting(false);
      }
    } else {
      // Fall back to intent URL for regular posts
      let postUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(activePost.text)}`;
      if (quoteTweetUrl) {
        postUrl += `&url=${encodeURIComponent(quoteTweetUrl)}`;
      }
      window.open(postUrl, "_blank");
    }
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
        quoteTweetId: quoteTweetFromBookmark?.tweetId || undefined,  // For API-based quote
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

  // AI Enhancement - generate 3 different options
  const handleAIEnhance = async () => {
    if (!activePost.text.trim()) return;

    setIsEnhancing(true);
    setShowAIEnhance(true);
    setAiEnhanceOptions([]);

    try {
      const response = await fetch("/api/generate/enhance-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activePost.text,
        }),
      });

      const data = await response.json();
      if (data.options) {
        setAiEnhanceOptions(data.options);
      }
    } catch (error) {
      console.error("AI enhance failed:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Apply AI enhancement with animation
  const applyEnhancement = (newText: string) => {
    setEnhancingType("applying");

    // Animate the text change
    setTimeout(() => {
      updatePostText(activePostId, newText);
      setEnhancingType(null);
      setShowAIEnhance(false);

      // Trigger textarea resize
      setTimeout(() => {
        const textarea = textareaRefs.current.get(activePostId);
        if (textarea) {
          autoResizeTextarea(textarea);
        }
      }, 50);
    }, 300);
  };

  // Hallucination check (fact-check)
  const handleFactCheck = async () => {
    if (!activePost.text.trim()) return;

    setIsFactChecking(true);
    setShowFactCheck(true);
    setFactCheckResults(null);

    try {
      const response = await fetch("/api/generate/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: activePost.text,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFactCheckResults(data);
      }
    } catch (error) {
      console.error("Fact check failed:", error);
    } finally {
      setIsFactChecking(false);
    }
  };

  // Apply fact check correction
  const applyFactCheckCorrection = () => {
    if (factCheckResults?.correctedContent) {
      updatePostText(activePostId, factCheckResults.correctedContent);
      setShowFactCheck(false);
      setFactCheckResults(null);

      setTimeout(() => {
        const textarea = textareaRefs.current.get(activePostId);
        if (textarea) {
          autoResizeTextarea(textarea);
        }
      }, 50);
    }
  };

  // AI Correction
  const handleAICorrection = async () => {
    if (!activePost.text.trim()) return;

    setIsAICorrecting(true);
    setShowAICorrection(true);
    setAiCorrectionPatterns([]);

    try {
      const response = await fetch("/api/generate/ai-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: activePost.text,
          originalContent: activePost.text,
          referenceText: activePost.text,
        }),
      });

      const data = await response.json();
      if (data.success && data.patterns) {
        setAiCorrectionPatterns(data.patterns);
      }
    } catch (error) {
      console.error("AI correction failed:", error);
    } finally {
      setIsAICorrecting(false);
    }
  };

  // Apply AI correction
  const applyAICorrection = (newText: string) => {
    updatePostText(activePostId, newText);
    setShowAICorrection(false);
    setAiCorrectionPatterns([]);

    setTimeout(() => {
      const textarea = textareaRefs.current.get(activePostId);
      if (textarea) {
        autoResizeTextarea(textarea);
      }
    }, 50);
  };

  // Handle text selection for enhancement
  const handleTextSelection = (postId: number, e: React.MouseEvent<HTMLTextAreaElement> | React.TouchEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const selection = window.getSelection();

    // Get selection from textarea
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      const selected = textarea.value.substring(start, end);
      if (selected.trim().length >= 3) {
        setSelectedText(selected);
        setSelectionRange({ start, end, postId });

        // Calculate position for popup
        const rect = textarea.getBoundingClientRect();
        const lineHeight = 28;
        const charsPerLine = Math.floor(textarea.clientWidth / 8);
        const lineNum = Math.floor(start / charsPerLine);

        setTextEnhancePosition({
          x: rect.left + Math.min(200, (start % charsPerLine) * 8),
          y: rect.top + lineNum * lineHeight + 30,
        });
        setShowTextEnhance(true);
      } else {
        setShowTextEnhance(false);
        setSelectedText("");
        setSelectionRange(null);
      }
    } else {
      setShowTextEnhance(false);
      setSelectedText("");
      setSelectionRange(null);
    }
  };

  // Generate text enhancement options
  const handleTextEnhance = async () => {
    if (!selectedText || !selectionRange) return;

    setIsTextEnhancing(true);
    setTextEnhanceOptions([]);

    try {
      const post = threadPosts.find(p => p.id === selectionRange.postId);
      if (!post) return;

      const response = await fetch("/api/generate/text-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText,
          fullText: post.text,
          selectionStart: selectionRange.start,
          selectionEnd: selectionRange.end,
        }),
      });

      const data = await response.json();
      if (data.success && data.options) {
        setTextEnhanceOptions(data.options);
      }
    } catch (error) {
      console.error("Text enhance failed:", error);
    } finally {
      setIsTextEnhancing(false);
    }
  };

  // Apply text enhancement
  const applyTextEnhancement = (newText: string) => {
    if (!selectionRange) return;

    const post = threadPosts.find(p => p.id === selectionRange.postId);
    if (!post) return;

    const updatedText = post.text.substring(0, selectionRange.start) + newText + post.text.substring(selectionRange.end);
    updatePostText(selectionRange.postId, updatedText);

    setShowTextEnhance(false);
    setSelectedText("");
    setSelectionRange(null);
    setTextEnhanceOptions([]);

    setTimeout(() => {
      const textarea = textareaRefs.current.get(selectionRange.postId);
      if (textarea) {
        autoResizeTextarea(textarea);
      }
    }, 50);
  };

  // Close text enhance popup
  const closeTextEnhance = () => {
    setShowTextEnhance(false);
    setSelectedText("");
    setSelectionRange(null);
    setTextEnhanceOptions([]);
    setTextEnhancePosition(null);
  };

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
                  onPaste={(e) => handleTextareaPaste(post.id, e)}
                  onMouseUp={(e) => handleTextSelection(post.id, e)}
                  onTouchEnd={(e) => handleTextSelection(post.id, e)}
                  placeholder={index === 0 ? "いまどうしてる？（画像も貼り付け可能）" : "スレッドを続ける...（画像も貼り付け可能）"}
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

          {/* Quote Tweet from Bookmark - will use quote_tweet_id */}
          {quoteTweetFromBookmark && (
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Quote className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        引用投稿
                      </span>
                      <span className="text-xs text-zinc-500">
                        URLなしで引用カードが付きます
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-900">
                      {quoteTweetFromBookmark.author}
                      <span className="text-zinc-500 font-normal ml-1">
                        @{quoteTweetFromBookmark.username}
                      </span>
                    </p>
                    <p className="text-sm text-zinc-600 mt-1 line-clamp-2">
                      {quoteTweetFromBookmark.text}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                      <span>❤️ {quoteTweetFromBookmark.likes.toLocaleString()}</span>
                      <span>•</span>
                      <span>ID: {quoteTweetFromBookmark.tweetId}</span>
                    </div>
                  </div>
                </div>
                <button onClick={handleRemoveBookmarkQuote} className="p-1 text-zinc-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Selected Quote Tweet Preview (legacy - uses URL) */}
          {selectedQuoteTweet && !quoteTweetFromBookmark && (
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

          {/* Error Message */}
          {postError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm">{postError}</span>
              <button
                onClick={() => setPostError(null)}
                className="ml-auto p-1 text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Toolbar */}
          <div className="mt-4 p-4 bg-white border border-zinc-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={handleAIEnhance}
                disabled={!activePost.text.trim() || isEnhancing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                title="AI強化"
              >
                {isEnhancing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Wand2 className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">AI強化</span>
              </button>
              <button
                onClick={handleFactCheck}
                disabled={!activePost.text.trim() || isFactChecking}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                title="ハルシネーションチェック"
              >
                {isFactChecking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                <span className="text-sm font-medium hidden sm:inline">チェック</span>
              </button>
              <button
                onClick={handleAICorrection}
                disabled={!activePost.text.trim() || isAICorrecting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                title="AI補正"
              >
                {isAICorrecting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                <span className="text-sm font-medium hidden sm:inline">AI補正</span>
              </button>
              <div className="w-px h-6 bg-zinc-200 mx-1" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                title="画像を追加"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleImageSearch}
                disabled={!activePost.text.trim() || activePost.images.length >= 4}
                className="p-2.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="画像を検索"
              >
                <Search className="w-5 h-5" />
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
                disabled={!activePost.text.trim() || isPosting}
                className={`flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                  postSuccess
                    ? "bg-emerald-500 text-white"
                    : quoteTweetFromBookmark
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    投稿中...
                  </>
                ) : postSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    投稿完了！
                  </>
                ) : quoteTweetFromBookmark ? (
                  <>
                    <Quote className="w-4 h-4" />
                    引用投稿する
                  </>
                ) : (
                  "ポストする"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Preview Column */}
        <div className={`${showPreview ? "block" : "hidden lg:block"}`}>
          <div className="sticky top-24">
            {/* Article URL Card (when from external content) */}
            {articleUrl && (
              <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">参照記事</span>
                </div>
                {articleTitle && (
                  <p className="text-sm font-medium text-zinc-900 mb-2 line-clamp-2">{articleTitle}</p>
                )}
                <div className="flex items-center gap-2">
                  <a
                    href={articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-emerald-600 hover:text-emerald-700 hover:underline truncate"
                  >
                    {articleUrl}
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(articleUrl);
                      setCopiedArticleUrl(true);
                      setTimeout(() => setCopiedArticleUrl(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    {copiedArticleUrl ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        コピー済
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        コピー
                      </>
                    )}
                  </button>
                  <a
                    href={articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    開く
                  </a>
                </div>
              </div>
            )}

            <h3 className="text-sm font-semibold text-zinc-500 mb-3">投稿プレビュー</h3>

            {/* X-style Preview */}
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
              {threadPosts.map((post, index) => (
                <div key={post.id} className={`p-4 ${index > 0 ? "border-t border-zinc-100" : ""}`}>
                  {/* User info */}
                  <div className="flex items-start gap-3">
                    {xConnected && xProfile?.profileImageUrl ? (
                      <Image
                        src={xProfile.profileImageUrl.replace("_normal", "_200x200")}
                        alt={xProfile.name}
                        width={40}
                        height={40}
                        className="rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">
                          {xConnected && xProfile ? xProfile.name : "あなた"}
                        </span>
                        <span className="text-zinc-500 text-sm">
                          @{xConnected && xProfile ? xProfile.username : "username"}
                        </span>
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

                      {/* Quote Tweet Preview from Bookmark (only on first post) */}
                      {index === 0 && quoteTweetFromBookmark && (
                        <div className="mt-3 p-3 border border-blue-200 bg-blue-50/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center">
                              <Quote className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-sm font-medium text-zinc-900">{quoteTweetFromBookmark.author}</span>
                            <span className="text-xs text-zinc-500">@{quoteTweetFromBookmark.username}</span>
                          </div>
                          <p className="text-sm text-zinc-600 line-clamp-2">{quoteTweetFromBookmark.text}</p>
                        </div>
                      )}

                      {/* Quote Tweet Preview (legacy - only on first post) */}
                      {index === 0 && selectedQuoteTweet && !quoteTweetFromBookmark && (
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

      {/* AI Enhancement Modal */}
      {showAIEnhance && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAIEnhance(false)} />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl mx-4 mb-20 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Wand2 className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">AI強化</h2>
                  <p className="text-sm text-zinc-500">元の投稿を活かして微調整</p>
                </div>
              </div>
              <button onClick={() => setShowAIEnhance(false)} className="p-2 rounded-lg hover:bg-white/50 transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isEnhancing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                  </div>
                  <p className="mt-4 text-zinc-600 font-medium">3つの強化案を生成中...</p>
                </div>
              ) : aiEnhanceOptions.length > 0 ? (
                <div className="space-y-4">
                  {aiEnhanceOptions.map((option, index) => {
                    const icons = [
                      { icon: Plus, color: "text-blue-500", bg: "bg-blue-50", label: "続きを追加" },
                      { icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50", label: "表現を磨く" },
                      { icon: Target, color: "text-emerald-500", bg: "bg-emerald-50", label: "要素を補強" },
                    ];
                    const style = icons[index] || icons[0];

                    return (
                      <button
                        key={option.id}
                        onClick={() => applyEnhancement(option.text)}
                        disabled={enhancingType === "applying"}
                        className={`w-full p-4 rounded-xl border-2 border-zinc-200 hover:border-zinc-300 text-left transition-all group ${
                          enhancingType === "applying" ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${style.bg}`}>
                            <style.icon className={`w-5 h-5 ${style.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-zinc-900">{option.label || style.label}</span>
                              <span className="text-xs text-zinc-400">{option.text.length}文字</span>
                            </div>
                            <p className="text-sm text-zinc-600 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                              {option.text}
                            </p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p>強化案を生成できませんでした</p>
                  <button
                    onClick={handleAIEnhance}
                    className="mt-4 text-amber-600 hover:underline"
                  >
                    再試行
                  </button>
                </div>
              )}
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

      {/* Image Search Modal */}
      {showImageSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowImageSearch(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl mx-4 mb-20 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-blue-50 to-sky-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">投稿に使う画像を検索</h2>
                  <p className="text-sm text-zinc-500">AIが投稿内容に合う画像を提案します</p>
                </div>
              </div>
              <button
                onClick={() => setShowImageSearch(false)}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isSearchingImages ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-zinc-600 font-medium">関連画像を検索中...</p>
                  <p className="text-sm text-zinc-400 mt-1">公式ロゴや関連画像を探しています</p>
                </div>
              ) : imageSearchError ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">{imageSearchError}</p>
                  <button
                    onClick={handleImageSearch}
                    className="text-blue-600 hover:underline"
                  >
                    再試行
                  </button>
                </div>
              ) : imageSearchResults.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                    {imageSearchResults.map((img, index) => (
                      <button
                        key={index}
                        onClick={() => toggleImageSelection(index)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          img.selected
                            ? "border-blue-500 ring-2 ring-blue-500/30"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {img.selected && (
                          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-xs text-white truncate">{img.title}</p>
                          <p className="text-xs text-white/70 truncate">{img.source}</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Selection info and add button */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-200">
                    <p className="text-sm text-zinc-500">
                      {imageSearchResults.filter(img => img.selected).length > 0
                        ? `${imageSearchResults.filter(img => img.selected).length}枚選択中 (最大${4 - activePost.images.length}枚追加可能)`
                        : "画像をクリックして選択"}
                    </p>
                    <button
                      onClick={addSelectedImages}
                      disabled={imageSearchResults.filter(img => img.selected).length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      選択した画像を追加
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <Search className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
                  <p>画像が見つかりませんでした</p>
                  <button
                    onClick={handleImageSearch}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    再検索
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fact Check (Hallucination Check) Modal */}
      {showFactCheck && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFactCheck(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl mx-4 mb-20 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">ハルシネーションチェック</h2>
                  <p className="text-sm text-zinc-500">事実確認と文章の流れをチェック</p>
                </div>
              </div>
              <button
                onClick={() => setShowFactCheck(false)}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isFactChecking ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
                    <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="mt-4 text-zinc-600 font-medium">投稿内容をチェック中...</p>
                  <p className="text-sm text-zinc-400 mt-1">事実確認と文章の流れを分析しています</p>
                </div>
              ) : factCheckResults ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className={`p-4 rounded-xl ${
                    factCheckResults.wasModified
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-emerald-50 border border-emerald-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {factCheckResults.wasModified ? (
                        <>
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-amber-800">修正箇所があります</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span className="font-medium text-emerald-800">問題ありません</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-zinc-600">
                        主張チェック: {factCheckResults.summary.accurateClaims}/{factCheckResults.summary.totalClaims}件OK
                      </span>
                      {factCheckResults.summary.flowIssues > 0 && (
                        <span className="text-zinc-600">
                          流れの問題: {factCheckResults.summary.flowIssues}件
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fact Check Details */}
                  {factCheckResults.details.factCheckResults.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-700 mb-3">事実チェック結果</h3>
                      <div className="space-y-2">
                        {factCheckResults.details.factCheckResults.map((item, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border ${
                              item.isAccurate
                                ? "bg-emerald-50 border-emerald-200"
                                : "bg-red-50 border-red-200"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {item.isAccurate ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-900">{item.claim}</p>
                                {item.correction && (
                                  <p className="text-sm text-red-700 mt-1">
                                    → 修正案: {item.correction}
                                  </p>
                                )}
                                <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
                                  item.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                                  item.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                                  "bg-zinc-100 text-zinc-600"
                                }`}>
                                  信頼度: {item.confidence}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flow Issues */}
                  {factCheckResults.details.flowCheck.hasIssues && (
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-700 mb-3">文章の流れ</h3>
                      <ul className="space-y-1">
                        {factCheckResults.details.flowCheck.issues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-zinc-600">
                            <ChevronRight className="w-4 h-4 text-zinc-400 mt-0.5" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Corrected Content */}
                  {factCheckResults.wasModified && (
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-700 mb-3">修正後の投稿</h3>
                      <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200">
                        <p className="text-sm text-zinc-900 whitespace-pre-wrap">
                          {factCheckResults.correctedContent}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4 border-t border-zinc-200">
                    <button
                      onClick={() => setShowFactCheck(false)}
                      className="flex-1 py-2.5 text-zinc-600 font-medium rounded-xl hover:bg-zinc-100 transition-colors"
                    >
                      閉じる
                    </button>
                    {factCheckResults.wasModified && (
                      <button
                        onClick={applyFactCheckCorrection}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        修正を適用
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p>チェックに失敗しました</p>
                  <button
                    onClick={handleFactCheck}
                    className="mt-4 text-emerald-600 hover:underline"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Correction Modal */}
      {showAICorrection && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAICorrection(false)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl mx-4 mb-20 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">AI補正</h2>
                  <p className="text-sm text-zinc-500">構造を維持しつつ表現を改善</p>
                </div>
              </div>
              <button
                onClick={() => setShowAICorrection(false)}
                className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isAICorrecting ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    <RefreshCw className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-500" />
                  </div>
                  <p className="mt-4 text-zinc-600 font-medium">3パターンを生成中...</p>
                  <p className="text-sm text-zinc-400 mt-1">構造を維持しつつ表現を改善</p>
                </div>
              ) : aiCorrectionPatterns.length > 0 ? (
                <div className="space-y-4">
                  {aiCorrectionPatterns.map((pattern, index) => {
                    const colors = [
                      { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-500" },
                      { bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-500" },
                      { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-500" },
                    ];
                    const color = colors[index] || colors[0];

                    return (
                      <button
                        key={index}
                        onClick={() => applyAICorrection(pattern.text)}
                        className={`w-full p-4 rounded-xl border-2 ${color.border} ${color.bg} text-left transition-all hover:shadow-md group`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-900">{pattern.type}</span>
                            {pattern.warning && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                {pattern.warning}
                              </span>
                            )}
                          </div>
                          <CheckCircle2 className={`w-5 h-5 ${color.icon} opacity-0 group-hover:opacity-100 transition-opacity`} />
                        </div>
                        <p className="text-sm text-zinc-600 whitespace-pre-wrap line-clamp-4 leading-relaxed mb-2">
                          {pattern.text}
                        </p>
                        <p className="text-xs text-zinc-500">{pattern.changes}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p>補正案を生成できませんでした</p>
                  <button
                    onClick={handleAICorrection}
                    className="mt-4 text-blue-600 hover:underline"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Text Selection Enhancement Popup */}
      {showTextEnhance && textEnhancePosition && (
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden"
          style={{
            left: Math.min(textEnhancePosition.x, window.innerWidth - 320),
            top: Math.min(textEnhancePosition.y, window.innerHeight - 400),
            width: "300px",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-zinc-900">テキスト強化</span>
            </div>
            <button
              onClick={closeTextEnhance}
              className="p-1 rounded hover:bg-white/50 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Selected Text */}
          <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200">
            <p className="text-xs text-zinc-500 mb-1">選択中:</p>
            <p className="text-sm text-zinc-900 line-clamp-2">&ldquo;{selectedText}&rdquo;</p>
          </div>

          {/* Content */}
          <div className="p-3 max-h-64 overflow-y-auto">
            {isTextEnhancing ? (
              <div className="flex flex-col items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin mb-2" />
                <p className="text-sm text-zinc-600">候補を生成中...</p>
              </div>
            ) : textEnhanceOptions.length > 0 ? (
              <div className="space-y-2">
                {textEnhanceOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => applyTextEnhancement(option.text)}
                    className="w-full p-3 rounded-lg border border-zinc-200 hover:border-violet-300 hover:bg-violet-50 text-left transition-all group"
                  >
                    <p className="text-sm text-zinc-900 mb-1">{option.text}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded">
                        {option.style}
                      </span>
                      <span className="text-xs text-zinc-400">{option.reason}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4">
                <button
                  onClick={handleTextEnhance}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-500 text-white text-sm font-medium rounded-lg hover:bg-violet-600 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  バズる表現に変換
                </button>
                <p className="text-xs text-zinc-400 text-center mt-2">
                  AIが5つの候補を提案します
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
