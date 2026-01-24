"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Copy,
  RotateCcw,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { saveScheduledPost } from "@/lib/firebase";
import {
  ImageUploadGrid,
  ScheduleModal,
  PostPreview,
} from "@/app/components/compose";

export default function ComposePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // No character limit for X Premium
  const charCount = content.length;

  const handleStartGeneration = () => {
    if (!content.trim()) return;
    // Store content and link in sessionStorage to avoid URL length issues
    sessionStorage.setItem("compose_content", content);
    sessionStorage.setItem("compose_link", linkUrl);
    router.push("/compose/generate");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePost = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleSchedule = async (scheduledAt: Date) => {
    if (!user || !content.trim()) return;

    setIsScheduling(true);
    try {
      await saveScheduledPost(user.uid, {
        text: content,
        scheduledAt,
        status: "scheduled",
        imageUrls: images,
      });
      setShowScheduleModal(false);
      setContent("");
      setImages([]);
    } catch (err) {
      console.error("Schedule failed:", err);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReset = () => {
    setContent("");
    setImages([]);
  };

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight mb-2">
          AI投稿作成
        </h1>
        <p className="text-lg text-zinc-500">
          コンテンツを入力して、AIでバズる投稿を生成
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
                <div className="flex-1 space-y-4">
                  <div>
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

                  {/* Link Input */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      <LinkIcon className="w-4 h-4 inline-block mr-1.5" />
                      入れ込むリンク
                      <span className="text-zinc-400 font-normal ml-2">（任意）</span>
                    </label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-11 px-4 text-base text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <p className="text-xs text-zinc-400 mt-1.5">
                      生成された投稿の末尾にURLが自動で追加されます
                    </p>
                  </div>
                </div>

                {/* AI Generate Button */}
                <button
                  onClick={handleStartGeneration}
                  disabled={!content.trim()}
                  className="flex-shrink-0 flex flex-col items-center justify-center gap-2 w-32 h-48 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/25"
                >
                  <Sparkles className="w-10 h-10" />
                  <span className="text-base font-semibold">AIで生成</span>
                  <span className="text-xs opacity-80">Step by Step</span>
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div className="px-6 pb-6">
              <ImageUploadGrid images={images} onImagesChange={setImages} maxImages={4} />
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Schedule Button */}
                <button
                  onClick={() => setShowScheduleModal(true)}
                  disabled={!content.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Calendar className="w-5 h-5" />
                  予約投稿
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  disabled={!content.trim()}
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
                  <span className="text-lg font-semibold text-zinc-700">
                    {charCount}
                  </span>
                  <span className="text-zinc-400">文字</span>
                </div>

                {/* Post Button */}
                <button
                  onClick={handlePost}
                  disabled={!content.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white text-base font-semibold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  Xで投稿
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Preview Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
              <h3 className="text-sm font-semibold text-zinc-900">プレビュー</h3>
            </div>
            <PostPreview text={content} images={images} />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">
              クイックアクション
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleReset}
                disabled={!content && images.length === 0}
                className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-50 rounded-xl text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                リセット
              </button>
            </div>
          </div>

          {/* Character Count Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">文字数</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold text-zinc-900">
                {charCount}
              </span>
              <span className="text-xl text-zinc-400 mb-1">文字</span>
            </div>
            <p className="text-sm text-zinc-500">
              X Premium: 制限なし
            </p>
          </div>

          {/* Tips */}
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
            <h3 className="text-lg font-semibold text-emerald-900 mb-3">使い方</h3>
            <ul className="space-y-2 text-sm text-emerald-800">
              <li>1. 投稿したい内容を入力</li>
              <li>2. 「AIで生成」をクリック</li>
              <li>3. テンプレートを選択</li>
              <li>4. 参考投稿を確認して生成</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
        postText={content}
        images={images}
        isScheduling={isScheduling}
      />
    </div>
  );
}
