"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Sparkles,
  Send,
  Copy,
  RotateCcw,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Wand2,
  FileText,
  ChevronDown,
  Calendar,
  Clock,
} from "lucide-react";

const templates = [
  { id: "insight", name: "気づき共有型", example: "〇〇で最も大切なのは「△△」じゃない。\n\n本当に大切なのは「□□」。" },
  { id: "news", name: "速報・ニュース型", example: "【朗報】〇〇が△△に対応\n\n□□の組み合わせが最強。" },
  { id: "list", name: "リスト型", example: "エンジニア3年目で気づいたこと\n\n・〇〇より△△\n・□□より■■" },
  { id: "thread", name: "スレッド型", example: "〇〇について解説します🧵\n\n↓" },
];

const categories = ["マインド", "速報", "ノウハウ", "キャリア", "技術", "ツール", "その他"];

const tones = [
  { id: "casual", name: "カジュアル" },
  { id: "professional", name: "プロフェッショナル" },
  { id: "energetic", name: "エネルギッシュ" },
];

export default function ComposePage() {
  const [activeTab, setActiveTab] = useState<"compose" | "drafts">("compose");
  const [postText, setPostText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [tone, setTone] = useState("casual");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxLength = 280;
  const charCount = postText.length;
  const isOverLimit = charCount > maxLength;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !topic) return;

    setIsGenerating(true);
    setError(null);

    try {
      const template = templates.find(t => t.id === selectedTemplate);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "template",
          template: template?.example,
          topic,
          category,
          tone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      setPostText(data.text);
      setShowTemplates(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(postText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePost = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`;
    window.open(tweetUrl, "_blank");
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
          AI投稿作成
        </h1>
        <p className="text-lg text-zinc-500">
          AIの力で、バズる投稿を効率的に作成
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("compose")}
              className={`px-6 py-2.5 rounded-lg text-base font-medium transition-all ${
                activeTab === "compose"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              作成
            </button>
            <button
              onClick={() => setActiveTab("drafts")}
              className={`px-6 py-2.5 rounded-lg text-base font-medium transition-all ${
                activeTab === "drafts"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              下書き
            </button>
          </div>

          {/* Editor Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Text Area */}
            <div className="p-6">
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="今何してる？"
                className="w-full h-48 text-lg text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none leading-relaxed"
              />

              {/* Image Preview */}
              {selectedImage && (
                <div className="relative mt-4 rounded-xl overflow-hidden border border-zinc-200">
                  <Image
                    src={selectedImage}
                    alt="Selected"
                    width={400}
                    height={300}
                    className="w-full h-auto max-h-64 object-cover"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-3 right-3 p-2 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Editor Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Image Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                  title="画像を追加"
                >
                  <ImageIcon className="w-6 h-6" />
                </button>

                {/* AI Generate Button */}
                <button
                  onClick={() => setShowTemplates(!showTemplates)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium transition-all ${
                    showTemplates
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  AIで生成
                </button>

                {/* Schedule Button */}
                <button
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  予約
                </button>
              </div>

              {/* Character Count & Post */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-semibold ${isOverLimit ? "text-red-500" : "text-zinc-700"}`}>
                    {charCount}
                  </span>
                  <span className="text-zinc-400">/</span>
                  <span className="text-zinc-400">{maxLength}</span>
                </div>

                <button
                  onClick={handlePost}
                  disabled={!postText.trim() || isOverLimit}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white text-base font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Send className="w-5 h-5" />
                  ポストする
                </button>
              </div>
            </div>
          </div>

          {/* AI Generation Panel */}
          {showTemplates && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-emerald-500" />
                  AI投稿生成
                </h3>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-3">
                  テンプレート
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        selectedTemplate === template.id
                          ? "bg-emerald-50 border-2 border-emerald-500"
                          : "bg-zinc-50 border-2 border-transparent hover:border-zinc-200"
                      }`}
                    >
                      <p className="font-medium text-zinc-900">{template.name}</p>
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                        {template.example}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Input */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  トピック・キーワード
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="例：プログラミング学習、React、キャリア..."
                  className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Category & Tone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    カテゴリー
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                      <option value="">選択してください</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    口調
                  </label>
                  <div className="relative">
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full h-12 px-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    >
                      {tones.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!selectedTemplate || !topic || isGenerating}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    投稿を生成
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              クイックアクション
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleCopy}
                disabled={!postText}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    コピー完了
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    テキストをコピー
                  </>
                )}
              </button>
              <button
                onClick={() => setPostText("")}
                disabled={!postText}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                リセット
              </button>
            </div>
          </div>

          {/* Character Progress */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              文字数
            </h3>
            <div className="flex items-end gap-2 mb-4">
              <span className={`text-4xl font-bold ${isOverLimit ? "text-red-500" : "text-zinc-900"}`}>
                {charCount}
              </span>
              <span className="text-xl text-zinc-400 mb-1">/ {maxLength}</span>
            </div>
            <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isOverLimit
                    ? "bg-red-500"
                    : charCount > maxLength * 0.8
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min((charCount / maxLength) * 100, 100)}%`,
                }}
              />
            </div>
            {isOverLimit && (
              <p className="mt-3 text-sm text-red-500">
                {charCount - maxLength}文字オーバーしています
              </p>
            )}
          </div>

          {/* Tips */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">
              💡 Tips
            </h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li>• 具体的なキーワードを入れると効果的</li>
              <li>• 画像を追加するとエンゲージメント向上</li>
              <li>• 140文字以内が読まれやすい</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
