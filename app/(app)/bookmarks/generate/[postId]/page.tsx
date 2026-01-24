"use client";

import { useState, useEffect, useRef, use } from "react";
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
  RotateCcw,
  Heart,
  Tag,
  Pencil,
  Zap,
  X as XIcon,
  Clock,
  Video,
  MessageCircle,
  Repeat2,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { useXProfile } from "@/lib/x-profile-context";
import { getContextPosts, getPosts, saveScheduledPost, getUserStyleAnalysis } from "@/lib/firebase";

/**
 * URLを除去する（t.co, x.com, twitter.com などすべて）
 * AI生成時に元ツイートのURLが混入しないようにする
 */
function removeUrls(text: string | null | undefined): string {
  if (!text || typeof text !== "string") {
    return "";
  }
  // すべてのURL形式を除去（http, https, t.co短縮URL含む）
  return text
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/t\.co\/[^\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Post categories
const CATEGORIES = [
  "速報・ニュース系",
  "Tips・ノウハウ系",
  "記事・コンテンツ紹介系",
  "ツール・サービス紹介系",
  "動画・メディア紹介系",
  "プロンプト・AI活用系",
];

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

interface ReferencePost {
  id: string;
  text: string;
  likes: number;
  tier: "S" | "A" | "B" | "C";
  category: string;
  source: "myPosts" | "othersPosts";
}

interface GeneratedCard {
  id: number;
  text: string;
  referencePost: ReferencePost;
  isLoading: boolean;
  isEnhancing?: boolean;
  error?: string;
}

export default function BookmarkGeneratePage({ params }: { params: Promise<{ postId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { profile: xProfile, isConnected: xConnected } = useXProfile();

  // Saved post data
  const [savedPost, setSavedPost] = useState<SavedPost | null>(null);
  const [isLoadingSavedPost, setIsLoadingSavedPost] = useState(true);

  // Reference posts
  const [referencePosts, setReferencePosts] = useState<ReferencePost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [userStyle, setUserStyle] = useState<string>("");
  const [userStyleAnalysis, setUserStyleAnalysis] = useState<any>(null);

  // Category selection
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableCategories, setAvailableCategories] = useState<{name: string; count: number}[]>([]);

  // 6 cards state
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Generation progress state
  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    completed: number;
    total: number;
  }>({ isGenerating: false, completed: 0, total: 0 });

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCardId, setScheduleCardId] = useState<number | null>(null);
  const [scheduleText, setScheduleText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const scheduleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load saved post
  useEffect(() => {
    const loadSavedPost = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/x/saved-posts?userId=${user.uid}`);
        const data = await response.json();

        if (response.ok && data.posts) {
          const post = data.posts.find((p: SavedPost) => p.id === resolvedParams.postId);
          if (post) {
            setSavedPost(post);
          }
        }
      } catch (err) {
        console.error("Failed to load saved post:", err);
      } finally {
        setIsLoadingSavedPost(false);
      }
    };

    loadSavedPost();
  }, [user, resolvedParams.postId]);

  // Load reference posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      setIsLoadingPosts(true);

      try {
        const [contextPosts, userPosts, styleAnalysis] = await Promise.all([
          getContextPosts(user.uid),
          getPosts(user.uid),
          getUserStyleAnalysis(user.uid),
        ]);

        if (styleAnalysis) {
          setUserStyleAnalysis(styleAnalysis);
        }

        // Combine posts from both sources
        const allPosts: ReferencePost[] = [];

        contextPosts
          .filter((p: any) => p.tier === "S" || p.tier === "A")
          .forEach((p: any) => {
            allPosts.push({
              id: p.id,
              text: p.text,
              likes: p.likes || 0,
              tier: p.tier,
              category: p.category || "日常・つぶやき系",
              source: "othersPosts",
            });
          });

        userPosts
          .filter((p: any) => p.tier === "S" || p.tier === "A")
          .forEach((p: any) => {
            allPosts.push({
              id: p.id,
              text: p.text,
              likes: p.likes || 0,
              tier: p.tier,
              category: p.category || "日常・つぶやき系",
              source: "myPosts",
            });
          });

        allPosts.sort((a, b) => b.likes - a.likes);
        setReferencePosts(allPosts);

        // User style
        if (userPosts.length > 0) {
          const topUserPosts = userPosts
            .filter((p: any) => p.tier === "S" || p.tier === "A")
            .slice(0, 10)
            .map((p: any) => p.text);

          if (topUserPosts.length > 0) {
            const hasEmoji = topUserPosts.some((t: string) => /[\u{1F300}-\u{1F9FF}]/u.test(t));
            const avgLength = Math.round(topUserPosts.reduce((acc: number, t: string) => acc + t.length, 0) / topUserPosts.length);
            const usesExclamation = topUserPosts.filter((t: string) => t.includes("！")).length > topUserPosts.length / 2;

            let styleDesc = "";
            if (hasEmoji) styleDesc += "絵文字を適度に使用。";
            else styleDesc += "絵文字は使用しない。";
            if (usesExclamation) styleDesc += "「！」を使う元気な口調。";
            else styleDesc += "落ち着いた口調。";
            styleDesc += `平均${avgLength}文字程度。`;

            const samplePhrases = topUserPosts.slice(0, 3).join("\n---\n");
            setUserStyle(`${styleDesc}\n\n【ユーザーの実際の投稿例】\n${samplePhrases}`);
          }
        }
      } catch (err) {
        console.error("Failed to load posts:", err);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadPosts();
  }, [user]);

  // Update category counts
  useEffect(() => {
    const categoryCounts: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
      categoryCounts[cat] = 0;
    });
    referencePosts.forEach(p => {
      if (categoryCounts[p.category] !== undefined) {
        categoryCounts[p.category]++;
      }
    });

    const cats = CATEGORIES.map(name => ({
      name,
      count: categoryCounts[name] || 0,
    })).sort((a, b) => b.count - a.count);
    setAvailableCategories(cats);
  }, [referencePosts]);

  // Auto-resize schedule textarea
  useEffect(() => {
    if (scheduleTextareaRef.current) {
      scheduleTextareaRef.current.style.height = "auto";
      scheduleTextareaRef.current.style.height = `${scheduleTextareaRef.current.scrollHeight}px`;
    }
  }, [scheduleText]);

  // Get filtered reference posts
  const getFilteredReferencePosts = () => {
    if (!selectedCategory) return [];
    return referencePosts
      .filter(p => p.category === selectedCategory)
      .slice(0, 6);
  };

  // Helper function for rate-limit-aware API call with retry
  const generateWithRetry = async (body: any, maxRetries = 3): Promise<{ text: string; error?: string }> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        // Handle rate limit error
        if (response.status === 429) {
          const waitMatch = data.error?.match(/(\d+\.?\d*)\s*s/);
          const waitTime = waitMatch ? parseFloat(waitMatch[1]) * 1000 : 20000;
          console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
          continue;
        }

        if (!response.ok) {
          throw new Error(data.error || "生成に失敗しました");
        }

        return { text: data.text };
      } catch (err) {
        if (attempt === maxRetries - 1) {
          const message = err instanceof Error ? err.message : "エラー";
          return { text: "", error: message };
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return { text: "", error: "リトライ回数を超えました" };
  };

  // Generate all 6 cards
  const handleGenerateAll = async () => {
    if (!savedPost || !selectedCategory) return;

    const postsToUse = getFilteredReferencePosts();
    if (postsToUse.length === 0) {
      alert("選択したカテゴリーに参考投稿がありません");
      return;
    }

    // Content to use: translated text or original
    const content = savedPost.translatedText || savedPost.text;

    // Initialize 6 cards
    const initialCards: GeneratedCard[] = [];
    for (let i = 0; i < 6; i++) {
      const refPost = postsToUse[i % postsToUse.length];
      initialCards.push({
        id: i + 1,
        text: "",
        referencePost: refPost,
        isLoading: true,
      });
    }
    setCards(initialCards);
    setGenerationProgress({ isGenerating: true, completed: 0, total: 6 });

    // Generate cards in batches to avoid rate limits
    const batchSize = 2;
    const delayBetweenBatches = 3000;

    for (let batchStart = 0; batchStart < initialCards.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, initialCards.length);
      const batchCards = initialCards.slice(batchStart, batchEnd);

      // Process batch in parallel
      const batchPromises = batchCards.map(async (card) => {
        const body = {
          mode: "reference",
          content: removeUrls(content),
          referenceText: removeUrls(card.referencePost.text),
          userStyle: userStyle || undefined,
        };

        const result = await generateWithRetry(body);
        return { id: card.id, text: removeUrls(result.text), error: result.error };
      });

      const batchResults = await Promise.all(batchPromises);

      // Update cards and progress
      setCards(prev => prev.map(card => {
        const result = batchResults.find(r => r.id === card.id);
        if (result) {
          return {
            ...card,
            text: result.text,
            error: result.error,
            isLoading: false,
          };
        }
        return card;
      }));

      setGenerationProgress(prev => ({
        ...prev,
        completed: batchEnd,
      }));

      // Wait between batches
      if (batchEnd < initialCards.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    setGenerationProgress(prev => ({ ...prev, isGenerating: false }));
  };

  // AI Enhance
  const handleEnhance = async (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.text || !savedPost) return;

    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, isEnhancing: true } : c
    ));

    try {
      const response = await fetch("/api/generate/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // URLを除去してAIに渡す
          currentText: removeUrls(card.text),
          originalContent: removeUrls(savedPost.translatedText || savedPost.text),
          referenceText: removeUrls(card.referencePost.text),
          userStyle: userStyleAnalysis,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "強化に失敗しました");

      // 生成結果からもURLを除去
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, text: removeUrls(data.text), isEnhancing: false } : c
      ));
    } catch (err) {
      console.error("Enhance failed:", err);
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, isEnhancing: false } : c
      ));
    }
  };

  // Regenerate single card
  const handleRegenerateCard = async (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !savedPost) return;

    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, isLoading: true, error: undefined } : c
    ));

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "reference",
          // URLを除去してAIに渡す
          content: removeUrls(savedPost.translatedText || savedPost.text),
          referenceText: removeUrls(card.referencePost.text),
          userStyle: userStyle || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成に失敗しました");

      // 生成結果からもURLを除去
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, text: removeUrls(data.text), isLoading: false } : c
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラー";
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, error: message, isLoading: false } : c
      ));
    }
  };

  const handleCopy = (cardId: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(cardId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Go to editor with video preview
  const handleEdit = (text: string) => {
    if (!savedPost) return;

    // Store data in sessionStorage
    sessionStorage.setItem("bookmark_editor_text", text);
    sessionStorage.setItem("bookmark_editor_post", JSON.stringify(savedPost));

    router.push("/bookmarks/editor");
  };

  // Open schedule modal
  const handleSchedule = (cardId: number, text: string) => {
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    defaultDate.setMinutes(0, 0, 0);

    setScheduleCardId(cardId);
    setScheduleText(text);
    setScheduleDate(defaultDate.toISOString().split("T")[0]);
    setScheduleTime(defaultDate.toTimeString().slice(0, 5));
    setShowScheduleModal(true);
  };

  // Save scheduled post with mediaInfo (/video/1 or /photo/1形式)
  const handleSaveSchedule = async () => {
    if (!user || !scheduleText.trim() || !savedPost) return;

    setIsSavingSchedule(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);

      await saveScheduledPost(user.uid, {
        text: scheduleText,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status: "scheduled",
        // メディアURLを末尾に追加（/video/1 または /photo/1形式）
        mediaInfo: hasMedia && mediaType ? {
          tweetId: savedPost.id,
          username: savedPost.authorUsername,
          mediaType,
        } : undefined,
      });

      setShowScheduleModal(false);
      setScheduleCardId(null);
      router.push("/schedule");
    } catch (err) {
      console.error("Schedule failed:", err);
      alert("予約に失敗しました");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const hasGenerated = cards.length > 0;
  const isAnyLoading = cards.some(c => c.isLoading);
  const hasVideo = savedPost?.media?.some(m => m.type === "video");
  const hasPhoto = savedPost?.media?.some(m => m.type === "photo");
  const hasMedia = hasVideo || hasPhoto;
  const mediaType: "video" | "photo" | undefined = hasVideo ? "video" : hasPhoto ? "photo" : undefined;

  if (isLoadingSavedPost) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!savedPost) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">投稿が見つかりません</p>
        <Link href="/bookmarks" className="text-emerald-600 hover:underline mt-2 inline-block">
          保存済み投稿に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/bookmarks"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">AI投稿生成</h1>
            <p className="text-zinc-500">保存済み投稿から6パターン生成</p>
          </div>
        </div>

        {hasGenerated && (
          <button
            onClick={handleGenerateAll}
            disabled={isAnyLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            全て再生成
          </button>
        )}
      </div>

      {/* Reference Post Card */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-zinc-900">参照元の投稿</h3>
          {hasMedia && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              <Video className="w-3 h-3" />
              {hasVideo ? "/video/1で動画表示" : "/photo/1で画像表示"}
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {savedPost.authorProfileImageUrl && (
            <div className="flex-shrink-0 w-10 h-10">
              <Image
                src={savedPost.authorProfileImageUrl}
                alt={savedPost.authorName}
                width={40}
                height={40}
                className="rounded-full w-10 h-10 object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <span className="font-bold text-zinc-900 text-sm">{savedPost.authorName}</span>
              <span className="text-zinc-500 text-sm">@{savedPost.authorUsername}</span>
            </div>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-3">
              {savedPost.translatedText || savedPost.text}
            </p>
            {savedPost.media && savedPost.media.length > 0 && savedPost.media[0].type === "video" && (
              <div className="mt-2 rounded-lg overflow-hidden border border-zinc-200 max-w-[200px]">
                <video
                  src={savedPost.media[0].url}
                  poster={savedPost.media[0].thumbnailUrl}
                  className="w-full aspect-video object-cover"
                  muted
                />
              </div>
            )}
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

      {/* Category Selection */}
      {!hasGenerated && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-zinc-900">カテゴリーを選択</h3>
          </div>

          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="ml-2 text-zinc-500">読み込み中...</span>
            </div>
          ) : referencePosts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p>参考投稿がありません</p>
              <Link href="/context" className="text-emerald-600 hover:underline mt-2 inline-block">
                他者バズ投稿を追加する
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableCategories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedCategory === cat.name
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  }`}
                >
                  <p className={`font-medium text-sm ${
                    selectedCategory === cat.name ? "text-emerald-700" : "text-zinc-700"
                  }`}>
                    {cat.name}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">{cat.count}件の参考投稿</p>
                </button>
              ))}
            </div>
          )}

          {/* Selected category preview */}
          {selectedCategory && (
            <div className="mt-4 p-4 bg-zinc-50 rounded-xl">
              <p className="text-sm font-medium text-zinc-700 mb-2">
                「{selectedCategory}」の上位投稿で6パターン生成
              </p>
              <div className="space-y-2">
                {getFilteredReferencePosts().slice(0, 3).map((post) => (
                  <div key={post.id} className="flex items-start gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-bold ${
                      post.tier === "S" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"
                    }`}>
                      {post.tier}
                    </span>
                    <p className="text-zinc-600 line-clamp-1 flex-1">{post.text}</p>
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      {!hasGenerated && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerateAll}
            disabled={!selectedCategory || isLoadingPosts}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
          >
            <Sparkles className="w-6 h-6" />
            {selectedCategory ? `「${selectedCategory}」で6パターン生成` : "カテゴリーを選択してください"}
          </button>
        </div>
      )}

      {/* Generation Progress Bar */}
      {generationProgress.isGenerating && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              <span className="font-medium text-zinc-900">6パターン生成中...</span>
            </div>
            <span className="text-sm font-medium text-emerald-600">
              {generationProgress.completed}/{generationProgress.total}
            </span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(generationProgress.completed / generationProgress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            レート制限を回避するため、2つずつ順番に生成しています
          </p>
        </div>
      )}

      {/* 6 Cards Grid */}
      {hasGenerated && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                    {card.id}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                    card.referencePost.source === "myPosts"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-violet-100 text-violet-600"
                  }`}>
                    {card.referencePost.source === "myPosts" ? "自分" : "他者"}
                  </span>
                </div>

                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                  card.referencePost.tier === "S"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-violet-100 text-violet-700"
                }`}>
                  {card.referencePost.tier}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex-1 p-4">
                {card.isLoading ? (
                  <div className="h-40 flex flex-col items-center justify-center text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <span className="text-sm">生成中...</span>
                  </div>
                ) : card.error ? (
                  <div className="h-40 flex flex-col items-center justify-center text-red-500">
                    <span className="text-sm mb-2">{card.error}</span>
                    <button
                      onClick={() => handleRegenerateCard(card.id)}
                      className="text-sm text-emerald-600 hover:underline"
                    >
                      再試行
                    </button>
                  </div>
                ) : (
                  <div>
                    {xConnected && xProfile && (
                      <div className="flex items-center gap-2 mb-3">
                        {xProfile.profileImageUrl ? (
                          <Image
                            src={xProfile.profileImageUrl}
                            alt={xProfile.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            {xProfile.name?.[0] || "X"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-zinc-900 truncate">{xProfile.name}</p>
                          <p className="text-xs text-zinc-500">@{xProfile.username}</p>
                        </div>
                      </div>
                    )}
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                      {card.text}
                    </p>
                    {/* Media preview badge */}
                    {hasMedia && (
                      <div className="mt-3 p-2 bg-zinc-50 rounded-lg border border-zinc-200">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <Video className="w-4 h-4" />
                          <span>{hasVideo ? "/video/1 URLで動画プレイヤーが表示" : "/photo/1 URLで画像が表示"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              {!card.isLoading && !card.error && card.text && (
                <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{card.text.length}文字</span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {card.referencePost.likes}
                    </span>
                  </div>
                </div>
              )}

              {/* Card Actions */}
              {!card.isLoading && !card.error && card.text && (
                <div className="flex border-t border-zinc-100">
                  <button
                    onClick={() => handleEnhance(card.id)}
                    disabled={card.isEnhancing}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-amber-600 hover:bg-amber-50 transition-colors border-r border-zinc-100 disabled:opacity-50"
                  >
                    {card.isEnhancing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    AI強化
                  </button>
                  <button
                    onClick={() => handleCopy(card.id, card.text)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors border-r border-zinc-100"
                  >
                    {copiedId === card.id ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600">コピー済</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        コピー
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(card.text)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors border-r border-zinc-100"
                  >
                    <Pencil className="w-4 h-4" />
                    編集
                  </button>
                  <button
                    onClick={() => handleSchedule(card.id, card.text)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    予約
                  </button>
                </div>
              )}

              {/* Regenerate */}
              {!card.isLoading && card.text && (
                <button
                  onClick={() => handleRegenerateCard(card.id)}
                  className="flex items-center justify-center gap-1.5 py-2 text-xs text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors border-t border-zinc-100"
                >
                  <RotateCcw className="w-3 h-3" />
                  この投稿を再生成
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
                    {hasVideo ? "動画URL付きで予約" : hasPhoto ? "画像URL付きで予約" : "日時を選択してください"}
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

              {/* Post content */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  投稿内容
                  <span className="ml-2 text-zinc-400 font-normal">{scheduleText.length}文字</span>
                </label>
                <textarea
                  ref={scheduleTextareaRef}
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  className="w-full min-h-[120px] p-4 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                />
              </div>

              {/* Media preview */}
              {hasMedia && savedPost.media && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">
                      {hasVideo ? "/video/1 URLで動画プレイヤーが表示されます" : "/photo/1 URLで画像が表示されます"}
                    </span>
                  </div>
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
                disabled={isSavingSchedule || !scheduleText.trim() || !scheduleDate || !scheduleTime}
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
