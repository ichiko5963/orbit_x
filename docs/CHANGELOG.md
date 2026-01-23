# OrbitX 更新履歴

## 2026-01-23 - 外部コンテンツ大幅拡張 & X連携完成

### 新機能

#### 外部コンテンツソース拡張
公式AIブログと海外AI記事サイトを大幅に追加しました。

**公式AIブログ（5サイト）:**
- **OpenAI** (`openai.com/news/`) - ChatGPT、GPT-4関連の公式ニュース
- **Anthropic** (`anthropic.com/news`) - Claude関連の公式ニュース
- **Google AI** (`blog.google/technology/ai/`) - Gemini、Google AI関連
- **Cursor** (`cursor.com/blog`) - AIエディターCursorのブログ
- **Vercel** (`vercel.com/blog`) - AI SDK、v0関連のブログ

**海外AI記事サイト（3サイト）:**
- **Medium** - AI/機械学習タグの人気記事
- **DEV.to** - AIタグの記事
- **Hashnode** - AI関連記事（GraphQL API使用）

#### X保存投稿（ブックマーク）連携
- OAuth 2.0 PKCE認証でXと連携
- ブックマーク一覧表示
- 英語投稿の日本語翻訳（OpenAI使用）
- ブックマークをAI投稿作成の参照として使用可能

#### AI強化機能の改善
AI強化が「完全書き換え」から「構造保持型」に変更:
- **続きを追加**: 現在の投稿の最後に一文追加
- **表現を磨く**: 構造維持、表現のみ微調整
- **要素を補強**: 足りない要素（数字、具体例）を追加
- 元の投稿の70%以上を維持

### 新規ファイル

```
lib/
├── official-ai-blogs.ts    # 公式AIブログ取得モジュール
├── international-ai-articles.ts  # 海外記事サイト取得モジュール
├── x-oauth.ts             # OAuth 2.0 PKCE ユーティリティ
├── github-trending.ts     # GitHub AI/LLMリポジトリ取得
└── claude-skills.ts       # Claude Skills取得

app/api/
├── auth/x/
│   ├── route.ts          # OAuth開始エンドポイント
│   └── callback/route.ts # OAuthコールバック処理
├── x/bookmarks/route.ts  # ブックマーク取得API
├── translate/route.ts    # 翻訳API（英→日）
└── scrape-article/route.ts # 記事スクレイピング（拡張）

app/(app)/
└── bookmarks/page.tsx    # ブックマーク一覧ページ
```

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `lib/types.ts` | ExternalSource型に8つの新ソースを追加 |
| `app/api/external/route.ts` | 新ソースの取得処理追加 |
| `app/api/scrape-article/route.ts` | 8つの新サイト対応スクレイピング追加 |
| `app/(app)/external/page.tsx` | 公式AI・海外タブ追加、UI改善 |
| `app/(app)/settings/page.tsx` | X連携ボタン追加 |
| `app/(app)/compose/page.tsx` | ブックマーク参照機能追加 |
| `app/api/generate/enhance-options/route.ts` | プロンプト全面改修 |
| `lib/openai.ts` | enhancePost関数の構造保持強化 |
| `app/(app)/compose/editor/page.tsx` | AI強化UIラベル変更 |

### 対応RSS/APIソース

| ソース | 取得方法 | URL |
|-------|---------|-----|
| OpenAI | RSS | `openai.com/news/rss.xml` |
| Google AI | RSS | `blog.google/technology/ai/rss/` |
| Vercel | Atom | `vercel.com/atom` |
| Medium | RSS | `medium.com/feed/tag/artificial-intelligence` |
| DEV.to | RSS | `dev.to/feed/tag/ai` |
| Hashnode | GraphQL | `gql.hashnode.com` |
| Anthropic | スクレイピング | `anthropic.com/news` |
| Cursor | スクレイピング | `cursor.com/blog` |

---

## 2026-01-22 - GitHub AI リポジトリ & Claude Skills

### 新機能
- GitHub Search APIでAI/LLMリポジトリを取得
- Claude Code人気スキルをキュレーションリストで提供
- 外部コンテンツページにGitHub/Skillsタブ追加

### 新規ファイル
- `lib/github-trending.ts` - GitHub API連携
- `lib/claude-skills.ts` - Claude Skillsリスト

---

## 2026-01-21 - 記事スクレイピング & 全文対応

### 新機能
- 記事スクレイピングAPI（Qiita、Zenn、GitHub対応）
- AI投稿生成時に記事全文を使用
- 外部コンテンツUIの簡素化（画像削除、コンパクト表示）

### 新規ファイル
- `app/api/scrape-article/route.ts`

### 変更ファイル
- `app/api/generate-article-post/route.ts` - 全文取得対応
- `app/(app)/external/page.tsx` - UI簡素化

---

## 2026-01-20 - 初期実装完了

### 実装済み機能
- CSVインポート（X Premium CSV対応）
- 投稿ランキング（ティアS/A/B/C分類）
- AI投稿作成（6パターン生成）
- 外部コンテンツ提案（Qiita/Zenn）
- カテゴリー管理
- 口調・絵文字管理
- 設定ページ

### 技術スタック
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Firebase (Authentication, Firestore)
- OpenAI API

---

## 今後の予定

### Phase 4（将来）
- 自動時間提案
- 投稿結果フィードバック
- 学習ループ
- SaaS化
