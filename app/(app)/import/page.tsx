"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useImport } from "@/lib/import-context";

interface ProcessStep {
  name: string;
  description: string;
}

const steps: ProcessStep[] = [
  { name: "ファイル読み込み", description: "CSVファイルを解析中" },
  { name: "データ検証", description: "カラムを確認中" },
  { name: "構造抽出", description: "AIが投稿構造を分析中" },
  { name: "カテゴリー分類", description: "投稿をカテゴリーに分類中" },
  { name: "型テンプレート生成", description: "再利用可能な型を抽出中" },
  { name: "口調分析", description: "文体パターンを分析中" },
];

// Supported CSV formats
const csvFormats = [
  {
    name: "X Premium形式",
    description: "X Premiumのエクスポート",
    columns: ["日付", "ポスト本文", "ポストのリンク", "インプレッション数", "いいね", "エンゲージメント"],
  },
  {
    name: "シンプル形式",
    description: "基本的なCSV",
    columns: ["投稿日時", "投稿本文", "いいね数", "リツイート数"],
  },
];

const tiers = [
  { tier: "S", condition: "200+いいね", rule: "完全同文再投稿OK", bgColor: "bg-amber-100", textColor: "text-amber-700" },
  { tier: "A", condition: "100-199いいね", rule: "構文同一・内容差替", bgColor: "bg-violet-100", textColor: "text-violet-700" },
  { tier: "B", condition: "50-99いいね", rule: "構文模倣・差替多め", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  { tier: "C", condition: "49以下", rule: "参照のみ", bgColor: "bg-zinc-100", textColor: "text-zinc-700" },
];

export default function ImportPage() {
  const { user } = useAuth();
  const { progress, startImport, resetImport } = useImport();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync file with progress state
  useEffect(() => {
    if (progress.fileName && !file) {
      // Import is running but page was navigated away and back
      // We don't have the file reference anymore, but we can show progress
    }
  }, [progress.fileName, file]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith(".csv")) {
      setFile(droppedFile);
      setLocalError(null);
    } else {
      setLocalError("CSVファイルのみアップロード可能です");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setLocalError(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setLocalError(null);
    resetImport();
  };

  const handleImport = async () => {
    if (!file || !user) return;
    startImport(file, user.uid);
  };

  const isProcessing = progress.isProcessing;
  const isComplete = progress.result !== null;
  const error = localError || progress.error;
  const result = progress.result;

  // Calculate which steps are completed based on percentage
  const completedSteps = steps.map((_, index) => {
    const stepPercentage = ((index + 1) / steps.length) * 100;
    return progress.percentage >= stepPercentage;
  }).reduce<number[]>((acc, completed, index) => {
    if (completed) acc.push(index);
    return acc;
  }, []);

  const currentStep = isProcessing ? Math.floor((progress.percentage / 100) * steps.length) : -1;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
          自分の投稿をインポート
        </h1>
        <p className="text-lg text-zinc-500">
          X PremiumからエクスポートしたCSVを取り込んで、<strong>あなたの過去投稿</strong>を自動分析
        </p>
        <p className="text-sm text-zinc-400 mt-1">
          ※インポートした投稿は「過去投稿一覧」に表示されます
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload Area */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            {!file && !isProcessing ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 mb-2">
                  CSVをドラッグ&ドロップ
                </h3>
                <p className="text-base text-zinc-500 mb-6">
                  または下のボタンからファイルを選択
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-700 text-base font-medium rounded-xl hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  ファイルを選択
                </label>
                <p className="mt-4 text-sm text-zinc-400">
                  @を含む行（リプライ等）は自動的に除外されます
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{file?.name || progress.fileName}</p>
                    <p className="text-sm text-zinc-500">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : "処理中..."}
                    </p>
                  </div>
                  {!isProcessing && !isComplete && (
                    <button
                      onClick={handleRemoveFile}
                      className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* Progress Bar - Main Feature */}
                {(isProcessing || isComplete) && (
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isProcessing ? (
                          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        )}
                        <span className="text-base font-semibold text-zinc-900">
                          {isProcessing ? progress.stepName || "処理中..." : "完了"}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-600">
                        {Math.round(progress.percentage)}%
                      </span>
                    </div>

                    {/* Large Progress Bar */}
                    <div className="relative h-4 bg-white rounded-full overflow-hidden shadow-inner">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress.percentage}%` }}
                      >
                        {/* Animated shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </div>
                    </div>

                    {/* Progress Details */}
                    {isProcessing && progress.totalCount > 0 && (
                      <p className="mt-3 text-sm text-zinc-500">
                        {progress.processedCount} / {progress.totalCount} 件処理中
                      </p>
                    )}

                    {/* Navigation Hint */}
                    {isProcessing && (
                      <p className="mt-2 text-xs text-emerald-600 bg-emerald-100 rounded-lg px-3 py-2">
                        💡 このページを離れても処理は継続します。右下に進捗が表示されます。
                      </p>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-base text-red-600">{error}</p>
                  </div>
                )}

                {/* Processing Steps */}
                {(isProcessing || isComplete) && (
                  <div className="space-y-2">
                    {steps.map((step, index) => {
                      const isCompleted = completedSteps.includes(index);
                      const isCurrent = currentStep === index;
                      return (
                        <div
                          key={step.name}
                          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                            isCurrent
                              ? "bg-emerald-50 border border-emerald-200"
                              : isCompleted
                              ? "bg-zinc-50"
                              : "bg-zinc-50/50"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-zinc-300 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-base font-medium ${
                                isCompleted || isCurrent ? "text-zinc-900" : "text-zinc-400"
                              }`}
                            >
                              {step.name}
                            </p>
                            {isCurrent && (
                              <p className="text-sm text-zinc-500">{step.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}


                {/* Results */}
                {result && (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-700">
                        インポート完了
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-3xl font-bold text-zinc-900">{result.savedCount || result.total}</p>
                        <p className="text-base text-zinc-500">新規追加</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-zinc-900">{result.tierS}</p>
                        <p className="text-base text-zinc-500">Tier S</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-zinc-900">{result.categories}</p>
                        <p className="text-base text-zinc-500">カテゴリー</p>
                      </div>
                      {result.duplicateCount !== undefined && result.duplicateCount > 0 && (
                        <div>
                          <p className="text-3xl font-bold text-amber-600">{result.duplicateCount}</p>
                          <p className="text-base text-zinc-500">重複スキップ</p>
                        </div>
                      )}
                    </div>
                    {result.duplicateCount !== undefined && result.duplicateCount > 0 && (
                      <p className="text-sm text-zinc-500 mt-3">
                        ※{result.duplicateCount}件は既にインポート済みのためスキップされました
                      </p>
                    )}
                  </div>
                )}

                {/* Action Button */}
                {!isComplete && (
                  <button
                    onClick={handleImport}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
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
                )}

                {isComplete && (
                  <a
                    href="/posts"
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                  >
                    投稿一覧を見る
                    <ArrowRight className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supported Formats */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-900">対応フォーマット</h3>
            </div>
            <div className="space-y-4">
              {csvFormats.map((format, index) => (
                <div key={format.name} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{format.name}</span>
                    <span className="text-xs text-zinc-400">{format.description}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {format.columns.map((col) => (
                      <code
                        key={col}
                        className="text-xs text-emerald-600 font-mono bg-zinc-50 px-2 py-1 rounded"
                      >
                        {col}
                      </code>
                    ))}
                  </div>
                  {index < csvFormats.length - 1 && (
                    <div className="border-t border-zinc-100 mt-3" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-4">
              ※ 日付（投稿日時）と本文は必須です。その他のカラムは任意です。
            </p>
          </div>

          {/* Auto Filter Rules */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-zinc-900">自動除外ルール</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-sm font-bold">@</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700">リプライ・メンション</p>
                  <p className="text-xs text-zinc-400">@を含む投稿は自動的に除外されます</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-zinc-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-zinc-500 text-xs font-bold">≤5</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700">低エンゲージメント</p>
                  <p className="text-xs text-zinc-400">いいね数が5以下の投稿は除外されます</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tier System */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">ティア設計</h3>
            <div className="space-y-3">
              {tiers.map((t) => (
                <div
                  key={t.tier}
                  className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl"
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${t.bgColor} flex items-center justify-center ${t.textColor} text-lg font-bold`}
                  >
                    {t.tier}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-medium text-zinc-900">{t.condition}</p>
                    <p className="text-sm text-zinc-500">{t.rule}</p>
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
