"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  Globe,
  Users,
  Upload,
  FolderOpen,
  Palette,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Plus,
  LogOut,
  Calendar,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth-context";

const mainNav = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI投稿作成", href: "/compose", icon: Sparkles },
  { name: "予約投稿", href: "/schedule", icon: Calendar },
  { name: "過去投稿一覧", href: "/posts", icon: TrendingUp },
  { name: "バズ投稿参考", href: "/viral", icon: Users },
  { name: "外部コンテンツ", href: "/external", icon: Globe },
];

const subNav = [
  { name: "Xコンテキスト", href: "/context", icon: Upload },
  { name: "カテゴリー", href: "/categories", icon: FolderOpen },
  { name: "口調・絵文字", href: "/styles", icon: Palette },
  { name: "設定", href: "/settings", icon: Settings },
];

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-zinc-200 p-10 text-center">
          <Image
            src="/logo.png"
            alt="OrbitX"
            width={64}
            height={64}
            className="mx-auto mb-6 rounded-2xl"
          />
          <h1 className="text-3xl font-bold text-zinc-900 mb-3">OrbitXへようこそ</h1>
          <p className="text-lg text-zinc-500 mb-8">
            X運用を、科学する。
          </p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-zinc-900 text-white text-lg font-semibold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed top-0 left-0 z-40 h-screen bg-white border-r border-zinc-200 transition-all duration-300 ease-out flex flex-col",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-zinc-100 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <Image
              src="/logo.png"
              alt="OrbitX"
              width={44}
              height={44}
              className="rounded-xl flex-shrink-0"
            />
            {!collapsed && (
              <span className="text-xl font-bold text-zinc-900 whitespace-nowrap">
                OrbitX
              </span>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={clsx(
              "p-2.5 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors",
              collapsed && "absolute right-3"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-8 overflow-y-auto">
          {/* Main Navigation */}
          <div>
            {!collapsed && (
              <p className="px-4 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                メイン
              </p>
            )}
            <div className="space-y-1.5">
              {mainNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
                      collapsed && "justify-center px-3"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={clsx(
                        "w-6 h-6 flex-shrink-0 transition-transform",
                        !isActive && "group-hover:scale-110"
                      )}
                    />
                    {!collapsed && (
                      <span className="text-base font-medium">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sub Navigation */}
          <div>
            {!collapsed && (
              <p className="px-4 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                管理
              </p>
            )}
            <div className="space-y-1.5">
              {subNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
                      collapsed && "justify-center px-3"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={clsx(
                        "w-6 h-6 flex-shrink-0 transition-transform",
                        !isActive && "group-hover:scale-110"
                      )}
                    />
                    {!collapsed && (
                      <span className="text-base font-medium">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-zinc-100">
          {!collapsed ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50">
              {user.photoURL ? (
                <Image
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  width={44}
                  height={44}
                  className="rounded-full"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white text-lg font-bold">
                  {user.displayName?.[0] || user.email?.[0] || "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-zinc-900 truncate">
                  {user.displayName || "ユーザー"}
                </p>
                <p className="text-sm text-zinc-500 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="ログアウト"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={signOut}
              className="w-full p-3 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
              title="ログアウト"
            >
              <LogOut className="w-6 h-6" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div
        className="transition-all duration-300 ease-out min-h-screen"
        style={{ marginLeft: collapsed ? "80px" : "288px" }}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-20 bg-white/80 backdrop-blur-xl border-b border-zinc-100 flex items-center justify-between px-10">
          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <input
                type="text"
                placeholder="検索..."
                className="w-80 h-12 pl-12 pr-5 bg-zinc-100 border-none rounded-xl text-base text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-white rounded-lg text-xs text-zinc-400 font-mono border border-zinc-200">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* New Post Button */}
            <Link
              href="/compose"
              className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
            >
              <Plus className="w-5 h-5" />
              新規作成
            </Link>

            {/* Notifications */}
            <button className="relative p-3 rounded-xl text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </button>

            {/* User Avatar */}
            {user.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName || "User"}
                width={44}
                height={44}
                className="rounded-full border-2 border-zinc-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white text-lg font-bold border-2 border-emerald-400">
                {user.displayName?.[0] || user.email?.[0] || "U"}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="p-10">
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AuthProvider>
  );
}
