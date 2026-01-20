"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Smile,
  MessageSquare,
  Sparkles,
  CheckCircle2,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui";
import { PageHeader } from "../components/layout";

interface WritingStyle {
  id: string;
  name: string;
  description: string;
  isAiExtracted: boolean;
  features: string[];
  examples: string[];
}

interface EmojiSet {
  id: string;
  name: string;
  emojis: string;
  description: string;
}

const initialStyles: WritingStyle[] = [
  {
    id: "casual",
    name: "カジュアル",
    description: "親しみやすい口調で、フレンドリーな印象を与える",
    isAiExtracted: true,
    features: ["〜だよ", "〜なの", "〜じゃん", "〜かも"],
    examples: [
      "これマジでおすすめだよ",
      "実はこれ、みんな知らないの",
    ],
  },
  {
    id: "formal",
    name: "フォーマル",
    description: "丁寧語を使った品のある文体",
    isAiExtracted: true,
    features: ["〜です", "〜ます", "〜でしょうか", "〜いたします"],
    examples: [
      "こちらをおすすめいたします",
      "ぜひお試しください",
    ],
  },
  {
    id: "energetic",
    name: "テンション高め",
    description: "感嘆符多めの熱量のある文体",
    isAiExtracted: false,
    features: ["！多め", "強調表現", "アッパー系"],
    examples: [
      "これは本当にすごい！！",
      "マジで感動した！試してみて！",
    ],
  },
  {
    id: "calm",
    name: "落ち着いた",
    description: "冷静で理性的な印象を与える文体",
    isAiExtracted: true,
    features: ["〜ですね", "〜かと思います", "〜でしょう"],
    examples: [
      "参考になるかと思います",
      "良い選択肢ですね",
    ],
  },
  {
    id: "professional",
    name: "専門的",
    description: "技術用語を適切に使用する文体",
    isAiExtracted: false,
    features: ["専門用語", "正確な表現", "根拠明示"],
    examples: [
      "パフォーマンスが約30%向上します",
      "この実装では時間計算量がO(n)です",
    ],
  },
];

const initialEmojiSets: EmojiSet[] = [
  {
    id: "minimal",
    name: "控えめ",
    emojis: "✨",
    description: "文末に控えめに絵文字を追加",
  },
  {
    id: "energetic",
    name: "テンション高め",
    emojis: "🔥💪✨🎉",
    description: "エネルギッシュな印象を与える絵文字セット",
  },
  {
    id: "tech",
    name: "技術系",
    emojis: "💻⚡️🚀📝",
    description: "技術・開発に関連する絵文字",
  },
  {
    id: "thanks",
    name: "感謝",
    emojis: "🙏✨💕",
    description: "感謝や謝意を表す絵文字",
  },
  {
    id: "celebrate",
    name: "お祝い",
    emojis: "🎉🎊✨🥳",
    description: "祝福や達成を表す絵文字",
  },
];

export default function StylesPage() {
  const [styles, setStyles] = useState<WritingStyle[]>(initialStyles);
  const [emojiSets, setEmojiSets] = useState<EmojiSet[]>(initialEmojiSets);
  const [selectedStyle, setSelectedStyle] = useState<WritingStyle | null>(null);
  const [isAddStyleModalOpen, setIsAddStyleModalOpen] = useState(false);
  const [isAddEmojiModalOpen, setIsAddEmojiModalOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleDescription, setNewStyleDescription] = useState("");
  const [newStyleFeatures, setNewStyleFeatures] = useState("");
  const [newEmojiName, setNewEmojiName] = useState("");
  const [newEmojis, setNewEmojis] = useState("");
  const [newEmojiDescription, setNewEmojiDescription] = useState("");

  const handleAddStyle = () => {
    if (!newStyleName.trim()) return;

    const newStyle: WritingStyle = {
      id: `custom-${Date.now()}`,
      name: newStyleName,
      description: newStyleDescription,
      isAiExtracted: false,
      features: newStyleFeatures.split(",").map((f) => f.trim()).filter(Boolean),
      examples: [],
    };

    setStyles([...styles, newStyle]);
    setNewStyleName("");
    setNewStyleDescription("");
    setNewStyleFeatures("");
    setIsAddStyleModalOpen(false);
  };

  const handleAddEmojiSet = () => {
    if (!newEmojiName.trim() || !newEmojis.trim()) return;

    const newEmojiSet: EmojiSet = {
      id: `custom-${Date.now()}`,
      name: newEmojiName,
      emojis: newEmojis,
      description: newEmojiDescription,
    };

    setEmojiSets([...emojiSets, newEmojiSet]);
    setNewEmojiName("");
    setNewEmojis("");
    setNewEmojiDescription("");
    setIsAddEmojiModalOpen(false);
  };

  const handleDeleteStyle = (styleId: string) => {
    setStyles(styles.filter((s) => s.id !== styleId));
  };

  const handleDeleteEmojiSet = (emojiSetId: string) => {
    setEmojiSets(emojiSets.filter((e) => e.id !== emojiSetId));
  };

  return (
    <div className="p-8">
      <PageHeader
        title="口調・絵文字管理"
        description="投稿生成時に使用する口調と絵文字セットを管理"
      />

      <Tabs defaultValue="styles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="styles">
            <MessageSquare className="w-4 h-4 mr-2" />
            口調
          </TabsTrigger>
          <TabsTrigger value="emojis">
            <Smile className="w-4 h-4 mr-2" />
            絵文字セット
          </TabsTrigger>
        </TabsList>

        {/* Writing Styles Tab */}
        <TabsContent value="styles">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[--muted-foreground]">
              {styles.filter((s) => s.isAiExtracted).length}件のAI抽出口調、
              {styles.filter((s) => !s.isAiExtracted).length}件のカスタム口調
            </p>
            <Button onClick={() => setIsAddStyleModalOpen(true)}>
              <Plus className="w-4 h-4" />
              口調を追加
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styles.map((style) => (
              <Card key={style.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{style.name}</h3>
                      {style.isAiExtracted && (
                        <Badge variant="info" className="text-[10px]">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI抽出
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteStyle(style.id)}
                      className="p-1.5 rounded-[--radius-sm] text-[--muted-foreground] hover:text-[--destructive] hover:bg-white/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-sm text-[--muted-foreground] mb-3">
                    {style.description}
                  </p>

                  <div className="mb-3">
                    <p className="text-xs text-[--muted-foreground] mb-1.5">特徴</p>
                    <div className="flex flex-wrap gap-1.5">
                      {style.features.map((feature, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 text-xs bg-[--muted] text-white rounded"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>

                  {style.examples.length > 0 && (
                    <div>
                      <p className="text-xs text-[--muted-foreground] mb-1.5">例文</p>
                      <div className="space-y-1">
                        {style.examples.map((example, index) => (
                          <p key={index} className="text-xs text-white/80 italic">
                            「{example}」
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Emoji Sets Tab */}
        <TabsContent value="emojis">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[--muted-foreground]">
              {emojiSets.length}件の絵文字セット
            </p>
            <Button onClick={() => setIsAddEmojiModalOpen(true)}>
              <Plus className="w-4 h-4" />
              絵文字セット追加
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emojiSets.map((emojiSet) => (
              <Card key={emojiSet.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white">{emojiSet.name}</h3>
                    <button
                      onClick={() => handleDeleteEmojiSet(emojiSet.id)}
                      className="p-1.5 rounded-[--radius-sm] text-[--muted-foreground] hover:text-[--destructive] hover:bg-white/5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-3xl mb-3 tracking-wider">
                    {emojiSet.emojis}
                  </div>

                  <p className="text-sm text-[--muted-foreground]">
                    {emojiSet.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Style Modal */}
      <Modal
        isOpen={isAddStyleModalOpen}
        onClose={() => setIsAddStyleModalOpen(false)}
        title="口調を追加"
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              口調名
            </label>
            <Input
              value={newStyleName}
              onChange={(e) => setNewStyleName(e.target.value)}
              placeholder="例: ビジネスライク"
            />
          </div>
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              説明
            </label>
            <Textarea
              value={newStyleDescription}
              onChange={(e) => setNewStyleDescription(e.target.value)}
              placeholder="この口調の特徴を説明"
              className="min-h-[80px]"
            />
          </div>
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              特徴（カンマ区切り）
            </label>
            <Input
              value={newStyleFeatures}
              onChange={(e) => setNewStyleFeatures(e.target.value)}
              placeholder="例: 〜です, 〜ます, 敬語"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsAddStyleModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button className="flex-1" onClick={handleAddStyle}>
              追加
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Emoji Set Modal */}
      <Modal
        isOpen={isAddEmojiModalOpen}
        onClose={() => setIsAddEmojiModalOpen(false)}
        title="絵文字セットを追加"
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              セット名
            </label>
            <Input
              value={newEmojiName}
              onChange={(e) => setNewEmojiName(e.target.value)}
              placeholder="例: モチベーション"
            />
          </div>
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              絵文字
            </label>
            <Input
              value={newEmojis}
              onChange={(e) => setNewEmojis(e.target.value)}
              placeholder="例: 💪🔥✨"
              className="text-2xl"
            />
          </div>
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              説明
            </label>
            <Textarea
              value={newEmojiDescription}
              onChange={(e) => setNewEmojiDescription(e.target.value)}
              placeholder="この絵文字セットの用途"
              className="min-h-[60px]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsAddEmojiModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button className="flex-1" onClick={handleAddEmojiSet}>
              追加
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
