"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Newspaper,
  List,
  MessageSquare,
  Wrench,
  Video,
  Loader2,
  Copy,
  ExternalLink,
  Calendar,
  RotateCcw,
  Heart,
  Eye,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getContextPosts, getPosts, saveScheduledPost } from "@/lib/firebase";

// 6 templates with clearer one-liner descriptions
const TEMPLATES = [
  {
    id: "insight",
    name: "気づき共有",
    description: "逆説で注目を引く",
    example: "〇〇で大切なのは「△△」じゃない。本当に大切なのは「□□」。",
    icon: Lightbulb,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    id: "news",
    name: "速報・ニュース",
    description: "最新情報を共有",
    example: "【速報】〇〇が△△に対応。詳しくは↓",
    icon: Newspaper,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    id: "list",
    name: "リスト型",
    description: "箇条書きで整理",
    example: "〇〇で気づいたこと\n・△△\n・□□\n・■■",
    icon: List,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "thread",
    name: "スレッド導入",
    description: "続きが読みたくなる",
    example: "〇〇について解説します。多くの人が誤解してる△△。実は…↓",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    id: "problem-solving",
    name: "問題解決",
    description: "課題→解決策を提示",
    example: "「〇〇がうまくいかない」よく聞きます。解決策は△△。",
    icon: Wrench,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    id: "video",
    name: "動画投稿",
    description: "近日実装予定",
    example: "",
    icon: Video,
    color: "text-zinc-400",
    bgColor: "bg-zinc-50",
    borderColor: "border-zinc-200",
    disabled: true,
  },
];

interface ReferencePost {
  id: string;
  text: string;
  likes: number;
  impressions: number;
  tier: "S" | "A" | "B" | "C";
  category: string;
}

interface GeneratedCandidate {
  id: number;
  text: string;
  referencePost: ReferencePost;
}

type Step = 1 | 2 | 3;

export default function GeneratePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [referencePosts, setReferencePosts] = useState<ReferencePost[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<ReferencePost[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCandidates, setGeneratedCandidates] = useState<GeneratedCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<GeneratedCandidate | null>(null);
  const [copied, setCopied] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  // Load content from sessionStorage
  useEffect(() => {
    const savedContent = sessionStorage.getItem("compose_content");
    if (savedContent) {
      setContent(savedContent);
    }
  }, []);

  // Load reference posts (S/A tier from context and user posts)
  useEffect(() => {
    const loadPosts = async () => {
      if (!user) return;
      try {
        const [contextPosts, userPosts] = await Promise.all([
          getContextPosts(user.uid),
          getPosts(user.uid),
        ]);

        const allPosts = [...contextPosts, ...userPosts]
          .filter((p: any) => p.tier === "S" || p.tier === "A")
          .map((p: any) => ({
            id: p.id,
            text: p.text,
            likes: p.likes || 0,
            impressions: p.impressions || 0,
            tier: p.tier,
            category: p.category || "その他",
          }))
          .sort((a, b) => b.likes - a.likes);

        setReferencePosts(allPosts);

        // Auto-select top 6 reference posts
        const top6 = allPosts.slice(0, 6);
        setSelectedReferences(top6);
      } catch (err) {
        console.error("Failed to load posts:", err);
      }
    };
    loadPosts();
  }, [user]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedTemplate) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      handleGenerate();
    }
  };

  // Generate 6 variations using 6 reference posts
  const handleGenerate = async () => {
    if (!content || !selectedTemplate) return;

    setIsGenerating(true);
    setCurrentStep(3);
    setGeneratedCandidates([]);

    try {
      // Generate 6 candidates in parallel
      const refs = selectedReferences.slice(0, 6);

      // If we have fewer than 6 references, fill with template-only generations
      const promises = refs.map(async (ref, index) => {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "reference",
            templateId: selectedTemplate,
            content,
            referenceText: ref.text,
            tone: "casual",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "生成に失敗しました");
        }

        return {
          id: index + 1,
          text: data.text,
          referencePost: ref,
        } as GeneratedCandidate;
      });

      // If we have fewer than 6 references, add template-only generations
      if (refs.length < 6) {
        for (let i = refs.length; i < 6; i++) {
          promises.push(
            (async () => {
              const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mode: "template",
                  templateId: selectedTemplate,
                  content,
                  tone: "casual",
                }),
              });

              const data = await response.json();

              return {
                id: i + 1,
                text: data.text,
                referencePost: { id: `template-${i}`, text: "テンプレートベース", likes: 0, impressions: 0, tier: "A" as const, category: "その他" },
              } as GeneratedCandidate;
            })()
          );
        }
      }

      const results = await Promise.all(promises);
      setGeneratedCandidates(results);

      // Auto-select first candidate
      if (results.length > 0) {
        setSelectedCandidate(results[0]);
      }
    } catch (err) {
      console.error("Generate error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!selectedCandidate) return;
    navigator.clipboard.writeText(selectedCandidate.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePost = () => {
    if (!selectedCandidate) return;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(selectedCandidate.text)}`;
    window.open(tweetUrl, "_blank");
  };

  const handleSchedule = async () => {
    if (!user || !selectedCandidate) return;

    setIsScheduling(true);
    try {
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      await saveScheduledPost(user.uid, {
        text: selectedCandidate.text,
        scheduledAt,
        status: "scheduled",
      });

      alert("1時間後に予約投稿しました");
      router.push("/schedule");
    } catch (err) {
      console.error("Schedule failed:", err);
    } finally {
      setIsScheduling(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedTemplate(null);
    setGeneratedCandidates([]);
    setSelectedCandidate(null);
  };

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/compose"
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">AI投稿生成</h1>
            <p className="text-zinc-500">ステップに沿って投稿を生成</p>
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  currentStep >= step
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
              </div>
              {step < 3 && (
                <div
                  className={`w-12 h-1 mx-1 rounded ${
                    currentStep > step ? "bg-emerald-500" : "bg-zinc-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Content Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">投稿内容</h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="投稿したい内容を入力..."
              className="w-full h-40 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Generated Candidates - Show all 6 */}
          {generatedCandidates.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-zinc-900">
                  生成結果（6候補）
                </h2>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  再生成
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {generatedCandidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedCandidate?.id === candidate.id
                        ? "bg-emerald-50 border-2 border-emerald-500"
                        : "bg-zinc-50 border-2 border-transparent hover:border-zinc-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedCandidate?.id === candidate.id
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-200 text-zinc-600"
                        }`}>
                          {candidate.id}
                        </span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          candidate.referencePost.tier === "S"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                        }`}>
                          {candidate.referencePost.tier}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {candidate.referencePost.category}
                        </span>
                      </div>
                      {selectedCandidate?.id === candidate.id && (
                        <Check className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                    <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-4">
                      {candidate.text}
                    </p>
                    <p className="text-xs text-zinc-400 mt-2">
                      {candidate.text.length}文字
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Steps / Selected Candidate Detail */}
        <div className="space-y-6">
          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-emerald-600">1</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">テンプレート選択</h2>
                  <p className="text-sm text-zinc-500">投稿の型を選んでください</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => !template.disabled && handleTemplateSelect(template.id)}
                    disabled={template.disabled}
                    className={`relative p-4 rounded-xl text-left transition-all ${
                      template.disabled
                        ? "bg-zinc-50 cursor-not-allowed opacity-60"
                        : selectedTemplate === template.id
                        ? `${template.bgColor} border-2 ${template.borderColor}`
                        : "bg-zinc-50 border-2 border-transparent hover:border-zinc-200"
                    }`}
                  >
                    {template.disabled && (
                      <span className="absolute top-2 right-2 text-xs bg-zinc-200 px-2 py-0.5 rounded-full">
                        準備中
                      </span>
                    )}
                    <div className={`flex items-center gap-2 mb-2 ${template.color}`}>
                      <template.icon className="w-5 h-5" />
                      <span className="font-semibold">{template.name}</span>
                    </div>
                    <p className="text-sm text-zinc-600">{template.description}</p>
                  </button>
                ))}
              </div>

              {selectedTemplate && (
                <div className="p-4 bg-zinc-50 rounded-xl mb-6">
                  <p className="text-xs text-zinc-500 mb-2">例:</p>
                  <p className="text-sm text-zinc-700">
                    {TEMPLATES.find((t) => t.id === selectedTemplate)?.example}
                  </p>
                </div>
              )}

              <button
                onClick={handleNextStep}
                disabled={!selectedTemplate || !content.trim()}
                className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                次へ: 参考投稿を確認
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Step 2: Reference Posts (Auto-selected 6) */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-lg font-bold text-emerald-600">2</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">参考投稿（自動選択6件）</h2>
                  <p className="text-sm text-zinc-500">S/Aティアから自動選択された6件で生成</p>
                </div>
              </div>

              {selectedReferences.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-xl mb-6">
                  <p className="text-zinc-500">参考投稿がありません</p>
                  <p className="text-sm text-zinc-400 mt-1">CSVインポートでS/Aティアの投稿を追加してください</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
                  {selectedReferences.map((post, index) => (
                    <div
                      key={post.id}
                      className="p-4 bg-zinc-50 rounded-xl"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                            post.tier === "S"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-violet-100 text-violet-700"
                          }`}>
                            {post.tier}
                          </span>
                          <span className="text-xs text-zinc-500">{post.category}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {post.impressions}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-700 line-clamp-2">{post.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  戻る
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={selectedReferences.length === 0}
                  className="flex-[2] flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-emerald-500/25"
                >
                  <Sparkles className="w-5 h-5" />
                  6パターン生成
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {currentStep === 3 && isGenerating && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">6パターン生成中...</h2>
              <p className="text-zinc-500">
                AIが6つの投稿候補を生成しています。
              </p>
            </div>
          )}

          {/* Selected Candidate Detail */}
          {currentStep === 3 && !isGenerating && selectedCandidate && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                    {selectedCandidate.id}
                  </span>
                  <h2 className="text-lg font-semibold text-emerald-900">選択中の投稿</h2>
                </div>
                <span className="text-sm text-emerald-600 font-medium">
                  {selectedCandidate.text.length}文字
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-emerald-200 mb-4">
                <p className="text-zinc-900 whitespace-pre-wrap leading-relaxed">
                  {selectedCandidate.text}
                </p>
              </div>

              <div className="p-3 bg-emerald-100 rounded-lg mb-4">
                <p className="text-xs text-emerald-700 mb-1">参考投稿</p>
                <p className="text-sm text-emerald-800 line-clamp-2">
                  {selectedCandidate.referencePost.text}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handleCopy}
                  className="flex items-center justify-center gap-2 py-3 bg-white border border-emerald-200 text-emerald-700 font-medium rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      コピー済み
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      コピー
                    </>
                  )}
                </button>
                <button
                  onClick={handleSchedule}
                  disabled={isScheduling}
                  className="flex items-center justify-center gap-2 py-3 bg-violet-500 text-white font-medium rounded-xl hover:bg-violet-600 disabled:opacity-50 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  予約投稿
                </button>
                <button
                  onClick={handlePost}
                  className="flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Xで投稿
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
