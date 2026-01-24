import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "URLを指定してください" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "無効なURLです" },
        { status: 400 }
      );
    }

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OrbitX/1.0)",
        "Accept": "image/*",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    // Get content type
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Check if it's an image
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "URLは画像ではありません" },
        { status: 400 }
      );
    }

    // Convert to buffer and then base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      base64: dataUrl,
      contentType,
    });
  } catch (error) {
    console.error("[ProxyImage] Error:", error);
    const message =
      error instanceof Error ? error.message : "画像の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
