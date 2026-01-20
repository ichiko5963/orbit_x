"use client";

import { clsx } from "clsx";
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Users,
  Upload,
  FolderOpen,
  Palette,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const mainNav = [
  { name: "ダッシュボード", href: "/", icon: LayoutDashboard },
  { name: "投稿ランキング", href: "/posts", icon: TrendingUp },
  { name: "AI投稿作成", href: "/compose", icon: Sparkles },
  { name: "外部コンテンツ", href: "/external", icon: ExternalLink },
  { name: "バズ投稿参考", href: "/viral", icon: Users },
];

const subNav = [
  { name: "CSVインポート", href: "/import", icon: Upload },
  { name: "カテゴリー", href: "/categories", icon: FolderOpen },
  { name: "口調・絵文字", href: "/styles", icon: Palette },
  { name: "設定", href: "/settings", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "fixed top-0 left-0 z-40 h-screen bg-[#0a0a0a] border-r border-white/[0.06] transition-all duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold text-white whitespace-nowrap">
              OrbitX
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-6 overflow-y-auto h-[calc(100vh-64px)]">
        {/* Main */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">
              メイン
            </p>
          )}
          <div className="space-y-1">
            {mainNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                    isActive
                      ? "bg-white text-black font-medium"
                      : "text-zinc-400 hover:text-white hover:bg-white/5",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-[14px]">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sub */}
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">
              管理
            </p>
          )}
          <div className="space-y-1">
            {subNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                    isActive
                      ? "bg-white text-black font-medium"
                      : "text-zinc-400 hover:text-white hover:bg-white/5",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-[14px]">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
