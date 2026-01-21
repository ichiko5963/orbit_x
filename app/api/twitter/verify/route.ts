import { NextResponse } from "next/server";
import { createTwitterClient } from "@/lib/twitter";

export async function GET() {
  try {
    const client = createTwitterClient();

    if (!client) {
      return NextResponse.json({
        connected: false,
        message: "X API credentials not configured",
      });
    }

    const user = await client.verifyCredentials();

    if (!user) {
      return NextResponse.json({
        connected: false,
        message: "Failed to verify credentials",
      });
    }

    return NextResponse.json({
      connected: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Twitter verify error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      connected: false,
      message,
    });
  }
}
