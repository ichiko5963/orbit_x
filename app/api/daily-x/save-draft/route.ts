import { NextRequest, NextResponse } from "next/server";
import { initAdmin, getAdminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

initAdmin();

/**
 * POST /api/daily-x/save-draft
 * Save a daily-x post as a draft
 * Body: { userId, date, postId, text?, imageUrls? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, postId, text: customText, imageUrls: customImageUrls } = body;

    if (!userId || !date || !postId) {
      return NextResponse.json(
        { error: "userId, date, postId are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Get the post
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

    const post = postDoc.data()!;
    const postText = customText || post.finalPostText;
    const imageUrls = customImageUrls || post.mediaImageUrls || [];

    // Save as draft in user's drafts collection
    const draftRef = db.collection("users").doc(userId).collection("drafts").doc();
    await draftRef.set({
      text: postText,
      imageUrls,
      source: "daily-x",
      sourcePostId: postId,
      sourceDate: date,
      originalTweet: post.originalTweet || null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Update post status
    await postRef.update({
      status: "drafted",
    });

    return NextResponse.json({
      success: true,
      draftId: draftRef.id,
      text: postText,
    });
  } catch (error) {
    console.error("[SaveDraft] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save draft" },
      { status: 500 }
    );
  }
}
