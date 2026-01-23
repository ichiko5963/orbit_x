import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

/**
 * GET /api/x/profile
 * Get the user's connected X profile info from Firestore
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const xAuthDoc = await db
      .collection("users")
      .doc(userId)
      .collection("settings")
      .doc("xAuth")
      .get();

    if (!xAuthDoc.exists) {
      return NextResponse.json({
        connected: false,
        message: "X未連携",
      });
    }

    const xAuthData = xAuthDoc.data();

    if (!xAuthData?.accessToken) {
      return NextResponse.json({
        connected: false,
        message: "X未連携",
      });
    }

    // Check if token is expired
    const expiresAt = new Date(xAuthData.expiresAt);
    if (new Date() > expiresAt) {
      return NextResponse.json({
        connected: false,
        expired: true,
        message: "X連携の有効期限が切れています。再連携してください。",
      });
    }

    return NextResponse.json({
      connected: true,
      profile: {
        id: xAuthData.xUserId,
        name: xAuthData.xName,
        username: xAuthData.xUsername,
        profileImageUrl: xAuthData.xProfileImageUrl,
      },
      connectedAt: xAuthData.connectedAt,
    });
  } catch (error) {
    console.error("X profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch X profile" },
      { status: 500 }
    );
  }
}
