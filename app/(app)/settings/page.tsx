"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

interface SettingSection {
  id: string;
  title: string;
  icon: typeof Settings;
}

const sections: SettingSection[] = [
  { id: "profile", title: "プロフィール", icon: User },
  { id: "patterns", title: "投稿パターン", icon: FileText },
  { id: "notifications", title: "通知", icon: Bell },
  { id: "api", title: "API連携", icon: Key },
  { id: "schedule", title: "スケジュール", icon: Clock },
  { id: "data", title: "データ", icon: Database },
];

export default function SettingsPage() {
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

  // X API connection state
  const [xConnected, setXConnected] = useState(false);
  const [xUser, setXUser] = useState<{ name: string; username: string } | null>(null);
  const [xLoading, setXLoading] = useState(true);
  const [xError, setXError] = useState<string | null>(null);

  // Check X connection on mount
  useEffect(() => {
    const checkXConnection = async () => {
      try {
        const response = await fetch("/api/twitter/verify");
        const data = await response.json();
        setXConnected(data.connected);
        if (data.user) {
          setXUser(data.user);
        }
        if (!data.connected && data.message) {
          setXError(data.message);
        }
      } catch (error) {
        setXError("Failed to check X connection");
      } finally {
        setXLoading(false);
      }
    };
    checkXConnection();
  }, []);

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

                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                    U
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">ユーザー名</p>
                    <p className="text-sm text-zinc-500">user@example.com</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-2">
                      表示名
                    </label>
                    <input
                      type="text"
                      defaultValue="ユーザー"
                      className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-2">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      defaultValue="user@example.com"
                      className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                    />
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
                    API連携
                  </h3>
                  <p className="text-sm text-zinc-500">
                    外部サービスとの連携を設定します
                  </p>
                </div>

                <div className="space-y-4">
                  {/* OpenAI */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <Key className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">OpenAI API</p>
                          <p className="text-xs text-zinc-500">AI投稿生成に使用</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-600 rounded-lg">
                        接続済み
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        defaultValue="sk-xxxx...xxxx"
                        className="w-full h-10 px-4 bg-white border border-zinc-200 rounded-lg text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                      />
                    </div>
                  </div>

                  {/* X API */}
                  <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          xConnected ? "bg-blue-500/20" : "bg-zinc-200"
                        }`}>
                          <Globe className={`w-5 h-5 ${xConnected ? "text-blue-400" : "text-zinc-400"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">X (Twitter) API</p>
                          <p className="text-xs text-zinc-500">
                            {xConnected && xUser
                              ? `@${xUser.username} として接続中`
                              : "予約投稿の自動投稿に使用"}
                          </p>
                        </div>
                      </div>
                      {xLoading ? (
                        <span className="px-2.5 py-1 text-xs bg-zinc-200 text-zinc-500 rounded-lg">
                          確認中...
                        </span>
                      ) : xConnected ? (
                        <span className="px-2.5 py-1 text-xs bg-emerald-500/20 text-emerald-600 rounded-lg">
                          接続済み
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs bg-amber-500/20 text-amber-600 rounded-lg">
                          未設定
                        </span>
                      )}
                    </div>
                    {xConnected && xUser ? (
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-emerald-700">
                            {xUser.name}
                          </p>
                          <p className="text-xs text-emerald-600">
                            予約投稿は自動的にこのアカウントから投稿されます
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {xError && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-700">{xError}</p>
                          </div>
                        )}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-700 mb-2">
                            <strong>X API の設定方法:</strong>
                          </p>
                          <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                            <li>X Developer Portal でアプリを作成</li>
                            <li>APIキーとアクセストークンを取得</li>
                            <li>.env.local に設定を追加</li>
                          </ol>
                        </div>
                        <a
                          href="https://developer.twitter.com/en/portal/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-zinc-200 text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-300 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          X Developer Portal を開く
                        </a>
                      </div>
                    )}
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
