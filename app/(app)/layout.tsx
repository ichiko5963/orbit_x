"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
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
  CalendarDays,
  Loader2,
  CheckCircle2,
  X,
  Bookmark,
  User,
  LinkIcon,
  Zap,
} from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ImportProvider, useImport } from "@/lib/import-context";
import { XProfileProvider, useXProfile } from "@/lib/x-profile-context";
import { ResearchProvider } from "@/lib/research-context";
import { ResearchProgressWidget } from "@/components/research-progress-widget";

// Custom X logo component
const XLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const mainNav = [
  { name: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
  { name: "Daily X", href: "/daily-x", icon: Zap },
  { name: "AI投稿作成", href: "/compose", icon: Sparkles },
  { name: "投稿カレンダー", href: "/schedule", icon: CalendarDays },
  { name: "過去投稿一覧", href: "/posts", icon: TrendingUp },
  { name: "他者バズ投稿", href: "/context", icon: Users },
  { name: "外部コンテンツ", href: "/external", icon: Globe },
  { name: "保存済み投稿", href: "/bookmarks", icon: XLogo, isCustomIcon: true },
];

const subNav = [
  { name: "CSVインポート", href: "/import", icon: Upload },
  { name: "カテゴリー管理", href: "/categories", icon: FolderOpen },
  { name: "口調・絵文字", href: "/styles", icon: Palette },
  { name: "設定", href: "/settings", icon: Settings },
];

// Background Import Indicator Component
function BackgroundImportIndicator() {
  const { progress, resetImport } = useImport();
  const pathname = usePathname();

  // Don't show on import page (it has its own UI)
  if (pathname === "/import") return null;

  // Don't show if not processing and no result
  if (!progress.isProcessing && !progress.result && !progress.error) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-4 min-w-[320px]">
        {progress.isProcessing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <span className="text-sm font-medium text-zinc-900">インポート中...</span>
              </div>
              <span className="text-sm font-bold text-emerald-600">{Math.round(progress.percentage)}%</span>
            </div>
            <div className="relative h-2 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">{progress.stepName}</p>
            {progress.fileName && (
              <p className="text-xs text-zinc-400 truncate">{progress.fileName}</p>
            )}
          </div>
        ) : progress.result ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">インポート完了</span>
              </div>
              <button
                onClick={resetImport}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-zinc-600">
                <strong className="text-zinc-900">{progress.result.savedCount || progress.result.total}</strong> 件追加
              </span>
              {progress.result.duplicateCount && progress.result.duplicateCount > 0 && (
                <span className="text-amber-600">{progress.result.duplicateCount}件スキップ</span>
              )}
            </div>
            <Link
              href="/posts"
              className="block w-full text-center py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              投稿一覧を見る
            </Link>
          </div>
        ) : progress.error ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <X className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">エラー</span>
              </div>
              <button
                onClick={resetImport}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-red-600">{progress.error}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const { user, loading, signIn, signOut } = useAuth();
  const { profile: xProfile, isConnected: xConnected } = useXProfile();

  // Sidebar is collapsed by default, expands on hover
  const collapsed = !isHovered;

  // Handle sidebar hover
  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      {/* Sidebar - hover to expand */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={clsx(
          "fixed top-0 left-0 z-40 h-screen bg-white border-r border-zinc-200 flex flex-col",
          "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {/* Logo */}
        <div className={clsx(
          "h-20 flex items-center border-b border-zinc-100 flex-shrink-0 transition-all duration-300",
          collapsed ? "justify-center px-0" : "px-5"
        )}>
          <Link href="/dashboard" className={clsx(
            "flex items-center overflow-hidden transition-all duration-300",
            collapsed ? "justify-center" : "gap-3"
          )}>
            <Image
              src="/logo.png"
              alt="OrbitX"
              width={44}
              height={44}
              className="rounded-xl flex-shrink-0"
            />
            <span className={clsx(
              "text-xl font-bold text-zinc-900 whitespace-nowrap transition-[opacity,transform] duration-300",
              collapsed ? "opacity-0 -translate-x-2 w-0" : "opacity-100 translate-x-0"
            )}>
              OrbitX
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-8 overflow-y-auto overflow-x-hidden">
          {/* Main Navigation */}
          <div>
            <p className={clsx(
              "px-4 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest transition-opacity duration-300 whitespace-nowrap",
              collapsed ? "opacity-0 h-0 mb-0 overflow-hidden" : "opacity-100"
            )}>
              メイン
            </p>
            <div className="space-y-1.5">
              {mainNav.map((item) => {
                const isActive = pathname === item.href;
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "group flex items-center py-3.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
                      collapsed ? "justify-center px-0" : "px-4 gap-4"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <IconComponent
                      className={clsx(
                        "w-6 h-6 flex-shrink-0 transition-transform",
                        !isActive && "group-hover:scale-110"
                      )}
                    />
                    <span className={clsx(
                      "text-base font-medium whitespace-nowrap transition-[opacity,width] duration-300 overflow-hidden",
                      collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                    )}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Sub Navigation */}
          <div>
            <p className={clsx(
              "px-4 mb-3 text-xs font-semibold text-zinc-400 uppercase tracking-widest transition-opacity duration-300 whitespace-nowrap",
              collapsed ? "opacity-0 h-0 mb-0 overflow-hidden" : "opacity-100"
            )}>
              管理
            </p>
            <div className="space-y-1.5">
              {subNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "group flex items-center py-3.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
                      collapsed ? "justify-center px-0" : "px-4 gap-4"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={clsx(
                        "w-6 h-6 flex-shrink-0 transition-transform",
                        !isActive && "group-hover:scale-110"
                      )}
                    />
                    <span className={clsx(
                      "text-base font-medium whitespace-nowrap transition-[opacity,width] duration-300 overflow-hidden",
                      collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                    )}>
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-zinc-100 overflow-hidden">
          <div className={clsx(
            "flex items-center p-3 rounded-xl transition-all duration-300",
            collapsed ? "justify-center bg-transparent" : "bg-zinc-50 gap-3"
          )}>
            {/* Avatar - always visible */}
            <div className="flex-shrink-0">
              {xConnected && xProfile?.profileImageUrl ? (
                <Image
                  src={xProfile.profileImageUrl.replace("_normal", "_200x200")}
                  alt={xProfile.name}
                  width={44}
                  height={44}
                  className="rounded-full border-2 border-blue-400"
                />
              ) : user.photoURL ? (
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
            </div>
            {/* User info - CSS hidden when collapsed */}
            <div className={clsx(
              "min-w-0 transition-[opacity,width] duration-300 overflow-hidden",
              collapsed ? "opacity-0 w-0" : "opacity-100 flex-1"
            )}>
              {xConnected && xProfile ? (
                <>
                  <p className="text-base font-semibold text-zinc-900 truncate whitespace-nowrap">
                    {xProfile.name}
                  </p>
                  <p className="text-sm text-blue-500 truncate whitespace-nowrap">
                    @{xProfile.username}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-semibold text-zinc-900 truncate whitespace-nowrap">
                    {user.displayName || "ユーザー"}
                  </p>
                  <p className="text-sm text-zinc-500 truncate whitespace-nowrap">
                    {user.email}
                  </p>
                </>
              )}
            </div>
            {/* Logout button - CSS hidden when collapsed */}
            <button
              onClick={signOut}
              className={clsx(
                "p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300",
                collapsed ? "opacity-0 w-0 p-0 overflow-hidden" : "opacity-100"
              )}
              title="ログアウト"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content - Responds to sidebar state */}
      <div
        className="min-h-screen transition-[margin-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
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

            {/* User Avatar with Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
              >
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    width={44}
                    height={44}
                    className="rounded-full border-2 border-zinc-200 hover:border-emerald-400 transition-colors cursor-pointer"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white text-lg font-bold border-2 border-emerald-400 hover:border-emerald-300 transition-colors cursor-pointer">
                    {user.displayName?.[0] || user.email?.[0] || "U"}
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-zinc-200 py-2 animate-fade-in z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-3">
                      {user.photoURL ? (
                        <Image
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                          {user.displayName?.[0] || user.email?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">
                          {user.displayName || "ユーザー"}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* X Connection Status */}
                  {xConnected && xProfile && (
                    <div className="px-4 py-2 border-b border-zinc-100 bg-blue-50">
                      <div className="flex items-center gap-2">
                        <XLogo className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-blue-600">@{xProfile.username}</span>
                      </div>
                    </div>
                  )}

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-zinc-400" />
                      設定
                    </Link>
                    {!xConnected && (
                      <Link
                        href="/settings?section=xauth"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                        X連携する
                      </Link>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-zinc-100 pt-1">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      ログアウト
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-10">
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Background Import Indicator */}
        <BackgroundImportIndicator />

        {/* Research Progress Widget (他のページに移動しても表示) */}
        <ResearchProgressWidget />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ImportProvider>
        <XProfileProvider>
          <ResearchProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
          </ResearchProvider>
        </XProfileProvider>
      </ImportProvider>
    </AuthProvider>
  );
}
