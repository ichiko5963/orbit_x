"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Heart,
  Repeat2,
  Globe,
  Trash2,
  Sparkles,
  Lock,
  Unlock,
  Copy,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Modal,
  Textarea,
} from "../components/ui";
import { PageHeader } from "../components/layout";

interface ViralPost {
  id: string;
  text: string;
  authorUsername: string;
  likeCount: number;
  retweetCount: number;
  isOverseas: boolean;
  analyzedAt: string;
  structure: { role: string; text: string }[];
  isTemplateFixed: boolean;
}

const sampleViralPosts: ViralPost[] = [
  {
    id: "1",
    text: "The best developers I know don't write the most code.\n\nThey write the least code that solves the problem.\n\nSimplicity is the ultimate sophistication.",
    authorUsername: "dev_wisdom",
    likeCount: 45000,
    retweetCount: 8500,
    isOverseas: true,
    analyzedAt: "2024-01-18T14:30:00Z",
    structure: [
      { role: "contrary", text: "The best developers I know don't write the most code." },
      { role: "truth", text: "They write the least code that solves the problem." },
      { role: "quote", text: "Simplicity is the ultimate sophistication." },
    ],
    isTemplateFixed: true,
  },
  {
    id: "2",
    text: "エンジニアの成長に必要なのは\n\n「完璧なコードを書くこと」じゃない\n\n「動くものを早く作って、フィードバックを得ること」\n\nこれに気づくのに3年かかった。",
    authorUsername: "tech_senior",
    likeCount: 12000,
    retweetCount: 2100,
    isOverseas: false,
    analyzedAt: "2024-01-17T10:00:00Z",
    structure: [
      { role: "topic", text: "エンジニアの成長に必要なのは" },
      { role: "contrary", text: "「完璧なコードを書くこと」じゃない" },
      { role: "truth", text: "「動くものを早く作って、フィードバックを得ること」" },
      { role: "reflection", text: "これに気づくのに3年かかった。" },
    ],
    isTemplateFixed: false,
  },
  {
    id: "3",
    text: "I asked 100 senior engineers what they wish they knew earlier.\n\nTop 3 answers:\n\n1. Communication > Code\n2. Ask questions early\n3. Take breaks seriously\n\nNone mentioned technical skills.",
    authorUsername: "career_coach",
    likeCount: 38000,
    retweetCount: 6200,
    isOverseas: true,
    analyzedAt: "2024-01-16T08:00:00Z",
    structure: [
      { role: "hook", text: "I asked 100 senior engineers what they wish they knew earlier." },
      { role: "list_intro", text: "Top 3 answers:" },
      { role: "list", text: "1. Communication > Code\n2. Ask questions early\n3. Take breaks seriously" },
      { role: "punchline", text: "None mentioned technical skills." },
    ],
    isTemplateFixed: false,
  },
];

const roleColors: Record<string, string> = {
  contrary: "bg-red-500/20 text-red-400",
  truth: "bg-green-500/20 text-green-400",
  quote: "bg-purple-500/20 text-purple-400",
  topic: "bg-blue-500/20 text-blue-400",
  reflection: "bg-amber-500/20 text-amber-400",
  hook: "bg-pink-500/20 text-pink-400",
  list_intro: "bg-cyan-500/20 text-cyan-400",
  list: "bg-indigo-500/20 text-indigo-400",
  punchline: "bg-orange-500/20 text-orange-400",
};

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ViralPage() {
  const [viralPosts, setViralPosts] = useState<ViralPost[]>(sampleViralPosts);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ViralPost | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [inputType, setInputType] = useState<"url" | "text">("text");
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (inputType === "text" && !inputText.trim()) return;
    if (inputType === "url" && !inputUrl.trim()) return;

    setIsAnalyzing(true);

    // Simulate analysis
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const newPost: ViralPost = {
      id: `custom-${Date.now()}`,
      text: inputText || "Analyzed post from URL",
      authorUsername: "unknown",
      likeCount: 0,
      retweetCount: 0,
      isOverseas: false,
      analyzedAt: new Date().toISOString(),
      structure: [
        { role: "hook", text: "Hook text..." },
        { role: "body", text: "Main content..." },
        { role: "cta", text: "Call to action..." },
      ],
      isTemplateFixed: false,
    };

    setViralPosts([newPost, ...viralPosts]);
    setInputUrl("");
    setInputText("");
    setIsAnalyzing(false);
    setIsAddModalOpen(false);
  };

  const handlePostClick = (post: ViralPost) => {
    setSelectedPost(post);
    setIsDetailModalOpen(true);
  };

  const handleDeletePost = (postId: string) => {
    setViralPosts(viralPosts.filter((p) => p.id !== postId));
  };

  const handleToggleFixed = (postId: string) => {
    setViralPosts(
      viralPosts.map((p) =>
        p.id === postId ? { ...p, isTemplateFixed: !p.isTemplateFixed } : p
      )
    );
  };

  return (
    <div className="p-8">
      <PageHeader
        title="他人のバズ投稿参考"
        description="他人のバズ投稿を分析して型テンプレートとして保存"
        action={
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            投稿を追加
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-[--muted-foreground]">分析済み投稿</p>
          <p className="text-2xl font-bold text-white mt-1">{viralPosts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[--muted-foreground]">固定化済み型</p>
          <p className="text-2xl font-bold text-white mt-1">
            {viralPosts.filter((p) => p.isTemplateFixed).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-[--muted-foreground]">海外投稿</p>
          <p className="text-2xl font-bold text-white mt-1">
            {viralPosts.filter((p) => p.isOverseas).length}
          </p>
        </Card>
      </div>

      {/* Posts Grid */}
      <div className="space-y-4">
        {viralPosts.map((post) => (
          <Card key={post.id} hover onClick={() => handlePostClick(post)}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  {post.isOverseas ? (
                    <Badge variant="info" className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      海外
                    </Badge>
                  ) : (
                    <Badge variant="default">国内</Badge>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFixed(post.id);
                    }}
                    className="flex items-center gap-1 text-xs"
                  >
                    {post.isTemplateFixed ? (
                      <Lock className="w-4 h-4 text-[--warning]" />
                    ) : (
                      <Unlock className="w-4 h-4 text-[--muted-foreground]" />
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white whitespace-pre-wrap line-clamp-3">
                    {post.text}
                  </p>

                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-[--muted-foreground]">
                      @{post.authorUsername}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-[--muted-foreground]">
                      <Heart className="w-3.5 h-3.5" />
                      {formatNumber(post.likeCount)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-[--muted-foreground]">
                      <Repeat2 className="w-3.5 h-3.5" />
                      {formatNumber(post.retweetCount)}
                    </span>
                    <span className="text-xs text-[--muted-foreground]">
                      分析: {formatDate(post.analyzedAt)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePost(post.id);
                  }}
                  className="p-2 rounded-[--radius-sm] text-[--muted-foreground] hover:text-[--destructive] hover:bg-white/5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="他人のバズ投稿を追加"
        size="md"
      >
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <Button
              variant={inputType === "text" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setInputType("text")}
            >
              本文をペースト
            </Button>
            <Button
              variant={inputType === "url" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setInputType("url")}
            >
              URLを入力
            </Button>
          </div>

          {inputType === "url" ? (
            <div>
              <label className="text-sm text-[--muted-foreground] mb-1.5 block">
                投稿URL
              </label>
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://twitter.com/username/status/..."
              />
              <p className="text-xs text-[--muted-foreground] mt-1.5">
                X APIは使用せず、URLから投稿を特定します（手動確認が必要な場合あり）
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm text-[--muted-foreground] mb-1.5 block">
                投稿本文
              </label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="バズった投稿の本文をコピー＆ペーストしてください..."
                className="min-h-[150px]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsAddModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1"
              onClick={handleAnalyze}
              loading={isAnalyzing}
            >
              <Sparkles className="w-4 h-4" />
              構造を分析
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="投稿詳細・構造分析"
        size="lg"
      >
        {selectedPost && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3">
              {selectedPost.isOverseas ? (
                <Badge variant="info" className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  海外
                </Badge>
              ) : (
                <Badge variant="default">国内</Badge>
              )}
              {selectedPost.isTemplateFixed && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  固定化済み
                </Badge>
              )}
            </div>

            <div className="p-4 bg-[--muted] rounded-[--radius-sm]">
              <p className="text-sm text-white whitespace-pre-wrap">{selectedPost.text}</p>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-[--muted-foreground]">
                @{selectedPost.authorUsername}
              </span>
              <span className="flex items-center gap-1.5 text-[--muted-foreground]">
                <Heart className="w-4 h-4" />
                <span className="text-white font-medium">{formatNumber(selectedPost.likeCount)}</span>
              </span>
              <span className="flex items-center gap-1.5 text-[--muted-foreground]">
                <Repeat2 className="w-4 h-4" />
                <span className="text-white font-medium">{formatNumber(selectedPost.retweetCount)}</span>
              </span>
            </div>

            <div>
              <h4 className="text-sm font-medium text-[--muted-foreground] mb-3">構造分析</h4>
              <div className="space-y-2">
                {selectedPost.structure.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-[--muted] rounded-[--radius-sm]"
                  >
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        roleColors[item.role] || "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {item.role}
                    </span>
                    <p className="text-sm text-white flex-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-[--border]">
              <Button className="flex-1">
                <Sparkles className="w-4 h-4" />
                この型で投稿作成
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleToggleFixed(selectedPost.id)}
              >
                {selectedPost.isTemplateFixed ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    固定解除
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    型を固定
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
