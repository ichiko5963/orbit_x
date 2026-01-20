"use client";

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
} from "lucide-react";

const stats = [
  {
    label: "投稿数",
    value: "0",
    change: "-",
    icon: BarChart3,
    color: "bg-violet-500",
    bgColor: "bg-violet-50",
    textColor: "text-violet-600",
  },
  {
    label: "インプレッション",
    value: "0",
    change: "-",
    icon: Eye,
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    label: "いいね",
    value: "0",
    change: "-",
    icon: Heart,
    color: "bg-pink-500",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
  },
  {
    label: "Tier S投稿",
    value: "0",
    change: "-",
    icon: TrendingUp,
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
  },
];

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
        {stats.map((stat) => (
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
              {stat.change !== "-" && (
                <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                  <TrendingUp className="w-4 h-4" />
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-base text-zinc-500 mb-1">{stat.label}</p>
            <p className="text-4xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
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
            <div className="flex items-center justify-center flex-col py-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-zinc-400" />
              </div>
              <p className="text-base text-zinc-600 mb-1">アクティビティなし</p>
              <p className="text-sm text-zinc-400">
                CSVをインポートして始めましょう
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-zinc-900">最近の投稿</h2>
          <Link
            href="/posts"
            className="flex items-center gap-1 text-base text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            すべて見る
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

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
      </div>

      {/* CTA Banner */}
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
    </div>
  );
}
