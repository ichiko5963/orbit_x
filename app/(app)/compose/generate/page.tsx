"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
  Copy,
  ExternalLink,
  Calendar,
  RotateCcw,
  Heart,
  FileText,
  ChevronDown,
  ChevronUp,
  Tag,
  Pencil,
  Wand2,
  Zap,
  X as XIcon,
  Clock,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useXProfile } from "@/lib/x-profile-context";
import { getContextPosts, getPosts, saveScheduledPost, getUserStyleAnalysis } from "@/lib/firebase";

// Practical X post categories (must match database)
const CATEGORIES = [
  "速報・ニュース系",
  "Tips・ノウハウ系",
  "記事・コンテンツ紹介系",
  "ツール・サービス紹介系",
  "動画・メディア紹介系",
  "プロンプト・AI活用系",
  "プロダクト・リリース系",
  "イベント・登壇系",
  "プレゼント・キャンペーン系",
  "採用・メンバー募集系",
  "日常・つぶやき系",
];

interface ReferencePost {
  id: string;
  text: string;
  likes: number;
  tier: "S" | "A" | "B" | "C";
  category: string;
}

interface ReferencePostExtended extends ReferencePost {
  source: "myPosts" | "othersPosts";
}

interface GeneratedCard {
  id: number;
  text: string;
  referencePost: ReferencePostExtended;
  isLoading: boolean;
  isEnhancing?: boolean;
  error?: string;
}

type PostSource = "myPosts" | "othersPosts" | "aiAuto";

export default function GeneratePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile: xProfile, isConnected: xConnected } = useXProfile();

  const [content, setContent] = useState("");
  const [previousContent, setPreviousContent] = useState("");
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // URL input state
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [newUrlInput, setNewUrlInput] = useState("");

  // Source toggle: 過去投稿一覧 (myPosts) or 他者バズ投稿 (othersPosts) or AIおまかせ (aiAuto)
  const [postSource, setPostSource] = useState<PostSource>("myPosts");

  // Reference posts from both sources
  const [myReferencePosts, setMyReferencePosts] = useState<ReferencePostExtended[]>([]);
  const [contextReferencePosts, setContextReferencePosts] = useState<ReferencePostExtended[]>([]);
  const [allReferencePosts, setAllReferencePosts] = useState<ReferencePostExtended[]>([]);
  // User's own style (learned from their posts)
  const [userStyle, setUserStyle] = useState<string>("");
  const [userStyleAnalysis, setUserStyleAnalysis] = useState<any>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Category selection
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableCategories, setAvailableCategories] = useState<{name: string; count: number}[]>([]);

  // 6 cards state
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [schedulingId, setSchedulingId] = useState<number | null>(null);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCardId, setScheduleCardId] = useState<number | null>(null);
  const [scheduleText, setScheduleText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const scheduleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load content from sessionStorage
  useEffect(() => {
    const savedContent = sessionStorage.getItem("compose_content");
    if (savedContent) {
      setContent(savedContent);
      setPreviousContent(savedContent);
    }

    // Only restore cards if coming back from editor (check navigation history)
    const cameFromEditor = sessionStorage.getItem("came_from_editor") === "true";
    if (cameFromEditor && savedContent) {
      const savedCards = sessionStorage.getItem("compose_generated_cards");
      if (savedCards) {
        try {
          const parsedCards = JSON.parse(savedCards);
          if (Array.isArray(parsedCards) && parsedCards.length > 0) {
            setCards(parsedCards);
          }
        } catch (e) {
          console.error("Failed to parse saved cards:", e);
        }
      }
      // Clear the flag
      sessionStorage.removeItem("came_from_editor");
    } else {
      // Clear any old cards
      sessionStorage.removeItem("compose_generated_cards");
    }
  }, []);

  // Clear cards when content changes significantly
  useEffect(() => {
    if (content && previousContent && content !== previousContent) {
      // Content changed, clear old cards
      setCards([]);
      setSelectedCategory("");
      sessionStorage.removeItem("compose_generated_cards");
    }
    if (content) {
      setPreviousContent(content);
    }
  }, [content, previousContent]);

  // Save cards to sessionStorage whenever they change
  useEffect(() => {
    if (cards.length > 0 && cards.some(c => c.text && !c.isLoading)) {
      sessionStorage.setItem("compose_generated_cards", JSON.stringify(cards));
    }
  }, [cards]);

  // Auto-resize schedule textarea
  useEffect(() => {
    if (scheduleTextareaRef.current) {
      scheduleTextareaRef.current.style.height = "auto";
      scheduleTextareaRef.current.style.height = `${scheduleTextareaRef.current.scrollHeight}px`;
    }
  }, [scheduleText]);

  // Load reference posts from BOTH sources
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      setIsLoadingPosts(true);
      try {
        // Load BOTH - userPosts for reference AND style, contextPosts for reference
        const [contextPosts, userPosts, styleAnalysis] = await Promise.all([
          getContextPosts(user.uid),
          getPosts(user.uid),
          getUserStyleAnalysis(user.uid),
        ]);

        // Store user style analysis if available
        if (styleAnalysis) {
          setUserStyleAnalysis(styleAnalysis);
        }

        // === REFERENCE POSTS FROM 他者バズ投稿 (contextPosts) ===
        const ctxRefPosts: ReferencePostExtended[] = contextPosts
          .filter((p: any) => p.tier === "S" || p.tier === "A")
          .map((p: any) => ({
            id: p.id,
            text: p.text,
            likes: p.likes || 0,
            tier: p.tier as "S" | "A" | "B" | "C",
            category: p.category || "日常・つぶやき系",
            source: "othersPosts" as const,
          }))
          .sort((a, b) => b.likes - a.likes);
        setContextReferencePosts(ctxRefPosts);

        // === REFERENCE POSTS FROM 過去投稿一覧 (userPosts) ===
        const myRefPosts: ReferencePostExtended[] = userPosts
          .filter((p: any) => p.tier === "S" || p.tier === "A")
          .map((p: any) => ({
            id: p.id,
            text: p.text,
            likes: p.likes || 0,
            tier: p.tier as "S" | "A" | "B" | "C",
            category: p.category || "日常・つぶやき系",
            source: "myPosts" as const,
          }))
          .sort((a, b) => b.likes - a.likes);
        setMyReferencePosts(myRefPosts);

        // Combine all posts for AI auto mode
        const combined = [...myRefPosts, ...ctxRefPosts].sort((a, b) => b.likes - a.likes);
        setAllReferencePosts(combined);

        // === USER STYLE: Learn from their OWN posts ===
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

  // Update category counts when source changes
  useEffect(() => {
    // AIおまかせモードではカテゴリー選択不要
    if (postSource === "aiAuto") {
      setAvailableCategories([]);
      setSelectedCategory("");
      return;
    }

    const refPosts = postSource === "myPosts" ? myReferencePosts : contextReferencePosts;

    const categoryCounts: Record<string, number> = {};
    CATEGORIES.forEach(cat => {
      categoryCounts[cat] = 0;
    });
    refPosts.forEach(p => {
      if (categoryCounts[p.category] !== undefined) {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      }
    });

    const cats = CATEGORIES.map(name => ({
      name,
      count: categoryCounts[name] || 0,
    })).sort((a, b) => b.count - a.count);
    setAvailableCategories(cats);

    // Reset selected category when source changes
    setSelectedCategory("");
  }, [postSource, myReferencePosts, contextReferencePosts]);

  // Get active reference posts based on source selection
  const activeReferencePosts = postSource === "myPosts"
    ? myReferencePosts
    : postSource === "othersPosts"
      ? contextReferencePosts
      : allReferencePosts;

  // Get filtered reference posts for selected category
  const getFilteredReferencePosts = () => {
    if (postSource === "aiAuto") return []; // AIおまかせは別処理
    if (!selectedCategory) return [];
    return activeReferencePosts
      .filter(p => p.category === selectedCategory)
      .slice(0, 6); // Top 6 from this category
  };

  // Generate all 6 cards using top 6 posts from selected category or AI auto
  const handleGenerateAll = async () => {
    if (!content.trim()) return;

    // AIおまかせモードではカテゴリー不要
    if (postSource !== "aiAuto" && !selectedCategory) return;

    let postsToUse: ReferencePostExtended[] = [];

    if (postSource === "aiAuto") {
      // AIおまかせ: APIで最適な6つを選択
      try {
        const response = await fetch("/api/generate/auto-select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            allPosts: allReferencePosts.slice(0, 30).map(p => ({
              id: p.id,
              text: p.text,
              likes: p.likes,
              tier: p.tier,
              category: p.category,
              source: p.source,
            })),
          }),
        });

        const data = await response.json();
        if (data.posts && data.posts.length > 0) {
          postsToUse = data.posts;
        } else {
          // Fallback to top 6 by likes
          postsToUse = allReferencePosts.slice(0, 6);
        }
      } catch (err) {
        console.error("Auto select failed:", err);
        postsToUse = allReferencePosts.slice(0, 6);
      }
    } else {
      // カテゴリー選択モード
      postsToUse = getFilteredReferencePosts();

      if (postsToUse.length === 0) {
        postsToUse = activeReferencePosts.slice(0, 6);
      }
    }

    if (postsToUse.length === 0) {
      alert("参考投稿がありません。過去投稿をインポートするか、他者バズ投稿を追加してください。");
      return;
    }

    // Initialize 6 cards with loading state
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

    // Generate all 6 in parallel
    const promises = initialCards.map(async (card, index) => {
      try {
        const body: any = {
          mode: "reference",
          content,
          referenceText: card.referencePost.text,
          userStyle: userStyle || undefined,
        };

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "生成に失敗しました");
        }

        // Append URL to generated text if provided
        let generatedText = data.text;
        if (referenceUrls.length > 0) {
          generatedText = `${generatedText}\n\n${referenceUrls[0]}`;
        }

        return { index, text: generatedText, error: undefined };
      } catch (err) {
        const message = err instanceof Error ? err.message : "エラー";
        return { index, text: "", error: message };
      }
    });

    const results = await Promise.all(promises);

    setCards(prev => prev.map((card, i) => {
      const result = results.find(r => r.index === i);
      return {
        ...card,
        text: result?.text || "",
        error: result?.error,
        isLoading: false,
      };
    }));
  };

  // AI強化: 要素漏れなしでバズる投稿に強化
  const handleEnhance = async (cardId: number) => {
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = cards[cardIndex];
    if (!card.text) return;

    // Set enhancing state
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, isEnhancing: true } : c
    ));

    try {
      const response = await fetch("/api/generate/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: card.text,
          originalContent: content,
          referenceText: card.referencePost.text,
          userStyle: userStyleAnalysis,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "強化に失敗しました");
      }

      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, text: data.text, isEnhancing: false } : c
      ));
    } catch (err) {
      console.error("Enhance failed:", err);
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, isEnhancing: false } : c
      ));
      alert("AI強化に失敗しました");
    }
  };

  // Regenerate single card
  const handleRegenerateCard = async (cardId: number) => {
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = cards[cardIndex];

    // Set loading
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, isLoading: true, error: undefined } : c
    ));

    try {
      const body: any = {
        mode: "reference",
        content,
        referenceText: card.referencePost.text,
        userStyle: userStyle || undefined,
      };

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      // Append URL to generated text if provided
      let generatedText = data.text;
      if (referenceUrls.length > 0) {
        generatedText = `${generatedText}\n\n${referenceUrls[0]}`;
      }

      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, text: generatedText, isLoading: false } : c
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

  const handlePost = (text: string) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(tweetUrl, "_blank");
  };

  // Open schedule modal with date/time picker
  const handleSchedule = (cardId: number, text: string) => {
    // Set default to 1 hour from now
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    defaultDate.setMinutes(0, 0, 0);

    setScheduleCardId(cardId);
    setScheduleText(text);
    setScheduleDate(defaultDate.toISOString().split("T")[0]);
    setScheduleTime(defaultDate.toTimeString().slice(0, 5));
    setShowScheduleModal(true);
  };

  // Save scheduled post with selected date/time
  const handleSaveSchedule = async () => {
    if (!user || !scheduleText.trim()) return;

    setIsSavingSchedule(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);

      await saveScheduledPost(user.uid, {
        text: scheduleText,
        scheduledAt: Timestamp.fromDate(scheduledAt),
        status: "scheduled",
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

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/compose"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">AI投稿生成</h1>
            <p className="text-zinc-500">6パターンから選んで投稿</p>
          </div>
        </div>

        {hasGenerated && (
          <button
            onClick={handleGenerateAll}
            disabled={isAnyLoading || !content.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            全て再生成
          </button>
        )}
      </div>

      {/* Content & Link Input */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6">
        {/* Content Section */}
        <button
          onClick={() => setIsContentExpanded(!isContentExpanded)}
          className="w-full flex items-center justify-between p-4 text-left border-b border-zinc-100"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <p className="font-medium text-zinc-900">投稿内容</p>
              <p className="text-sm text-zinc-500 line-clamp-1">
                {content ? `${content.slice(0, 50)}${content.length > 50 ? "..." : ""}` : "内容を入力してください"}
              </p>
            </div>
          </div>
          {isContentExpanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </button>

        {isContentExpanded && (
          <div className="px-4 py-4 border-b border-zinc-100">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="投稿したい内容・アイデアなどを入力..."
              className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Link Input Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-5 h-5 text-emerald-500" />
            <span className="font-medium text-zinc-900">入れ込むリンク</span>
            <span className="text-xs text-zinc-400">生成した投稿に含めるURL（任意）</span>
          </div>

          {/* URL List */}
          {referenceUrls.length > 0 && (
            <div className="space-y-2 mb-3">
              {referenceUrls.map((url, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg group"
                >
                  <LinkIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="flex-1 text-sm text-emerald-600 truncate font-mono">
                    {url}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded text-emerald-500 hover:bg-emerald-100 transition-colors"
                    title="URLを開く"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setReferenceUrls(prev => prev.filter((_, i) => i !== index))}
                    className="p-1.5 rounded text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add URL Input */}
          <div className="flex gap-2">
            <input
              type="url"
              value={newUrlInput}
              onChange={(e) => setNewUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newUrlInput.trim()) {
                  e.preventDefault();
                  if (newUrlInput.startsWith("http://") || newUrlInput.startsWith("https://")) {
                    setReferenceUrls(prev => [...prev, newUrlInput.trim()]);
                    setNewUrlInput("");
                  }
                }
              }}
              placeholder="https://example.com/article"
              className="flex-1 h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={() => {
                if (newUrlInput.trim() && (newUrlInput.startsWith("http://") || newUrlInput.startsWith("https://"))) {
                  setReferenceUrls(prev => [...prev, newUrlInput.trim()]);
                  setNewUrlInput("");
                }
              }}
              disabled={!newUrlInput.trim() || (!newUrlInput.startsWith("http://") && !newUrlInput.startsWith("https://"))}
              className="px-4 h-10 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>
        </div>
      </div>

      {/* Category Selection (if not yet generated) */}
      {!hasGenerated && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6 p-6">
          {/* Source Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-zinc-900">参考投稿ソース</h3>
            </div>
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl">
              <button
                onClick={() => setPostSource("aiAuto")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  postSource === "aiAuto"
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                <Wand2 className="w-4 h-4" />
                AIおまかせ
              </button>
              <button
                onClick={() => setPostSource("myPosts")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  postSource === "myPosts"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                過去投稿一覧
              </button>
              <button
                onClick={() => setPostSource("othersPosts")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  postSource === "othersPosts"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                他者バズ投稿
              </button>
            </div>
          </div>

          {/* Source Info */}
          <div className={`mb-4 p-3 rounded-lg ${
            postSource === "aiAuto"
              ? "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100"
              : postSource === "myPosts"
                ? "bg-blue-50 border border-blue-100"
                : "bg-violet-50 border border-violet-100"
          }`}>
            <p className={`text-sm ${
              postSource === "aiAuto"
                ? "text-violet-700"
                : postSource === "myPosts"
                  ? "text-blue-700"
                  : "text-violet-700"
            }`}>
              {postSource === "aiAuto"
                ? `🤖 投稿内容に応じて、過去投稿と他者バズ投稿から最適な6つを自動選択（計${allReferencePosts.length}件から）`
                : postSource === "myPosts"
                  ? `📝 あなたの過去投稿（S/A tier）から構造を参考にします（${myReferencePosts.length}件）`
                : `🌟 他者のバズ投稿（S/A tier）から構造を参考にします（${contextReferencePosts.length}件）`
              }
            </p>
          </div>

          {/* Category Selection - Hidden in AIおまかせ mode */}
          {postSource !== "aiAuto" && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <h4 className="font-medium text-zinc-700">カテゴリーを選択</h4>
              </div>

              {isLoadingPosts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  <span className="ml-2 text-zinc-500">読み込み中...</span>
                </div>
              ) : activeReferencePosts.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <p>{postSource === "myPosts" ? "過去投稿（S/A tier）がありません" : "他者バズ投稿がありません"}</p>
                  <Link
                    href={postSource === "myPosts" ? "/import" : "/context"}
                    className="text-emerald-600 hover:underline mt-2 inline-block"
                  >
                    {postSource === "myPosts" ? "過去投稿をインポートする" : "他者バズ投稿を追加する"}
                  </Link>
                </div>
              ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                    「{selectedCategory}」の{postSource === "myPosts" ? "あなたの" : ""}上位投稿で6パターン生成
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
                    {getFilteredReferencePosts().length > 3 && (
                      <p className="text-xs text-zinc-400">...他 {getFilteredReferencePosts().length - 3}件</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Generate Button (if not yet generated) */}
      {!hasGenerated && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerateAll}
            disabled={!content.trim() || (postSource !== "aiAuto" && !selectedCategory) || isLoadingPosts}
            className={`flex items-center gap-3 px-8 py-4 text-white text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg ${
              postSource === "aiAuto"
                ? "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-violet-500/25"
                : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25"
            }`}
          >
            {postSource === "aiAuto" ? (
              <>
                <Wand2 className="w-6 h-6" />
                AIおまかせで6パターン生成
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                {selectedCategory ? `「${selectedCategory}」で6パターン生成` : "カテゴリーを選択してください"}
              </>
            )}
          </button>
        </div>
      )}

      {/* User Style Info */}
      {!hasGenerated && userStyle && (
        <div className="text-center text-sm text-zinc-500 mb-8">
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            あなたの投稿スタイルを学習済み
          </span>
        </div>
      )}

      {/* 6 Cards Grid */}
      {hasGenerated && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => {
            return (
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

                {/* Card Body - X風プレビュー */}
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
                      {/* X Profile Header */}
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
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed line-clamp-[8]">
                        {card.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer - Stats */}
                {!card.isLoading && !card.error && card.text && (
                  <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{card.text.length}文字</span>
                      {card.referencePost && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {card.referencePost.likes}
                        </span>
                      )}
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
                    <Link
                      href={`/compose/editor?text=${encodeURIComponent(card.text)}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50 transition-colors border-r border-zinc-100"
                    >
                      <Pencil className="w-4 h-4" />
                      編集
                    </Link>
                    <button
                      onClick={() => handleSchedule(card.id, card.text)}
                      disabled={schedulingId === card.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors border-r border-zinc-100 disabled:opacity-50"
                    >
                      {schedulingId === card.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      予約
                    </button>
                    <button
                      onClick={() => handlePost(card.text)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      投稿
                    </button>
                  </div>
                )}

                {/* Regenerate single card */}
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
            );
          })}
        </div>
      )}

      {/* Empty State - no content */}
      {!hasGenerated && !content.trim() && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-lg text-zinc-600 mb-2">投稿内容を入力してください</p>
          <p className="text-sm text-zinc-400">
            1. 上の「投稿内容」に記事URL/アイデアを入力<br />
            2. カテゴリーを選択（他者バズ投稿から参考）<br />
            3. 6パターンの投稿案を生成
          </p>
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
                  <div className="text-sm text-zinc-500">日時を選択してください</div>
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
                  style={{ lineHeight: "1.8" }}
                />
              </div>

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
