import { NextRequest, NextResponse } from "next/server";
import {
  parseCSV,
  convertRowsToPosts,
  calculateImportStats,
} from "@/lib/csv-parser";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "ファイルが選択されていません" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "CSVファイルのみアップロード可能です" },
        { status: 400 }
      );
    }

    // Read file content
    const csvText = await file.text();

    // Parse CSV
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSVファイルにデータが含まれていません" },
        { status: 400 }
      );
    }

    // Convert to posts
    const posts = convertRowsToPosts(rows);

    // Calculate statistics
    const stats = calculateImportStats(posts);

    // TODO: Save posts to database (Firebase)
    // For now, we just return the stats

    return NextResponse.json({
      success: true,
      stats,
      posts,
    });
  } catch (error) {
    console.error("Import error:", error);
    const message =
      error instanceof Error ? error.message : "インポート中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
