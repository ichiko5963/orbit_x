import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";

initAdmin();

/**
 * POST /api/daily-x/schedule
 * Schedule a post for later
 * Body: { userId, date, postId, scheduledAt, text? }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, date, postId, scheduledAt, text } = await request.json();

    if (!userId || !date || !postId || !scheduledAt) {
      return NextResponse.json(
        { error: "userId, date, postId, scheduledAt are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const postRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyPosts")
      .doc(date)
      .collection("posts")
      .doc(postId);

    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {
      status: "scheduled",
      scheduledAt,
    };
    if (text) {
      updateData.finalPostText = text;
    }

    await postRef.update(updateData);

    return NextResponse.json({ success: true, scheduledAt });
  } catch (error) {
    console.error("[Schedule] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Schedule failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/daily-x/schedule
 * Cancel a scheduled post
 * Body: { userId, date, postId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, date, postId } = await request.json();

    if (!userId || !date || !postId) {
      return NextResponse.json(
        { error: "userId, date, postId are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    const postRef = db
      .collection("users")
      .doc(userId)
      .collection("dailyPosts")
      .doc(date)
      .collection("posts")
      .doc(postId);

    await postRef.update({
      status: "pending",
      scheduledAt: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Schedule Cancel] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cancel failed" },
      { status: 500 }
    );
  }
}
