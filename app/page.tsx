"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Sparkles,
  Clock,
  Upload,
  Brain,
  Target,
  Repeat,
  TrendingUp,
  Shield,
  Zap,
  CheckCircle,
  ArrowDown,
} from "lucide-react";

// Logo position configurations for each section
const logoConfigs = [
  { x: 65, y: 40, scale: 1.2, rotation: 0, opacity: 0.08 },      // Hero - big, right side
  { x: 75, y: 55, scale: 0.6, rotation: 45, opacity: 0.06 },     // Problem - smaller, near "なぜバズった"
  { x: 50, y: 45, scale: 0.8, rotation: 90, opacity: 0.05 },     // Solution - center
  { x: 20, y: 50, scale: 0.7, rotation: 135, opacity: 0.15 },    // Features (dark) - left, white
  { x: 80, y: 40, scale: 0.9, rotation: 180, opacity: 0.06 },    // Tier - right
  { x: 50, y: 50, scale: 0.7, rotation: 225, opacity: 0.05 },    // Flow
  { x: 30, y: 45, scale: 0.8, rotation: 270, opacity: 0.12 },    // CSV (dark)
  { x: 50, y: 50, scale: 1.0, rotation: 315, opacity: 0.04 },    // CTA
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [isDarkSection, setIsDarkSection] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);

      const sections = document.querySelectorAll("section[data-section]");
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          setActiveSection(index);
          // Check if section has dark background
          const isDark = section.classList.contains("bg-zinc-900");
          setIsDarkSection(isDark);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Interpolate between logo configs based on scroll
  const currentConfig = logoConfigs[activeSection] || logoConfigs[0];
  const nextConfig = logoConfigs[Math.min(activeSection + 1, logoConfigs.length - 1)];

  // Add some dynamic movement based on scroll
  const dynamicRotation = scrollY * 0.05;
  const breatheScale = 1 + Math.sin(scrollY * 0.003) * 0.05;

  const logoStyle = {
    left: `${currentConfig.x}%`,
    top: `${currentConfig.y}%`,
    transform: `translate(-50%, -50%) rotate(${currentConfig.rotation + dynamicRotation}deg) scale(${currentConfig.scale * breatheScale})`,
    opacity: currentConfig.opacity,
    filter: isDarkSection ? "invert(1)" : "none",
    transition: "left 1s ease-out, top 1s ease-out, transform 0.5s ease-out, opacity 0.5s ease-out, filter 0.5s ease-out",
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 overflow-x-hidden">
      {/* Floating Animated Logo */}
      <div
        className="fixed pointer-events-none z-0"
        style={logoStyle}
      >
        <Image
          src="/logo.png"
          alt=""
          width={800}
          height={800}
          className="select-none"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="OrbitX"
                width={44}
                height={44}
                className="rounded-2xl"
              />
              <span className="text-xl font-bold tracking-tight">OrbitX</span>
            </Link>
            <div className="flex items-center gap-8">
              <Link
                href="#concept"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors hidden md:block"
              >
                コンセプト
              </Link>
              <Link
                href="#features"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors hidden md:block"
              >
                機能
              </Link>
              <Link
                href="#flow"
                className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors hidden md:block"
              >
                使い方
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white text-sm font-semibold rounded-full hover:bg-zinc-800 transition-colors"
              >
                始める
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section data-section className="relative min-h-screen flex items-center pt-20">
        <div className="max-w-7xl mx-auto px-8 lg:px-16 py-20 w-full">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-zinc-600 text-sm font-medium mb-8 animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              X運用特化AIツール
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-8 animate-fade-in-up">
              X運用を、
              <br />
              <span className="text-zinc-400">科学する。</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-zinc-500 leading-relaxed mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              感覚運用から、構造運用へ。
            </p>

            <p className="text-lg text-zinc-400 leading-relaxed mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              過去の投稿データを構造化し、なぜバズったかを分析。
              <br />
              AIが同じ構造で新しい投稿を量産します。
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-8 py-4 bg-zinc-900 text-white text-lg font-bold rounded-full hover:bg-zinc-800 transition-all hover:scale-105"
              >
                無料で始める
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#concept"
                className="flex items-center gap-2 px-8 py-4 text-zinc-500 hover:text-zinc-900 text-lg transition-colors"
              >
                詳しく見る
                <ArrowDown className="w-5 h-5 animate-bounce" />
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-400">
          <span className="text-sm">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-zinc-300 to-transparent" />
        </div>
      </section>

      {/* Problem Section */}
      <section id="concept" data-section className="relative py-32 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <p className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
                The Problem
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-8">
                X運用の
                <br />
                <span className="text-zinc-400">3つの壁</span>
              </h2>

              <div className="space-y-6">
                {[
                  {
                    num: "01",
                    title: "再現性がない",
                    desc: "バズっても「なぜバズったか」がわからない。同じ成功を繰り返せない。",
                  },
                  {
                    num: "02",
                    title: "ネタが尽きる",
                    desc: "毎日投稿のプレッシャー。何を書けばいいかわからなくなる。",
                  },
                  {
                    num: "03",
                    title: "時間がかかる",
                    desc: "1投稿に30分以上。本業との両立が難しい。",
                  },
                ].map((item) => (
                  <div
                    key={item.num}
                    className="flex gap-6 p-6 bg-white rounded-2xl border border-zinc-200 hover:border-zinc-300 transition-all hover:shadow-lg"
                  >
                    <span className="text-3xl font-bold text-zinc-200">{item.num}</span>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 mb-2">{item.title}</h3>
                      <p className="text-zinc-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-100 rounded-full blur-3xl opacity-50" />
                <div className="relative bg-white p-12 rounded-3xl border border-zinc-200 shadow-xl">
                  <div className="text-center">
                    <p className="text-8xl font-bold text-zinc-200 mb-4">?</p>
                    <p className="text-xl text-zinc-400">なぜバズった？</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section data-section className="relative py-32">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-emerald-500 uppercase tracking-widest mb-4">
              The Solution
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              OrbitXが
              <span className="text-zinc-400">すべて解決</span>
            </h2>
            <p className="text-xl text-zinc-500 max-w-2xl mx-auto">
              データ分析 × AI生成で、再現性のあるX運用を実現
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "構造分析",
                desc: "投稿を「フック」「本文」「CTA」などの構造に分解。バズの法則を可視化。",
                color: "bg-violet-100 text-violet-600",
              },
              {
                icon: Sparkles,
                title: "AI生成",
                desc: "過去の勝ちパターンを学習。同じ構造で新しい投稿を瞬時に生成。",
                color: "bg-amber-100 text-amber-600",
              },
              {
                icon: Target,
                title: "ティア管理",
                desc: "いいね数でランク付け。再投稿ルールを自動管理し、事故を防止。",
                color: "bg-emerald-100 text-emerald-600",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group p-8 bg-white rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:shadow-xl hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" data-section className="relative py-32 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
              Features
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              主要機能
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: Upload,
                title: "Xコンテキスト",
                desc: "X Premiumのアナリティクスデータを一括取り込み。日付・本文・リンク・インプレッション・いいね・エンゲージメントを自動解析。",
              },
              {
                icon: BarChart3,
                title: "投稿ランキング",
                desc: "全投稿をティア（S/A/B/C）で自動分類。いいね数に応じて再投稿ルールを適用。",
              },
              {
                icon: Sparkles,
                title: "AI投稿作成",
                desc: "過去のバズ投稿を参考に、AIが新規投稿を生成。口調・絵文字も自由にカスタマイズ。",
              },
              {
                icon: Repeat,
                title: "構造テンプレート",
                desc: "「問題提起→解決策→CTA」などの構造パターンを保存。何度でも再利用可能。",
              },
              {
                icon: Clock,
                title: "予約投稿",
                desc: "最適な時間帯に自動投稿。カレンダービューで一元管理。",
              },
              {
                icon: TrendingUp,
                title: "外部コンテンツ取得",
                desc: "Qiita・Zennのトレンド記事を毎日自動取得。ネタ切れとは無縁に。",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group p-8 bg-zinc-800/50 rounded-2xl border border-zinc-700 hover:border-zinc-600 transition-all hover:bg-zinc-800"
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-zinc-700 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-600 transition-colors">
                    <item.icon className="w-6 h-6 text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                    <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tier System Section */}
      <section data-section className="relative py-32">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
                Tier System
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
                再投稿を、
                <br />
                <span className="text-zinc-400">安全に管理</span>
              </h2>
              <p className="text-xl text-zinc-500 leading-relaxed mb-8">
                いいね数に基づく4段階のティア制で、再投稿のタイミングを自動管理。
                同文投稿の事故を防ぎながら、効果的な運用を実現します。
              </p>

              <div className="space-y-4">
                {[
                  { icon: Shield, text: "同文再投稿は2-3ヶ月に1回まで自動制限" },
                  { icon: CheckCircle, text: "ティアに応じた再利用ルールを自動適用" },
                  { icon: Zap, text: "構文模倣でオリジナル投稿を量産" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-4">
                    <item.icon className="w-5 h-5 text-emerald-500" />
                    <span className="text-zinc-600">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { tier: "S", likes: "200+", rule: "同文OK", desc: "そのまま再投稿可能", bg: "bg-zinc-900", text: "text-white" },
                { tier: "A", likes: "100-199", rule: "構文模倣", desc: "構造を参考に新規作成", bg: "bg-zinc-700", text: "text-white" },
                { tier: "B", likes: "50-99", rule: "参考程度", desc: "アイデアの参考に", bg: "bg-zinc-400", text: "text-white" },
                { tier: "C", likes: "~49", rule: "保存のみ", desc: "アーカイブ用途", bg: "bg-zinc-200", text: "text-zinc-700" },
              ].map((t) => (
                <div
                  key={t.tier}
                  className="p-6 bg-zinc-50 rounded-3xl border border-zinc-200 hover:border-zinc-300 transition-all hover:shadow-lg"
                >
                  <div
                    className={`w-14 h-14 rounded-xl ${t.bg} ${t.text} flex items-center justify-center mb-4 text-2xl font-bold`}
                  >
                    {t.tier}
                  </div>
                  <p className="text-xl font-bold text-zinc-900 mb-1">
                    {t.likes}いいね
                  </p>
                  <p className="text-sm font-medium text-zinc-600 mb-2">{t.rule}</p>
                  <p className="text-sm text-zinc-400">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Flow Section */}
      <section id="flow" data-section className="relative py-32 bg-zinc-50">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4">
              How it works
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              3ステップで完結
            </h2>
            <p className="text-xl text-zinc-500">
              CSVをインポートするだけ。あとはOrbitXにお任せ。
            </p>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-zinc-200" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  num: "01",
                  title: "インポート",
                  desc: "X PremiumのCSVをドラッグ&ドロップ。日付・本文・インプレッション・いいね・エンゲージメントを自動取り込み。",
                  icon: Upload,
                },
                {
                  num: "02",
                  title: "AI分析",
                  desc: "投稿の構造を自動抽出。バズの法則を分析し、ティアを自動判定。",
                  icon: Brain,
                },
                {
                  num: "03",
                  title: "生成・投稿",
                  desc: "過去のテンプレートから新規投稿を生成。予約投稿で最適なタイミングに自動投稿。",
                  icon: Sparkles,
                },
              ].map((step) => (
                <div key={step.num} className="relative text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white border-2 border-zinc-200 mb-6 relative z-10">
                    <step.icon className="w-8 h-8 text-zinc-700" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 bg-zinc-900 text-white text-xs font-bold px-2 py-1 rounded">
                    STEP {step.num}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CSV Format Section */}
      <section data-section className="relative py-32 bg-zinc-900 text-white">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                X Context
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">
                X Premium CSVに対応
              </h2>
              <p className="text-zinc-400 leading-relaxed mb-8">
                X Premiumのアナリティクスからエクスポートしたデータをそのままインポート可能。AIがあなたの投稿を分析し、コンテキストとして活用します。
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  "日付",
                  "ポスト本文",
                  "ポストのリンク",
                  "インプレッション数",
                  "いいね",
                  "エンゲージメント",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-800 rounded-2xl p-6 font-mono text-sm">
              <div className="flex items-center gap-2 mb-4 text-zinc-500">
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <div className="w-3 h-3 rounded-full bg-zinc-600" />
                <span className="ml-2">posts.csv</span>
              </div>
              <div className="text-zinc-400 overflow-x-auto">
                <p className="text-emerald-400">日付,ポスト本文,リンク,インプレ,いいね,エンゲージ</p>
                <p>2024-01-15,プログラミング学習で...,https://...,25000,350,1200</p>
                <p>2024-01-14,【朗報】GitHub...,https://...,12000,180,890</p>
                <p>2024-01-13,エンジニア3年目で...,https://...,9500,145,650</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section data-section className="relative py-32 bg-zinc-50">
        <div className="max-w-4xl mx-auto px-8 lg:px-16 text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-8">
            X運用を、
            <br />
            <span className="text-zinc-400">次のレベルへ。</span>
          </h2>

          <p className="text-xl text-zinc-500 mb-12 max-w-2xl mx-auto">
            感覚に頼らない、データドリブンな運用を始めましょう。
            <br />
            CSVをインポートするだけで、すぐに始められます。
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-3 px-12 py-6 bg-zinc-900 text-white text-xl font-bold rounded-full hover:bg-zinc-800 transition-all hover:scale-105"
          >
            無料で始める
            <ArrowRight className="w-6 h-6" />
          </Link>

          <p className="mt-6 text-sm text-zinc-400">
            クレジットカード不要 • 永久無料プラン有り
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-100">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="OrbitX"
                width={32}
                height={32}
                className="rounded-xl"
              />
              <span className="text-base text-zinc-500">OrbitX</span>
            </div>
            <p className="text-sm text-zinc-400">
              © 2025 OrbitX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
