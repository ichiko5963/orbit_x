# OrbitX 開発タスクリスト

## Phase 1: 基盤・UI構築

### 1.1 プロジェクトセットアップ
- [x] Next.js プロジェクト確認
- [x] 必要なパッケージインストール (zustand, lucide-react, date-fns, clsx)
- [x] ロゴ画像を public フォルダに配置
- [x] グローバルCSS・テーマ設定 (ダークテーマ)

### 1.2 共通コンポーネント
- [x] Button コンポーネント (primary/secondary/ghost/destructive)
- [x] Card コンポーネント (default/interactive)
- [x] Input / Textarea コンポーネント
- [x] Badge コンポーネント (ティア対応)
- [x] Tabs コンポーネント
- [x] Modal コンポーネント
- [x] Select / Checkbox コンポーネント

### 1.3 レイアウト
- [x] Sidebar コンポーネント (ナビゲーション)
- [x] MainLayout コンポーネント
- [x] PageHeader コンポーネント

## Phase 2: ページ実装

### 2.1 ダッシュボード
- [x] 統計カード表示 (総投稿数/インプレッション/いいね/Tier S)
- [x] クイックアクション (CSVインポート/AI投稿作成/投稿ランキング)
- [x] 最近の投稿一覧

### 2.2 CSVインポート
- [x] ドラッグ&ドロップアップロードUI
- [x] ファイル選択UI
- [x] 処理ステップ表示 (6ステップ)
- [x] 必須カラム説明
- [x] ティア設計説明

### 2.3 投稿ランキング
- [x] 投稿一覧表示 (インプレッション順)
- [x] 検索機能
- [x] ティアフィルター (S/A/B/C)
- [x] 投稿詳細モーダル
- [x] 構造分析表示
- [x] 再投稿アクション (同文/構文模倣/Quote)

### 2.4 AI投稿作成
- [x] カテゴリー選択 (8カテゴリー)
- [x] 型テンプレート選択 (6種類/カテゴリー)
- [x] 口調・絵文字設定
- [x] 6パターン生成表示
- [x] 投稿編集エリア
- [x] 文字数カウンター (280文字)
- [x] 投稿/予約投稿ボタン

### 2.5 外部コンテンツ提案
- [x] Qiita/Zenn記事一覧表示
- [x] 検索・フィルター機能
- [x] トレンド指標表示
- [x] 記事詳細モーダル
- [x] 投稿作成連携

### 2.6 他人のバズ投稿参考
- [x] 投稿追加モーダル (URL/本文入力)
- [x] 分析済み投稿一覧
- [x] 構造分析表示
- [x] 型固定化機能
- [x] 海外/国内バッジ

### 2.7 カテゴリー管理
- [x] カテゴリー一覧
- [x] カテゴリー追加・編集・削除
- [x] 型テンプレート一覧
- [x] 型固定化/解除

### 2.8 口調・絵文字管理
- [x] 口調一覧 (AI抽出/カスタム)
- [x] 口調追加・削除
- [x] 絵文字セット一覧
- [x] 絵文字セット追加・削除

### 2.9 設定
- [x] X API設定 (API Key/Secret/Token)
- [x] AI API設定 (OpenAI/Claude選択)
- [x] 投稿制御設定 (再投稿間隔/確認設定)
- [x] データ統計表示
- [x] データエクスポート
- [x] データ削除

## Phase 3: バックエンド実装 (未実装)

### 3.1 データベース
- [ ] Prisma スキーマ定義
- [ ] posts_raw テーブル
- [ ] post_structures テーブル
- [ ] categories テーブル
- [ ] category_template_types テーブル
- [ ] external_contents テーブル
- [ ] writing_styles / emoji_sets テーブル

### 3.2 API Routes
- [ ] CSV インポート API
- [ ] 投稿 CRUD API
- [ ] カテゴリー CRUD API
- [ ] 外部コンテンツ取得 API (Qiita/Zenn)
- [ ] AI 構造抽出 API
- [ ] AI 投稿生成 API

### 3.3 X API連携
- [ ] OAuth 認証
- [ ] 投稿 API
- [ ] 予約投稿機能

### 3.4 AI機能
- [ ] 構造抽出 (OpenAI/Claude)
- [ ] 投稿生成
- [ ] 口調抽出
- [ ] カテゴリー自動分類

## Phase 4: 外部連携 (未実装)

### 4.1 Qiita API
- [ ] アクセストークン設定
- [ ] トレンド記事取得
- [ ] 人気記事取得

### 4.2 Zenn API
- [ ] 記事一覧取得
- [ ] いいね順ソート

### 4.3 定期実行
- [ ] node-cron / Vercel Cron設定
- [ ] 毎日朝9時：Qiita/Zenn取得
- [ ] 3日経過後の自動削除

---

## UI/UX改善（2026-01-20更新）
- [x] グローバルCSS変数の整理（zinc系カラーパレット）
- [x] Buttonコンポーネント改善（loading prop追加）
- [x] Cardコンポーネント改善（hover prop対応）
- [x] Badgeコンポーネント改善（tier, success, warning, info variants）
- [x] Sidebarデザイン刷新（w-60幅、クリーンなデザイン）
- [x] MainLayoutのパディング調整
- [x] 全ページのコンポーネントAPI統一
- [x] .env.local.example作成（必要な環境変数一覧）

## 進捗状況
- 開始日: 2026-01-20
- 最終更新: 2026-01-20
- Phase 1-2: 完了 (フロントエンドUI + UI/UX改善)
- Phase 3-4: 未着手 (バックエンド/外部連携)

## 実装済みページ
1. `/` - ダッシュボード
2. `/import` - CSVインポート
3. `/posts` - 投稿ランキング
4. `/compose` - AI投稿作成
5. `/external` - 外部コンテンツ提案
6. `/viral` - 他人のバズ投稿参考
7. `/categories` - カテゴリー管理
8. `/styles` - 口調・絵文字管理
9. `/settings` - 設定
