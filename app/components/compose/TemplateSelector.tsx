"use client";

import { Lightbulb, Newspaper, List, MessageSquare, Wrench, Video } from "lucide-react";

export interface Template {
  id: string;
  name: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export const templates: Template[] = [
  {
    id: "insight",
    name: "気づき共有型",
    description: "逆説的な気づきで注目を引く",
    example: "〇〇で最も大切なのは「△△」じゃない。\n\n本当に大切なのは「□□」。\n\nなぜなら...",
    icon: <Lightbulb className="w-5 h-5" />,
  },
  {
    id: "news",
    name: "速報・ニュース型",
    description: "最新情報をいち早く共有",
    example: "【速報】〇〇が△△に対応\n\n□□の組み合わせが最強。\n\n詳しくはスレッドで↓",
    icon: <Newspaper className="w-5 h-5" />,
  },
  {
    id: "list",
    name: "リスト型",
    description: "箇条書きで読みやすく",
    example: "エンジニア3年目で気づいたこと\n\n・〇〇より△△\n・□□より■■\n・▲▲より●●",
    icon: <List className="w-5 h-5" />,
  },
  {
    id: "thread",
    name: "スレッド型",
    description: "続きが気になる導入",
    example: "〇〇について解説します\n\n多くの人が誤解している△△。\n\n実は...\n\n↓",
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    id: "problem-solving",
    name: "問題解決型",
    description: "課題提起から解決策へ",
    example: "「〇〇がうまくいかない」\n\nこの悩み、よく聞きます。\n\n解決策は△△。\n\n具体的には...",
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    id: "video",
    name: "動画投稿",
    description: "動画コンテンツ用",
    example: "近日実装予定",
    icon: <Video className="w-5 h-5" />,
    disabled: true,
  },
];

interface TemplateSelectorProps {
  selectedTemplate: string | null;
  onSelect: (templateId: string) => void;
}

export function TemplateSelector({ selectedTemplate, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-700">
        テンプレートを選択
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => !template.disabled && onSelect(template.id)}
            disabled={template.disabled}
            className={`relative p-4 rounded-xl text-left transition-all ${
              template.disabled
                ? "bg-zinc-100 cursor-not-allowed opacity-60"
                : selectedTemplate === template.id
                ? "bg-emerald-50 border-2 border-emerald-500 shadow-sm"
                : "bg-zinc-50 border-2 border-transparent hover:border-zinc-200 hover:bg-zinc-100"
            }`}
          >
            {template.disabled && (
              <span className="absolute top-2 right-2 text-xs bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
            <div className={`flex items-center gap-2 mb-2 ${
              template.disabled ? "text-zinc-400" : selectedTemplate === template.id ? "text-emerald-600" : "text-zinc-700"
            }`}>
              {template.icon}
              <span className="font-medium">{template.name}</span>
            </div>
            <p className={`text-xs ${template.disabled ? "text-zinc-400" : "text-zinc-500"}`}>
              {template.description}
            </p>
          </button>
        ))}
      </div>

      {selectedTemplate && !templates.find(t => t.id === selectedTemplate)?.disabled && (
        <div className="mt-4 p-4 bg-zinc-50 rounded-xl">
          <p className="text-xs text-zinc-500 mb-2">テンプレート例:</p>
          <p className="text-sm text-zinc-700 whitespace-pre-line">
            {templates.find(t => t.id === selectedTemplate)?.example}
          </p>
        </div>
      )}
    </div>
  );
}
