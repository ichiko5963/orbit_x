"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  Newspaper,
  List,
  MessageSquare,
  Wrench,
  Loader2,
  Copy,
  ExternalLink,
  Calendar,
  RotateCcw,
  Heart,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getContextPosts, getPosts, saveScheduledPost } from "@/lib/firebase";

// 5 active templates (video removed for now)
const TEMPLATES = [
  { id: "insight", name: "気づき共有", icon: Lightbulb, color: "text-amber-600", bgColor: "bg-amber-50" },
  { id: "news", name: "速報", icon: Newspaper, color: "text-red-600", bgColor: "bg-red-50" },
  { id: "list", name: "リスト", icon: List, color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "thread", name: "スレッド", icon: MessageSquare, color: "text-purple-600", bgColor: "bg-purple-50" },
  { id: "problem-solving", name: "問題解決", icon: Wrench, color: "text-emerald-600", bgColor: "bg-emerald-50" },
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
  templateId: string;
  templateName: string;
  referencePost?: ReferencePost;
  isLoading: boolean;
  error?: string;
}

export default function GeneratePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [referencePosts, setReferencePosts] = useState<ReferencePost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

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

  // Load reference posts (S/A tier)
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      setIsLoadingPosts(true);
      try {
        const [contextPosts, userPosts] = await Promise.all([
          getContextPosts(user.uid),
          getPosts(user.uid),
        ]);

        const allPosts = [...contextPosts, ...userPosts]
          .filter((p: any) => p.tier === "S" || p.tier === "A")
          .map((p: any) => ({
            id: p.id,
            text: p.text,
            likes: p.likes || 0,
            tier: p.tier,
            category: p.category || "その他",
          }))
          .sort((a, b) => b.likes - a.likes);

        setReferencePosts(allPosts);
      } catch (err) {
        console.error("Failed to load posts:", err);
      } finally {
        setIsLoadingPosts(false);
      }
    };
    loadPosts();
  }, [user]);

  // Generate all 6 cards
  const handleGenerateAll = async () => {
    if (!content.trim()) return;

    // Initialize 6 cards with loading state
    const initialCards: GeneratedCard[] = [];
    const templatesForCards = [...TEMPLATES];

    // Use top 6 reference posts (or repeat templates if not enough)
    for (let i = 0; i < 6; i++) {
      const template = templatesForCards[i % templatesForCards.length];
      const refPost = referencePosts[i];

      initialCards.push({
        id: i + 1,
        text: "",
        templateId: template.id,
        templateName: template.name,
        referencePost: refPost,
        isLoading: true,
      });
    }

    setCards(initialCards);

    // Generate all 6 in parallel
    const promises = initialCards.map(async (card, index) => {
      try {
        const body: any = {
          templateId: card.templateId,
          content,
          tone: "casual",
        };

        // Use reference post if available
        if (card.referencePost) {
          body.mode = "reference";
          body.referenceText = card.referencePost.text;
        } else {
          body.mode = "template";
        }

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
        templateId: card.templateId,
        content,
        tone: "casual",
      };

      if (card.referencePost) {
        body.mode = "reference";
        body.referenceText = card.referencePost.text;
      } else {
        body.mode = "template";
      }

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

      {/* Generate Button (if not yet generated) */}
      {!hasGenerated && (
        <div className="flex justify-center mb-8">
          <button
            onClick={handleGenerateAll}
            disabled={!content.trim() || isLoadingPosts}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
          >
            <Sparkles className="w-6 h-6" />
            6パターン生成する
          </button>
        </div>
      )}

      {/* Reference Posts Info */}
      {!hasGenerated && (
        <div className="text-center text-sm text-zinc-500 mb-8">
          {isLoadingPosts ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              参考投稿を読み込み中...
            </span>
          ) : (
            <span>
              {referencePosts.length > 0
                ? `${referencePosts.length}件のS/Aティア投稿を参考に生成します`
                : "参考投稿がないため、テンプレートベースで生成します"}
            </span>
          )}
        </div>
      )}

      {/* 6 Cards Grid */}
      {hasGenerated && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card) => {
            const template = TEMPLATES.find(t => t.id === card.templateId);
            const TemplateIcon = template?.icon || Lightbulb;

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
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${template?.bgColor || "bg-zinc-50"}`}>
                      <TemplateIcon className={`w-4 h-4 ${template?.color || "text-zinc-500"}`} />
                      <span className={`text-xs font-medium ${template?.color || "text-zinc-500"}`}>
                        {card.templateName}
                      </span>
                    </div>
                  </div>

                  {card.referencePost && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      card.referencePost.tier === "S"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-violet-100 text-violet-700"
                    }`}>
                      {card.referencePost.tier}
                    </span>
                  )}
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
            記事URL、アイデア、テーマなどを入力すると<br />
            6パターンの投稿案を生成します
          </p>
        </div>
      )}
    </div>
  );
}
