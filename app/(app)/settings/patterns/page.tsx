"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Save,
  X,
  RotateCcw,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getArticlePatterns,
  saveArticlePattern,
  updateArticlePattern,
  deleteArticlePattern,
  resetArticlePatternsToDefault,
  initializeArticlePatterns,
  ArticlePattern,
  DEFAULT_ARTICLE_PATTERNS,
} from "@/lib/firebase";

export default function PatternSettingsPage() {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<ArticlePattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit modal state
  const [editingPattern, setEditingPattern] = useState<ArticlePattern | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTemplate, setFormTemplate] = useState("");

  // Notification
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Load patterns
  useEffect(() => {
    const loadPatterns = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        await initializeArticlePatterns(user.uid);
        const loadedPatterns = await getArticlePatterns(user.uid);
        setPatterns(loadedPatterns);
      } catch (error) {
        console.error("Failed to load patterns:", error);
        showNotification("error", "パターンの読み込みに失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    loadPatterns();
  }, [user]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEdit = (pattern: ArticlePattern) => {
    setEditingPattern(pattern);
    setFormName(pattern.name);
    setFormDescription(pattern.description);
    setFormTemplate(pattern.template);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingPattern(null);
    setFormName("");
    setFormDescription("");
    setFormTemplate("");
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!user || !formName.trim() || !formTemplate.trim()) return;

    setIsSaving(true);
    try {
      if (isCreating) {
        // Create new pattern
        const newId = await saveArticlePattern(user.uid, {
          name: formName,
          description: formDescription,
          template: formTemplate,
          category: "記事紹介",
          isDefault: false,
        });
        setPatterns((prev) => [
          ...prev,
          {
            id: newId,
            name: formName,
            description: formDescription,
            template: formTemplate,
            category: "記事紹介",
            isDefault: false,
          },
        ]);
        showNotification("success", "パターンを追加しました");
      } else if (editingPattern?.id && !editingPattern.id.startsWith("default_")) {
        // Update existing pattern (only if not a default pattern ID)
        await updateArticlePattern(user.uid, editingPattern.id, {
          name: formName,
          description: formDescription,
          template: formTemplate,
        });
        setPatterns((prev) =>
          prev.map((p) =>
            p.id === editingPattern.id
              ? { ...p, name: formName, description: formDescription, template: formTemplate }
              : p
          )
        );
        showNotification("success", "パターンを更新しました");
      } else {
        // For default patterns, create a new one with the edits
        const newId = await saveArticlePattern(user.uid, {
          name: formName,
          description: formDescription,
          template: formTemplate,
          category: "記事紹介",
          isDefault: false,
        });
        // Reload patterns to get the updated list
        const loadedPatterns = await getArticlePatterns(user.uid);
        setPatterns(loadedPatterns);
        showNotification("success", "パターンを保存しました");
      }
      closeModal();
    } catch (error) {
      console.error("Save error:", error);
      showNotification("error", "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (patternId: string) => {
    if (!user || patternId.startsWith("default_")) return;

    if (!confirm("このパターンを削除しますか？")) return;

    try {
      await deleteArticlePattern(user.uid, patternId);
      setPatterns((prev) => prev.filter((p) => p.id !== patternId));
      showNotification("success", "パターンを削除しました");
    } catch (error) {
      console.error("Delete error:", error);
      showNotification("error", "削除に失敗しました");
    }
  };

  const handleResetToDefault = async () => {
    if (!user) return;

    if (!confirm("全てのパターンをデフォルトに戻しますか？カスタムパターンは削除されます。")) return;

    setIsLoading(true);
    try {
      await resetArticlePatternsToDefault(user.uid);
      const loadedPatterns = await getArticlePatterns(user.uid);
      setPatterns(loadedPatterns);
      showNotification("success", "デフォルトに戻しました");
    } catch (error) {
      console.error("Reset error:", error);
      showNotification("error", "リセットに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setEditingPattern(null);
    setIsCreating(false);
    setFormName("");
    setFormDescription("");
    setFormTemplate("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg ${
            notification.type === "success"
              ? "bg-emerald-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/external"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">投稿パターン設定</h1>
            <p className="text-zinc-500">記事紹介用の投稿パターンを管理</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            デフォルトに戻す
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規パターン
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
        <p className="text-sm text-blue-700">
          <strong>記事紹介カテゴリー</strong>のパターンです。外部コンテンツページでAI生成する際に使用されます。
          デフォルトパターンはそのまま使えますが、編集して自分用にカスタマイズすることもできます。
        </p>
      </div>

      {/* Patterns List */}
      <div className="space-y-4">
        {patterns.map((pattern, index) => (
          <div
            key={pattern.id || index}
            className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <h3 className="font-semibold text-zinc-900">{pattern.name}</h3>
                  {pattern.isDefault && (
                    <span className="px-2 py-0.5 text-xs bg-zinc-100 text-zinc-500 rounded">
                      デフォルト
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500 mb-3">{pattern.description}</p>
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-600 whitespace-pre-wrap font-mono">
                    {pattern.template}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(pattern)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                  title="編集"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                {!pattern.isDefault && pattern.id && !pattern.id.startsWith("default_") && (
                  <button
                    onClick={() => handleDelete(pattern.id!)}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {patterns.length === 0 && (
        <div className="text-center py-12 bg-zinc-50 rounded-xl">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
          <p className="text-zinc-500">パターンがありません</p>
          <button
            onClick={handleResetToDefault}
            className="mt-4 text-sm text-emerald-600 hover:underline"
          >
            デフォルトパターンを読み込む
          </button>
        </div>
      )}

      {/* Edit/Create Modal */}
      {(editingPattern || isCreating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">
                {isCreating ? "新規パターン作成" : "パターン編集"}
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-zinc-100">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  パターン名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例: 有益すぎた型"
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  説明
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="例: 詳細な機能紹介 + 効果を数字で示す"
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  テンプレート <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formTemplate}
                  onChange={(e) => setFormTemplate(e.target.value)}
                  placeholder="〇〇が公開した「△△」が有益すぎた。□□で■■を実現。▲▲な人は必読👇🧵"
                  rows={6}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  〇△□■▲●◆◇などの記号を使って、AIが埋める部分を示してください。絵文字（👇🧵😳↓など）も含めてOKです。
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 bg-zinc-50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !formName.trim() || !formTemplate.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
