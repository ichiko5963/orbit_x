"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Copy,
  CheckCircle2,
  Loader2,
  Calendar,
  ExternalLink,
  RotateCcw,
  Eye,
  Heart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPost, getContextPost, saveScheduledPost } from "@/lib/firebase";
import { ScheduleModal } from "@/app/components/compose";

interface ReferencePost {
  id: string;
  text: string;
  likes?: number;
  impressions?: number;
  category?: string;
  tier?: string;
}

export default function ImitatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const postId = searchParams.get("post");
  const contextPostId = searchParams.get("context");
  const sourceType = contextPostId ? "context" : "post";

  const [referencePost, setReferencePost] = useState<ReferencePost | null>(null);
  const [isLoadingRef, setIsLoadingRef] = useState(true);
  const [topic, setTopic] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Load reference post
  useEffect(() => {
    const loadReferencePost = async () => {
      if (!user) return;

      const targetId = postId || contextPostId;
      if (!targetId) {
        setError("参照する投稿が指定されていません");
        setIsLoadingRef(false);
        return;
      }

      setIsLoadingRef(true);
      try {
        let post;
        if (contextPostId) {
          post = await getContextPost(user.uid, contextPostId);
        } else if (postId) {
          post = await getPost(user.uid, postId);
        }

        // Cast to any first then extract fields
        const postData = post as any;
        if (postData && postData.text) {
          setReferencePost({
            id: postData.id,
            text: postData.text,
            likes: postData.likes,
            impressions: postData.impressions,
            category: postData.category,
            tier: postData.tier,
          });
        } else {
          setError("投稿が見つかりませんでした");
        }
      } catch (err) {
        console.error("Failed to load reference post:", err);
        setError("投稿の読み込みに失敗しました");
      } finally {
        setIsLoadingRef(false);
      }
    };

    loadReferencePost();
  }, [user, postId, contextPostId]);

  const handleGenerate = async () => {
    if (!referencePost || !topic.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "imitate",
          referenceText: referencePost.text,
          topic: topic,
          tone: "casual",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }

      setGeneratedText(data.text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePost = () => {
    if (!generatedText) return;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedText)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleSchedule = async (scheduledAt: Date) => {
    if (!user || !generatedText.trim()) return;

    setIsScheduling(true);
    try {
      await saveScheduledPost(user.uid, {
        text: generatedText,
        scheduledAt,
        status: "scheduled",
      });
      setShowScheduleModal(false);
      alert("予約投稿を登録しました");
    } catch (err) {
      console.error("Schedule failed:", err);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReset = () => {
    setGeneratedText("");
    setTopic("");
  };

  if (isLoadingRef) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error && !referencePost) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">{error}</h2>
        <p className="text-zinc-500 mb-6">
          過去投稿一覧またはバズ投稿一覧から投稿を選択してください
        </p>
        <Link
          href="/posts"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          過去投稿一覧へ
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={sourceType === "context" ? "/context" : "/posts"}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">この構造で生成</h1>
          <p className="text-zinc-500">参考投稿の構造を模倣して新しい投稿を作成</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Reference Post */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 bg-violet-50">
            <h2 className="text-lg font-semibold text-violet-900">参考投稿</h2>
            <p className="text-sm text-violet-600">この投稿の構造を模倣します</p>
          </div>

          {referencePost && (
            <div className="p-6">
              {/* Stats */}
              {(referencePost.likes || referencePost.impressions) && (
                <div className="flex items-center gap-4 mb-4">
                  {referencePost.impressions && (
                    <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                      <Eye className="w-4 h-4" />
                      {referencePost.impressions.toLocaleString()}
                    </span>
                  )}
                  {referencePost.likes && (
                    <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                      <Heart className="w-4 h-4" />
                      {referencePost.likes.toLocaleString()}
                    </span>
                  )}
                  {referencePost.category && (
                    <span className="px-2 py-0.5 text-xs bg-zinc-100 text-zinc-600 rounded">
                      {referencePost.category}
                    </span>
                  )}
                </div>
              )}

              {/* Text */}
              <div className="p-4 bg-zinc-50 rounded-xl">
                <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                  {referencePost.text}
                </p>
              </div>

              <p className="mt-4 text-xs text-zinc-400">
                {referencePost.text.length}文字
              </p>
            </div>
          )}
        </div>

        {/* Right: Generation */}
        <div className="space-y-6">
          {/* Topic Input */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h2 className="text-lg font-semibold text-zinc-900">投稿したい内容</h2>
              <p className="text-sm text-zinc-500">あなたの投稿内容を入力してください</p>
            </div>

            <div className="p-6">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例：今日学んだこと、気づき、紹介したいツールなど..."
                className="w-full h-32 p-4 text-sm text-zinc-900 placeholder:text-zinc-400 bg-zinc-50 border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />

              <button
                onClick={handleGenerate}
                disabled={!topic.trim() || isGenerating}
                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    この構造で生成
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Result */}
          {(generatedText || error) && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-100 bg-emerald-50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-emerald-900">生成結果</h2>
                  <p className="text-sm text-emerald-600">
                    {generatedText ? `${generatedText.length}文字` : ""}
                  </p>
                </div>
                {generatedText && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    リセット
                  </button>
                )}
              </div>

              <div className="p-6">
                {error ? (
                  <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                    {error}
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-zinc-50 rounded-xl mb-4">
                      <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                        {generatedText}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={handleCopy}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-700 font-medium rounded-xl hover:bg-zinc-200 transition-colors"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            済み
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            コピー
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-100 text-violet-700 font-medium rounded-xl hover:bg-violet-200 transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        予約
                      </button>
                      <button
                        onClick={handlePost}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        投稿
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleSchedule}
        postText={generatedText}
        images={[]}
        isScheduling={isScheduling}
      />
    </div>
  );
}
