"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Image as ImageIcon,
  CheckCircle2,
  Target,
  Settings,
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

function isToday(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function isThisWeek(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start
  startOfWeek.setHours(0, 0, 0, 0);
  return date >= startOfWeek;
}

const quickActions = [
  {
    title: "Daily X",
    description: "AI生成の投稿案を確認",
    href: "/daily-x",
    icon: Zap,
    primary: true,
  },
  {
    title: "CSVインポート",
    description: "X PremiumのCSVを取り込む",
    href: "/import",
    icon: Upload,
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
  const [goalSettings, setGoalSettings] = useState({
    dailyTarget: 3,
    weeklyTarget: 15,
    showOnDashboard: true,
  });

  // Load goal settings from localStorage
  useEffect(() => {
    const savedGoal = localStorage.getItem("orbitx_goal_settings");
    if (savedGoal) {
      try {
        setGoalSettings(JSON.parse(savedGoal));
      } catch (e) {
        console.error("Failed to parse goal settings:", e);
      }
    }
  }, []);

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

          {/* Goal Progress */}
          {goalSettings.showOnDashboard && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-zinc-900">目標達成</span>
                </div>
                <Link
                  href="/settings?section=goal"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>

              {/* Daily Progress */}
              {(() => {
                const todayCount = postedHistory.filter(h => isToday(h.postedAt)).length;
                const dailyProgress = Math.min((todayCount / goalSettings.dailyTarget) * 100, 100);
                return (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-zinc-600">今日</span>
                      <span className="font-semibold text-zinc-900">
                        {todayCount} / {goalSettings.dailyTarget}
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${dailyProgress}%` }}
                      />
                    </div>
                    {dailyProgress >= 100 && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        目標達成!
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Weekly Progress */}
              {(() => {
                const weekCount = postedHistory.filter(h => isThisWeek(h.postedAt)).length;
                const weeklyProgress = Math.min((weekCount / goalSettings.weeklyTarget) * 100, 100);
                return (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-zinc-600">今週</span>
                      <span className="font-semibold text-zinc-900">
                        {weekCount} / {goalSettings.weeklyTarget}
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${weeklyProgress}%` }}
                      />
                    </div>
                    {weeklyProgress >= 100 && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        週間目標達成!
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

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
        </div>

        {/* Right Column: AI History + Posted History */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Generation History - Larger Display */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <span className="font-semibold text-violet-800">AI生成履歴</span>
                <span className="text-sm text-violet-500">({aiHistory.length}件)</span>
              </div>
              {aiHistory.length > 0 && (
                <Link
                  href={`/compose/generate?historyId=${aiHistory[0]?.id || ""}`}
                  className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
                >
                  すべて見る
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
            {isLoadingAiHistory ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500 mb-3" />
                <p className="text-zinc-500 text-sm">読み込み中...</p>
              </div>
            ) : aiHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
                {aiHistory.map((history) => (
                  <Link
                    key={history.id}
                    href={`/compose/generate?historyId=${history.id}`}
                    className="group p-4 rounded-xl border border-zinc-200 hover:border-violet-300 hover:shadow-sm transition-all bg-zinc-50 hover:bg-violet-50"
                  >
                    <p className="text-sm font-medium text-zinc-800 line-clamp-2 mb-2 group-hover:text-violet-900">
                      {history.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
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
                      <span className="text-zinc-400">{history.generatedTexts.length}パターン</span>
                      <span className="text-zinc-400">
                        {new Date(history.createdAt!).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-violet-400" />
                </div>
                <p className="text-base text-zinc-600 mb-2">AI生成履歴がありません</p>
                <p className="text-sm text-zinc-400 mb-4">
                  AIで投稿を作成すると、ここに履歴が表示されます
                </p>
                <Link
                  href="/compose"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 text-white text-sm font-medium rounded-xl hover:bg-violet-600 transition-colors shadow-lg shadow-violet-500/25"
                >
                  <Sparkles className="w-4 h-4" />
                  AI投稿作成
                </Link>
              </div>
            )}
          </div>

          {/* Posted History */}
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
                  <div key={item.id} className="p-4 hover:bg-zinc-50/50 transition-colors">
                    {/* Posted content preview */}
                    <div className="p-3 bg-white rounded-xl border border-zinc-200">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-emerald-600">投稿済み</span>
                          {/* Media tags - Simple tags instead of previews */}
                          {item.sourcePost?.media && item.sourcePost.media.length > 0 && (
                            <div className="flex items-center gap-1">
                              {item.sourcePost.media.some(m => m.type === "video") && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-600 rounded">
                                  <Video className="w-3 h-3" />
                                  動画
                                </span>
                              )}
                              {item.sourcePost.media.some(m => m.type === "photo") && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-600 rounded">
                                  <ImageIcon className="w-3 h-3" />
                                  画像
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.postedAt)}
                        </span>
                      </div>

                      {/* Posted text */}
                      <p className="text-sm text-zinc-800 whitespace-pre-wrap line-clamp-4 mb-2">
                        {item.text}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {item.tweetUrl && (
                          <a
                            href={item.tweetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
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
                            className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-500 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
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
