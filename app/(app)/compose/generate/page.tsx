"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getContextPosts, getPosts, saveScheduledPost } from "@/lib/firebase";

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

interface GeneratedCard {
  id: number;
  text: string;
  referencePost: ReferencePost;
  isLoading: boolean;
  error?: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [isContentExpanded, setIsContentExpanded] = useState(false);

  // Reference posts from contextPosts ONLY (他者バズ投稿)
  const [contextReferencePosts, setContextReferencePosts] = useState<ReferencePost[]>([]);
  // User's own style (learned from their posts)
  const [userStyle, setUserStyle] = useState<string>("");
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Category selection
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableCategories, setAvailableCategories] = useState<{name: string; count: number}[]>([]);

  // 6 cards state
  const [cards, setCards] = useState<GeneratedCard[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [schedulingId, setSchedulingId] = useState<number | null>(null);

  // Load content from sessionStorage
  useEffect(() => {
    const savedContent = sessionStorage.getItem("compose_content");
    if (savedContent) {
      setContent(savedContent);
    }
  }, []);

  // Load reference posts from contextPosts ONLY (他者バズ投稿)
  // AND learn user style from their own posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      setIsLoadingPosts(true);
      try {
        // Load SEPARATELY - contextPosts for reference, userPosts for style learning
        const [contextPosts, userPosts] = await Promise.all([
          getContextPosts(user.uid),
          getPosts(user.uid),
        ]);

        // === REFERENCE POSTS: ONLY from contextPosts (他者バズ投稿) ===
        const refPosts = contextPosts
          .filter((p: any) => p.tier === "S" || p.tier === "A")
          .map((p: any) => ({
            id: p.id,
            text: p.text,
            likes: p.likes || 0,
            tier: p.tier as "S" | "A" | "B" | "C",
            category: p.category || "日常・つぶやき系",
          }))
          .sort((a, b) => b.likes - a.likes);

        setContextReferencePosts(refPosts);

        // Count posts by category for selection UI
        const categoryCounts: Record<string, number> = {};
        refPosts.forEach(p => {
          categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
        });

        const cats = Object.entries(categoryCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setAvailableCategories(cats);

        // === USER STYLE: Learn from their OWN posts ===
        if (userPosts.length > 0) {
          // Analyze user's top posts for style patterns
          const topUserPosts = userPosts
            .filter((p: any) => p.tier === "S" || p.tier === "A")
            .slice(0, 10)
            .map((p: any) => p.text);

          if (topUserPosts.length > 0) {
            // Extract style characteristics
            const hasEmoji = topUserPosts.some((t: string) => /[\u{1F300}-\u{1F9FF}]/u.test(t));
            const avgLength = Math.round(topUserPosts.reduce((acc: number, t: string) => acc + t.length, 0) / topUserPosts.length);
            const usesExclamation = topUserPosts.filter((t: string) => t.includes("！")).length > topUserPosts.length / 2;

            // Build style description for AI
            let styleDesc = "";
            if (hasEmoji) styleDesc += "絵文字を適度に使用。";
            else styleDesc += "絵文字は使用しない。";
            if (usesExclamation) styleDesc += "「！」を使う元気な口調。";
            else styleDesc += "落ち着いた口調。";
            styleDesc += `平均${avgLength}文字程度。`;

            // Sample actual phrases from user's posts
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

  // Get filtered reference posts for selected category
  const getFilteredReferencePosts = () => {
    if (!selectedCategory) return [];
    return contextReferencePosts
      .filter(p => p.category === selectedCategory)
      .slice(0, 6); // Top 6 from this category
  };

  // Generate all 6 cards using top 6 posts from selected category
  const handleGenerateAll = async () => {
    if (!content.trim() || !selectedCategory) return;

    // Get top 6 posts from selected category
    const categoryPosts = getFilteredReferencePosts();

    if (categoryPosts.length === 0) {
      alert("選択したカテゴリーに参考投稿がありません。他のカテゴリーを選んでください。");
      return;
    }

    // Initialize 6 cards with loading state
    const initialCards: GeneratedCard[] = [];

    for (let i = 0; i < 6; i++) {
      // Use posts from the category, cycling if less than 6
      const refPost = categoryPosts[i % categoryPosts.length];

      initialCards.push({
        id: i + 1,
        text: "",
        referencePost: refPost,
        isLoading: true,
      });
    }

    setCards(initialCards);

    // Generate all 6 in parallel - each using a different reference post's structure
    const promises = initialCards.map(async (card, index) => {
      try {
        const body: any = {
          mode: "reference",
          content,
          referenceText: card.referencePost.text,
          // Pass user's learned style
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

        return { index, text: data.text, error: undefined };
      } catch (err) {
        const message = err instanceof Error ? err.message : "エラー";
        return { index, text: "", error: message };
      }
    });

    // Update cards as results come in
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

      setCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, text: data.text, isLoading: false } : c
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

  const handleSchedule = async (cardId: number, text: string) => {
    if (!user) return;

    setSchedulingId(cardId);
    try {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      await saveScheduledPost(user.uid, {
        text,
        scheduledAt,
        status: "scheduled",
      });

      alert("1時間後に予約投稿しました");
      router.push("/schedule");
    } catch (err) {
      console.error("Schedule failed:", err);
    } finally {
      setSchedulingId(null);
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

      {/* Compact Content Input */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6">
        <button
          onClick={() => setIsContentExpanded(!isContentExpanded)}
          className="w-full flex items-center justify-between p-4 text-left"
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
          <div className="px-4 pb-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="投稿したい内容・記事のURL・アイデアなどを入力..."
              className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Category Selection (if not yet generated) */}
      {!hasGenerated && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm mb-6 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-zinc-900">カテゴリーを選択</h3>
            <span className="text-sm text-zinc-500">（他者バズ投稿から）</span>
          </div>

          {isLoadingPosts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="ml-2 text-zinc-500">読み込み中...</span>
            </div>
          ) : availableCategories.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p>他者バズ投稿がありません</p>
              <Link href="/context" className="text-emerald-600 hover:underline mt-2 inline-block">
                他者バズ投稿を追加する
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
                「{selectedCategory}」の上位投稿で6パターン生成
              </p>
              <div className="space-y-2">
                {getFilteredReferencePosts().slice(0, 3).map((post, idx) => (
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
        </div>
      )}

      {/* Generate Button (if not yet generated) */}
      {!hasGenerated && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerateAll}
            disabled={!content.trim() || !selectedCategory || isLoadingPosts}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
          >
            <Sparkles className="w-6 h-6" />
            {selectedCategory ? `「${selectedCategory}」で6パターン生成` : "カテゴリーを選択してください"}
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
                    <span className="px-2 py-1 text-xs font-medium bg-zinc-100 text-zinc-600 rounded-lg">
                      {selectedCategory}
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
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed line-clamp-[8]">
                      {card.text}
                    </p>
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
                      onClick={() => handleCopy(card.id, card.text)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors border-r border-zinc-100"
                    >
                      {copiedId === card.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-600">コピー済み</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          コピー
                        </>
                      )}
                    </button>
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
    </div>
  );
}
