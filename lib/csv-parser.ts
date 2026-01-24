import { CSVRow, Post, ImportResult } from "./types";

// Column name variations for different CSV formats
// Each key is the internal field name, value is array of possible column names
const columnVariations: Record<string, string[]> = {
  date: ["日付", "投稿日時", "日時", "created_at", "timestamp"],
  text: ["ポスト本文", "投稿本文", "本文", "テキスト", "text", "content"],
  link: ["ポストのリンク", "投稿リンク", "リンク", "URL", "url", "link"],
  impressions: ["インプレッション数", "インプレッション", "表示回数", "impressions"],
  likes: ["いいね", "いいね数", "ライク", "likes", "like_count"],
  retweets: ["リツイート数", "リツイート", "RT数", "retweets", "retweet_count"],
  engagement: ["エンゲージメント", "エンゲージメント数", "反応数", "engagement"],
};

// Minimum required fields (at least date, text, and one metric)
const minimumRequiredFields = ["date", "text"];

/**
 * Find column index by checking all variations
 */
function findColumnIndex(header: string[], fieldName: string): number {
  const variations = columnVariations[fieldName] || [];
  for (const variation of variations) {
    const index = header.findIndex(h => h.trim() === variation);
    if (index !== -1) return index;
  }
  return -1;
}

/**
 * Detect CSV format and return column indices
 */
function detectCSVFormat(header: string[]): {
  indices: Record<string, number>;
  format: "x-premium" | "simple" | "unknown";
  missingRequired: string[];
} {
  const indices: Record<string, number> = {};
  const missingRequired: string[] = [];

  // Try to find all known columns
  for (const fieldName of Object.keys(columnVariations)) {
    const index = findColumnIndex(header, fieldName);
    if (index !== -1) {
      indices[fieldName] = index;
    }
  }

  // Check minimum required fields
  for (const required of minimumRequiredFields) {
    if (indices[required] === undefined) {
      missingRequired.push(required);
    }
  }

  // Detect format type
  let format: "x-premium" | "simple" | "unknown" = "unknown";
  if (indices.date !== undefined && indices.text !== undefined) {
    if (indices.link !== undefined && indices.impressions !== undefined) {
      format = "x-premium";
    } else if (indices.likes !== undefined || indices.retweets !== undefined) {
      format = "simple";
    }
  }

  return { indices, format, missingRequired };
}

/**
 * Parse CSV text into rows (handles multi-line quoted fields)
 */
export function parseCSV(csvText: string): CSVRow[] {
  // Parse all rows handling multi-line quoted fields
  const allRows = parseCSVWithMultiline(csvText);

  if (allRows.length < 2) {
    throw new Error("CSVファイルが空か、データが不足しています");
  }

  // First row is header
  const header = allRows[0];

  // Detect format and get column indices
  const { indices, format, missingRequired } = detectCSVFormat(header);

  if (missingRequired.length > 0) {
    const missingNames = missingRequired.map(field => {
      const variations = columnVariations[field];
      return variations.slice(0, 2).join("または");
    });
    throw new Error(`必須カラムが見つかりません: ${missingNames.join(", ")}\n\n対応カラム名: ${missingRequired.map(f => columnVariations[f].join(", ")).join(" / ")}`);
  }

  console.log(`[CSV] Detected format: ${format}, columns:`, indices);

  // Parse data rows (skip header at index 0)
  const rows: CSVRow[] = [];
  for (let i = 1; i < allRows.length; i++) {
    const values = allRows[i];
    if (values.length === 0 || values.every(v => !v.trim())) continue;

    const getValue = (field: string, defaultValue: string = ""): string => {
      const index = indices[field];
      return index !== undefined ? (values[index] || defaultValue) : defaultValue;
    };

    rows.push({
      date: getValue("date"),
      text: getValue("text"),
      link: getValue("link"),
      impressions: getValue("impressions", "0"),
      likes: getValue("likes", "0"),
      engagement: getValue("engagement", "0"),
      // Store retweets separately if available
      retweets: getValue("retweets", "0"),
    });
  }

  return rows;
}

/**
 * Parse CSV with proper handling of multi-line quoted fields
 */
function parseCSVWithMultiline(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("") -> single quote
          currentField += '"';
          i++;
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        // Inside quotes, include everything (including newlines)
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // End of field
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        // End of row
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        if (char === '\r') i++; // Skip \n after \r
      } else if (char === '\r') {
        // End of row (old Mac style)
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // Don't forget the last field and row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Calculate tier based on likes
 */
export function calculateTier(likes: number): "S" | "A" | "B" | "C" {
  if (likes >= 200) return "S";
  if (likes >= 100) return "A";
  if (likes >= 50) return "B";
  return "C";
}

/**
 * Extract URLs from text
 * Matches http/https URLs
 */
export function extractUrls(text: string): string[] {
  // URL pattern: matches http:// or https:// followed by non-whitespace characters
  const urlPattern = /https?:\/\/[^\s\u3000\u200B\u200C\u200D\uFEFF]+/gi;
  const matches = text.match(urlPattern);

  if (!matches) return [];

  // Clean up URLs (remove trailing punctuation that might have been captured)
  return matches.map(url => {
    // Remove trailing punctuation like 。、」）etc.
    return url.replace(/[。、！？」）】』"'…]+$/, '');
  });
}

/**
 * Convert CSV rows to Post objects
 */
export function convertRowsToPosts(rows: CSVRow[]): Post[] {
  return rows.map((row, index) => {
    const likes = parseInt(row.likes, 10) || 0;
    const retweets = row.retweets ? parseInt(row.retweets, 10) || 0 : 0;

    // Extract URLs from text
    const urls = extractUrls(row.text);

    return {
      id: `post_${Date.now()}_${index}`,
      tweetId: row.link ? row.link.split("/").pop() || `post_${index}` : `post_${index}`,
      text: row.text,
      createdAt: row.date,
      impressions: parseInt(row.impressions, 10) || 0,
      likes,
      retweets,
      replies: 0,  // Not typically available in CSV exports
      tier: calculateTier(likes),
      category: "未分類",
      structure: [],
      repostCount: 0,
      lastRepostedAt: null,
      urls: urls.length > 0 ? urls : undefined,
    };
  });
}

/**
 * Calculate import statistics
 */
export function calculateImportStats(posts: Post[]): ImportResult {
  const tierCounts = posts.reduce(
    (acc, post) => {
      acc[post.tier]++;
      return acc;
    },
    { S: 0, A: 0, B: 0, C: 0 }
  );

  const uniqueCategories = new Set(posts.map((p) => p.category));

  return {
    total: posts.length,
    tierS: tierCounts.S,
    tierA: tierCounts.A,
    tierB: tierCounts.B,
    tierC: tierCounts.C,
    categories: uniqueCategories.size,
  };
}
