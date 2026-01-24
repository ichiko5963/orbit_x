"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  TrendingUp,
  Eye,
  Heart,
  Upload,
  Sparkles,
  BarChart3,
  Plus,
  ArrowRight,
  Clock,
  Calendar,
  Zap,
  Users,
  Loader2,
  History,
  ExternalLink,
  Video,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPosts, getScheduledPosts, getContextPosts, getAIGenerationHistory, cleanupExpiredAIHistories, AIGenerationHistory } from "@/lib/firebase";

interface DashboardStats {
  totalPosts: number;
  totalImpressions: number;
  totalLikes: number;
  tierSCount: number;
  tierACount: number;
  scheduledCount: number;
  contextPostsCount: number;
}

interface PostedHistory {
  id: string;
  text: string;
  tweetId?: string;
  tweetUrl?: string;
  postedAt: string;
  sourcePost?: {
    text: string;
    authorName: string;
    authorUsername: string;
    authorProfileImageUrl: string;
    media?: Array<{
      type: "photo" | "video";
      url: string;
      thumbnailUrl?: string;
    }>;
    originalUrl: string;
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const quickActions = [
  {
    title: "CSVインポート",
    description: "X PremiumのCSVを取り込む",
    href: "/import",
    icon: Upload,
    primary: true,
  },
  {
    title: "AI投稿作成",
    description: "テンプレートから生成",
    href: "/compose",
    icon: Sparkles,
  },
  {
    title: "投稿ランキング",
    description: "パフォーマンス分析",
    href: "/posts",
    icon: BarChart3,
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    totalImpressions: 0,
    totalLikes: 0,
    tierSCount: 0,
    tierACount: 0,
    scheduledCount: 0,
    contextPostsCount: 0,
  });
  const [postedHistory, setPostedHistory] = useState<PostedHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [aiHistory, setAiHistory] = useState<AIGenerationHistory[]>([]);
  const [isLoadingAiHistory, setIsLoadingAiHistory] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Load all data in parallel
        const [posts, scheduledPosts, contextPosts] = await Promise.all([
          getPosts(user.uid),
          getScheduledPosts(user.uid),
          getContextPosts(user.uid),
        ]);

        // Calculate stats from posts
        let totalImpressions = 0;
        let totalLikes = 0;
        let tierSCount = 0;
        let tierACount = 0;

        const typedPosts = posts as any[];
        typedPosts.forEach((post) => {
          totalImpressions += post.impressions || 0;
          totalLikes += post.likes || 0;
          if (post.tier === "S") tierSCount++;
          if (post.tier === "A") tierACount++;
        });

        setStats({
          totalPosts: typedPosts.length,
          totalImpressions,
          totalLikes,
          tierSCount,
          tierACount,
          scheduledCount: (scheduledPosts as any[]).filter((p: any) => p.status === "scheduled").length,
          contextPostsCount: (contextPosts as any[]).length,
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Load posted history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/x/posted-history?userId=${user.uid}`);
        const data = await response.json();

        if (response.ok) {
          setPostedHistory(data.history || []);
        }
      } catch (err) {
        console.error("Load history error:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [user]);

  // Load AI generation history
  useEffect(() => {
    const loadAiHistory = async () => {
      if (!user) return;

      try {
        // Cleanup expired histories first
        await cleanupExpiredAIHistories(user.uid);
        // Then load current histories
        const histories = await getAIGenerationHistory(user.uid);
        setAiHistory(histories.slice(0, 5)); // Show only recent 5
      } catch (err) {
        console.error("Load AI history error:", err);
      } finally {
        setIsLoadingAiHistory(false);
      }
    };

    loadAiHistory();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-1">
            ダッシュボード
          </h1>
          <p className="text-zinc-500">
            X運用の状況を一目で把握
          </p>
        </div>
        <Link
          href="/import"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
        >
          <Upload className="w-4 h-4" />
          CSVインポート
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Quick Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Compact Stats */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-zinc-500 mb-4">統計</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="text-sm text-zinc-600">投稿数</span>
                </div>
                <span className="text-lg font-bold text-zinc-900">{formatNumber(stats.totalPosts)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-zinc-600">インプ</span>
                </div>
                <span className="text-lg font-bold text-zinc-900">{formatNumber(stats.totalImpressions)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-pink-600" />
                  </div>
                  <span className="text-sm text-zinc-600">いいね</span>
                </div>
                <span className="text-lg font-bold text-zinc-900">{formatNumber(stats.totalLikes)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm text-zinc-600">Tier S</span>
                </div>
                <span className="text-lg font-bold text-zinc-900">{stats.tierSCount}</span>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-zinc-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-zinc-500">予約投稿</span>
              </div>
              <p className="text-xl font-bold text-zinc-900">{stats.scheduledCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-zinc-500">参考投稿</span>
              </div>
              <p className="text-xl font-bold text-zinc-900">{stats.contextPostsCount}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-500">クイックアクション</h2>
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div
                  className={`group p-3 rounded-xl border transition-all hover:shadow-sm ${
                    action.primary
                      ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                      : "bg-white border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        action.primary ? "bg-emerald-100" : "bg-zinc-100"
                      }`}
                    >
                      <action.icon
                        className={`w-5 h-5 ${action.primary ? "text-emerald-600" : "text-zinc-600"}`}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-zinc-900">{action.title}</h3>
                      <p className="text-xs text-zinc-500">{action.description}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* AI Generation History */}
          {aiHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-violet-50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-semibold text-violet-800">AI生成履歴</span>
                </div>
                <Link
                  href="/compose/generate"
                  className="text-xs text-violet-600 hover:text-violet-700"
                >
                  すべて見る
                </Link>
              </div>
              <div className="divide-y divide-zinc-100">
                {aiHistory.map((history) => (
                  <Link
                    key={history.id}
                    href="/compose/generate"
                    className="block p-3 hover:bg-zinc-50 transition-colors"
                  >
                    <p className="text-sm text-zinc-700 line-clamp-2 mb-1">
                      {history.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
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
                      <span>{history.generatedTexts.length}パターン</span>
                      <span>
                        {new Date(history.createdAt!).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Posted History */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-emerald-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-emerald-800">投稿履歴</span>
                <span className="text-sm text-emerald-600">({postedHistory.length}件)</span>
              </div>
              <Link
                href="/bookmarks"
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
              >
                すべて見る
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* History List */}
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-3" />
                <p className="text-zinc-500 text-sm">読み込み中...</p>
              </div>
            ) : postedHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">まだ投稿履歴がありません</h3>
                <p className="text-zinc-500 text-sm max-w-sm mb-4">
                  保存済み投稿からAI生成して投稿すると、ここに履歴が表示されます
                </p>
                <Link
                  href="/bookmarks"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  保存済み投稿へ
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-[60vh] overflow-y-auto">
                {postedHistory.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-zinc-50 transition-colors">
                    {/* Posted content preview */}
                    <div className="p-3 bg-white rounded-xl border border-zinc-200">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-600">投稿済み</span>
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.postedAt)}
                        </span>
                      </div>

                      {/* Posted text */}
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap line-clamp-4 mb-2">
                        {item.text}
                      </p>

                      {/* Media thumbnail */}
                      {item.sourcePost?.media && item.sourcePost.media.length > 0 && (
                        <div className="mb-2 rounded-lg overflow-hidden border border-zinc-200 max-w-[200px]">
                          {item.sourcePost.media[0].type === "video" ? (
                            <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
                              <Video className="w-8 h-8 text-zinc-400" />
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[10px] bg-black/70 text-white rounded">
                                動画
                              </span>
                            </div>
                          ) : (
                            <Image
                              src={item.sourcePost.media[0].url || item.sourcePost.media[0].thumbnailUrl || ""}
                              alt="メディア"
                              width={200}
                              height={120}
                              className="w-full object-cover max-h-24"
                              unoptimized
                            />
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {item.tweetUrl && (
                          <a
                            href={item.tweetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Xで見る
                          </a>
                        )}
                        {item.sourcePost?.originalUrl && (
                          <a
                            href={item.sourcePost.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 bg-zinc-100 rounded-lg hover:bg-zinc-200"
                          >
                            <ExternalLink className="w-3 h-3" />
                            参照元
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Banner - Only show if no posts */}
          {stats.totalPosts === 0 && (
            <div className="mt-6 p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">はじめての方へ</span>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                CSVをインポートして、運用を始めましょう
              </h3>
              <p className="text-sm text-zinc-600 mb-4">
                X Premium からエクスポートしたCSVを取り込むと、AIが自動で投稿を分析・構造化します。
              </p>
              <Link
                href="/import"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
              >
                インポート開始
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
