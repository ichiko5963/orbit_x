"use client";

import { useState, useCallback } from "react";
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
  Brain,
  Database,
  FolderOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveContextPosts, clearContextPosts } from "@/lib/firebase";

interface ProcessStep {
  name: string;
  description: string;
  weight: number; // Percentage weight
}

const steps: ProcessStep[] = [
  { name: "ファイル読み込み", description: "CSVファイルを解析中...", weight: 5 },
  { name: "データ検証", description: "必須カラムを確認中...", weight: 5 },
  { name: "AI構造分析", description: "AIが投稿の構造を分析中...", weight: 40 },
  { name: "カテゴリー分類", description: "AIが投稿をカテゴリーに分類中...", weight: 30 },
  { name: "ティア判定", description: "いいね数に基づきティアを判定中...", weight: 10 },
  { name: "データベース保存", description: "Firebaseに保存中...", weight: 10 },
];

const requiredColumns = [
  { name: "日付", description: "投稿日時" },
  { name: "ポスト本文", description: "投稿内容" },
  { name: "ポストのリンク", description: "投稿URL" },
  { name: "インプレッション数", description: "表示回数" },
  { name: "いいね", description: "いいね数" },
  { name: "エンゲージメント", description: "反応数" },
];

const tiers = [
  { tier: "S", condition: "200+いいね", rule: "完全同文再投稿OK", bgColor: "bg-amber-100", textColor: "text-amber-700" },
  { tier: "A", condition: "100-199いいね", rule: "構文同一・内容差替", bgColor: "bg-violet-100", textColor: "text-violet-700" },
  { tier: "B", condition: "50-99いいね", rule: "構文模倣・差替多め", bgColor: "bg-blue-100", textColor: "text-blue-700" },
  { tier: "C", condition: "49以下", rule: "参照のみ", bgColor: "bg-zinc-100", textColor: "text-zinc-700" },
];

export default function XContextPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentPostIndex, setCurrentPostIndex] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [result, setResult] = useState<{
    total: number;
    tierS: number;
    tierA: number;
    tierB: number;
    tierC: number;
    categories: string[];
  } | null>(null);

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
      setError(null);
    } else {
      setError("CSVファイルのみアップロード可能です");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setCompletedSteps([]);
    setCurrentStep(-1);
    setResult(null);
    setError(null);
    setFilteredCount(0);
    setProgress(0);
    setCurrentPostIndex(0);
    setTotalPosts(0);
  };

  const calculateProgress = (stepIndex: number, stepProgress: number = 100) => {
    let totalProgress = 0;
    for (let i = 0; i < stepIndex; i++) {
      totalProgress += steps[i].weight;
    }
    totalProgress += (steps[stepIndex]?.weight || 0) * (stepProgress / 100);
    return Math.min(totalProgress, 100);
  };

  const handleImport = async () => {
    if (!file || !user) return;

    setIsProcessing(true);
    setCompletedSteps([]);
    setError(null);
    setResult(null);
    setFilteredCount(0);
    setProgress(0);
    setCurrentPostIndex(0);

    try {
      // Step 0: ファイル読み込み
      setCurrentStep(0);
      setProgress(calculateProgress(0, 0));

      const text = await file.text();
      const lines = text.split("\n");
      const header = lines[0];
      let filtered = 0;
      const filteredLines = [header];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes("@")) {
          filtered++;
        } else if (lines[i].trim()) {
          filteredLines.push(lines[i]);
        }
      }

      setFilteredCount(filtered);
      setTotalPosts(filteredLines.length - 1);
      setProgress(calculateProgress(0, 100));
      setCompletedSteps((prev) => [...prev, 0]);

      // Step 1: データ検証
      setCurrentStep(1);
      setProgress(calculateProgress(1, 0));

      const filteredCsv = filteredLines.join("\n");

      // Validate columns
      const headerCols = header.split(",").map(c => c.trim().replace(/"/g, ""));
      const missingCols = requiredColumns.filter(
        rc => !headerCols.some(hc => hc.includes(rc.name))
      );

      if (missingCols.length > 0) {
        throw new Error(`必須カラムが不足しています: ${missingCols.map(c => c.name).join(", ")}`);
      }

      setProgress(calculateProgress(1, 100));
      setCompletedSteps((prev) => [...prev, 1]);

      // Step 2-5: AI処理とFirebase保存
      const formData = new FormData();
      formData.append("file", new Blob([filteredCsv], { type: "text/csv" }));
      formData.append("userId", user.uid);
      formData.append("totalSteps", "4");

      // Create an EventSource for streaming progress
      const response = await fetch("/api/context/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "分析に失敗しました");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.step !== undefined) {
                  setCurrentStep(data.step + 2); // Offset by 2 for file reading and validation
                  if (data.completed) {
                    setCompletedSteps((prev) => [...prev, data.step + 2]);
                  }
                }

                if (data.progress !== undefined) {
                  setProgress(calculateProgress(data.step + 2, data.progress));
                }

                if (data.currentPost !== undefined) {
                  setCurrentPostIndex(data.currentPost);
                }

                if (data.result) {
                  setResult(data.result);
                  // Save posts to Firebase
                  if (data.posts && user) {
                    try {
                      await clearContextPosts(user.uid); // Clear old posts first
                      await saveContextPosts(user.uid, data.posts);
                    } catch (saveError) {
                      console.error("Failed to save to Firebase:", saveError);
                    }
                  }
                }

                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      }

      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setCurrentStep(-1);
      setIsProcessing(false);
    }
  };

  const isComplete = result !== null;

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">ログインが必要です</h2>
          <p className="text-zinc-500">Xコンテキスト機能を使用するにはGoogleアカウントでログインしてください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
          Xコンテキスト
        </h1>
        <p className="text-lg text-zinc-500">
          X PremiumからエクスポートしたCSVを取り込んで、AIがあなたの投稿を分析・学習
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upload Area */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            {!file ? (
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
                    <p className="font-medium text-zinc-900 truncate">{file.name}</p>
                    <p className="text-sm text-zinc-500">
                      {(file.size / 1024).toFixed(1)} KB
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

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                    <p className="text-base text-red-600">{error}</p>
                  </div>
                )}

                {/* Progress Bar */}
                {(isProcessing || isComplete) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-700">
                        {isComplete ? "完了" : "処理中..."}
                      </span>
                      <span className="text-2xl font-bold text-emerald-600">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {currentStep >= 2 && currentStep < 4 && totalPosts > 0 && (
                      <p className="text-sm text-zinc-500 text-center">
                        {currentPostIndex} / {totalPosts} 件の投稿を分析中
                      </p>
                    )}
                  </div>
                )}

                {/* Processing Steps */}
                {(isProcessing || isComplete) && (
                  <div className="space-y-2 mt-4">
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
                          <span className="text-xs text-zinc-400">{step.weight}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Filtered Count */}
                {filteredCount > 0 && (isProcessing || isComplete) && (
                  <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-base text-amber-700">
                      @を含む{filteredCount}件の行を除外しました（リプライ等）
                    </p>
                  </div>
                )}

                {/* Results */}
                {result && (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <span className="text-lg font-semibold text-emerald-700">
                        コンテキスト学習完了
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-3xl font-bold text-zinc-900">{result.total}</p>
                        <p className="text-base text-zinc-500">総投稿数</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-zinc-900">{result.tierS}</p>
                        <p className="text-base text-zinc-500">Tier S</p>
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-zinc-900">{result.categories.length}</p>
                        <p className="text-base text-zinc-500">カテゴリー</p>
                      </div>
                    </div>
                    {result.categories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-3 py-1 bg-white text-zinc-700 text-sm rounded-lg border border-zinc-200"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
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
                        AI分析中...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        AI分析を開始
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
          {/* User Info */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-zinc-900">データ保存先</h3>
            </div>
            <p className="text-sm text-zinc-500 mb-3">
              分析結果は以下のアカウントに保存されます
            </p>
            <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-zinc-900">{user.displayName}</p>
                <p className="text-sm text-zinc-500">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Required Columns */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-900">必須カラム</h3>
            </div>
            <div className="space-y-2">
              {requiredColumns.map((col) => (
                <div
                  key={col.name}
                  className="flex items-center justify-between py-2 px-3 bg-zinc-50 rounded-lg"
                >
                  <code className="text-sm text-emerald-600 font-mono">{col.name}</code>
                  <span className="text-sm text-zinc-500">{col.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier System */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-zinc-900">ティア設計</h3>
            </div>
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
