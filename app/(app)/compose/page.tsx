"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  RotateCcw,
  X,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getContextPosts, saveScheduledPost } from "@/lib/firebase";
import {
  TemplateSelector,
  templates,
  ReferencePostSelector,
  ImageUploadGrid,
  ScheduleModal,
  PostPreview,
} from "@/app/components/compose";
import type { ReferencePost } from "@/app/components/compose";

const categories = ["マインド", "速報", "ノウハウ", "キャリア", "技術", "ツール", "その他"];

const tones = [
  { id: "casual", name: "カジュアル" },
  { id: "professional", name: "プロフェッショナル" },
  { id: "energetic", name: "エネルギッシュ" },
];

type GenerationStep = "input" | "template" | "reference" | "generating";

export default function ComposePage() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generation flow state
  const [generationStep, setGenerationStep] = useState<GenerationStep>("input");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const [referencePosts, setReferencePosts] = useState<ReferencePost[]>([]);
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);

  // Options
  const [category, setCategory] = useState("");
  const [tone, setTone] = useState("casual");
  const [showOptions, setShowOptions] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Character count
  const maxLength = 280;
  const displayText = generatedText || content;
  const charCount = displayText.length;
  const isOverLimit = charCount > maxLength;

  // Load context posts
  useEffect(() => {
    const loadContextPosts = async () => {
      if (!user) return;
      try {
        const posts = await getContextPosts(user.uid);
        setReferencePosts(
          posts.map((p: any) => ({
            id: p.id,
            text: p.text,
            likes: p.likes || 0,
            impressions: p.impressions || 0,
            tier: p.tier || "B",
            category: p.category || "その他",
          }))
        );
      } catch (err) {
        console.error("Failed to load context posts:", err);
      }
    };
    loadContextPosts();
  }, [user]);

  const handleStartGeneration = () => {
    if (!content.trim()) return;
    setGenerationStep("template");
    setError(null);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleNextToReference = () => {
    if (!selectedTemplate) return;
    setGenerationStep("reference");
  };

  const handleReferenceSelect = (postId: string | null) => {
    setSelectedReferenceId(postId);
  };

  const handleAutoSelect = async () => {
    if (!content || !selectedTemplate) return;
    setIsAutoSelecting(true);

    try {
      const response = await fetch("/api/auto-select-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          templateId: selectedTemplate,
          posts: referencePosts.filter((p) => p.tier === "S" || p.tier === "A"),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.selectedId) {
          setSelectedReferenceId(data.selectedId);
        }
      }
    } catch (err) {
      console.error("Auto select failed:", err);
    } finally {
      setIsAutoSelecting(false);
    }
  };

  const handleGenerate = async () => {
    if (!content || !selectedTemplate) return;

    setIsGenerating(true);
    setGenerationStep("generating");
    setError(null);

    try {
      const selectedRef = referencePosts.find((p) => p.id === selectedReferenceId);
      const mode = selectedRef ? "reference" : "template";

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          templateId: selectedTemplate,
          content,
          referenceText: selectedRef?.text,
          category,
          tone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      setGeneratedText(data.text);
      setGenerationStep("input");
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
      setGenerationStep("reference");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePost = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(displayText)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleSchedule = async (scheduledAt: Date) => {
    if (!user || !displayText.trim()) return;

    setIsScheduling(true);
    try {
      await saveScheduledPost(user.uid, {
        text: displayText,
        scheduledAt,
        status: "scheduled",
        imageUrls: images,
        generatedFrom: selectedTemplate
          ? {
              templateId: selectedTemplate,
              referencePostId: selectedReferenceId || undefined,
            }
          : undefined,
      });
      setShowScheduleModal(false);
      // Reset after scheduling
      setGeneratedText("");
      setContent("");
      setImages([]);
      setSelectedTemplate(null);
      setSelectedReferenceId(null);
    } catch (err) {
      console.error("Schedule failed:", err);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReset = () => {
    setContent("");
    setGeneratedText("");
    setImages([]);
    setSelectedTemplate(null);
    setSelectedReferenceId(null);
    setGenerationStep("input");
    setError(null);
  };

  const handleBack = () => {
    if (generationStep === "template") {
      setGenerationStep("input");
    } else if (generationStep === "reference") {
      setGenerationStep("template");
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
          AI投稿作成
        </h1>
        <p className="text-lg text-zinc-500">
          コンテキスト投稿を活用して、バズる投稿を効率的に作成
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Editor Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Input Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            {/* Content Input Section */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Text Input */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    投稿したい内容
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="投稿したい内容をペースト、または入力してください..."
                    className="w-full h-32 p-4 text-base text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed"
                  />
                </div>

                {/* AI Generate Button */}
                <button
                  onClick={handleStartGeneration}
                  disabled={!content.trim() || isGenerating}
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-2 w-28 h-32 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Sparkles className="w-8 h-8" />
                  <span className="text-sm font-semibold">AIで生成</span>
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div className="px-6 pb-6">
              <ImageUploadGrid images={images} onImagesChange={setImages} maxImages={4} />
            </div>

            {/* Generated Text Section */}
            {generatedText && (
              <div className="px-6 pb-6">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  生成されたテキスト（編集可能）
                </label>
                <textarea
                  value={generatedText}
                  onChange={(e) => setGeneratedText(e.target.value)}
                  className="w-full h-40 p-4 text-base text-zinc-900 bg-emerald-50 border-2 border-emerald-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed"
                />
              </div>
            )}

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Schedule Button */}
                <button
                  onClick={() => setShowScheduleModal(true)}
                  disabled={!displayText.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  予約投稿
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  disabled={!displayText.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      コピー
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-4">
                {/* Character Count */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-semibold ${
                      isOverLimit ? "text-red-500" : "text-zinc-700"
                    }`}
                  >
                    {charCount}
                  </span>
                  <span className="text-zinc-400">/</span>
                  <span className="text-zinc-400">{maxLength}</span>
                </div>

                {/* Post Button */}
                <button
                  onClick={handlePost}
                  disabled={!displayText.trim() || isOverLimit}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white text-base font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  Xで投稿
                </button>
              </div>
            </div>
          </div>

          {/* AI Generation Flow Panel */}
          {generationStep !== "input" && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
              {/* Step Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBack}
                    className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">
                      {generationStep === "template" && "Step 1: テンプレート選択"}
                      {generationStep === "reference" && "Step 2: 参考投稿選択"}
                      {generationStep === "generating" && "生成中..."}
                    </h3>
                    <p className="text-sm text-zinc-500">
                      {generationStep === "template" && "投稿の型を選んでください"}
                      {generationStep === "reference" && "参考にする投稿を選んでください（任意）"}
                      {generationStep === "generating" && "AIが投稿を生成しています"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setGenerationStep("input")}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step Content */}
              {generationStep === "template" && (
                <>
                  <TemplateSelector
                    selectedTemplate={selectedTemplate}
                    onSelect={handleTemplateSelect}
                  />

                  {/* Options Toggle */}
                  <div>
                    <button
                      onClick={() => setShowOptions(!showOptions)}
                      className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          showOptions ? "rotate-180" : ""
                        }`}
                      />
                      詳細オプション
                    </button>

                    {showOptions && (
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">
                            カテゴリー
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">選択しない</option>
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 mb-2">
                            口調
                          </label>
                          <select
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {tones.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleNextToReference}
                    disabled={!selectedTemplate}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    次へ：参考投稿を選択
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {generationStep === "reference" && (
                <>
                  <ReferencePostSelector
                    posts={referencePosts}
                    selectedPostId={selectedReferenceId}
                    onSelect={handleReferenceSelect}
                    onAutoSelect={handleAutoSelect}
                    isAutoSelecting={isAutoSelecting}
                  />

                  {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          {selectedReferenceId ? "参考投稿を元に生成" : "テンプレートのみで生成"}
                        </>
                      )}
                    </button>
                  </div>

                  {!selectedReferenceId && (
                    <p className="text-center text-sm text-zinc-500">
                      参考投稿を選択しない場合、テンプレートのみで生成されます
                    </p>
                  )}
                </>
              )}

              {generationStep === "generating" && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-zinc-600">AIが投稿を生成しています...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Preview Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
              <h3 className="text-sm font-semibold text-zinc-900">プレビュー</h3>
            </div>
            <PostPreview text={displayText} images={images} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              クイックアクション
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleReset}
                disabled={!content && !generatedText}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                リセット
              </button>
            </div>
          </div>

          {/* Character Progress */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">文字数</h3>
            <div className="flex items-end gap-2 mb-4">
              <span
                className={`text-4xl font-bold ${
                  isOverLimit ? "text-red-500" : "text-zinc-900"
                }`}
              >
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
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">Tips</h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li>- 参考投稿を選ぶとより良い構造で生成</li>
              <li>- S/Aティアの投稿を選択可能</li>
              <li>- 画像は最大4枚まで追加可能</li>
              <li>- 140文字以内が読まれやすい</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
        postText={displayText}
        images={images}
        isScheduling={isScheduling}
      />
    </div>
  );
}
