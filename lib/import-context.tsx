"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from "react";

interface ImportProgress {
  isProcessing: boolean;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  percentage: number;
  processedCount: number;
  totalCount: number;
  error: string | null;
  result: ImportResult | null;
  fileName: string | null;
}

interface ImportResult {
  total: number;
  tierS: number;
  tierA: number;
  tierB: number;
  tierC: number;
  categories: number;
  duplicateCount?: number;
  savedCount?: number;
}

interface ImportContextType {
  progress: ImportProgress;
  startImport: (file: File, userId: string) => void;
  resetImport: () => void;
}

const defaultProgress: ImportProgress = {
  isProcessing: false,
  currentStep: -1,
  totalSteps: 6,
  stepName: "",
  percentage: 0,
  processedCount: 0,
  totalCount: 0,
  error: null,
  result: null,
  fileName: null,
};

const ImportContext = createContext<ImportContextType | undefined>(undefined);

const steps = [
  { name: "ファイル読み込み", description: "CSVファイルを解析中" },
  { name: "データ検証", description: "必須カラムを確認中" },
  { name: "構造抽出", description: "AIが投稿構造を分析中" },
  { name: "カテゴリー分類", description: "投稿をカテゴリーに分類中" },
  { name: "型テンプレート生成", description: "再利用可能な型を抽出中" },
  { name: "口調分析", description: "文体パターンを分析中" },
];

export function ImportProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ImportProgress>(defaultProgress);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startImport = useCallback(async (file: File, userId: string) => {
    if (progress.isProcessing) return;

    // Create abort controller for this import
    abortControllerRef.current = new AbortController();

    setProgress({
      ...defaultProgress,
      isProcessing: true,
      fileName: file.name,
    });

    try {
      // Step 0: ファイル読み込み
      setProgress((prev) => ({
        ...prev,
        currentStep: 0,
        stepName: steps[0].name,
        percentage: 5,
      }));

      // Filter @ containing lines
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

      const totalPosts = filteredLines.length - 1; // Minus header
      setProgress((prev) => ({
        ...prev,
        totalCount: totalPosts,
        percentage: 15,
      }));

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 1: データ検証
      setProgress((prev) => ({
        ...prev,
        currentStep: 1,
        stepName: steps[1].name,
        percentage: 25,
      }));

      const filteredCsv = filteredLines.join("\n");
      const blob = new Blob([filteredCsv], { type: "text/csv" });
      const filteredFile = new File([blob], file.name, { type: "text/csv" });

      const formData = new FormData();
      formData.append("file", filteredFile);
      formData.append("userId", userId);

      // Update progress during API call
      setProgress((prev) => ({
        ...prev,
        currentStep: 2,
        stepName: steps[2].name,
        percentage: 35,
      }));

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "インポートに失敗しました");
      }

      // Simulate remaining steps with progress animation
      for (let i = 3; i < steps.length; i++) {
        setProgress((prev) => ({
          ...prev,
          currentStep: i,
          stepName: steps[i].name,
          percentage: 35 + ((i - 2) * 65) / (steps.length - 2),
          processedCount: Math.floor((prev.totalCount * (i - 2)) / (steps.length - 2)),
        }));
        await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 200));
      }

      // Complete
      setProgress((prev) => ({
        ...prev,
        isProcessing: false,
        currentStep: -1,
        stepName: "",
        percentage: 100,
        processedCount: prev.totalCount,
        result: {
          ...data.stats,
          duplicateCount: data.duplicateCount,
          savedCount: data.savedCount,
        },
      }));
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Import was cancelled
        setProgress(defaultProgress);
        return;
      }

      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setProgress((prev) => ({
        ...prev,
        isProcessing: false,
        currentStep: -1,
        error: message,
      }));
    }
  }, [progress.isProcessing]);

  const resetImport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setProgress(defaultProgress);
  }, []);

  return (
    <ImportContext.Provider value={{ progress, startImport, resetImport }}>
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const context = useContext(ImportContext);
  if (context === undefined) {
    throw new Error("useImport must be used within an ImportProvider");
  }
  return context;
}
