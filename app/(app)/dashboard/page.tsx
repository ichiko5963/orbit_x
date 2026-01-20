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
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPosts, getScheduledPosts, getContextPosts } from "@/lib/firebase";

interface DashboardStats {
  totalPosts: number;
  totalImpressions: number;
  totalLikes: number;
  tierSCount: number;
  tierACount: number;
  scheduledCount: number;
  contextPostsCount: number;
}

interface RecentPost {
  id: string;
  text: string;
  likes: number;
  impressions: number;
  tier: string;
  createdAt: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
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
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);

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

        // Get recent posts (top 5 by likes)
        const sortedPosts = [...typedPosts]
          .sort((a, b) => (b.likes || 0) - (a.likes || 0))
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            text: p.text,
            likes: p.likes || 0,
            impressions: p.impressions || 0,
            tier: p.tier || "C",
            createdAt: p.createdAt,
          }));
        setRecentPosts(sortedPosts);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  const statsConfig = [
    {
      label: "投稿数",
      value: formatNumber(stats.totalPosts),
      icon: BarChart3,
      bgColor: "bg-violet-50",
      textColor: "text-violet-600",
    },
    {
      label: "インプレッション",
      value: formatNumber(stats.totalImpressions),
      icon: Eye,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "いいね",
      value: formatNumber(stats.totalLikes),
      icon: Heart,
      bgColor: "bg-pink-50",
      textColor: "text-pink-600",
    },
    {
      label: "Tier S投稿",
      value: stats.tierSCount.toString(),
      icon: TrendingUp,
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            ダッシュボード
          </h1>
          <p className="text-lg text-zinc-500">
            X運用の状況を一目で把握
          </p>
        </div>
        <Link
          href="/import"
          className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
        >
          <Upload className="w-5 h-5" />
          CSVインポート
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat) => (
          <div
            key={stat.label}
            className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}
              >
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
            <p className="text-base text-zinc-500 mb-1">{stat.label}</p>
            <p className="text-4xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
            <span className="text-lg font-bold text-violet-600">A</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900">{stats.tierACount}</p>
            <p className="text-sm text-zinc-500">Tier A投稿</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900">{stats.scheduledCount}</p>
            <p className="text-sm text-zinc-500">予約投稿</p>
          </div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-zinc-900">{stats.contextPostsCount}</p>
            <p className="text-sm text-zinc-500">参考バズ投稿</p>
          </div>
        </div>
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900">クイックアクション</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div
                  className={`group p-6 rounded-2xl border transition-all hover:shadow-md ${
                    action.primary
                      ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                      : "bg-white border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        action.primary
                          ? "bg-emerald-100"
                          : "bg-zinc-100"
                      }`}
                    >
                      <action.icon
                        className={`w-6 h-6 ${
                          action.primary ? "text-emerald-600" : "text-zinc-600"
                        }`}
                      />
                    </div>
                    <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-base text-zinc-500">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-900">アクティビティ</h2>
            <Clock className="w-5 h-5 text-zinc-400" />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            {stats.totalPosts > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {stats.totalPosts}件の投稿をインポート済み
                    </p>
                    <p className="text-xs text-zinc-500">過去投稿一覧で確認</p>
                  </div>
                </div>
                {stats.scheduledCount > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {stats.scheduledCount}件の予約投稿
                      </p>
                      <p className="text-xs text-zinc-500">予約投稿で確認</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center flex-col py-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                  <Calendar className="w-7 h-7 text-zinc-400" />
                </div>
                <p className="text-base text-zinc-600 mb-1">アクティビティなし</p>
                <p className="text-sm text-zinc-400">
                  CSVをインポートして始めましょう
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">トップ投稿</h2>
          <Link
            href="/posts"
            className="flex items-center gap-1 text-base text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            すべて見る
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {recentPosts.length > 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-zinc-100">
              {recentPosts.map((post, index) => (
                <div key={post.id} className="p-4 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-sm text-zinc-400">#{index + 1}</span>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                        post.tier === "S" ? "bg-amber-100 text-amber-700" :
                        post.tier === "A" ? "bg-violet-100 text-violet-700" :
                        post.tier === "B" ? "bg-blue-100 text-blue-700" :
                        "bg-zinc-100 text-zinc-700"
                      }`}>
                        {post.tier}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-700 line-clamp-2 whitespace-pre-wrap">
                        {post.text}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-sm text-zinc-500">
                          <Eye className="w-4 h-4" />
                          {formatNumber(post.impressions)}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-zinc-500">
                          <Heart className="w-4 h-4" />
                          {formatNumber(post.likes)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center justify-center flex-col py-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
                <Upload className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-3">
                データがありません
              </h3>
              <p className="text-base text-zinc-500 mb-8 max-w-md">
                X PremiumからエクスポートしたCSVをインポートして、
                過去の投稿を分析・構造化しましょう。
              </p>
              <Link
                href="/import"
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
              >
                <Plus className="w-5 h-5" />
                CSVをインポート
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* CTA Banner - Only show if no posts */}
      {stats.totalPosts === 0 && (
        <div className="relative p-8 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-emerald-600" />
                <span className="text-base font-semibold text-emerald-700">
                  はじめての方へ
                </span>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">
                CSVをインポートして、運用を始めましょう
              </h3>
              <p className="text-base text-zinc-600 max-w-lg">
                X Premium からエクスポートしたCSVを取り込むと、
                AIが自動で投稿を分析・構造化します。
              </p>
            </div>
            <Link
              href="/import"
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
            >
              インポート開始
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
