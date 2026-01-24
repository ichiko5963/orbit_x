"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SearchQuery {
  id: string;
  query: string;
  category: string;
  description: string;
  selected: boolean;
  source?: string;
  keywords?: string[];
  date?: string;
}

interface ResearchState {
  // 検索フェーズ
  isSearching: boolean;
  searchProgress: number;
  searchMessage: string;
  searchQueries: SearchQuery[];
  searchSummary: string;
  searchedAt: string;

  // ディープリサーチフェーズ
  isResearching: boolean;
  researchProgress: number;
  researchMessage: string;
  deepResearch: string | null;
  researchComplete: boolean;

  // 元のコンテンツ
  originalContent: string;
  category: string;

  // ページ復帰用
  returnPath: string;
}

interface ResearchContextType {
  state: ResearchState;
  // 検索開始
  startSearch: (content: string, category: string) => void;
  // 検索進捗更新
  updateSearchProgress: (progress: number, message: string) => void;
  // 検索完了
  completeSearch: (queries: SearchQuery[], summary: string, searchedAt: string) => void;
  // クエリ選択
  toggleQuery: (id: string) => void;
  selectAllQueries: () => void;
  // ディープリサーチ開始
  startDeepResearch: () => void;
  // リサーチ進捗更新
  updateResearchProgress: (progress: number, message: string) => void;
  // リサーチ完了
  completeResearch: (research: string) => void;
  // リセット
  reset: () => void;
  // 最小化/復帰
  isMinimized: boolean;
  setMinimized: (minimized: boolean) => void;
}

const initialState: ResearchState = {
  isSearching: false,
  searchProgress: 0,
  searchMessage: "",
  searchQueries: [],
  searchSummary: "",
  searchedAt: "",
  isResearching: false,
  researchProgress: 0,
  researchMessage: "",
  deepResearch: null,
  researchComplete: false,
  originalContent: "",
  category: "",
  returnPath: "/compose/generate",
};

const ResearchContext = createContext<ResearchContextType | null>(null);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResearchState>(initialState);
  const [isMinimized, setMinimized] = useState(false);

  const startSearch = useCallback((content: string, category: string) => {
    setState({
      ...initialState,
      isSearching: true,
      searchProgress: 0,
      searchMessage: "検索を開始しています...",
      originalContent: content,
      category,
      returnPath: "/compose/generate",
    });
    setMinimized(false);
  }, []);

  const updateSearchProgress = useCallback((progress: number, message: string) => {
    setState(prev => ({
      ...prev,
      searchProgress: progress,
      searchMessage: message,
    }));
  }, []);

  const completeSearch = useCallback((queries: SearchQuery[], summary: string, searchedAt: string) => {
    setState(prev => ({
      ...prev,
      isSearching: false,
      searchProgress: 100,
      searchMessage: "検索完了",
      searchQueries: queries,
      searchSummary: summary,
      searchedAt,
    }));
  }, []);

  const toggleQuery = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      searchQueries: prev.searchQueries.map(q =>
        q.id === id ? { ...q, selected: !q.selected } : q
      ),
    }));
  }, []);

  const selectAllQueries = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchQueries: prev.searchQueries.map(q => ({ ...q, selected: true })),
    }));
  }, []);

  const startDeepResearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      isResearching: true,
      researchProgress: 0,
      researchMessage: "ディープリサーチを開始...",
    }));
  }, []);

  const updateResearchProgress = useCallback((progress: number, message: string) => {
    setState(prev => ({
      ...prev,
      researchProgress: progress,
      researchMessage: message,
    }));
  }, []);

  const completeResearch = useCallback((research: string) => {
    setState(prev => ({
      ...prev,
      isResearching: false,
      researchProgress: 100,
      researchMessage: "リサーチ完了",
      deepResearch: research,
      researchComplete: true,
    }));
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
    setMinimized(false);
  }, []);

  return (
    <ResearchContext.Provider
      value={{
        state,
        startSearch,
        updateSearchProgress,
        completeSearch,
        toggleQuery,
        selectAllQueries,
        startDeepResearch,
        updateResearchProgress,
        completeResearch,
        reset,
        isMinimized,
        setMinimized,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error("useResearch must be used within a ResearchProvider");
  }
  return context;
}
