"use client";

import { useState } from "react";
import {
  Key,
  Bell,
  Shield,
  Clock,
  Database,
  Trash2,
  Download,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Select,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
} from "../components/ui";
import { PageHeader } from "../components/layout";

export default function SettingsPage() {
  const [xApiKey, setXApiKey] = useState("");
  const [xApiSecret, setXApiSecret] = useState("");
  const [xAccessToken, setXAccessToken] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [repostInterval, setRepostInterval] = useState("60");
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [autoSchedule, setAutoSchedule] = useState(false);

  return (
    <div className="p-8">
      <PageHeader
        title="設定"
        description="OrbitXの設定を管理します"
      />

      <Tabs defaultValue="api" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api">API設定</TabsTrigger>
          <TabsTrigger value="posting">投稿制御</TabsTrigger>
          <TabsTrigger value="data">データ管理</TabsTrigger>
        </TabsList>

        {/* API Settings */}
        <TabsContent value="api" className="space-y-6">
          {/* X API */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-blue-500/20">
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </div>
                <div>
                  <CardTitle>X API (Twitter API v2)</CardTitle>
                  <CardDescription>投稿に必要な認証情報</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-[--muted-foreground] mb-1.5 block">
                  API Key
                </label>
                <Input
                  type="password"
                  value={xApiKey}
                  onChange={(e) => setXApiKey(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="text-sm text-[--muted-foreground] mb-1.5 block">
                  API Secret
                </label>
                <Input
                  type="password"
                  value={xApiSecret}
                  onChange={(e) => setXApiSecret(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className="text-sm text-[--muted-foreground] mb-1.5 block">
                  Access Token
                </label>
                <Input
                  type="password"
                  value={xAccessToken}
                  onChange={(e) => setXAccessToken(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  {xApiKey ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[--success]" />
                      <span className="text-sm text-[--success]">接続済み</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-[--warning]" />
                      <span className="text-sm text-[--warning]">未設定</span>
                    </>
                  )}
                </div>
                <Button variant="secondary" size="sm">
                  <ExternalLink className="w-4 h-4" />
                  X Developer Portal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI API */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-purple-500/20">
                  <Key className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle>OpenAI API</CardTitle>
                  <CardDescription>構造抽出・投稿生成に使用（GPT-4）</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-[--muted-foreground] mb-1.5 block">
                  OpenAI API Key
                </label>
                <Input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                {openaiKey ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[--success]" />
                    <span className="text-sm text-[--success]">設定済み</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-[--warning]" />
                    <span className="text-sm text-[--warning]">未設定</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>設定を保存</Button>
          </div>
        </TabsContent>

        {/* Posting Control */}
        <TabsContent value="posting" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <CardTitle>再投稿間隔</CardTitle>
                  <CardDescription>同文再投稿の最小間隔（事故防止）</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Select
                value={repostInterval}
                onChange={(e) => setRepostInterval(e.target.value)}
                options={[
                  { value: "30", label: "30日" },
                  { value: "60", label: "60日（推奨）" },
                  { value: "90", label: "90日" },
                ]}
              />
              <p className="text-xs text-[--muted-foreground] mt-2">
                同一文面の投稿は、この期間が経過するまで再投稿できません
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-green-500/20">
                  <Shield className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <CardTitle>安全設定</CardTitle>
                  <CardDescription>投稿前の確認・制限</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="require-confirmation"
                  checked={requireConfirmation}
                  onChange={(e) => setRequireConfirmation(e.target.checked)}
                />
                <div>
                  <label htmlFor="require-confirmation" className="text-sm text-white cursor-pointer">
                    Tier A/B の投稿前に確認を表示
                  </label>
                  <p className="text-xs text-[--muted-foreground] mt-0.5">
                    完全同文再投稿ではない場合、内容確認を必須にします
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="auto-schedule"
                  checked={autoSchedule}
                  onChange={(e) => setAutoSchedule(e.target.checked)}
                />
                <div>
                  <label htmlFor="auto-schedule" className="text-sm text-white cursor-pointer">
                    自動スケジュール最適化（β）
                  </label>
                  <p className="text-xs text-[--muted-foreground] mt-0.5">
                    過去のエンゲージメントから最適な投稿時間を提案
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-red-500/20">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <CardTitle>ティア別制限</CardTitle>
                  <CardDescription>各ティアの再投稿ルール</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { tier: "S", condition: "200いいね以上", rule: "完全同文再投稿OK", variant: "tier-s" as const },
                  { tier: "A", condition: "100–199いいね", rule: "構文100%同一・内容一部差替", variant: "tier-a" as const },
                  { tier: "B", condition: "50–99いいね", rule: "構文模倣・差替多め", variant: "tier-b" as const },
                  { tier: "C", condition: "49以下", rule: "参照のみ（再投稿不可）", variant: "tier-c" as const },
                ].map((item) => (
                  <div
                    key={item.tier}
                    className="flex items-center gap-3 p-3 bg-[--muted] rounded-[--radius-sm]"
                  >
                    <Badge variant={item.variant}>{item.tier}</Badge>
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.condition}</p>
                      <p className="text-xs text-[--muted-foreground]">{item.rule}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button>設定を保存</Button>
          </div>
        </TabsContent>

        {/* Data Management */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-cyan-500/20">
                  <Database className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <CardTitle>データ統計</CardTitle>
                  <CardDescription>保存されているデータの概要</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "投稿データ", value: "0件" },
                  { label: "構造データ", value: "0件" },
                  { label: "カテゴリー", value: "8件" },
                  { label: "型テンプレート", value: "0件" },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-[--muted] rounded-[--radius-sm]">
                    <p className="text-xs text-[--muted-foreground]">{item.label}</p>
                    <p className="text-lg font-semibold text-white mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-blue-500/20">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle>データエクスポート</CardTitle>
                  <CardDescription>データのバックアップ</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" className="w-full justify-start">
                <Download className="w-4 h-4" />
                投稿データをエクスポート (CSV)
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <Download className="w-4 h-4" />
                構造データをエクスポート (JSON)
              </Button>
              <Button variant="secondary" className="w-full justify-start">
                <Download className="w-4 h-4" />
                すべてのデータをエクスポート
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-[--radius-sm] bg-red-500/20">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <CardTitle>データ削除</CardTitle>
                  <CardDescription>データの完全削除（取り消し不可）</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="danger" className="w-full justify-start">
                <Trash2 className="w-4 h-4" />
                外部コンテンツデータを削除
              </Button>
              <Button variant="danger" className="w-full justify-start">
                <Trash2 className="w-4 h-4" />
                すべてのデータを削除
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
