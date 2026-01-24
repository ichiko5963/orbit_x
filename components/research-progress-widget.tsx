"use client";

import { useResearch } from "@/lib/research-context";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ChevronUp, ChevronDown, X, ArrowRight, Search, BookOpen, CheckCircle2 } from "lucide-react";

export function ResearchProgressWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { state, isMinimized, setMinimized, reset } = useResearch();

  // 生成ページにいる場合は表示しない（ページ内で表示するため）
  if (pathname === "/compose/generate") {
    return null;
  }

  // 検索中またはリサーチ中でなければ表示しない
  const isActive = state.isSearching || state.isResearching ||
    (state.searchQueries.length > 0 && !state.researchComplete);

  if (!isActive) {
    return null;
  }

  const handleNavigate = () => {
    router.push(state.returnPath);
  };

  const handleClose = () => {
    reset();
  };

  // 最小化表示
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all animate-pulse"
        >
          {state.isSearching || state.isResearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {state.isSearching ? `検索中 ${state.searchProgress}%` :
             state.isResearching ? `リサーチ中 ${state.researchProgress}%` :
             `${state.searchQueries.length}件の情報`}
          </span>
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 展開表示
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
        <div className="flex items-center gap-2">
          {state.isSearching || state.isResearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span className="font-medium text-sm">情報自動補足</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4">
        {/* 検索中 */}
        {state.isSearching && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">{state.searchMessage}</span>
              <span className="font-bold text-blue-600">{state.searchProgress}%</span>
            </div>
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${state.searchProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ディープリサーチ中 */}
        {state.isResearching && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">{state.researchMessage}</span>
              <span className="font-bold text-indigo-600">{state.researchProgress}%</span>
            </div>
            <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${state.researchProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {state.searchQueries.filter(q => q.selected).length}件のテーマについて詳細調査中
            </p>
          </div>
        )}

        {/* 検索完了・テーマ選択待ち */}
        {!state.isSearching && !state.isResearching && state.searchQueries.length > 0 && !state.researchComplete && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">検索完了</span>
            </div>
            <p className="text-xs text-zinc-600">
              {state.searchQueries.length}件の情報が見つかりました
            </p>
            <p className="text-xs text-zinc-500">
              {state.searchQueries.filter(q => q.selected).length}件選択中
            </p>
          </div>
        )}

        {/* リサーチ完了 */}
        {state.researchComplete && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">リサーチ完了</span>
            </div>
            <p className="text-xs text-zinc-600">
              {state.deepResearch?.length.toLocaleString()}文字の情報を収集しました
            </p>
          </div>
        )}

        {/* 戻るボタン */}
        <button
          onClick={handleNavigate}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
        >
          投稿作成に戻る
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
