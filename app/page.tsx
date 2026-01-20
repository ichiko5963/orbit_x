"use client";

import {
  ArrowUpRight,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Upload,
  Sparkles,
  BarChart3,
  Plus,
} from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "投稿数", value: "0", sub: "未インポート" },
  { label: "インプレッション", value: "0", sub: "未インポート" },
  { label: "いいね", value: "0", sub: "未インポート" },
  { label: "Tier S", value: "0", sub: "200+いいね" },
];

const actions = [
  {
    title: "CSV インポート",
    desc: "X Premiumのデータを取り込む",
    href: "/import",
    icon: Upload,
  },
  {
    title: "AI 投稿作成",
    desc: "テンプレートから生成",
    href: "/compose",
    icon: Sparkles,
  },
  {
    title: "投稿ランキング",
    desc: "パフォーマンス分析",
    href: "/posts",
    icon: BarChart3,
  },
];

const recentPosts = [
  {
    tier: "S",
    text: "サンプル投稿です。CSVをインポートすると実際の投稿が表示されます。",
    imp: "1.5万",
    likes: "250",
  },
  {
    tier: "A",
    text: "構造化された投稿の例。問題提起→共感→主張→結論の流れ。",
    imp: "8.5K",
    likes: "150",
  },
  {
    tier: "B",
    text: "再現性のある投稿を作るために、バズ投稿を分析しましょう。",
    imp: "4.2K",
    likes: "75",
  },
];

const tierColors: Record<string, string> = {
  S: "bg-amber-500 text-black",
  A: "bg-violet-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-zinc-600 text-white",
};

export default function Dashboard() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-zinc-500 text-sm mb-1">Overview</p>
        <h1 className="text-3xl font-bold text-white">ダッシュボード</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5"
          >
            <p className="text-zinc-500 text-sm mb-3">{s.label}</p>
            <p className="text-3xl font-semibold text-white mb-1">{s.value}</p>
            <p className="text-xs text-zinc-600">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">クイックアクション</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((a) => (
            <Link key={a.href} href={a.href}>
              <div className="group bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-5 transition-all hover:bg-white/[0.04]">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    <a.icon className="w-5 h-5 text-zinc-400" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
                <h3 className="text-base font-medium text-white mb-1">{a.title}</h3>
                <p className="text-sm text-zinc-500">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Posts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">最近の投稿</h2>
          <Link
            href="/posts"
            className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
          >
            すべて見る
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentPosts.map((post, i) => (
            <div
              key={i}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <span
                  className={`${tierColors[post.tier]} text-xs font-bold px-2.5 py-1 rounded-lg`}
                >
                  {post.tier}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-zinc-300 leading-relaxed line-clamp-2">
                    {post.text}
                  </p>
                  <div className="flex items-center gap-5 mt-3">
                    <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                      <Eye className="w-4 h-4" />
                      {post.imp}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                      <Heart className="w-4 h-4" />
                      {post.likes}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              まずはCSVをインポート
            </h3>
            <p className="text-zinc-400 text-sm">
              X Premium からエクスポートしたCSVを取り込んで分析を開始
            </p>
          </div>
          <Link
            href="/import"
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-medium rounded-xl hover:bg-zinc-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            インポート
          </Link>
        </div>
      </div>
    </div>
  );
}
