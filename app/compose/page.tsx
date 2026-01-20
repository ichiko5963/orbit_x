"use client";

import { useState } from "react";
import {
  Sparkles,
  Wand2,
  RefreshCw,
  Copy,
  Send,
  Clock,
  CheckCircle2,
  ChevronRight,
  Lock,
  Unlock,
  Eye,
  Heart,
  Smile,
  MessageSquare,
} from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Textarea,
  Checkbox,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui";
import { PageHeader } from "../components/layout";

interface Category {
  id: string;
  name: string;
  description: string;
  postCount: number;
}

interface TemplateType {
  id: string;
  name: string;
  impression: number;
  structure: { role: string; text: string }[];
  isFixed: boolean;
}

interface GeneratedPost {
  id: string;
  text: string;
  selected: boolean;
}

const categories: Category[] = [
  { id: "article", name: "記事紹介", description: "技術記事やブログの紹介", postCount: 15 },
  { id: "news", name: "速報", description: "新機能やアップデート情報", postCount: 12 },
  { id: "knowhow", name: "ノウハウ", description: "実践的なTips・知見", postCount: 28 },
  { id: "mind", name: "マインド", description: "考え方・心構え", postCount: 18 },
  { id: "failure", name: "失敗談", description: "失敗から学んだこと", postCount: 8 },
  { id: "analysis", name: "考察", description: "技術・トレンドの分析", postCount: 10 },
  { id: "automation", name: "自動化", description: "効率化・自動化の知見", postCount: 7 },
  { id: "official", name: "公式情報引用", description: "公式発表の紹介", postCount: 5 },
];

const templateTypes: Record<string, TemplateType[]> = {
  article: [
    {
      id: "1",
      name: "型1",
      impression: 25000,
      isFixed: true,
      structure: [
        { role: "headline", text: "【記事紹介】{タイトル}" },
        { role: "highlight", text: "{重要ポイント}" },
        { role: "benefit", text: "{メリット・学び}" },
        { role: "cta", text: "{アクション喚起}" },
      ],
    },
    {
      id: "2",
      name: "型2",
      impression: 18000,
      isFixed: false,
      structure: [
        { role: "context", text: "{背景説明}" },
        { role: "reference", text: "この記事が参考になった → {URL}" },
        { role: "insight", text: "{自分の気づき}" },
      ],
    },
    {
      id: "3",
      name: "型3",
      impression: 15000,
      isFixed: false,
      structure: [
        { role: "problem", text: "{課題}" },
        { role: "solution", text: "この記事で解決 → {URL}" },
        { role: "result", text: "{結果}" },
      ],
    },
    {
      id: "4",
      name: "型4",
      impression: 12000,
      isFixed: false,
      structure: [
        { role: "topic", text: "{トピック}について" },
        { role: "article", text: "良記事見つけた" },
        { role: "summary", text: "{要約}" },
      ],
    },
    {
      id: "5",
      name: "型5",
      impression: 10000,
      isFixed: false,
      structure: [
        { role: "intro", text: "最近読んだ記事で一番良かったやつ" },
        { role: "content", text: "{内容紹介}" },
        { role: "recommend", text: "おすすめです" },
      ],
    },
    {
      id: "6",
      name: "型6",
      impression: 8500,
      isFixed: false,
      structure: [
        { role: "share", text: "シェア" },
        { role: "title", text: "{記事タイトル}" },
        { role: "point", text: "ポイント：{要点}" },
      ],
    },
  ],
  knowhow: [
    {
      id: "1",
      name: "型1",
      impression: 32000,
      isFixed: true,
      structure: [
        { role: "headline", text: "{X}で気づいたこと" },
        { role: "list", text: "・{ポイント1}\n・{ポイント2}\n・{ポイント3}" },
        { role: "reflection", text: "{まとめ・感想}" },
      ],
    },
    {
      id: "2",
      name: "型2",
      impression: 28000,
      isFixed: false,
      structure: [
        { role: "problem", text: "{問題}" },
        { role: "solution", text: "解決策：{方法}" },
        { role: "result", text: "{結果}" },
      ],
    },
    {
      id: "3",
      name: "型3",
      impression: 22000,
      isFixed: false,
      structure: [
        { role: "tip", text: "【Tips】{タイトル}" },
        { role: "how", text: "{やり方}" },
        { role: "benefit", text: "{メリット}" },
      ],
    },
    {
      id: "4",
      name: "型4",
      impression: 18000,
      isFixed: false,
      structure: [
        { role: "before", text: "Before：{以前の状態}" },
        { role: "action", text: "やったこと：{アクション}" },
        { role: "after", text: "After：{改善後}" },
      ],
    },
    {
      id: "5",
      name: "型5",
      impression: 15000,
      isFixed: false,
      structure: [
        { role: "context", text: "{状況説明}" },
        { role: "try", text: "試したこと：{内容}" },
        { role: "learn", text: "学び：{気づき}" },
      ],
    },
    {
      id: "6",
      name: "型6",
      impression: 12000,
      isFixed: false,
      structure: [
        { role: "question", text: "Q: {疑問}" },
        { role: "answer", text: "A: {答え}" },
        { role: "detail", text: "詳細：{補足}" },
      ],
    },
  ],
  mind: [
    {
      id: "1",
      name: "型1",
      impression: 35000,
      isFixed: true,
      structure: [
        { role: "contrary", text: "{一般論}じゃない。" },
        { role: "truth", text: "本当に大切なのは{核心}" },
        { role: "process", text: "{プロセス説明}" },
        { role: "conclusion", text: "{結論}" },
      ],
    },
    {
      id: "2",
      name: "型2",
      impression: 28000,
      isFixed: false,
      structure: [
        { role: "problem", text: "{悩み・課題}" },
        { role: "empathy", text: "{共感}" },
        { role: "message", text: "{メッセージ}" },
      ],
    },
    {
      id: "3",
      name: "型3",
      impression: 22000,
      isFixed: false,
      structure: [
        { role: "observation", text: "{観察・気づき}" },
        { role: "insight", text: "{洞察}" },
        { role: "action", text: "{行動提案}" },
      ],
    },
    {
      id: "4",
      name: "型4",
      impression: 18000,
      isFixed: false,
      structure: [
        { role: "quote", text: "「{名言・格言}」" },
        { role: "interpretation", text: "{解釈}" },
        { role: "apply", text: "{自分への適用}" },
      ],
    },
    {
      id: "5",
      name: "型5",
      impression: 15000,
      isFixed: false,
      structure: [
        { role: "years", text: "{X}年やって分かったこと" },
        { role: "realization", text: "{気づき}" },
        { role: "advice", text: "{アドバイス}" },
      ],
    },
    {
      id: "6",
      name: "型6",
      impression: 12000,
      isFixed: false,
      structure: [
        { role: "myth", text: "「{思い込み}」は間違い" },
        { role: "reality", text: "実際は{現実}" },
        { role: "suggestion", text: "{提案}" },
      ],
    },
  ],
};

const writingStyles = [
  { value: "casual", label: "カジュアル（〜だよ、〜なの）" },
  { value: "formal", label: "フォーマル（〜です、〜ます）" },
  { value: "energetic", label: "テンション高め（！多め）" },
  { value: "calm", label: "落ち着いた（〜ですね）" },
  { value: "professional", label: "専門的" },
];

const emojiSets = [
  { value: "none", label: "絵文字なし" },
  { value: "minimal", label: "控えめ（文末のみ）" },
  { value: "energetic", label: "テンション高め" },
  { value: "tech", label: "技術系" },
  { value: "custom", label: "カスタム" },
];

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export default function ComposePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("knowhow");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [useStyle, setUseStyle] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("casual");
  const [useEmoji, setUseEmoji] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState("none");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedPost[]>([]);
  const [editedText, setEditedText] = useState("");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const currentTemplates = templateTypes[selectedCategory] || templateTypes.knowhow;

  const handleGenerate = async () => {
    setIsGenerating(true);

    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const sampleTexts = [
      "プログラミング学習で最も大切なのは「毎日続けること」じゃない。\n\n本当に大切なのは「わからないを楽しむこと」。\n\nわからない → 調べる → わかる\n\nこのサイクルが回り始めたら、あなたは既に成長している。",
      "コードレビューで最も大切なのは「指摘すること」じゃない。\n\n本当に大切なのは「相手の成長を考えること」。\n\n指摘 → 対話 → 理解\n\nこのサイクルが回り始めたら、チーム全体が強くなる。",
      "転職で最も大切なのは「年収アップ」じゃない。\n\n本当に大切なのは「成長できる環境かどうか」。\n\n挑戦 → 失敗 → 学習\n\nこのサイクルが回る環境を選べば、年収は後からついてくる。",
      "英語学習で最も大切なのは「完璧を目指すこと」じゃない。\n\n本当に大切なのは「伝わればOKと思うこと」。\n\n話す → 伝わる → 自信\n\nこのサイクルが回り始めたら、英語力は自然と伸びる。",
      "副業で最も大切なのは「稼ぐこと」じゃない。\n\n本当に大切なのは「スキルの幅を広げること」。\n\n挑戦 → 経験 → 成長\n\nこのサイクルが回り始めたら、収入は後からついてくる。",
      "読書で最も大切なのは「たくさん読むこと」じゃない。\n\n本当に大切なのは「1冊を深く理解すること」。\n\n読む → 考える → 行動\n\nこのサイクルが回り始めたら、知識は血肉になる。",
    ];

    setGeneratedPosts(
      sampleTexts.map((text, index) => ({
        id: String(index + 1),
        text,
        selected: index === 0,
      }))
    );

    setEditedText(sampleTexts[0]);
    setSelectedPostId("1");
    setIsGenerating(false);
  };

  const handleSelectPost = (id: string) => {
    setSelectedPostId(id);
    const post = generatedPosts.find((p) => p.id === id);
    if (post) {
      setEditedText(post.text);
    }
    setGeneratedPosts(
      generatedPosts.map((p) => ({
        ...p,
        selected: p.id === id,
      }))
    );
  };

  const characterCount = editedText.length;
  const maxCharacters = 280;

  return (
    <div className="p-8">
      <PageHeader
        title="AI投稿作成"
        description="カテゴリーと型を選んで、再現性のある投稿を生成"
        action={
          <Button onClick={handleGenerate} loading={isGenerating}>
            <Wand2 className="w-4 h-4" />
            6パターン生成
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Category Selection */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3">カテゴリー選択</h3>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-[--radius-sm] text-left transition-all ${
                      selectedCategory === category.id
                        ? "bg-white text-black"
                        : "text-[--muted-foreground] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{category.name}</p>
                      <p className={`text-xs mt-0.5 ${selectedCategory === category.id ? "text-black/60" : "text-[--muted-foreground]"}`}>
                        {category.postCount}件
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Template Selection */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3">型テンプレート</h3>
              <div className="space-y-3">
                {currentTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`w-full p-4 rounded-[--radius-sm] border text-left transition-all ${
                      selectedTemplate === template.id
                        ? "border-white bg-white/5"
                        : "border-[--border] hover:border-[--border-hover]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{template.name}</span>
                        {template.isFixed ? (
                          <Lock className="w-3.5 h-3.5 text-[--warning]" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-[--muted-foreground]" />
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                        <Eye className="w-3 h-3" />
                        {formatNumber(template.impression)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {template.structure.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <span className="text-[--muted-foreground]">{item.role}:</span>
                          <span className="text-white/60 truncate">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Generation & Edit */}
        <div className="lg:col-span-5 space-y-4">
          {/* Style Settings */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3">口調・絵文字設定</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="use-style"
                    checked={useStyle}
                    onChange={(e) => setUseStyle(e.target.checked)}
                  />
                  <div className="flex-1">
                    <label htmlFor="use-style" className="text-sm text-white cursor-pointer">
                      口調を使用する
                    </label>
                    {useStyle && (
                      <div className="mt-2">
                        <Select
                          value={selectedStyle}
                          onChange={(e) => setSelectedStyle(e.target.value)}
                          options={writingStyles}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="use-emoji"
                    checked={useEmoji}
                    onChange={(e) => setUseEmoji(e.target.checked)}
                  />
                  <div className="flex-1">
                    <label htmlFor="use-emoji" className="text-sm text-white cursor-pointer">
                      絵文字を使用する
                    </label>
                    {useEmoji && (
                      <div className="mt-2">
                        <Select
                          value={selectedEmoji}
                          onChange={(e) => setSelectedEmoji(e.target.value)}
                          options={emojiSets}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated Posts */}
          {generatedPosts.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-white mb-3">生成された投稿（6パターン）</h3>
                <div className="grid grid-cols-2 gap-2">
                  {generatedPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => handleSelectPost(post.id)}
                      className={`p-3 rounded-[--radius-sm] border text-left transition-all ${
                        post.selected
                          ? "border-white bg-white/5"
                          : "border-[--border] hover:border-[--border-hover]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">パターン {post.id}</span>
                        {post.selected && <CheckCircle2 className="w-3.5 h-3.5 text-[--success]" />}
                      </div>
                      <p className="text-xs text-[--muted-foreground] line-clamp-2">{post.text}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Area */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">投稿編集</h3>
                <span
                  className={`text-xs ${
                    characterCount > maxCharacters ? "text-[--destructive]" : "text-[--muted-foreground]"
                  }`}
                >
                  {characterCount} / {maxCharacters}
                </span>
              </div>
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="投稿内容を入力または生成してください..."
                className="min-h-[200px]"
              />

              <div className="flex items-center gap-3 mt-4">
                <Button className="flex-1" disabled={!editedText || characterCount > maxCharacters}>
                  <Send className="w-4 h-4" />
                  投稿する
                </Button>
                <Button variant="secondary">
                  <Clock className="w-4 h-4" />
                  予約投稿
                </Button>
                <Button variant="ghost" size="sm">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
