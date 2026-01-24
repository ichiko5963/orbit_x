import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BuzzPattern {
  name: string;
  description: string;
  template: string;
}

interface BuzzPrompt {
  prompt: string;
  patterns: BuzzPattern[];
  characteristics: string[];
  avoidPatterns: string[];
  samplePhrases: string[];
}

interface CorrectionRequest {
  currentText: string;
  originalContent: string;
  referenceText: string;
  researchData?: string;
  buzzPrompt?: BuzzPrompt;
}

/**
 * AI補正: バズるプロンプトを使って3パターン生成
 * - 構造は維持しつつ、一貫性と有益さを高める
 * - バズる要素を追加
 */
export async function POST(request: NextRequest) {
  try {
    const body: CorrectionRequest = await request.json();
    const { currentText, originalContent, referenceText, researchData, buzzPrompt } = body;

    if (!currentText) {
      return NextResponse.json(
        { error: "投稿テキストが必要です" },
        { status: 400 }
      );
    }

    // 現在の投稿の構造を分析
    const lines = currentText.split("\n");
    const lineCount = lines.length;
    const emptyLinePositions = lines.map((l, i) => l.trim() === "" ? i : -1).filter(i => i >= 0);
    const bulletLines = lines.map((l, i) => /^[・\-•]/.test(l.trim()) ? i : -1).filter(i => i >= 0);
    const bulletCount = bulletLines.length;
    const emojiMatches = currentText.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
    const emojis = [...new Set(emojiMatches)];

    // バズるプロンプトの有無で生成方法を変更
    const hasBuzzPrompt = buzzPrompt && buzzPrompt.prompt && buzzPrompt.patterns.length > 0;

    // システムプロンプト
    const systemPrompt = hasBuzzPrompt
      ? `あなたはXのバズる投稿を作成するエキスパートです。

【あなたのミッション】
1. 元の投稿の構造（行数、改行、箇条書き）を維持
2. バズるプロンプトに基づいて内容を改善
3. 一貫性のある、読みやすい投稿に仕上げる

【バズるプロンプト（この指示に従う）】
${buzzPrompt.prompt}

【バズる投稿の特徴】
${buzzPrompt.characteristics.map(c => `・${c}`).join("\n")}

【避けるべきパターン】
${buzzPrompt.avoidPatterns.map(p => `・${p}`).join("\n")}

【使える表現例】
${buzzPrompt.samplePhrases.map(p => `「${p}」`).join("、")}

【重要】
- 元の投稿の伝えたいことは維持
- より明確で一貫性のある表現に
- 違和感のある箇所は修正・削除してOK
- バズる要素（具体性、意外性、共感）を追加`
      : `あなたはXの投稿を改善するエキスパートです。

【ミッション】
1. 元の投稿の構造を維持
2. 一貫性と読みやすさを改善
3. バズる要素を追加

【改善のポイント】
- 違和感のある表現を自然に修正
- 「で、結局何？」とならない一貫性を確保
- 具体的な数字や事実を活用
- 冒頭のフックを強化
- 締めくくりにインパクトを`;

    // 3パターン生成（バズるプロンプトがある場合はそのパターンを使用）
    const patternInstructions = hasBuzzPrompt && buzzPrompt.patterns.length >= 3
      ? buzzPrompt.patterns.slice(0, 3).map((p, i) => `
【パターン${i + 1}: ${p.name}】
${p.description}
テンプレート: ${p.template}`).join("\n")
      : `
【パターン1: 一貫性強化】
投稿全体で1つのメッセージを明確に伝える。話の流れを自然に。

【パターン2: 具体性追加】
抽象的な表現を具体的に。数字、事実、データで説得力を。

【パターン3: フック強化】
冒頭のインパクトを強化。意外性や共感を呼ぶ要素を追加。`;

    const generatePrompt = `【AI補正タスク】以下の投稿を3パターンに補正してください。

━━━━━━━━━━━━━━━━━━━━
■ 現在の投稿
━━━━━━━━━━━━━━━━━━━━
${currentText}

━━━━━━━━━━━━━━━━━━━━
■ 構造ルール（絶対厳守）
━━━━━━━━━━━━━━━━━━━━
- 行数: ${lineCount}行を維持
- 空行: ${emptyLinePositions.length > 0 ? `${emptyLinePositions.join(", ")}行目に空行` : "なし"}
- 箇条書き: ${bulletCount > 0 ? `${bulletLines.join(", ")}行目に${bulletCount}個` : "なし → 追加禁止"}
- 絵文字: ${emojis.length > 0 ? `「${emojis.join("")}」を同じ位置に` : "禁止"}

━━━━━━━━━━━━━━━━━━━━
■ 元の内容
━━━━━━━━━━━━━━━━━━━━
${originalContent}
${researchData ? `
━━━━━━━━━━━━━━━━━━━━
■ リサーチ情報
━━━━━━━━━━━━━━━━━━━━
${researchData.slice(0, 2000)}
` : ""}
━━━━━━━━━━━━━━━━━━━━
■ 3パターンの補正方針
━━━━━━━━━━━━━━━━━━━━
${patternInstructions}

━━━━━━━━━━━━━━━━━━━━
■ 補正のポイント
━━━━━━━━━━━━━━━━━━━━
1. 違和感のある箇所は積極的に修正・削除
2. 「で、結局何？」とならない一貫性を確保
3. 各パターンで明確に違いを出す
4. 構造は維持しつつ中身はしっかり改善

JSON形式で出力：
{
  "patterns": [
    {
      "type": "パターン名",
      "text": "補正後の投稿（${lineCount}行）",
      "changes": "主な変更点（2-3文）"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: generatePrompt },
      ],
      temperature: 0.6, // 少し高めで多様性を出す
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI補正に失敗しました");
    }

    const result = JSON.parse(content);
    const patterns = result.patterns || [];

    // 各パターンの構造検証
    const validatedPatterns = patterns.map((p: any) => {
      const correctedLines = p.text.split("\n").length;
      const isValid = correctedLines === lineCount;
      return {
        ...p,
        lineCount: correctedLines,
        expectedLineCount: lineCount,
        structureValid: isValid,
        warning: !isValid ? `行数が${lineCount}行から${correctedLines}行に変わっています` : null,
      };
    });

    return NextResponse.json({
      success: true,
      patterns: validatedPatterns,
      originalStructure: {
        lineCount,
        emptyLinePositions,
        bulletLines,
        emojis,
      },
      buzzPromptUsed: hasBuzzPrompt,
    });
  } catch (error) {
    console.error("[AI-Correct] Error:", error);
    const message =
      error instanceof Error ? error.message : "AI補正中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
