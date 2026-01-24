import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CorrectionRequest {
  currentText: string;
  originalContent: string;
  referenceText: string;
  researchData?: string;
}

/**
 * AI補正: 構造は100%維持、一貫性と有益さを高める
 * 3パターンの補正版を生成
 */
export async function POST(request: NextRequest) {
  try {
    const body: CorrectionRequest = await request.json();
    const { currentText, originalContent, referenceText, researchData } = body;

    if (!currentText) {
      return NextResponse.json(
        { error: "投稿テキストが必要です" },
        { status: 400 }
      );
    }

    // 現在の投稿の構造を詳細分析
    const lines = currentText.split("\n");
    const lineCount = lines.length;
    const emptyLinePositions = lines.map((l, i) => l.trim() === "" ? i : -1).filter(i => i >= 0);
    const bulletLines = lines.map((l, i) => /^[・\-•]/.test(l.trim()) ? i : -1).filter(i => i >= 0);
    const bulletCount = bulletLines.length;
    const emojiMatches = currentText.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
    const emojis = [...new Set(emojiMatches)];
    const exclamationCount = (currentText.match(/！|!/g) || []).length;

    // 各行の文字数を記録
    const lineLengths = lines.map(l => l.length);

    // システムプロンプト
    const systemPrompt = `あなたはXの投稿を「補正」する専門家です。

【重要】構造は100%維持、中身の一貫性と価値を高める

★あなたの仕事★
- 構造（行数、改行位置、箇条書き位置、絵文字）は1ミリも変えない
- 文章の一貫性を高める（何を言いたいかが明確に伝わるように）
- 内容を有益にする（「知らなかった」「なるほど」と思わせる情報を入れる）
- バズる要素を追加（具体的な数字、意外性、共感）

【禁止事項】
- 行数を変える
- 改行位置を変える
- 箇条書きの位置を変える
- 絵文字を追加/削除/変更する
- AIっぽい表現（〜ですね、素晴らしい、ぜひ、必見）
- URL/リンクを含める`;

    // 3パターン生成用のプロンプト
    const generatePrompt = `【AI補正タスク】以下の投稿を3パターンに補正してください。

━━━━━━━━━━━━━━━━━━━━
■ 現在の投稿（この構造を100%維持）
━━━━━━━━━━━━━━━━━━━━
${currentText}

━━━━━━━━━━━━━━━━━━━━
■ 構造分析（これを完全に守る）
━━━━━━━━━━━━━━━━━━━━
- 総行数: ${lineCount}行（絶対に変えない）
- 空行の位置: ${emptyLinePositions.length > 0 ? `${emptyLinePositions.join(", ")}行目` : "なし"}
- 箇条書き: ${bulletCount > 0 ? `${bulletLines.join(", ")}行目に${bulletCount}個` : "なし"}
- 絵文字: ${emojis.length > 0 ? `「${emojis.join("")}」をそのまま同じ位置に` : "使用禁止"}
- 「！」の数: ${exclamationCount}個（同じ数を維持）
- 各行の文字数目安: ${lineLengths.map((l, i) => `${i + 1}行目=${l}字`).join(", ")}

━━━━━━━━━━━━━━━━━━━━
■ 元の内容（情報ソース）
━━━━━━━━━━━━━━━━━━━━
${originalContent}

━━━━━━━━━━━━━━━━━━━━
■ 参考投稿の構造
━━━━━━━━━━━━━━━━━━━━
${referenceText}
${researchData ? `
━━━━━━━━━━━━━━━━━━━━
■ リサーチ情報（最新データ・事実）
━━━━━━━━━━━━━━━━━━━━
${researchData.slice(0, 3000)}
${researchData.length > 3000 ? "（続きあり...）" : ""}

★リサーチから具体的な数字・データを使って投稿の説得力を高める
` : ""}

━━━━━━━━━━━━━━━━━━━━
■ 3パターンの補正方針
━━━━━━━━━━━━━━━━━━━━
【パターン1: 一貫性重視】
- 投稿全体で1つの明確なメッセージを伝える
- 話の流れを自然にする（導入→展開→結論）
- 読者が「何を言いたいか」をすぐ理解できるように

【パターン2: 有益性重視】
- 「知らなかった」「役立つ」と思わせる情報を強調
- 具体的な数字・データを活用
- 薄っぺらい表現を具体的な表現に置き換え

【パターン3: バズ要素重視】
- フック（冒頭）のインパクトを強化
- 意外性や逆説を入れる
- 共感を呼ぶ要素を追加

━━━━━━━━━━━━━━━━━━━━
■ 絶対厳守ルール
━━━━━━━━━━━━━━━━━━━━
1. 行数: ${lineCount}行を厳守（1行も増減しない）
2. 空行位置: 元と同じ位置に空行を入れる
3. 箇条書き: ${bulletCount > 0 ? `${bulletLines.join(", ")}行目に箇条書き` : "箇条書きは追加しない"}
4. 絵文字: ${emojis.length > 0 ? `「${emojis.join("")}」を元と同じ位置に` : "絶対に入れない"}
5. URL/リンク: 絶対に含めない

JSON形式で出力：
{
  "patterns": [
    {
      "type": "一貫性重視",
      "text": "補正後の投稿（${lineCount}行）",
      "changes": "どこをどう変えたか（1-2文）"
    },
    {
      "type": "有益性重視",
      "text": "補正後の投稿（${lineCount}行）",
      "changes": "どこをどう変えたか（1-2文）"
    },
    {
      "type": "バズ要素重視",
      "text": "補正後の投稿（${lineCount}行）",
      "changes": "どこをどう変えたか（1-2文）"
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: generatePrompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("AI補正に失敗しました");
    }

    const result = JSON.parse(content);
    const patterns = result.patterns || [];

    // 各パターンの構造検証（行数チェック）
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
        exclamationCount,
      },
    });
  } catch (error) {
    console.error("[AI-Correct] Error:", error);
    const message =
      error instanceof Error ? error.message : "AI補正中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
