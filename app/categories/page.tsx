"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Eye,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Sparkles,
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

interface TemplateType {
  id: string;
  name: string;
  impression: number;
  isFixed: boolean;
  structure: { role: string; text: string }[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  postCount: number;
  isUserCreated: boolean;
  templates: TemplateType[];
}

const initialCategories: Category[] = [
  {
    id: "article",
    name: "記事紹介",
    description: "技術記事やブログの紹介",
    postCount: 15,
    isUserCreated: false,
    templates: [
      { id: "1", name: "型1", impression: 25000, isFixed: true, structure: [{ role: "headline", text: "【記事紹介】" }] },
      { id: "2", name: "型2", impression: 18000, isFixed: false, structure: [{ role: "context", text: "" }] },
      { id: "3", name: "型3", impression: 15000, isFixed: false, structure: [{ role: "problem", text: "" }] },
      { id: "4", name: "型4", impression: 12000, isFixed: false, structure: [{ role: "topic", text: "" }] },
      { id: "5", name: "型5", impression: 10000, isFixed: false, structure: [{ role: "intro", text: "" }] },
      { id: "6", name: "型6", impression: 8500, isFixed: false, structure: [{ role: "share", text: "" }] },
    ],
  },
  {
    id: "news",
    name: "速報",
    description: "新機能やアップデート情報",
    postCount: 12,
    isUserCreated: false,
    templates: [
      { id: "1", name: "型1", impression: 32000, isFixed: true, structure: [{ role: "breaking", text: "【速報】" }] },
      { id: "2", name: "型2", impression: 24000, isFixed: false, structure: [{ role: "news", text: "" }] },
      { id: "3", name: "型3", impression: 18000, isFixed: false, structure: [{ role: "update", text: "" }] },
      { id: "4", name: "型4", impression: 14000, isFixed: false, structure: [{ role: "alert", text: "" }] },
      { id: "5", name: "型5", impression: 11000, isFixed: false, structure: [{ role: "info", text: "" }] },
      { id: "6", name: "型6", impression: 9000, isFixed: false, structure: [{ role: "announce", text: "" }] },
    ],
  },
  {
    id: "knowhow",
    name: "ノウハウ",
    description: "実践的なTips・知見",
    postCount: 28,
    isUserCreated: false,
    templates: [
      { id: "1", name: "型1", impression: 35000, isFixed: true, structure: [{ role: "headline", text: "" }] },
      { id: "2", name: "型2", impression: 28000, isFixed: true, structure: [{ role: "problem", text: "" }] },
      { id: "3", name: "型3", impression: 22000, isFixed: false, structure: [{ role: "tip", text: "" }] },
      { id: "4", name: "型4", impression: 18000, isFixed: false, structure: [{ role: "before", text: "" }] },
      { id: "5", name: "型5", impression: 15000, isFixed: false, structure: [{ role: "context", text: "" }] },
      { id: "6", name: "型6", impression: 12000, isFixed: false, structure: [{ role: "question", text: "" }] },
    ],
  },
  {
    id: "mind",
    name: "マインド",
    description: "考え方・心構え",
    postCount: 18,
    isUserCreated: false,
    templates: [
      { id: "1", name: "型1", impression: 38000, isFixed: true, structure: [{ role: "contrary", text: "" }] },
      { id: "2", name: "型2", impression: 30000, isFixed: false, structure: [{ role: "problem", text: "" }] },
      { id: "3", name: "型3", impression: 24000, isFixed: false, structure: [{ role: "observation", text: "" }] },
      { id: "4", name: "型4", impression: 20000, isFixed: false, structure: [{ role: "quote", text: "" }] },
      { id: "5", name: "型5", impression: 16000, isFixed: false, structure: [{ role: "years", text: "" }] },
      { id: "6", name: "型6", impression: 13000, isFixed: false, structure: [{ role: "myth", text: "" }] },
    ],
  },
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory: Category = {
      id: `custom-${Date.now()}`,
      name: newCategoryName,
      description: newCategoryDescription,
      postCount: 0,
      isUserCreated: true,
      templates: [],
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setIsAddModalOpen(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(categories.filter((c) => c.id !== categoryId));
    if (selectedCategory?.id === categoryId) {
      setSelectedCategory(null);
    }
  };

  const handleToggleFixed = (categoryId: string, templateId: string) => {
    setCategories(
      categories.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          templates: category.templates.map((template) => {
            if (template.id !== templateId) return template;
            return { ...template, isFixed: !template.isFixed };
          }),
        };
      })
    );
  };

  return (
    <div className="p-8">
      <PageHeader
        title="カテゴリー管理"
        description="投稿カテゴリーと型テンプレートを管理"
        action={
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            カテゴリー追加
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Categories List */}
        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">カテゴリー一覧</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-[--border]">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full flex items-center justify-between p-4 text-left transition-all ${
                      selectedCategory?.id === category.id
                        ? "bg-white/5"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[--radius-sm] bg-[--muted] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[--muted-foreground]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {category.name}
                          </span>
                          {category.isUserCreated && (
                            <Badge variant="info" className="text-[10px]">カスタム</Badge>
                          )}
                        </div>
                        <p className="text-xs text-[--muted-foreground] mt-0.5">
                          {category.postCount}件の投稿 • {category.templates.length}種類の型
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[--muted-foreground]" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Details */}
        <div className="lg:col-span-7">
          {selectedCategory ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{selectedCategory.name}の型テンプレート</CardTitle>
                    <p className="text-xs text-[--muted-foreground] mt-1">
                      {selectedCategory.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCategory.isUserCreated && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditModalOpen(true)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(selectedCategory.id)}
                        >
                          <Trash2 className="w-4 h-4 text-[--destructive]" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedCategory.templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 bg-[--muted] rounded-[--radius-sm] border border-[--border]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-white">
                            {template.name}
                          </span>
                          <button
                            onClick={() =>
                              handleToggleFixed(selectedCategory.id, template.id)
                            }
                            className="flex items-center gap-1 text-xs"
                          >
                            {template.isFixed ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-[--warning]" />
                                <span className="text-[--warning]">固定</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-[--muted-foreground]" />
                                <span className="text-[--muted-foreground]">一時的</span>
                              </>
                            )}
                          </button>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                          <Eye className="w-3.5 h-3.5" />
                          {formatNumber(template.impression)}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {template.structure.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="px-1.5 py-0.5 bg-[--card] text-[--muted-foreground] rounded">
                              {item.role}
                            </span>
                            <span className="text-white/60">{item.text || "..."}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[--border]">
                        <Button variant="secondary" size="sm" className="flex-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          この型で生成
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {selectedCategory.templates.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-sm text-[--muted-foreground]">
                        型テンプレートがありません
                      </p>
                      <p className="text-xs text-[--muted-foreground] mt-1">
                        CSVをインポートすると自動生成されます
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-12 h-12 text-[--muted-foreground] mb-4" />
                <p className="text-sm text-[--muted-foreground]">
                  カテゴリーを選択してください
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="カテゴリーを追加"
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              カテゴリー名
            </label>
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="例: プレゼント企画"
            />
          </div>
          <div>
            <label className="text-sm text-[--muted-foreground] mb-1.5 block">
              説明
            </label>
            <Textarea
              value={newCategoryDescription}
              onChange={(e) => setNewCategoryDescription(e.target.value)}
              placeholder="このカテゴリーの説明"
              className="min-h-[80px]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIsAddModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button className="flex-1" onClick={handleAddCategory}>
              追加
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
