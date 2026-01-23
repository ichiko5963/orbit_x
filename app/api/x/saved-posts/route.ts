import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

interface SavedPost {
  id: string;
  text: string;
  authorName: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  media: Array<{
    type: "photo" | "video";
    url: string;
    thumbnailUrl?: string;
  }>;
  likes: number;
  retweets: number;
  replies: number;
  savedAt: string;
  translatedText?: string;
}

/**
 * GET /api/x/saved-posts?userId=USER_ID
 * Get all saved posts for a user
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
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("savedPosts")
      .orderBy("savedAt", "desc")
      .get();

    const posts: SavedPost[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SavedPost[];

    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error("Get saved posts error:", error);
    return NextResponse.json(
      { error: "保存済み投稿の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/x/saved-posts
 * Save a new post
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, post } = body;

    if (!userId || !post) {
      return NextResponse.json(
        { error: "userId and post are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();

    // Check if already saved
    const existingDoc = await db
      .collection("users")
      .doc(userId)
      .collection("savedPosts")
      .doc(post.id)
      .get();

    if (existingDoc.exists) {
      return NextResponse.json(
        { error: "この投稿は既に保存されています", code: "ALREADY_SAVED" },
        { status: 400 }
      );
    }

    // Save the post (exclude undefined values for Firestore)
    const savedPost: Omit<SavedPost, 'translatedText'> & { translatedText?: string } = {
      id: post.id,
      text: post.text || "",
      authorName: post.authorName || "Unknown",
      authorUsername: post.authorUsername || "unknown",
      authorProfileImageUrl: post.authorProfileImageUrl || "",
      media: post.media || [],
      likes: post.likes || 0,
      retweets: post.retweets || 0,
      replies: post.replies || 0,
      savedAt: new Date().toISOString(),
    };

    // Only add translatedText if it exists
    if (post.translatedText) {
      savedPost.translatedText = post.translatedText;
    }

    await db
      .collection("users")
      .doc(userId)
      .collection("savedPosts")
      .doc(post.id)
      .set(savedPost);

    return NextResponse.json({
      success: true,
      post: savedPost,
    });
  } catch (error) {
    console.error("Save post error:", error);
    return NextResponse.json(
      { error: "投稿の保存に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/x/saved-posts
 * Delete a saved post
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const postId = searchParams.get("postId");

    if (!userId || !postId) {
      return NextResponse.json(
        { error: "userId and postId are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    await db
      .collection("users")
      .doc(userId)
      .collection("savedPosts")
      .doc(postId)
      .delete();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete saved post error:", error);
    return NextResponse.json(
      { error: "投稿の削除に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/x/saved-posts
 * Update a saved post (e.g., add translation)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, postId, updates } = body;

    if (!userId || !postId || !updates) {
      return NextResponse.json(
        { error: "userId, postId, and updates are required" },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    await db
      .collection("users")
      .doc(userId)
      .collection("savedPosts")
      .doc(postId)
      .update(updates);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Update saved post error:", error);
    return NextResponse.json(
      { error: "投稿の更新に失敗しました" },
      { status: 500 }
    );
  }
}
