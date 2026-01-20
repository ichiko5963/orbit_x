import { CSVRow, Post, ImportResult } from "./types";

/**
 * Parse CSV text into rows
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split("\n");
  if (lines.length < 2) {
    throw new Error("CSVファイルが空か、データが不足しています");
  }

  // Parse header
  const header = parseCSVLine(lines[0]);

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

  // Parse data rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);

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
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
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
