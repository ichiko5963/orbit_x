"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Key,
  Clock,
  Globe,
  Moon,
  Sun,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Trash2,
  FileText,
  ChevronRight,
  Twitter,
  Bookmark,
  Loader2,
} from "lucide-react";
import { useXProfile } from "@/lib/x-profile-context";
import { useAuth } from "@/lib/auth-context";

interface SettingSection {
  id: string;
  title: string;
  icon: typeof Settings;
}

const sections: SettingSection[] = [
  { id: "profile", title: "プロフィール", icon: User },
  { id: "xauth", title: "X連携", icon: Twitter },
  { id: "patterns", title: "投稿パターン", icon: FileText },
  { id: "notifications", title: "通知", icon: Bell },
  { id: "api", title: "外部コンテンツAPI", icon: Key },
  { id: "schedule", title: "スケジュール", icon: Clock },
  { id: "data", title: "データ", icon: Database },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState("profile");
  const [notifications, setNotifications] = useState({
    email: true,
    browser: false,
    dailyReport: true,
    newFeatures: false,
  });
  const [schedule, setSchedule] = useState({
    autoFetch: true,
    fetchTime: "06:00",
    timezone: "Asia/Tokyo",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // X OAuth state
  const [xAuthConnecting, setXAuthConnecting] = useState(false);
  const [xAuthSuccess, setXAuthSuccess] = useState(false);
  const [xAuthError, setXAuthError] = useState<string | null>(null);

  // Check for OAuth callback results
  useEffect(() => {
    const success = searchParams.get("x_auth_success");
    const error = searchParams.get("x_auth_error");

    if (success === "true") {
      setXAuthSuccess(true);
      setActiveSection("xauth");
      // Clear URL params
      window.history.replaceState({}, "", "/settings");
    } else if (error) {
      setXAuthError(decodeURIComponent(error));
      setActiveSection("xauth");
      window.history.replaceState({}, "", "/settings");
    }
  }, [searchParams]);

  // X profile from context
  const { profile: xProfile, isConnected: xConnected, isLoading: xLoading, error: xError } = useXProfile();

  // Handle X OAuth connection
  const handleConnectXAuth = () => {
    if (!user) return;
    setXAuthConnecting(true);
    window.location.href = `/api/auth/x?userId=${user.uid}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-zinc-500">Settings</span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
          設定
        </h1>
        <p className="text-zinc-500">
          アプリケーションの設定をカスタマイズ
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeSection === section.id
                    ? "bg-emerald-500 text-white font-medium"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <section.icon className="w-5 h-5" />
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm">
            {/* Profile Section */}
            {activeSection === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    プロフィール設定
                  </h3>
                  <p className="text-sm text-zinc-500">
                    アカウント情報を管理します
                  </p>
                </div>

                {/* X Profile (if connected) */}
                {xConnected && xProfile && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Twitter className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-700">X連携アカウント</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {xProfile.profileImageUrl ? (
                        <Image
                          src={xProfile.profileImageUrl.replace("_normal", "_200x200")}
                          alt={xProfile.name}
                          width={64}
                          height={64}
                          className="rounded-full border-2 border-white shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                          {xProfile.name?.[0] || "X"}
                        </div>
                      )}
                      <div>
                        <p className="text-lg font-bold text-zinc-900">{xProfile.name}</p>
                        <p className="text-blue-600">@{xProfile.username}</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-3">
                      このアカウントで予約投稿が自動的に投稿されます
                    </p>
                  </div>
                )}

                {!xConnected && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-700">
                      X連携が設定されていません。「API連携」セクションで設定してください。
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-2">
                      表示名（プレビュー用）
                    </label>
                    <input
                      type="text"
                      defaultValue={xProfile?.name || "ユーザー"}
                      disabled={xConnected}
                      className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                    />
                    {xConnected && (
                      <p className="text-xs text-zinc-500 mt-1">X連携中は自動的に反映されます</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-2">
                      ユーザー名（プレビュー用）
                    </label>
                    <input
                      type="text"
                      defaultValue={xProfile ? `@${xProfile.username}` : "@username"}
                      disabled={xConnected}
                      className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* X Auth Section */}
            {activeSection === "xauth" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    Xブックマーク連携
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Xで保存した投稿をOrbitXで参照・活用できます
                  </p>
                </div>

                {/* Success Message */}
                {xAuthSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-700">Xアカウントとの連携が完了しました！</span>
                  </div>
                )}

                {/* Error Message */}
                {xAuthError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700">{xAuthError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center">
                        <Bookmark className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-zinc-900">Xブックマーク</p>
                        <p className="text-sm text-zinc-600">
                          保存した投稿を参照して投稿を作成
                        </p>
                      </div>
                    </div>

                    {xAuthSuccess ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-white/80 rounded-lg">
                          <p className="text-emerald-700 font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            連携済み
                          </p>
                        </div>
                        <Link
                          href="/bookmarks"
                          className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
                        >
                          <Bookmark className="w-5 h-5" />
                          ブックマーク一覧を見る
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-4 bg-white/80 rounded-lg">
                          <p className="text-sm text-zinc-600 mb-3">
                            XアカウントでOAuth認証を行うと、あなたのブックマーク（保存済み投稿）にアクセスできるようになります。
                          </p>
                          <ul className="text-sm text-zinc-500 space-y-1">
                            <li>・ブックマークした投稿を一覧表示</li>
                            <li>・英語投稿を日本語に翻訳</li>
                            <li>・AIで投稿作成時に参考として使用</li>
                          </ul>
                        </div>
                        <button
                          onClick={handleConnectXAuth}
                          disabled={xAuthConnecting || !user}
                          className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                        >
                          {xAuthConnecting ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              接続中...
                            </>
                          ) : (
                            <>
                              <Twitter className="w-5 h-5" />
                              Xで連携する
                            </>
                          )}
                        </button>
                        {!user && (
                          <p className="text-xs text-amber-600 text-center">
                            連携するにはログインしてください
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <p className="text-sm text-zinc-600">
                      <strong>セキュリティについて：</strong>
                      OAuth 2.0 PKCEフローを使用した安全な認証を行います。
                      パスワードは保存されません。ブックマークの読み取り権限のみを要求します。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Patterns Section */}
            {activeSection === "patterns" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    投稿パターン設定
                  </h3>
                  <p className="text-sm text-zinc-500">
                    記事紹介用の投稿パターンを管理します
                  </p>
                </div>

                <div className="space-y-4">
                  <Link
                    href="/settings/patterns"
                    className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">記事紹介パターン</p>
                        <p className="text-sm text-zinc-500">
                          外部コンテンツからAI投稿を生成する際のパターンを編集
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                  </Link>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-700">
                      <strong>6つのデフォルトパターン</strong>が用意されています。自由に編集・追加できます。
                      外部コンテンツページでAI生成する際に使用されます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    通知設定
                  </h3>
                  <p className="text-sm text-zinc-500">
                    通知の受け取り方を設定します
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: "email",
                      title: "メール通知",
                      description: "重要な更新をメールで受け取る",
                    },
                    {
                      key: "browser",
                      title: "ブラウザ通知",
                      description: "デスクトップ通知を受け取る",
                    },
                    {
                      key: "dailyReport",
                      title: "デイリーレポート",
                      description: "毎日のパフォーマンスレポートを受け取る",
                    },
                    {
                      key: "newFeatures",
                      title: "新機能のお知らせ",
                      description: "新しい機能やアップデートの通知を受け取る",
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-zinc-900">{item.title}</p>
                        <p className="text-sm text-zinc-500">{item.description}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications((prev) => ({
                            ...prev,
                            [item.key]: !prev[item.key as keyof typeof notifications],
                          }))
                        }
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          notifications[item.key as keyof typeof notifications]
                            ? "bg-emerald-500"
                            : "bg-zinc-300"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                            notifications[item.key as keyof typeof notifications]
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Section */}
            {activeSection === "api" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    外部コンテンツAPI
                  </h3>
                  <p className="text-sm text-zinc-500">
                    外部記事サイトとのAPI連携を設定します
                  </p>
                </div>

                <div className="space-y-4">
                  {/* AI Status */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-medium text-emerald-900">AI機能</p>
                        <p className="text-sm text-emerald-700">
                          OpenAI APIはサービス側で管理されています。設定は不要です。
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* X OAuth Link */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          xConnected ? "bg-blue-500" : "bg-blue-200"
                        }`}>
                          <Twitter className={`w-5 h-5 ${xConnected ? "text-white" : "text-blue-500"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Xアカウント連携</p>
                          <p className="text-sm text-blue-700">
                            {xConnected && xProfile
                              ? `@${xProfile.username} として接続中`
                              : "ブックマーク取得・予約投稿に使用"}
                          </p>
                        </div>
                      </div>
                      {xConnected ? (
                        <span className="px-2.5 py-1 text-xs bg-emerald-500 text-white rounded-lg">
                          接続済み
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs bg-amber-500 text-white rounded-lg">
                          未接続
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveSection("xauth")}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      {xConnected ? "連携設定を確認" : "Xで認証する"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Qiita API */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Key className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">Qiita API</p>
                          <p className="text-xs text-zinc-500">記事取得のレート制限緩和（任意）</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="password"
                        placeholder="Qiita アクセストークン（任意）"
                        className="w-full h-10 px-4 bg-white border border-zinc-200 rounded-lg text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                      />
                      <p className="text-xs text-zinc-500">
                        設定するとQiita記事の取得制限が60リクエスト/時間に緩和されます。
                        未設定でも基本機能は利用可能です。
                      </p>
                      <a
                        href="https://qiita.com/settings/applications"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                      >
                        Qiitaでトークンを発行
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 bg-zinc-100 border border-zinc-200 rounded-xl">
                    <p className="text-sm text-zinc-600">
                      <strong>その他のソース</strong>（Zenn、GitHub、Medium、DEV.to、Hashnode）は
                      公開APIを使用しているため、設定不要で利用できます。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Section */}
            {activeSection === "schedule" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    スケジュール設定
                  </h3>
                  <p className="text-sm text-zinc-500">
                    自動取得のスケジュールを設定します
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Auto Fetch Toggle */}
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl">
                    <div>
                      <p className="font-medium text-zinc-900">自動取得</p>
                      <p className="text-sm text-zinc-500">
                        Qiita・Zennのトレンドを自動で取得
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSchedule((prev) => ({
                          ...prev,
                          autoFetch: !prev.autoFetch,
                        }))
                      }
                      className={`relative w-12 h-7 rounded-full transition-colors ${
                        schedule.autoFetch ? "bg-emerald-500" : "bg-zinc-300"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                          schedule.autoFetch ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Fetch Time */}
                  <div className="p-4 bg-zinc-50 rounded-xl">
                    <label className="block text-sm font-medium text-zinc-900 mb-2">
                      取得時刻
                    </label>
                    <input
                      type="time"
                      value={schedule.fetchTime}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          fetchTime: e.target.value,
                        }))
                      }
                      disabled={!schedule.autoFetch}
                      className="w-full h-11 px-4 bg-white border border-zinc-200 rounded-xl text-zinc-900 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      毎日この時刻に外部コンテンツを自動取得します
                    </p>
                  </div>

                  {/* Timezone */}
                  <div className="p-4 bg-zinc-50 rounded-xl">
                    <label className="block text-sm font-medium text-zinc-900 mb-2">
                      タイムゾーン
                    </label>
                    <select
                      value={schedule.timezone}
                      onChange={(e) =>
                        setSchedule((prev) => ({
                          ...prev,
                          timezone: e.target.value,
                        }))
                      }
                      className="w-full h-11 px-4 bg-white border border-zinc-200 rounded-xl text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    >
                      <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Data Section */}
            {activeSection === "data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                    データ管理
                  </h3>
                  <p className="text-sm text-zinc-500">
                    データのエクスポートや削除を行います
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Export */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Database className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">データエクスポート</p>
                        <p className="text-sm text-zinc-500">
                          全データをJSON形式でダウンロード
                        </p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-200 text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-300 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                      エクスポート
                    </button>
                  </div>

                  {/* Delete */}
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">データ削除</p>
                        <p className="text-sm text-zinc-500">
                          全データを削除します（この操作は取り消せません）
                        </p>
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 text-sm font-medium rounded-lg hover:bg-red-500/30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                      全データを削除
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-zinc-200">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors btn-press"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    保存中...
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    保存しました
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    変更を保存
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
