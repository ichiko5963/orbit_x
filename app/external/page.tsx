"use client";

import { useState } from "react";
import {
  ExternalLink,
  Heart,
  Bookmark,
  Clock,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Filter,
  Search,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
} from "../components/ui";
import { PageHeader } from "../components/layout";

interface ExternalContent {
  id: string;
  title: string;
  url: string;
  description: string;
  authorName: string;
  likeCount: number;
  stockCount?: number;
  source: "qiita" | "zenn";
  tags: string[];
  fetchedAt: string;
  isTrending?: boolean;
}

const sampleContents: ExternalContent[] = [
  {
    id: "1",
    title: "React Server Componentsを完全に理解する",
    url: "https://qiita.com/example/react-server-components",
    description: "React Server Componentsの仕組みと実践的な使い方を解説します。Next.js App Routerとの組み合わせ方も紹介。",
    authorName: "tech_writer",
    likeCount: 450,
    stockCount: 320,
    source: "qiita",
    tags: ["React", "Next.js", "TypeScript"],
    fetchedAt: "2024-01-20T09:00:00Z",
    isTrending: true,
  },
  {
    id: "2",
    title: "TypeScript 5.4の新機能まとめ",
    url: "https://zenn.dev/example/typescript-5-4",
    description: "TypeScript 5.4で追加された新機能をまとめました。NoInferユーティリティ型やクロージャの型推論改善など。",
    authorName: "ts_master",
    likeCount: 380,
    source: "zenn",
    tags: ["TypeScript", "フロントエンド"],
    fetchedAt: "2024-01-20T09:00:00Z",
    isTrending: true,
  },
  {
    id: "3",
    title: "Prismaのパフォーマンス最適化テクニック",
    url: "https://qiita.com/example/prisma-performance",
    description: "Prismaを使ったアプリケーションのパフォーマンスを向上させるためのテクニックを紹介します。",
    authorName: "db_expert",
    likeCount: 280,
    stockCount: 180,
    source: "qiita",
    tags: ["Prisma", "Database", "Node.js"],
    fetchedAt: "2024-01-19T09:00:00Z",
  },
  {
    id: "4",
    title: "Next.js 15のPartial Prerenderingを試してみた",
    url: "https://zenn.dev/example/nextjs-15-ppr",
    description: "Next.js 15で安定版になったPartial Prerenderingの使い方と、実際のプロジェクトでの活用例を紹介します。",
    authorName: "frontend_dev",
    likeCount: 220,
    source: "zenn",
    tags: ["Next.js", "React", "パフォーマンス"],
    fetchedAt: "2024-01-19T09:00:00Z",
  },
  {
    id: "5",
    title: "GitHub Actionsで効率的なCI/CDを構築する",
    url: "https://qiita.com/example/github-actions-cicd",
    description: "GitHub Actionsを使った効率的なCI/CDパイプラインの構築方法を解説。キャッシュ戦略やmatrixビルドも。",
    authorName: "devops_pro",
    likeCount: 190,
    stockCount: 150,
    source: "qiita",
    tags: ["GitHub Actions", "CI/CD", "DevOps"],
    fetchedAt: "2024-01-18T09:00:00Z",
  },
  {
    id: "6",
    title: "Tailwind CSS v4の変更点と移行ガイド",
    url: "https://zenn.dev/example/tailwind-v4",
    description: "Tailwind CSS v4で変わる設定ファイルの書き方や、新機能について解説。既存プロジェクトの移行方法も。",
    authorName: "css_ninja",
    likeCount: 165,
    source: "zenn",
    tags: ["Tailwind CSS", "CSS", "フロントエンド"],
    fetchedAt: "2024-01-18T09:00:00Z",
  },
];

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExternalPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedContent, setSelectedContent] = useState<ExternalContent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredContents = sampleContents.filter((content) => {
    const matchesSearch =
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = selectedSource === "all" || content.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const handleContentClick = (content: ExternalContent) => {
    setSelectedContent(content);
    setIsModalOpen(true);
  };

  return (
    <div className="p-8">
      <PageHeader
        title="外部コンテンツ提案"
        description="Qiita・Zennのトレンド記事から投稿を作成"
        action={
          <Button onClick={handleRefresh} loading={isRefreshing} variant="secondary">
            <RefreshCw className="w-4 h-4" />
            最新を取得
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
          <Input
            placeholder="記事を検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="all" onValueChange={setSelectedSource}>
          <TabsList>
            <TabsTrigger value="all">すべて</TabsTrigger>
            <TabsTrigger value="qiita">Qiita</TabsTrigger>
            <TabsTrigger value="zenn">Zenn</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 mb-4 text-sm text-[--muted-foreground]">
        <Clock className="w-4 h-4" />
        <span>最終更新: {formatDate(new Date().toISOString())}</span>
        <span className="mx-2">•</span>
        <span>{filteredContents.length}件の記事</span>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContents.map((content) => (
          <Card
            key={content.id}
            hover
            onClick={() => handleContentClick(content)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <Badge
                  variant={content.source === "qiita" ? "success" : "info"}
                  className="uppercase text-[10px]"
                >
                  {content.source}
                </Badge>
                {content.isTrending && (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    トレンド
                  </Badge>
                )}
              </div>

              <h3 className="text-sm font-semibold text-white line-clamp-2 mb-2">
                {content.title}
              </h3>
              <p className="text-xs text-[--muted-foreground] line-clamp-2 mb-3">
                {content.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {content.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] bg-[--muted] text-[--muted-foreground] rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[--border]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                    <Heart className="w-3.5 h-3.5" />
                    {formatNumber(content.likeCount)}
                  </span>
                  {content.stockCount && (
                    <span className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                      <Bookmark className="w-3.5 h-3.5" />
                      {formatNumber(content.stockCount)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[--muted-foreground]">
                  @{content.authorName}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="記事詳細"
        size="lg"
      >
        {selectedContent && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-3">
              <Badge
                variant={selectedContent.source === "qiita" ? "success" : "info"}
                className="uppercase"
              >
                {selectedContent.source}
              </Badge>
              {selectedContent.isTrending && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  トレンド
                </Badge>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-2">
                {selectedContent.title}
              </h2>
              <p className="text-sm text-[--muted-foreground]">
                {selectedContent.description}
              </p>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-[--muted-foreground]">
                <Heart className="w-4 h-4" />
                <span className="text-white font-medium">{formatNumber(selectedContent.likeCount)}</span>
                いいね
              </span>
              {selectedContent.stockCount && (
                <span className="flex items-center gap-1.5 text-[--muted-foreground]">
                  <Bookmark className="w-4 h-4" />
                  <span className="text-white font-medium">{formatNumber(selectedContent.stockCount)}</span>
                  ストック
                </span>
              )}
              <span className="text-[--muted-foreground]">
                by @{selectedContent.authorName}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedContent.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs bg-[--muted] text-white rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-[--border] flex items-center gap-3">
              <Button className="flex-1">
                <Sparkles className="w-4 h-4" />
                この記事で投稿作成
              </Button>
              <Button variant="secondary">
                <ExternalLink className="w-4 h-4" />
                記事を開く
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
