import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Step 1: Extract claims that need fact-checking
async function extractClaims(content: string): Promise<{
  claims: { claim: string; searchQuery: string }[];
  hasFactualClaims: boolean;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたはファクトチェックの専門家です。
投稿内容から、事実確認が必要な主張を抽出してください。

【抽出対象】
- 数字・統計データ（○○%、○○倍、○○人など）
- 日付・時期に関する主張
- 技術的な仕様・機能に関する主張
- 「〜によると」「〜では」などの引用
- 比較や優劣の主張
- 「初めて」「最大」「唯一」などの最上級表現

【抽出しない】
- 個人の意見・感想
- 一般的な常識
- 抽象的な表現

JSON形式で回答：
{
  "claims": [
    {
      "claim": "確認が必要な主張",
      "searchQuery": "この主張を検証するための検索クエリ"
    }
  ],
  "hasFactualClaims": true/false
}

※ 最大5つまで抽出`,
      },
      {
        role: "user",
        content: `以下の投稿から、事実確認が必要な主張を抽出してください：

${content}`,
      },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      claims: result.claims || [],
      hasFactualClaims: result.hasFactualClaims || false,
    };
  } catch {
    return { claims: [], hasFactualClaims: false };
  }
}

// Step 2: Research each claim thoroughly
async function researchClaim(
  claim: string,
  searchQuery: string
): Promise<{
  claim: string;
  isAccurate: boolean;
  correction: string | null;
  sources: string[];
  confidence: "high" | "medium" | "low";
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは徹底的なファクトチェッカーです。
与えられた主張を検証し、正確性を判定してください。

【検証の観点】
1. 数字・データは正確か（最新の情報と照合）
2. 日付・時期は正しいか
3. 技術的な仕様は正確か（公式ドキュメントと照合）
4. 引用元の情報は正しいか
5. 誇張や不正確な表現はないか

【重視する情報源】
- 公式ドキュメント
- 公式発表・プレスリリース
- 学術論文・調査レポート
- 信頼できる技術メディア

JSON形式で回答：
{
  "isAccurate": true/false,
  "correction": "不正確な場合の修正案（正確な場合はnull）",
  "sources": ["参照した情報源1", "参照した情報源2"],
  "confidence": "high/medium/low",
  "details": "検証の詳細（1-2文）"
}`,
      },
      {
        role: "user",
        content: `【検証する主張】
${claim}

【検索クエリ】
${searchQuery}

この主張の正確性を徹底的に検証してください。`,
      },
    ],
    temperature: 0.1,
    max_tokens: 800,
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      claim,
      isAccurate: result.isAccurate ?? true,
      correction: result.correction || null,
      sources: result.sources || [],
      confidence: result.confidence || "medium",
    };
  } catch {
    return {
      claim,
      isAccurate: true,
      correction: null,
      sources: [],
      confidence: "low",
    };
  }
}

// Step 3: Check overall flow and naturalness
async function checkFlowAndNaturalness(content: string): Promise<{
  hasIssues: boolean;
  issues: string[];
  suggestions: string[];
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは文章校正の専門家です。
投稿の「流れ」と「自然さ」をチェックしてください。

【チェック項目】
1. 文章の論理的なつながり
2. 唐突な話題転換がないか
3. 重複した内容がないか
4. 結論と内容の整合性
5. 読みやすさ・理解しやすさ

JSON形式で回答：
{
  "hasIssues": true/false,
  "issues": ["問題点1", "問題点2"],
  "suggestions": ["改善提案1", "改善提案2"]
}`,
      },
      {
        role: "user",
        content: `以下の投稿の流れと自然さをチェックしてください：

${content}`,
      },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  try {
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      hasIssues: result.hasIssues || false,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
    };
  } catch {
    return { hasIssues: false, issues: [], suggestions: [] };
  }
}

// Step 4: Rewrite content with corrections
async function rewriteWithCorrections(
  originalContent: string,
  factCheckResults: {
    claim: string;
    isAccurate: boolean;
    correction: string | null;
    sources: string[];
  }[],
  flowCheck: {
    hasIssues: boolean;
    issues: string[];
    suggestions: string[];
  }
): Promise<string> {
  const corrections = factCheckResults
    .filter((r) => !r.isAccurate && r.correction)
    .map((r) => `- 「${r.claim}」→「${r.correction}」`)
    .join("\n");

  const flowIssues = flowCheck.hasIssues
    ? flowCheck.issues.map((i) => `- ${i}`).join("\n")
    : "";

  const flowSuggestions = flowCheck.suggestions.length > 0
    ? flowCheck.suggestions.map((s) => `- ${s}`).join("\n")
    : "";

  // If no corrections needed, return original
  if (!corrections && !flowCheck.hasIssues) {
    return originalContent;
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `あなたは投稿の校正専門家です。
ファクトチェック結果と流れのチェック結果を踏まえて、投稿を修正してください。

【修正ルール】
1. 不正確な事実は正確な情報に置き換える
2. 元の投稿のトーン・スタイルを維持
3. 文章の流れを自然に保つ
4. 修正は最小限に（必要な箇所のみ）
5. 投稿としての魅力を損なわない

【重要】
- 大幅な書き換えは避ける
- 元の意図を尊重する
- 修正後も読みやすさを維持`,
      },
      {
        role: "user",
        content: `【元の投稿】
${originalContent}

${corrections ? `【ファクトチェックによる修正点】\n${corrections}` : ""}

${flowIssues ? `【流れの問題点】\n${flowIssues}` : ""}

${flowSuggestions ? `【改善提案】\n${flowSuggestions}` : ""}

上記を踏まえて、投稿を修正してください。修正が必要ない場合は元の投稿をそのまま返してください。`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  return response.choices[0]?.message?.content || originalContent;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "コンテンツを入力してください" },
        { status: 400 }
      );
    }

    console.log("[FactCheck] Starting fact check...");

    // Step 1: Extract claims
    const { claims, hasFactualClaims } = await extractClaims(content);
    console.log("[FactCheck] Claims extracted:", claims.length);

    // Step 2: Research each claim
    let factCheckResults: {
      claim: string;
      isAccurate: boolean;
      correction: string | null;
      sources: string[];
      confidence: "high" | "medium" | "low";
    }[] = [];

    if (hasFactualClaims && claims.length > 0) {
      const researchPromises = claims.slice(0, 5).map((c) =>
        researchClaim(c.claim, c.searchQuery)
      );
      factCheckResults = await Promise.all(researchPromises);
      console.log("[FactCheck] Research complete");
    }

    // Step 3: Check flow and naturalness
    const flowCheck = await checkFlowAndNaturalness(content);
    console.log("[FactCheck] Flow check complete");

    // Determine if any corrections are needed
    const hasFactErrors = factCheckResults.some((r) => !r.isAccurate);
    const needsCorrection = hasFactErrors || flowCheck.hasIssues;

    // Step 4: Rewrite if needed
    let correctedContent = content;
    if (needsCorrection) {
      correctedContent = await rewriteWithCorrections(
        content,
        factCheckResults,
        flowCheck
      );
      console.log("[FactCheck] Content corrected");
    }

    // Build result summary
    const accurateClaims = factCheckResults.filter((r) => r.isAccurate).length;
    const inaccurateClaims = factCheckResults.filter((r) => !r.isAccurate).length;

    return NextResponse.json({
      success: true,
      originalContent: content,
      correctedContent,
      wasModified: content !== correctedContent,
      summary: {
        totalClaims: claims.length,
        accurateClaims,
        inaccurateClaims,
        flowIssues: flowCheck.issues.length,
      },
      details: {
        factCheckResults: factCheckResults.map((r) => ({
          claim: r.claim,
          isAccurate: r.isAccurate,
          correction: r.correction,
          confidence: r.confidence,
        })),
        flowCheck: {
          hasIssues: flowCheck.hasIssues,
          issues: flowCheck.issues,
        },
      },
    });
  } catch (error) {
    console.error("[FactCheck] Error:", error);
    const message =
      error instanceof Error ? error.message : "ファクトチェック中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
