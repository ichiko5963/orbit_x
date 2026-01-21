import { NextRequest, NextResponse } from "next/server";
import { createTwitterClient } from "@/lib/twitter";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const client = createTwitterClient();

    if (!client) {
      return NextResponse.json(
        { error: "X API credentials not configured" },
        { status: 500 }
      );
    }

    const result = await client.postTweet(text);

    if (result.errors) {
      return NextResponse.json(
        { error: result.errors[0]?.message || "Failed to post tweet" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      tweet: result.data,
    });
  } catch (error) {
    console.error("Twitter post error:", error);
    const message = error instanceof Error ? error.message : "Failed to post tweet";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
