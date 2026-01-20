"use client";

import { useState } from "react";
import {
  FolderOpen,
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  BarChart3,
  Hash,
  GripVertical,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string;
  postCount: number;
  description: string;
}

const initialCategories: Category[] = [
  {
    id: "1",
    name: "マインド",
    color: "#8b5cf6",
    postCount: 45,
    description: "エンジニアとしての考え方・心構え",
  },
  {
    id: "2",
    name: "速報",
    color: "#ef4444",
    postCount: 23,
    description: "技術ニュース・アップデート情報",
  },
  {
    id: "3",
    name: "ノウハウ",
    color: "#10b981",
    postCount: 67,
    description: "実践的なテクニック・Tips",
  },
  {
    id: "4",
    name: "キャリア",
    color: "#f59e0b",
    postCount: 31,
    description: "転職・キャリアアップ関連",
  },
  {
    id: "5",
    name: "技術",
    color: "#3b82f6",
    postCount: 89,
    description: "プログラミング・技術解説",
  },
  {
    id: "6",
    name: "ツール",
    color: "#ec4899",
    postCount: 28,
    description: "開発ツール・サービス紹介",
  },
];

const colorOptions = [
  "#8b5cf6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(colorOptions[0]);

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setNewName(category.name);
      setNewDescription(category.description);
      setNewColor(category.color);
    } else {
      setEditingCategory(null);
      setNewName("");
      setNewDescription("");
      setNewColor(colorOptions[0]);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!newName) return;

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editingCategory.id
            ? { ...cat, name: newName, description: newDescription, color: newColor }
            : cat
        )
      );
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: newName,
        description: newDescription,
        color: newColor,
        postCount: 0,
      };
      setCategories((prev) => [...prev, newCategory]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const totalPosts = categories.reduce((sum, cat) => sum + cat.postCount, 0);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-zinc-500">Categories</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            カテゴリー管理
          </h1>
          <p className="text-zinc-500">
            投稿のカテゴリーを作成・編集して、コンテンツを整理
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors btn-press"
        >
          <Plus className="w-4 h-4" />
          カテゴリー追加
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Hash className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">{categories.length}</p>
              <p className="text-sm text-zinc-500">カテゴリー</p>
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">{totalPosts}</p>
              <p className="text-sm text-zinc-500">総投稿数</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="space-y-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="group flex items-center gap-4 p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 transition-all shadow-sm"
          >
            <div className="text-zinc-400 cursor-grab">
              <GripVertical className="w-5 h-5" />
            </div>

            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: category.color + "30" }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-zinc-900">{category.name}</h3>
                <span className="px-2 py-0.5 text-xs bg-zinc-100 text-zinc-500 rounded">
                  {category.postCount}件
                </span>
              </div>
              <p className="text-sm text-zinc-500 truncate">
                {category.description}
              </p>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleOpenModal(category)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-zinc-500 mb-1">カテゴリーがありません</p>
          <p className="text-sm text-zinc-400 mb-6">
            新しいカテゴリーを作成して、投稿を整理しましょう
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors btn-press"
          >
            <Plus className="w-4 h-4" />
            カテゴリーを作成
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-md p-6 bg-white border border-zinc-300 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingCategory ? "カテゴリーを編集" : "カテゴリーを作成"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">
                  カテゴリー名
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例：マインド"
                  className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">
                  説明
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="例：エンジニアとしての考え方"
                  className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">
                  カラー
                </label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-9 h-9 rounded-lg transition-all ${
                        newColor === color
                          ? "ring-2 ring-zinc-900 ring-offset-2 ring-offset-white"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 text-zinc-500 text-sm font-medium rounded-xl hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={!newName}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors btn-press"
              >
                <CheckCircle2 className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
