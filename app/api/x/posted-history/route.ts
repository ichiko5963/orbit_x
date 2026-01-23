import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, initAdmin } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

initAdmin();

/**
 * GET /api/x/posted-history
 * Get posted history for a user
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const db = getAdminFirestore();
    const historySnapshot = await db
      .collection("users")
      .doc(userId)
      .collection("postedHistory")
      .orderBy("postedAt", "desc")
      .limit(50)
      .get();

    const history = historySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        postedAt: data.postedAt?.toDate?.()?.toISOString() || data.postedAt,
      };
    });

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Get posted history error:", error);
    return NextResponse.json(
      { error: "Failed to get posted history" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/x/posted-history
 * Save a posted tweet to history
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, post } = body;

    if (!userId || !post) {
      return NextResponse.json(
        { error: "User ID and post data are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Save to posted history
    const historyRef = db
      .collection("users")
      .doc(userId)
      .collection("postedHistory")
      .doc();

    await historyRef.set({
      ...post,
      postedAt: Timestamp.now(),
    });

    // If there's a source saved post, delete it from saved posts
    if (post.sourceSavedPostId) {
      try {
        await db
          .collection("users")
          .doc(userId)
          .collection("savedPosts")
          .doc(post.sourceSavedPostId)
          .delete();
      } catch (e) {
        console.log("Source saved post not found or already deleted:", e);
      }
    }

    return NextResponse.json({
      success: true,
      id: historyRef.id,
    });
  } catch (error) {
    console.error("Save posted history error:", error);
    return NextResponse.json(
      { error: "Failed to save posted history" },
      { status: 500 }
    );
  }
}
