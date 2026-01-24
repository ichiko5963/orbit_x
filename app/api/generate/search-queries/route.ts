import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// カテゴリー別の検索クエリ生成ガイド
const CATEGORY_SEARCH_GUIDES: Record<string, string> = {
  "速報・ニュース系": `
【速報・ニュース系の検索クエリ】
- 公式発表、プレスリリース、リリースノート
- 「〇〇 発表」「〇〇 リリース」「〇〇 アップデート」
- 業界の最新動向、トレンド
- 具体的なバージョン番号や日付を含める
例: "OpenAI GPT-5 発表 2026年1月", "Apple Vision Pro 2 新機能 2026"`,

  "Tips・ノウハウ系": `
【Tips・ノウハウ系の検索クエリ】
- ベストプラクティス、効率的な方法
- 「〇〇 コツ」「〇〇 テクニック」「〇〇 効率化」
- 具体的な使い方、設定方法
- プロのやり方、上級者向けTips
例: "Claude プロンプト テクニック 2026", "React パフォーマンス最適化 ベストプラクティス"`,

  "記事・コンテンツ紹介系": `
【記事・コンテンツ紹介系の検索クエリ】
- 元記事の主題に関する詳細情報
- 関連する技術的背景、歴史
- 著者や企業についての情報
- 類似の事例、比較対象
例: "LLM エージェント 最新研究 2026", "〇〇 の仕組み 技術解説"`,

  "ツール・サービス紹介系": `
【ツール・サービス紹介系の検索クエリ】
- ツールの公式情報、機能一覧
- 料金プラン、無料版の制限
- 競合ツールとの比較
- 実際の使用感、レビュー
例: "Cursor vs GitHub Copilot 2026 比較", "〇〇 料金 プラン 2026"`,

  "動画・メディア紹介系": `
【動画・メディア紹介系の検索クエリ】
- 動画の主題に関する詳細情報
- 登場人物、企業の背景
- 関連する最新ニュース
- 視聴者の反応、コメント
例: "〇〇 インタビュー 最新", "〇〇 カンファレンス 2026 まとめ"`,

  "プロンプト・AI活用系": `
【プロンプト・AI活用系の検索クエリ】
- 最新のAIモデルの機能、特徴
- プロンプトエンジニアリング手法
- AI活用の具体的な事例
- 料金、API、制限事項
例: "Claude 3.5 Sonnet プロンプト 2026", "GPT-4o 新機能 活用法"`,

  "プロダクト・リリース系": `
【プロダクト・リリース系の検索クエリ】
- 類似プロダクトの市場動向
- 技術スタック、アーキテクチャ
- 競合分析、差別化ポイント
- ユーザー獲得、マーケティング手法
例: "SaaS ローンチ 戦略 2026", "〇〇 市場規模 2026"`,

  "イベント・登壇系": `
【イベント・登壇系の検索クエリ】
- イベントの概要、参加者
- 登壇トピックの詳細情報
- 過去の同イベントの内容
- 業界のトレンド、注目テーマ
例: "〇〇 カンファレンス 2026 登壇者", "〇〇 勉強会 最新"`,

  "プレゼント・キャンペーン系": `
【プレゼント・キャンペーン系の検索クエリ】
- プレゼント対象の製品/サービス情報
- 製品の特徴、レビュー
- 市場価格、入手方法
例: "〇〇 レビュー 2026", "〇〇 価格 比較"`,

  "採用・メンバー募集系": `
【採用・メンバー募集系の検索クエリ】
- 企業の最新情報、事業内容
- 業界の採用トレンド
- 給与相場、福利厚生
例: "〇〇 企業 最新ニュース", "エンジニア 採用 トレンド 2026"`,

  "日常・つぶやき系": `
【日常・つぶやき系の検索クエリ】
- つぶやきの主題に関する詳細情報
- トレンドや話題のニュース
- 共感を呼ぶ最新の事例
例: "〇〇 トレンド 2026", "〇〇 あるある"`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, postCategory, postSource, today } = body;

    if (!content) {
      return NextResponse.json(
        { error: "コンテンツを入力してください" },
        { status: 400 }
      );
    }

    // Calculate date range (last 2 weeks)
    const todayDate = today ? new Date(today) : new Date();
    const twoWeeksAgo = new Date(todayDate);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const dateRange = {
      from: twoWeeksAgo.toISOString().split("T")[0],
      to: todayDate.toISOString().split("T")[0],
    };

    console.log("[SearchQueries] Generating queries for:", content.slice(0, 100));
    console.log("[SearchQueries] Category:", postCategory || "none");
    console.log("[SearchQueries] Source:", postSource || "unknown");
    console.log("[SearchQueries] Date range:", dateRange);

    // カテゴリー別のガイドを取得
    const categoryGuide = postCategory ? CATEGORY_SEARCH_GUIDES[postCategory] || "" : "";

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたは最新情報リサーチの専門家です。
投稿内容とカテゴリーを分析し、直近2週間以内の最新情報を検索するための【具体的で実用的な】クエリを10個生成してください。

【重要】本日は ${today || todayDate.toISOString().split("T")[0]} です。
検索クエリには必ず「2026」「最新」「${todayDate.getMonth() + 1}月」などの時期を示すキーワードを含めてください。

【クエリ生成の原則】
1. 【具体的に】抽象的なクエリではなく、具体的な機能名、サービス名、技術名を含める
2. 【最新情報】2026年1月の最新情報を取得できるクエリにする
3. 【多角的に】公式情報、技術詳細、比較、事例、最新動向など異なる角度から
4. 【実用的に】実際に有用な情報が得られるクエリにする

${postCategory ? `【選択されたカテゴリー】${postCategory}
${categoryGuide}` : ""}

【クエリのカテゴリー分類】
各クエリに以下のカテゴリーを付与：
- 公式情報: 公式ドキュメント、公式発表、プレスリリース
- 技術詳細: 技術仕様、実装方法、ベストプラクティス
- 比較・評価: ベンチマーク、比較、レビュー、評価
- 活用事例: 使用例、事例紹介、体験談
- 最新動向: 最新ニュース、アップデート、トレンド

JSON形式で回答：
{
  "queries": [
    {
      "query": "具体的な検索クエリ文字列",
      "category": "公式情報 | 技術詳細 | 比較・評価 | 活用事例 | 最新動向",
      "description": "このクエリで何を調べるか（具体的に15文字程度）"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `以下の投稿内容について、最新情報を検索するためのクエリを10個生成してください。

【投稿内容】
${content}

${postCategory ? `【投稿カテゴリー】${postCategory}` : ""}

【検索対象期間】
${dateRange.from} 〜 ${dateRange.to}（直近2週間の最新情報）

【重要】
- 投稿内容に含まれる具体的なキーワード（サービス名、技術名、人名など）を活用する
- 2026年1月の最新情報を取得できるよう時期指定を含める
- 抽象的なクエリではなく、実際に検索して有用な情報が得られる具体的なクエリを生成する
- ${postCategory ? `「${postCategory}」に適した情報を得られるクエリにする` : ""}

カテゴリーをバランスよく、異なる角度から情報を収集できるクエリを生成してください。`,
        },
      ],
      temperature: 0.4,
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      const queries = result.queries || [];

      console.log("[SearchQueries] Generated", queries.length, "queries");
      if (queries.length > 0) {
        console.log("[SearchQueries] Sample query:", queries[0].query);
      }

      return NextResponse.json({
        success: true,
        queries,
        dateRange,
        postCategory: postCategory || null,
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: "クエリの解析に失敗しました",
        queries: [],
      });
    }
  } catch (error) {
    console.error("[SearchQueries] Error:", error);
    const message =
      error instanceof Error ? error.message : "検索クエリの生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
