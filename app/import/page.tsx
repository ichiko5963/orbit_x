"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  Info,
  Sparkles,
} from "lucide-react";

const steps = [
  "CSVファイル読み込み",
  "データ検証",
  "構造抽出 (AI)",
  "カテゴリー分類",
  "型テンプレート生成",
  "口調抽出",
];

const columns = [
  { name: "tweet_id", desc: "投稿ID" },
  { name: "text", desc: "投稿本文" },
  { name: "created_at", desc: "投稿日時" },
  { name: "impression_count", desc: "インプレッション" },
  { name: "like_count", desc: "いいね" },
  { name: "retweet_count", desc: "RT" },
  { name: "reply_count", desc: "リプ" },
];

const tiers = [
  { tier: "S", cond: "200いいね以上", rule: "完全同文再投稿OK", color: "bg-amber-500 text-black" },
  { tier: "A", cond: "100–199いいね", rule: "構文同一・内容差替", color: "bg-violet-500" },
  { tier: "B", cond: "50–99いいね", rule: "構文模倣・差替多め", color: "bg-blue-500" },
  { tier: "C", cond: "49以下", rule: "参照のみ", color: "bg-zinc-600" },
];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".csv")) setFile(f);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setCompletedSteps([]);

    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise((r) => setTimeout(r, 1200));
      setCompletedSteps((prev) => [...prev, i]);
    }

    setCurrentStep(-1);
    setIsProcessing(false);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-zinc-500 text-sm mb-1">Import</p>
        <h1 className="text-3xl font-bold text-white">CSVインポート</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Upload */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${
                  isDragging ? "border-violet-500 bg-violet-500/5" : "border-white/10 hover:border-white/20"
                }`}
              >
                <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-white mb-1">
                  ドラッグ＆ドロップ
                </p>
                <p className="text-sm text-zinc-500 mb-4">または</p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv"
                />
                <label
                  htmlFor="csv"
                  className="inline-block px-5 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 cursor-pointer transition-colors"
                >
                  ファイルを選択
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/[0.04] rounded-xl">
                  <FileText className="w-8 h-8 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{file.name}</p>
                    <p className="text-sm text-zinc-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {!isProcessing && (
                    <button
                      onClick={() => { setFile(null); setCompletedSteps([]); }}
                      className="p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      インポート開始
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Columns */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-medium text-zinc-400">必須カラム</h3>
            </div>
            <div className="space-y-2">
              {columns.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between py-2 px-3 bg-white/[0.02] rounded-lg"
                >
                  <code className="text-sm text-violet-400">{c.name}</code>
                  <span className="text-sm text-zinc-500">{c.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="space-y-6">
          {/* Steps */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">処理ステップ</h3>
            <div className="space-y-2">
              {steps.map((step, i) => {
                const isComplete = completedSteps.includes(i);
                const isCurrent = currentStep === i;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isCurrent
                        ? "bg-violet-500/10 border border-violet-500/30"
                        : isComplete
                        ? "bg-emerald-500/5"
                        : "bg-white/[0.02]"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-violet-400 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-700 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        isComplete || isCurrent ? "text-white" : "text-zinc-500"
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tiers */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">ティア設計</h3>
            <div className="space-y-2">
              {tiers.map((t) => (
                <div
                  key={t.tier}
                  className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl"
                >
                  <span
                    className={`${t.color} text-xs font-bold px-2.5 py-1 rounded-lg`}
                  >
                    {t.tier}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-white">{t.cond}</p>
                    <p className="text-xs text-zinc-500">{t.rule}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
