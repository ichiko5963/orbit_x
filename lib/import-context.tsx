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
      // Step 0: ファイル読み込み (0-10%)
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
        percentage: 10,
      }));

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 1: データ検証 (10-20%)
      setProgress((prev) => ({
        ...prev,
        currentStep: 1,
        stepName: steps[1].name,
        percentage: 15,
      }));

      const filteredCsv = filteredLines.join("\n");
      const blob = new Blob([filteredCsv], { type: "text/csv" });
      const filteredFile = new File([blob], file.name, { type: "text/csv" });

      const formData = new FormData();
      formData.append("file", filteredFile);
      formData.append("userId", userId);

      // Update progress during API call - Step 2: 構造抽出
      setProgress((prev) => ({
        ...prev,
        currentStep: 2,
        stepName: steps[2].name,
        percentage: 20,
        processedCount: 0,
      }));

      // Start a progress simulation during API call
      // Percentage is directly tied to processedCount/totalCount
      // 20% = start of processing, 95% = end of processing
      let simulatedProgress = 0;
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          // Progress goes up to 90% of totalCount during API processing
          const targetCount = Math.floor(prev.totalCount * 0.9);
          if (simulatedProgress < targetCount) {
            // Increment by random amount (1-3 items at a time)
            const increment = Math.floor(Math.random() * 3) + 1;
            simulatedProgress = Math.min(simulatedProgress + increment, targetCount);

            // Percentage directly tied to progress ratio
            // Range: 20% (start) to 95% (end)
            const progressRatio = simulatedProgress / prev.totalCount;
            const percentage = 20 + (progressRatio * 75); // 20% + up to 75% = 95%

            // Determine step based on progress ratio
            let currentStep = 2; // 構造抽出 (0-33%)
            if (progressRatio > 0.66) {
              currentStep = 4; // 型テンプレート生成 (66-100%)
            } else if (progressRatio > 0.33) {
              currentStep = 3; // カテゴリー分類 (33-66%)
            }

            return {
              ...prev,
              currentStep,
              stepName: steps[currentStep].name,
              processedCount: simulatedProgress,
              percentage: Math.round(percentage),
            };
          }
          return prev;
        });
      }, 100); // Update every 100ms for smooth progress

      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      // Clear the progress simulation interval
      clearInterval(progressInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "インポートに失敗しました");
      }

      // Quickly finish remaining progress after API completes
      setProgress((prev) => ({
        ...prev,
        currentStep: 5,
        stepName: steps[5].name,
        percentage: 95,
        processedCount: prev.totalCount,
      }));
      await new Promise((resolve) => setTimeout(resolve, 300));

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
