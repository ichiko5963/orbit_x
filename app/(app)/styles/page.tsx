"use client";

import { useState } from "react";
import {
  Palette,
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  Smile,
  MessageSquare,
  Copy,
  Sparkles,
} from "lucide-react";

interface ToneStyle {
  id: string;
  name: string;
  description: string;
  example: string;
  emojiSet: string[];
  isDefault: boolean;
}

const initialStyles: ToneStyle[] = [
  {
    id: "1",
    name: "カジュアル",
    description: "親しみやすく、フレンドリーな口調",
    example: "〇〇やってみたんだけど、これマジで最高だった！みんなも試してみて〜",
    emojiSet: ["🎉", "✨", "😊", "👍", "🔥"],
    isDefault: true,
  },
  {
    id: "2",
    name: "プロフェッショナル",
    description: "専門的で信頼感のある口調",
    example: "本日は〇〇について解説します。この機能を活用することで、効率が大幅に向上します。",
    emojiSet: ["📊", "💡", "📌", "✅", "🎯"],
    isDefault: false,
  },
  {
    id: "3",
    name: "エネルギッシュ",
    description: "熱量高めで、モチベーションを上げる口調",
    example: "絶対にやったほうがいい！！これを知らないのは損！！今すぐ始めよう！！",
    emojiSet: ["🔥", "💪", "⚡", "🚀", "💯"],
    isDefault: false,
  },
  {
    id: "4",
    name: "シンプル",
    description: "絵文字なし、簡潔で読みやすい",
    example: "〇〇を試した結果、生産性が2倍になった。特に△△の機能が有用。",
    emojiSet: [],
    isDefault: false,
  },
];

const emojiOptions = [
  "🎉", "✨", "😊", "👍", "🔥", "💪", "⚡", "🚀", "💯", "📊",
  "💡", "📌", "✅", "🎯", "😎", "🙌", "💰", "📈", "🏆", "💎",
  "🤔", "😤", "🥳", "👀", "💻", "⌨️", "🖥️", "📱", "🛠️", "🧪",
];

export default function StylesPage() {
  const [styles, setStyles] = useState<ToneStyle[]>(initialStyles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<ToneStyle | null>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newExample, setNewExample] = useState("");
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleOpenModal = (style?: ToneStyle) => {
    if (style) {
      setEditingStyle(style);
      setNewName(style.name);
      setNewDescription(style.description);
      setNewExample(style.example);
      setSelectedEmojis(style.emojiSet);
    } else {
      setEditingStyle(null);
      setNewName("");
      setNewDescription("");
      setNewExample("");
      setSelectedEmojis([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!newName) return;

    if (editingStyle) {
      setStyles((prev) =>
        prev.map((s) =>
          s.id === editingStyle.id
            ? {
                ...s,
                name: newName,
                description: newDescription,
                example: newExample,
                emojiSet: selectedEmojis,
              }
            : s
        )
      );
    } else {
      const newStyle: ToneStyle = {
        id: Date.now().toString(),
        name: newName,
        description: newDescription,
        example: newExample,
        emojiSet: selectedEmojis,
        isDefault: false,
      };
      setStyles((prev) => [...prev, newStyle]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    setStyles((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setStyles((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.id === id,
      }))
    );
  };

  const toggleEmoji = (emoji: string) => {
    setSelectedEmojis((prev) =>
      prev.includes(emoji)
        ? prev.filter((e) => e !== emoji)
        : prev.length < 5
        ? [...prev, emoji]
        : prev
    );
  };

  const handleCopyExample = (style: ToneStyle) => {
    navigator.clipboard.writeText(style.example);
    setCopiedId(style.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-zinc-500">Styles</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
            口調・絵文字
          </h1>
          <p className="text-zinc-500">
            投稿のトーンと使用する絵文字セットを管理
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors btn-press"
        >
          <Plus className="w-4 h-4" />
          スタイル追加
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">{styles.length}</p>
              <p className="text-sm text-zinc-500">口調スタイル</p>
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Smile className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-900">
                {styles.reduce((sum, s) => sum + s.emojiSet.length, 0)}
              </p>
              <p className="text-sm text-zinc-500">登録絵文字</p>
            </div>
          </div>
        </div>
      </div>

      {/* Styles List */}
      <div className="space-y-4">
        {styles.map((style) => (
          <div
            key={style.id}
            className={`p-5 bg-white border rounded-2xl transition-all shadow-sm ${
              style.isDefault
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-zinc-900 text-lg">
                    {style.name}
                  </h3>
                  {style.isDefault && (
                    <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-600 rounded-lg border border-emerald-500/30">
                      デフォルト
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">{style.description}</p>
              </div>

              <div className="flex items-center gap-2">
                {!style.isDefault && (
                  <button
                    onClick={() => handleSetDefault(style.id)}
                    className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    デフォルトに設定
                  </button>
                )}
                <button
                  onClick={() => handleOpenModal(style)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(style.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Emoji Set */}
            {style.emojiSet.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-zinc-500">絵文字セット:</span>
                <div className="flex gap-1">
                  {style.emojiSet.map((emoji, i) => (
                    <span
                      key={i}
                      className="w-8 h-8 flex items-center justify-center bg-zinc-50 rounded-lg text-lg"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Example */}
            <div className="relative p-4 bg-zinc-50 rounded-xl">
              <p className="text-[15px] text-zinc-600 leading-relaxed pr-10">
                {style.example}
              </p>
              <button
                onClick={() => handleCopyExample(style)}
                className="absolute top-3 right-3 p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                {copiedId === style.id ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {styles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-50 flex items-center justify-center mb-4">
            <Palette className="w-8 h-8 text-zinc-400" />
          </div>
          <p className="text-zinc-500 mb-1">スタイルがありません</p>
          <p className="text-sm text-zinc-400 mb-6">
            口調スタイルを作成して、投稿の雰囲気を統一しましょう
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors btn-press"
          >
            <Plus className="w-4 h-4" />
            スタイルを作成
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
          <div className="relative w-full max-w-lg p-6 bg-white border border-zinc-300 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-zinc-900">
                {editingStyle ? "スタイルを編集" : "スタイルを作成"}
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
                  スタイル名
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例：カジュアル"
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
                  placeholder="例：親しみやすい口調"
                  className="w-full h-11 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">
                  例文
                </label>
                <textarea
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="この口調で書いた投稿の例..."
                  rows={3}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-2">
                  絵文字セット（最大5個）
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-xl">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleEmoji(emoji)}
                      className={`w-10 h-10 rounded-lg text-xl transition-all ${
                        selectedEmojis.includes(emoji)
                          ? "bg-emerald-500/20 ring-2 ring-emerald-500"
                          : "bg-white hover:bg-zinc-100"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {selectedEmojis.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-zinc-500">選択中:</span>
                    <div className="flex gap-1">
                      {selectedEmojis.map((emoji, i) => (
                        <span key={i} className="text-lg">
                          {emoji}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
