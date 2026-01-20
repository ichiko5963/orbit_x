// Post types
export interface Post {
  id: string;
  tweetId: string;
  text: string;
  createdAt: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  tier: "S" | "A" | "B" | "C";
  category: string;
  structure: PostStructure[];
  repostCount: number;
  lastRepostedAt: string | null;
}

export interface PostStructure {
  role: string;
  text: string;
}

// CSV row type from X Premium export
export interface CSVRow {
  date: string;           // 日付
  text: string;           // ポスト本文
  link: string;           // ポストのリンク
  impressions: string;    // インプレッション数
  likes: string;          // いいね
  engagement: string;     // エンゲージメント
}

// Import result type
export interface ImportResult {
  total: number;
  tierS: number;
  tierA: number;
  tierB: number;
  tierC: number;
  categories: number;
}

// External content types
export interface ExternalArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  source: "qiita" | "zenn";
  author: string;
  likes: number;
  publishedAt: string;
  tags: string[];
  imageUrl: string | null;
  saved: boolean;
}

// Viral post types
export interface ViralPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  url: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  createdAt: string;
  category: string;
  saved: boolean;
}

// Category types
export interface Category {
  id: string;
  name: string;
  color: string;
  postCount: number;
  description: string;
}

// Tone style types
export interface ToneStyle {
  id: string;
  name: string;
  description: string;
  example: string;
  emojiSet: string[];
  isDefault: boolean;
}

// Template types
export interface PostTemplate {
  id: string;
  name: string;
  description: string;
  structure: string[];
  example: string;
}

// AI Generation Template types (6 templates)
export interface GenerationTemplate {
  id: string;
  name: string;
  description: string;
  example: string;
  icon: string;
}

// Context Post types (for reference)
export interface ContextPost {
  id: string;
  text: string;
  likes: number;
  impressions: number;
  tier: "S" | "A" | "B" | "C";
  category: string;
  structure?: PostStructure[];
  importedAt: string;
}

// Scheduled Post types (extended)
export interface ScheduledPost {
  id: string;
  text: string;
  scheduledAt: Date;
  status: "scheduled" | "posted" | "failed";
  imageUrls?: string[];
  generatedFrom?: {
    templateId: string;
    referencePostId?: string;
  };
  createdAt: string;
}

// Draft types
export interface Draft {
  id: string;
  text: string;
  imageUrls?: string[];
  templateId?: string;
  referencePostId?: string;
  createdAt: string;
}

// Generation options with reference post
export interface GenerationOptions {
  mode: "template" | "reference" | "auto";
  templateId?: string;
  referencePostId?: string;
  referenceText?: string;
  content: string;
  category?: string;
  tone?: string;
}
