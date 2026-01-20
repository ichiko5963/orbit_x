import { CSVRow, Post, ImportResult } from "./types";

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

  // Column mapping (Japanese column names from X Premium CSV)
  const columnMapping: Record<string, string> = {
    "日付": "date",
    "ポスト本文": "text",
    "ポストのリンク": "link",
    "インプレッション数": "impressions",
    "いいね": "likes",
    "エンゲージメント": "engagement",
  };

  const requiredColumns = Object.keys(columnMapping);

  // Validate required columns
  const missingColumns = requiredColumns.filter(
    (col) => !header.includes(col)
  );
  if (missingColumns.length > 0) {
    throw new Error(`必須カラムが不足しています: ${missingColumns.join(", ")}`);
  }

  // Get column indices
  const columnIndices = requiredColumns.reduce((acc, col) => {
    acc[columnMapping[col]] = header.indexOf(col);
    return acc;
  }, {} as Record<string, number>);

  // Parse data rows (skip header at index 0)
  const rows: CSVRow[] = [];
  for (let i = 1; i < allRows.length; i++) {
    const values = allRows[i];
    if (values.length === 0 || values.every(v => !v.trim())) continue;

    rows.push({
      date: values[columnIndices.date] || "",
      text: values[columnIndices.text] || "",
      link: values[columnIndices.link] || "",
      impressions: values[columnIndices.impressions] || "0",
      likes: values[columnIndices.likes] || "0",
      engagement: values[columnIndices.engagement] || "0",
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
 * Convert CSV rows to Post objects
 */
export function convertRowsToPosts(rows: CSVRow[]): Post[] {
  return rows.map((row, index) => {
    const likes = parseInt(row.likes, 10) || 0;

    return {
      id: `post_${Date.now()}_${index}`,
      tweetId: row.link.split("/").pop() || `post_${index}`,
      text: row.text,
      createdAt: row.date,
      impressions: parseInt(row.impressions, 10) || 0,
      likes,
      retweets: 0, // Not available in the new CSV format
      replies: 0,  // Not available in the new CSV format
      tier: calculateTier(likes),
      category: "未分類",
      structure: [],
      repostCount: 0,
      lastRepostedAt: null,
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
