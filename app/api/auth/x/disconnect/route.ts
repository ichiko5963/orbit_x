import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, initAdmin } from "@/lib/firebase-admin";

initAdmin();

/**
 * POST /api/auth/x/disconnect
 * Disconnect X account by removing the stored OAuth tokens
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Delete xAuth document
    await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .delete();

    // Also delete xProfile document if it exists
    try {
      await db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("xProfile")
        .delete();
    } catch {
      // Ignore if xProfile doesn't exist
    }

    return NextResponse.json({
      success: true,
      message: "X account disconnected successfully",
    });
  } catch (error) {
    console.error("Disconnect X auth error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect X account" },
      { status: 500 }
    );
  }
}
