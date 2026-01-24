"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Loader2,
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
  History,
  Search,
  Info,
  ShieldCheck,
  BookOpen,
  Target,
} from "lucide-react";
import { Timestamp } from "firebase/firestore";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useXProfile } from "@/lib/x-profile-context";
import {
  getContextPosts,
  getPosts,
  saveScheduledPost,
  getUserStyleAnalysis,
  saveAIGenerationHistory,
  getAIGenerationHistory,
  deleteAIGenerationHistory,
  cleanupExpiredAIHistories,
  AIGenerationHistory,
  getBuzzPrompt,
  BuzzPrompt,
} from "@/lib/firebase";

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
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { profile: xProfile, isConnected: xConnected } = useXProfile();

  const [content, setContent] = useState("");
  const [previousContent, setPreviousContent] = useState("");
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Content enrichment state
  const [isEnrichingContent, setIsEnrichingContent] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [autoEnrich, setAutoEnrich] = useState(false); // 自動補足ON/OFF（デフォルトOFF）

  // Deep research state (5000字程度の包括的な情報)
  const [deepResearch, setDeepResearch] = useState<string | null>(null);
  const [researchQueries, setResearchQueries] = useState<string[]>([]);
  const [showResearchToggle, setShowResearchToggle] = useState<Record<number, boolean>>({});

  // URL input state
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

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
  const [schedulingId, setSchedulingId] = useState<number | null>(null);

  // Fact checking state
  const [factCheckingId, setFactCheckingId] = useState<number | null>(null);
  const [factCheckResults, setFactCheckResults] = useState<Record<number, {
    wasModified: boolean;
    summary: {
      totalClaims: number;
      accurateClaims: number;
      inaccurateClaims: number;
      flowIssues: number;
    };
  }>>({});

  // Research toggle for cards (to show/hide 5000 char research)
  const [showCardResearch, setShowCardResearch] = useState<Record<number, boolean>>({});

  // Search query state (検索クエリ選択)
  interface SearchQuery {
    id: string;
    query: string;
    category: string;
    description: string;
    selected: boolean;
  }
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([]);
  const [isLoadingQueries, setIsLoadingQueries] = useState(false);
  const [queriesGenerated, setQueriesGenerated] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchComplete, setResearchComplete] = useState(false);
  const [showFullResearch, setShowFullResearch] = useState(false);

  // Generation progress state
  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    completed: number;
    total: number;
  }>({ isGenerating: false, completed: 0, total: 0 });

  // Individual card progress (0-100) for smooth animation
  const [cardProgressMap, setCardProgressMap] = useState<Record<number, number>>({});
  const progressIntervalsRef = useRef<Record<number, NodeJS.Timeout>>({});

  // AI generation history state
  const [generationHistory, setGenerationHistory] = useState<AIGenerationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleCardId, setScheduleCardId] = useState<number | null>(null);
  const [scheduleText, setScheduleText] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const scheduleTextareaRef = useRef<HTMLTextAreaElement>(null);

  // AI補正モーダル state
  interface CorrectionPattern {
    type: string;
    text: string;
    changes: string;
    lineCount: number;
    expectedLineCount: number;
    structureValid: boolean;
    warning?: string | null;
  }
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionCardId, setCorrectionCardId] = useState<number | null>(null);
  const [correctionPatterns, setCorrectionPatterns] = useState<CorrectionPattern[]>([]);
  const [isLoadingCorrection, setIsLoadingCorrection] = useState(false);
  const [correctionCardText, setCorrectionCardText] = useState("");

  // バズるプロンプト（AI補正で使用）
  const [buzzPrompt, setBuzzPrompt] = useState<BuzzPrompt | null>(null);

  // バズるプロンプトを読み込み
  useEffect(() => {
    const loadBuzzPrompt = async () => {
      if (!user) return;
      try {
        const savedPrompt = await getBuzzPrompt(user.uid);
        if (savedPrompt) {
          setBuzzPrompt(savedPrompt);
        }
      } catch (error) {
        console.error("Failed to load buzz prompt:", error);
      }
    };
    loadBuzzPrompt();
  }, [user]);

  // Load content and link from sessionStorage
  useEffect(() => {
    const savedContent = sessionStorage.getItem("compose_content");
    if (savedContent) {
      setContent(savedContent);
      setPreviousContent(savedContent);
    }

    // Load link from sessionStorage
    const savedLink = sessionStorage.getItem("compose_link");
    if (savedLink) {
      setReferenceUrls([savedLink]);
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

  // Generate search queries when autoEnrich is turned ON (requires category selection first)
  useEffect(() => {
    const generateSearchQueries = async () => {
      // AIおまかせモード以外はカテゴリー選択必須
      const categoryRequired = postSource !== "aiAuto";
      if (!autoEnrich || !content.trim() || queriesGenerated) return;
      if (categoryRequired && !selectedCategory) return;

      setIsLoadingQueries(true);
      setSearchQueries([]);
      setDeepResearch(null);
      setResearchComplete(false);

      try {
        const response = await fetch("/api/generate/search-queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            postCategory: selectedCategory || undefined, // カテゴリーをAPIに渡す
            postSource, // ソースモードも渡す
            today: new Date().toISOString().split("T")[0], // 2026-01-25形式
          }),
        });

        const data = await response.json();

        if (data.success && data.queries) {
          setSearchQueries(data.queries.map((q: any, i: number) => ({
            ...q,
            id: `query_${i}`,
            selected: false,
          })));
          setQueriesGenerated(true);
        }
      } catch (error) {
        console.error("Search query generation failed:", error);
      } finally {
        setIsLoadingQueries(false);
      }
    };

    generateSearchQueries();
  }, [autoEnrich, content, queriesGenerated, selectedCategory, postSource]);

  // Reset queries when autoEnrich is turned OFF or content changes significantly
  useEffect(() => {
    if (!autoEnrich) {
      setSearchQueries([]);
      setQueriesGenerated(false);
      setDeepResearch(null);
      setResearchComplete(false);
    }
  }, [autoEnrich]);

  useEffect(() => {
    if (previousContent && content && Math.abs(content.length - previousContent.length) > 50) {
      setQueriesGenerated(false);
      setResearchComplete(false);
    }
  }, [content, previousContent]);

  // Reset queries when category changes (to regenerate with new category context)
  const [previousCategory, setPreviousCategory] = useState("");
  useEffect(() => {
    if (autoEnrich && selectedCategory && previousCategory && selectedCategory !== previousCategory) {
      // カテゴリーが変更された場合、クエリを再生成
      setQueriesGenerated(false);
      setSearchQueries([]);
      setDeepResearch(null);
      setResearchComplete(false);
    }
    setPreviousCategory(selectedCategory);
  }, [selectedCategory, autoEnrich, previousCategory]);

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

  // Load AI generation history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;
      setIsLoadingHistory(true);
      try {
        // Cleanup expired histories first
        await cleanupExpiredAIHistories(user.uid);
        // Then load current histories
        const histories = await getAIGenerationHistory(user.uid);
        setGenerationHistory(histories);

        // Check if we need to auto-restore a specific history from URL
        const historyId = searchParams.get("historyId");
        if (historyId) {
          const targetHistory = histories.find(h => h.id === historyId);
          if (targetHistory) {
            // Restore this history
            setContent(targetHistory.content);
            setPostSource(targetHistory.referenceSource);
            if (targetHistory.category) {
              setSelectedCategory(targetHistory.category);
            }
            if (targetHistory.urls) {
              setReferenceUrls(targetHistory.urls);
            }
            // Set cards from history
            const restoredCards: GeneratedCard[] = targetHistory.generatedTexts.map((text, i) => ({
              id: i + 1,
              text,
              referencePost: {
                id: `history_${i}`,
                text: "",
                likes: 0,
                tier: "A" as const,
                category: targetHistory.category || "",
                source: targetHistory.referenceSource === "aiAuto" ? "myPosts" : targetHistory.referenceSource,
              },
              isLoading: false,
            }));
            setCards(restoredCards);
          }
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [user, searchParams]);

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

  // Start smooth progress animation for a card (0 to ~95%)
  const startCardProgress = (cardId: number) => {
    // Reset progress to 0
    setCardProgressMap(prev => ({ ...prev, [cardId]: 0 }));

    // Animate progress smoothly from 0 to 95% over ~10 seconds
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 3 + 1; // Random increment between 1-4%
      if (progress >= 95) {
        progress = 95;
        clearInterval(interval);
      }
      setCardProgressMap(prev => ({ ...prev, [cardId]: Math.min(Math.round(progress), 95) }));
    }, 200); // Update every 200ms

    progressIntervalsRef.current[cardId] = interval;
  };

  // Complete card progress (jump to 100%)
  const completeCardProgress = (cardId: number) => {
    // Clear any running interval
    if (progressIntervalsRef.current[cardId]) {
      clearInterval(progressIntervalsRef.current[cardId]);
      delete progressIntervalsRef.current[cardId];
    }
    // Set to 100%
    setCardProgressMap(prev => ({ ...prev, [cardId]: 100 }));
  };

  // Clear all progress intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(progressIntervalsRef.current).forEach(interval => clearInterval(interval));
    };
  }, []);

  // Toggle search query selection
  const toggleSearchQuery = (id: string) => {
    setSearchQueries(prev => prev.map(q =>
      q.id === id ? { ...q, selected: !q.selected } : q
    ));
  };

  // Start Deep Research with selected queries
  const handleStartResearch = async () => {
    const selectedQueries = searchQueries.filter(q => q.selected);
    if (selectedQueries.length === 0) return;

    setIsResearching(true);
    setEnrichmentProgress(0);
    setDeepResearch(null);

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setEnrichmentProgress(prev => Math.min(prev + 2, 90));
      }, 300);

      const response = await fetch("/api/generate/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          queries: selectedQueries.map(q => q.query),
          today: new Date().toISOString().split("T")[0], // 2026-01-25形式
        }),
      });

      clearInterval(progressInterval);
      setEnrichmentProgress(100);

      const data = await response.json();

      if (data.success && data.research) {
        setDeepResearch(data.research);
        setResearchQueries(data.queries || selectedQueries.map(q => q.query));
        setResearchComplete(true);
        console.log("[Research] Complete:", data.research.length, "chars");
      }
    } catch (error) {
      console.error("Deep research failed:", error);
    } finally {
      setIsResearching(false);
    }
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
          // Extract wait time from error message or use default
          const waitMatch = data.error?.match(/(\d+\.?\d*)\s*s/);
          const waitTime = waitMatch ? parseFloat(waitMatch[1]) * 1000 : 20000;
          console.log(`Rate limited, waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1s buffer
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
        // Wait before retry on other errors
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    return { text: "", error: "リトライ回数を超えました" };
  };


  // Generate all 6 cards using top 6 posts from selected category or AI auto
  const handleGenerateAll = async () => {
    if (!content.trim()) return;

    // AIおまかせモードではカテゴリー不要
    if (postSource !== "aiAuto" && !selectedCategory) return;

    // 情報自動補足ONの場合、Deep Researchが完了していることを確認
    if (autoEnrich && !researchComplete) {
      alert("情報リサーチを先に完了させてください");
      return;
    }

    // 既に完了しているDeep Researchデータを使用
    const researchData = autoEnrich ? deepResearch : null;

    // 選択された検索クエリを取得（情報自動補足ONの場合）
    const selectedQueries = autoEnrich ? searchQueries.filter(q => q.selected) : [];
    const queryCount = selectedQueries.length;

    // 検索クエリ数に応じて6パターンの分配を決定
    // 1個 → 6パターン全て
    // 2個 → 3パターンずつ
    // 3個 → 2パターンずつ
    // 4個以上 → できるだけ均等に
    let queryDistribution: string[] = [];
    if (queryCount > 0) {
      if (queryCount === 1) {
        queryDistribution = Array(6).fill(selectedQueries[0].query);
      } else if (queryCount === 2) {
        queryDistribution = [
          selectedQueries[0].query, selectedQueries[0].query, selectedQueries[0].query,
          selectedQueries[1].query, selectedQueries[1].query, selectedQueries[1].query,
        ];
      } else if (queryCount === 3) {
        queryDistribution = [
          selectedQueries[0].query, selectedQueries[0].query,
          selectedQueries[1].query, selectedQueries[1].query,
          selectedQueries[2].query, selectedQueries[2].query,
        ];
      } else {
        // 4個以上は順番に割り当て
        for (let i = 0; i < 6; i++) {
          queryDistribution.push(selectedQueries[i % queryCount].query);
        }
      }
    }

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
    setGenerationProgress({ isGenerating: true, completed: 0, total: 6 });
    // Reset all card progress
    setCardProgressMap({});

    // Generate cards sequentially to avoid rate limits
    // Process in batches of 2 with delay between batches
    const batchSize = 2;
    const delayBetweenBatches = 3000; // 3 seconds between batches

    // Collect all generated texts for history
    const allGeneratedTexts: string[] = [];

    for (let batchStart = 0; batchStart < initialCards.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, initialCards.length);
      const batchCards = initialCards.slice(batchStart, batchEnd);

      // Start progress animation for cards in this batch
      batchCards.forEach(card => startCardProgress(card.id));

      // Process batch in parallel
      const batchPromises = batchCards.map(async (card) => {
        // 検索クエリの軸を取得（情報自動補足ONの場合）
        const cardIndex = initialCards.findIndex(c => c.id === card.id);
        const queryAxis = queryDistribution.length > 0 ? queryDistribution[cardIndex] : undefined;

        const body = {
          mode: "reference",
          content, // 元のコンテンツ
          referenceText: card.referencePost.text,
          userStyle: userStyle || undefined,
          researchData: researchData || undefined, // 5000字のリサーチ情報
          queryAxis: queryAxis || undefined, // このカードの検索クエリ軸
        };

        const result = await generateWithRetry(body);

        // Complete progress animation for this card
        completeCardProgress(card.id);

        // Append URL to generated text if provided
        let generatedText = result.text;
        if (generatedText && referenceUrls.length > 0) {
          generatedText = `${generatedText}\n\n${referenceUrls[0]}`;
        }

        return { id: card.id, text: generatedText, error: result.error };
      });

      const batchResults = await Promise.all(batchPromises);

      // Collect generated texts for history
      batchResults.forEach(r => {
        if (r.text) {
          allGeneratedTexts.push(r.text);
        }
      });

      // Update cards and progress for this batch
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

      // Wait between batches (except for the last batch)
      if (batchEnd < initialCards.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    setGenerationProgress(prev => ({ ...prev, isGenerating: false }));

    // Save generation history
    if (user && allGeneratedTexts.length > 0) {
      try {
        await saveAIGenerationHistory(user.uid, {
          content,
          generatedTexts: allGeneratedTexts,
          referenceSource: postSource,
          category: postSource !== "aiAuto" ? selectedCategory : undefined,
          urls: referenceUrls.length > 0 ? referenceUrls : undefined,
        });
        // Reload history
        const histories = await getAIGenerationHistory(user.uid);
        setGenerationHistory(histories);
      } catch (err) {
        console.error("Failed to save history:", err);
      }
    }
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
          researchData: deepResearch || undefined, // 5000字のリサーチ情報
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

    // Set loading and start progress animation
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, isLoading: true, error: undefined } : c
    ));
    startCardProgress(cardId);

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

      // Complete progress animation
      completeCardProgress(cardId);

      // Append URL to generated text if provided
      let generatedText = data.text;
      if (referenceUrls.length > 0) {
        generatedText = `${generatedText}\n\n${referenceUrls[0]}`;
      }

      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, text: generatedText, isLoading: false } : c
      ));
    } catch (err) {
      // Complete progress animation even on error
      completeCardProgress(cardId);

      const message = err instanceof Error ? err.message : "エラー";
      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, error: message, isLoading: false } : c
      ));
    }
  };

  // Fact check: thoroughly verify facts and fix if needed
  const handleFactCheck = async (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.text) return;

    setFactCheckingId(cardId);
    try {
      const response = await fetch("/api/generate/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: card.text,
          researchData: deepResearch || undefined, // 5000字のリサーチ情報
        }),
      });

      if (!response.ok) throw new Error("ファクトチェックに失敗しました");

      const result = await response.json();

      // Update the card text if it was modified
      if (result.wasModified && result.correctedContent) {
        setCards(prev => prev.map(c =>
          c.id === cardId ? { ...c, text: result.correctedContent } : c
        ));
      }

      // Store the fact check result
      setFactCheckResults(prev => ({
        ...prev,
        [cardId]: {
          wasModified: result.wasModified,
          summary: result.summary,
        },
      }));
    } catch (error) {
      console.error("Fact check error:", error);
      alert("ファクトチェック中にエラーが発生しました");
    } finally {
      setFactCheckingId(null);
    }
  };

  // AI補正: 構造維持で一貫性・有益性を高める3パターン生成（バズるプロンプト使用）
  const handleAICorrect = async (cardId: number) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || !card.text) return;

    setIsLoadingCorrection(true);
    setCorrectionCardId(cardId);
    setCorrectionCardText(card.text);
    setCorrectionPatterns([]);
    setShowCorrectionModal(true);

    try {
      const response = await fetch("/api/generate/ai-correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: card.text,
          originalContent: content,
          referenceText: card.referencePost.text,
          researchData: deepResearch || undefined,
          // バズるプロンプトがあれば渡す
          buzzPrompt: buzzPrompt ? {
            prompt: buzzPrompt.prompt,
            patterns: buzzPrompt.patterns,
            characteristics: buzzPrompt.characteristics,
            avoidPatterns: buzzPrompt.avoidPatterns,
            samplePhrases: buzzPrompt.samplePhrases,
          } : undefined,
        }),
      });

      if (!response.ok) throw new Error("AI補正に失敗しました");

      const result = await response.json();
      if (result.success && result.patterns) {
        setCorrectionPatterns(result.patterns);
      }
    } catch (error) {
      console.error("AI correction error:", error);
      alert("AI補正中にエラーが発生しました");
      setShowCorrectionModal(false);
    } finally {
      setIsLoadingCorrection(false);
    }
  };

  // AI補正パターンを選択して適用
  const handleApplyCorrection = (patternIndex: number) => {
    if (correctionCardId === null) return;
    const pattern = correctionPatterns[patternIndex];
    if (!pattern) return;

    setCards(prev => prev.map(c =>
      c.id === correctionCardId ? { ...c, text: pattern.text } : c
    ));
    setShowCorrectionModal(false);
    setCorrectionCardId(null);
    setCorrectionPatterns([]);
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

        <div className="flex items-center gap-2">
          {generationHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                showHistory
                  ? "bg-violet-100 text-violet-700"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              <History className="w-4 h-4" />
              履歴
              <span className="bg-violet-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {generationHistory.length}
              </span>
            </button>
          )}

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
      </div>

      {/* Generation History Panel */}
      {showHistory && generationHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-violet-50">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-violet-600" />
              <h3 className="font-semibold text-violet-900">AI生成履歴</h3>
              <span className="text-xs text-violet-500">（1週間保存）</span>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1 rounded hover:bg-violet-100"
            >
              <XIcon className="w-4 h-4 text-violet-500" />
            </button>
          </div>
          <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
            {generationHistory.map((history) => (
              <div
                key={history.id}
                className="p-4 hover:bg-zinc-50 cursor-pointer transition-colors"
                onClick={() => {
                  // Restore this history
                  setContent(history.content);
                  setPostSource(history.referenceSource);
                  if (history.category) {
                    setSelectedCategory(history.category);
                  }
                  if (history.urls) {
                    setReferenceUrls(history.urls);
                  }
                  // Set cards from history
                  const restoredCards: GeneratedCard[] = history.generatedTexts.map((text, i) => ({
                    id: i + 1,
                    text,
                    referencePost: {
                      id: `history_${i}`,
                      text: "",
                      likes: 0,
                      tier: "A" as const,
                      category: history.category || "",
                      source: history.referenceSource === "aiAuto" ? "myPosts" : history.referenceSource,
                    },
                    isLoading: false,
                  }));
                  setCards(restoredCards);
                  setShowHistory(false);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 line-clamp-2 mb-1">
                      {history.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className={`px-1.5 py-0.5 rounded ${
                        history.referenceSource === "aiAuto"
                          ? "bg-violet-100 text-violet-600"
                          : history.referenceSource === "myPosts"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-emerald-100 text-emerald-600"
                      }`}>
                        {history.referenceSource === "aiAuto"
                          ? "AIおまかせ"
                          : history.referenceSource === "myPosts"
                            ? "過去投稿"
                            : "他者バズ"}
                      </span>
                      {history.category && (
                        <span className="text-zinc-400">{history.category}</span>
                      )}
                      <span className="text-zinc-400">
                        {history.generatedTexts.length}パターン
                      </span>
                      <span className="text-zinc-400">
                        {new Date(history.createdAt!).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (user && history.id) {
                        deleteAIGenerationHistory(user.uid, history.id).then(() => {
                          setGenerationHistory(prev => prev.filter(h => h.id !== history.id));
                        });
                      }
                    }}
                    className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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

        {/* Link Preview Section (read-only) */}
        {referenceUrls.length > 0 && (
          <div className="p-4 border-t border-zinc-100">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-zinc-700">入れ込むリンク</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg">
              <LinkIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="flex-1 text-sm text-emerald-600 truncate font-mono">
                {referenceUrls[0]}
              </span>
              <a
                href={referenceUrls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded text-emerald-500 hover:bg-emerald-100 transition-colors"
                title="URLを開く"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              生成された投稿の末尾に自動で追加されます
            </p>
          </div>
        )}
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

      {/* Auto-enrich toggle and search query selection */}
      {!hasGenerated && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6 overflow-hidden">
          {/* Toggle Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                autoEnrich ? "bg-blue-100" : "bg-blue-50"
              }`}>
                <Search className={`w-5 h-5 ${autoEnrich ? "text-blue-600" : "text-blue-500"}`} />
              </div>
              <div>
                <p className="font-medium text-zinc-900">情報自動補足</p>
                <p className="text-sm text-zinc-500">
                  {autoEnrich
                    ? "最新情報をリサーチして投稿に反映します"
                    : postSource !== "aiAuto" && !selectedCategory
                      ? "先にカテゴリーを選択してください"
                      : "ONにするとAIが最新情報をリサーチします"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // AIおまかせモード以外はカテゴリー選択必須
                if (!autoEnrich && postSource !== "aiAuto" && !selectedCategory) {
                  alert("先にカテゴリーを選択してください");
                  return;
                }
                setAutoEnrich(!autoEnrich);
              }}
              disabled={!autoEnrich && postSource !== "aiAuto" && !selectedCategory}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                autoEnrich ? "bg-blue-500" : !autoEnrich && postSource !== "aiAuto" && !selectedCategory ? "bg-zinc-200 cursor-not-allowed" : "bg-zinc-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  autoEnrich ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Search Query Selection (shown when autoEnrich is ON) */}
          {autoEnrich && (
            <div className="p-4">
              {/* Loading queries */}
              {isLoadingQueries && (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">検索クエリを生成中...</span>
                  </div>
                </div>
              )}

              {/* Query Options */}
              {searchQueries.length > 0 && !isResearching && !researchComplete && (
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-3">
                    検索クエリを選択（複数選択可、選択した軸で投稿を生成）
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {searchQueries.map((query) => (
                      <button
                        key={query.id}
                        onClick={() => toggleSearchQuery(query.id)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          query.selected
                            ? "border-blue-500 bg-blue-50"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          query.selected
                            ? "border-blue-500 bg-blue-500"
                            : "border-zinc-300"
                        }`}>
                          {query.selected && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-zinc-900 text-sm">{query.query}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded">
                              {query.category}
                            </span>
                            {query.description && (
                              <span className="text-xs text-zinc-500">{query.description}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Start Research Button */}
                  <div className="mt-4 pt-4 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-500">
                        {searchQueries.filter(q => q.selected).length > 0
                          ? `${searchQueries.filter(q => q.selected).length}件選択中`
                          : "リサーチする軸を選択してください"}
                      </p>
                      <button
                        onClick={handleStartResearch}
                        disabled={searchQueries.filter(q => q.selected).length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Search className="w-4 h-4" />
                        リサーチ開始
                      </button>
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">
                      1個選択 → 6パターン全てその軸 / 2個 → 3パターンずつ / 3個 → 2パターンずつ
                    </p>
                  </div>
                </div>
              )}

              {/* Researching Status */}
              {isResearching && (
                <div className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      <span className="font-medium text-blue-900">Deep Research 実行中...</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{enrichmentProgress}%</span>
                  </div>
                  <div className="relative h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${enrichmentProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-500 mt-2">
                    直近2週間以内の最新情報を5000字程度収集中...
                  </p>
                </div>
              )}

              {/* Research Complete - Show Results */}
              {researchComplete && deepResearch && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <span className="font-medium text-emerald-900">
                        リサーチ完了（{deepResearch.length.toLocaleString()}文字）
                      </span>
                    </div>
                    <button
                      onClick={() => setShowFullResearch(!showFullResearch)}
                      className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {showFullResearch ? "閉じる" : "リサーチ内容を確認"}
                      <ChevronDown className={`w-4 h-4 transition-transform ${showFullResearch ? "rotate-180" : ""}`} />
                    </button>
                  </div>

                  {/* Selected Queries */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {searchQueries.filter(q => q.selected).map((query) => (
                      <span
                        key={query.id}
                        className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {query.query}
                      </span>
                    ))}
                  </div>

                  {/* Full Research Content */}
                  {showFullResearch && (
                    <div className="mt-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200 max-h-96 overflow-y-auto">
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {deepResearch}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-emerald-600 mt-2">
                    このリサーチ情報を元に6パターンの投稿を生成します
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generate Button (if not yet generated) */}
      {!hasGenerated && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerateAll}
            disabled={
              !content.trim() ||
              (postSource !== "aiAuto" && !selectedCategory) ||
              isLoadingPosts ||
              isResearching ||
              (autoEnrich && !researchComplete) // 情報自動補足ONの場合はリサーチ完了必須
            }
            className={`flex items-center gap-3 px-8 py-4 text-white text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg ${
              postSource === "aiAuto"
                ? "bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 shadow-violet-500/25"
                : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25"
            }`}
          >
            {isResearching ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                情報をリサーチ中...
              </>
            ) : postSource === "aiAuto" ? (
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
            // Use smooth progress from cardProgressMap
            const isCompleted = !card.isLoading && card.text && !card.error;
            const cardProgress = isCompleted ? 100 : (cardProgressMap[card.id] || 0);

            return (
              <div
                key={card.id}
                className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col"
              >
                {/* Card Header with Circular Progress */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    {/* Circular Progress Number */}
                    <div className="relative w-9 h-9">
                      {/* Background circle */}
                      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="#e4e4e7"
                          strokeWidth="3"
                        />
                        {/* Progress circle - always show, full when complete */}
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeDasharray={`${cardProgress * 0.94} 94`}
                          strokeLinecap="round"
                          className="transition-all duration-300 ease-out"
                        />
                      </svg>
                      {/* Number in center */}
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        cardProgress === 100 ? "text-white" : "text-zinc-600"
                      }`} style={{
                        backgroundColor: cardProgress === 100 ? "#10b981" : "transparent",
                        borderRadius: "50%",
                        margin: "3px",
                      }}>
                        {card.id}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                      card.referencePost.source === "myPosts"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-violet-100 text-violet-600"
                    }`}>
                      {card.referencePost.source === "myPosts" ? "自分" : "他者"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {card.isLoading && (
                      <span className="text-xs text-zinc-400">{cardProgress}%</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      card.referencePost.tier === "S"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-violet-100 text-violet-700"
                    }`}>
                      {card.referencePost.tier}
                    </span>
                  </div>
                </div>

                {/* Card Body - X風プレビュー */}
                <div className="flex-1 p-4">
                  {card.isLoading ? (
                    <div className="h-40 flex flex-col items-center justify-center">
                      {/* Circular Progress Indicator */}
                      <div className="relative w-20 h-20 mb-3">
                        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                          <circle
                            cx="40"
                            cy="40"
                            r="35"
                            fill="none"
                            stroke="#e4e4e7"
                            strokeWidth="6"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="35"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="6"
                            strokeDasharray={`${cardProgress * 2.2} 220`}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold text-emerald-600 transition-all duration-300">{cardProgress}%</span>
                        </div>
                      </div>
                      <span className="text-sm text-zinc-500">
                        {cardProgress === 0 ? "待機中..." : cardProgress < 100 ? "生成中..." : "完了!"}
                      </span>
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
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
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
                      onClick={() => handleFactCheck(card.id)}
                      disabled={factCheckingId === card.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors border-r border-zinc-100 disabled:opacity-50 ${
                        factCheckResults[card.id]
                          ? factCheckResults[card.id].wasModified
                            ? "text-blue-600 bg-blue-50"
                            : "text-emerald-600 bg-emerald-50"
                          : "text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      {factCheckingId === card.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          検証中...
                        </>
                      ) : factCheckResults[card.id] ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          {factCheckResults[card.id].wasModified ? "修正済" : "検証OK"}
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          ファクトチェック
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleAICorrect(card.id)}
                      disabled={isLoadingCorrection && correctionCardId === card.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors border-r border-zinc-100 disabled:opacity-50"
                    >
                      {isLoadingCorrection && correctionCardId === card.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      AI補正
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
                    >
                      {schedulingId === card.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      予約
                    </button>
                  </div>
                )}

                {/* Research Info Toggle */}
                {!card.isLoading && card.text && deepResearch && (
                  <div className="border-t border-zinc-100">
                    <button
                      onClick={() => setShowCardResearch(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                      className="w-full flex items-center justify-between px-4 py-2 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        リサーチ情報を表示
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCardResearch[card.id] ? "rotate-180" : ""}`} />
                    </button>
                    {showCardResearch[card.id] && (
                      <div className="px-4 pb-3 max-h-60 overflow-y-auto">
                        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                          <p className="text-xs text-blue-600 font-medium mb-2">参考にしたリサーチ情報（{deepResearch.length.toLocaleString()}文字）</p>
                          <p className="text-xs text-zinc-600 whitespace-pre-wrap leading-relaxed line-clamp-[12]">
                            {deepResearch.slice(0, 2000)}
                            {deepResearch.length > 2000 && "..."}
                          </p>
                        </div>
                      </div>
                    )}
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

      {/* AI補正 Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!isLoadingCorrection) {
                setShowCorrectionModal(false);
                setCorrectionCardId(null);
                setCorrectionPatterns([]);
              }
            }}
          />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <div className="font-semibold text-zinc-900">AI補正</div>
                  <div className="text-sm text-zinc-500">構造を維持しつつ一貫性と有益さを高める</div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isLoadingCorrection) {
                    setShowCorrectionModal(false);
                    setCorrectionCardId(null);
                    setCorrectionPatterns([]);
                  }
                }}
                className="p-2 rounded-lg hover:bg-zinc-100"
                disabled={isLoadingCorrection}
              >
                <XIcon className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingCorrection ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="text-lg font-medium text-zinc-900 mb-2">AI補正パターンを生成中...</p>
                  <p className="text-sm text-zinc-500">構造を分析して3つのパターンを作成しています</p>
                </div>
              ) : correctionPatterns.length > 0 ? (
                <div className="space-y-4">
                  {/* Original Text */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-zinc-500 mb-2">元の投稿</h4>
                    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                      <p className="text-sm text-zinc-600 whitespace-pre-wrap">{correctionCardText}</p>
                    </div>
                  </div>

                  {/* Correction Patterns */}
                  <h4 className="text-sm font-medium text-zinc-900 mb-3">補正パターンを選択</h4>
                  <div className="grid gap-4">
                    {correctionPatterns.map((pattern, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white rounded-xl border-2 border-zinc-200 hover:border-indigo-300 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              index === 0
                                ? "bg-blue-100 text-blue-700"
                                : index === 1
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}>
                              {pattern.type}
                            </span>
                            {!pattern.structureValid && pattern.warning && (
                              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded">
                                ⚠ {pattern.warning}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleApplyCorrection(index)}
                            className="px-4 py-1.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                          >
                            この補正を適用
                          </button>
                        </div>
                        <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed mb-2">
                          {pattern.text}
                        </p>
                        {pattern.changes && (
                          <p className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-100">
                            📝 {pattern.changes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  補正パターンを読み込んでいます...
                </div>
              )}
            </div>

            {/* Footer */}
            {!isLoadingCorrection && correctionPatterns.length > 0 && (
              <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                <p className="text-xs text-zinc-500 text-center">
                  💡 各パターンは構造（行数、改行、箇条書き、絵文字）を維持しつつ、中身を補正しています
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
