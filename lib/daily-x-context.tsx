"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface SearchProgress {
  isActive: boolean;
  current: number;
  total: number;
  currentKeyword: string;
  type: "search" | "bookmarks" | "generate";
  errors: string[];
}

interface GenerateProgress {
  isActive: boolean;
  tweetAuthor: string;
  status: "generating" | "done" | "error";
  message: string;
}

interface DailyXContextType {
  progress: SearchProgress;
  generateProgress: GenerateProgress;
  startSearch: (
    userId: string,
    keywords: string[],
    onComplete?: () => void,
    maxResults?: number,
    minLikes?: number
  ) => void;
  cancelSearch: () => void;
  setGenerateProgress: (p: GenerateProgress) => void;
}

const DailyXContext = createContext<DailyXContextType | null>(null);

export function useDailyX() {
  const ctx = useContext(DailyXContext);
  if (!ctx) throw new Error("useDailyX must be inside DailyXProvider");
  return ctx;
}

export function DailyXProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<SearchProgress>({
    isActive: false,
    current: 0,
    total: 0,
    currentKeyword: "",
    type: "search",
    errors: [],
  });

  const [generateProgress, setGenerateProgress] = useState<GenerateProgress>({
    isActive: false,
    tweetAuthor: "",
    status: "done",
    message: "",
  });

  const [abortRef] = useState<{ current: boolean }>({ current: false });

  const cancelSearch = useCallback(() => {
    abortRef.current = true;
    setProgress((p) => ({ ...p, isActive: false }));
  }, [abortRef]);

  const startSearch = useCallback(
    (userId: string, keywords: string[], onComplete?: () => void, maxResults?: number, minLikes?: number) => {
      abortRef.current = false;

      setProgress({
        isActive: true,
        current: 0,
        total: 1,
        currentKeyword: `${keywords.length}キーワードを一括検索`,
        type: "search",
        errors: [],
      });

      // Send all keywords in ONE API call (batched server-side)
      (async () => {
        const errors: string[] = [];

        try {
          const res = await fetch("/api/daily-x/search-keyword", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, keywords, maxResults: maxResults || 20, minLikes: minLikes || 0 }),
          });
          const data = await res.json();
          if (!data.success) {
            errors.push(data.error || "Search failed");
          }
        } catch (err) {
          errors.push(err instanceof Error ? err.message : "Failed");
        }

        setProgress({
          isActive: false,
          current: 1,
          total: 1,
          currentKeyword: "",
          type: "search",
          errors,
        });

        onComplete?.();
      })();
    },
    [abortRef]
  );

  return (
    <DailyXContext.Provider value={{ progress, generateProgress, startSearch, cancelSearch, setGenerateProgress }}>
      {children}
    </DailyXContext.Provider>
  );
}
