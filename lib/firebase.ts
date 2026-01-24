import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create/update user document
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }, { merge: true });

    return user;
  } catch (error) {
    console.error("Google sign in error:", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

// Firestore functions - Posts
export const savePosts = async (userId: string, posts: any[]) => {
  try {
    const batch = posts.map(async (post) => {
      const postRef = doc(collection(db, "users", userId, "posts"));
      await setDoc(postRef, {
        ...post,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    await Promise.all(batch);
  } catch (error) {
    console.error("Save posts error:", error);
    throw error;
  }
};

export const getPosts = async (userId: string) => {
  try {
    const postsRef = collection(db, "users", userId, "posts");
    // Fetch without orderBy to avoid index requirements
    const snapshot = await getDocs(postsRef);
    const posts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Normalize createdAt to string for consistency
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
      };
    });
    // Sort client-side by createdAt descending
    return posts.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Get posts error:", error);
    throw error;
  }
};

// Get single post by ID
export const getPost = async (userId: string, postId: string) => {
  try {
    const postRef = doc(db, "users", userId, "posts", postId);
    const snapshot = await getDoc(postRef);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Get post error:", error);
    throw error;
  }
};

// Firestore functions - Viral Posts
export const saveViralPost = async (userId: string, post: any) => {
  try {
    const postRef = doc(collection(db, "users", userId, "viralPosts"));
    await setDoc(postRef, {
      ...post,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return postRef.id;
  } catch (error) {
    console.error("Save viral post error:", error);
    throw error;
  }
};

export const getViralPosts = async (userId: string) => {
  try {
    const postsRef = collection(db, "users", userId, "viralPosts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Get viral posts error:", error);
    throw error;
  }
};

// Firestore functions - Categories
export const saveCategory = async (userId: string, category: any) => {
  try {
    const categoryRef = doc(collection(db, "users", userId, "categories"));
    await setDoc(categoryRef, {
      ...category,
      createdAt: Timestamp.now(),
    });
    return categoryRef.id;
  } catch (error) {
    console.error("Save category error:", error);
    throw error;
  }
};

export const getCategories = async (userId: string) => {
  try {
    const categoriesRef = collection(db, "users", userId, "categories");
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Get categories error:", error);
    throw error;
  }
};

// Firestore functions - Scheduled Posts
export const saveScheduledPost = async (userId: string, post: any) => {
  try {
    const postRef = doc(collection(db, "users", userId, "scheduledPosts"));
    // Filter out undefined values to avoid Firebase error
    const cleanedPost = Object.fromEntries(
      Object.entries(post).filter(([_, v]) => v !== undefined)
    );

    // Convert scheduledAt to Firestore Timestamp if it's a Date
    if (cleanedPost.scheduledAt instanceof Date) {
      cleanedPost.scheduledAt = Timestamp.fromDate(cleanedPost.scheduledAt);
    }

    await setDoc(postRef, {
      ...cleanedPost,
      createdAt: Timestamp.now(),
    });
    return postRef.id;
  } catch (error) {
    console.error("Save scheduled post error:", error);
    throw error;
  }
};

export const getScheduledPosts = async (userId: string) => {
  try {
    const postsRef = collection(db, "users", userId, "scheduledPosts");
    const q = query(postsRef, orderBy("scheduledAt", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Get scheduled posts error:", error);
    throw error;
  }
};

export const updateScheduledPost = async (userId: string, postId: string, updates: any) => {
  try {
    const postRef = doc(db, "users", userId, "scheduledPosts", postId);
    await updateDoc(postRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Update scheduled post error:", error);
    throw error;
  }
};

export const deleteScheduledPost = async (userId: string, postId: string) => {
  try {
    const postRef = doc(db, "users", userId, "scheduledPosts", postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.error("Delete scheduled post error:", error);
    throw error;
  }
};

// Firestore functions - Delete Category
export const deleteCategory = async (userId: string, categoryId: string) => {
  try {
    const categoryRef = doc(db, "users", userId, "categories", categoryId);
    await deleteDoc(categoryRef);
  } catch (error) {
    console.error("Delete category error:", error);
    throw error;
  }
};

// Firestore functions - Update Category
export const updateCategory = async (userId: string, categoryId: string, updates: any) => {
  try {
    const categoryRef = doc(db, "users", userId, "categories", categoryId);
    await updateDoc(categoryRef, updates);
  } catch (error) {
    console.error("Update category error:", error);
    throw error;
  }
};

// Firestore functions - Delete Viral Post
export const deleteViralPost = async (userId: string, postId: string) => {
  try {
    const postRef = doc(db, "users", userId, "viralPosts", postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.error("Delete viral post error:", error);
    throw error;
  }
};

// Firestore functions - X Context Posts
export const saveContextPosts = async (userId: string, posts: any[]) => {
  try {
    const batch = posts.map(async (post, index) => {
      const postRef = doc(collection(db, "users", userId, "contextPosts"));
      await setDoc(postRef, {
        ...post,
        importedAt: Timestamp.now(),
      });
      return postRef.id;
    });
    const ids = await Promise.all(batch);
    return ids;
  } catch (error) {
    console.error("Save context posts error:", error);
    throw error;
  }
};

export const getContextPosts = async (userId: string) => {
  try {
    const postsRef = collection(db, "users", userId, "contextPosts");
    // Fetch without orderBy to avoid index requirements
    const snapshot = await getDocs(postsRef);
    const posts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Normalize dates for consistency
        importedAt: data.importedAt?.toDate?.()?.toISOString?.() || data.importedAt || new Date().toISOString(),
      };
    });
    // Sort client-side by importedAt descending
    return posts.sort((a, b) => {
      const dateA = new Date(a.importedAt).getTime();
      const dateB = new Date(b.importedAt).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error("Get context posts error:", error);
    throw error;
  }
};

// Get single context post by ID
export const getContextPost = async (userId: string, postId: string) => {
  try {
    const postRef = doc(db, "users", userId, "contextPosts", postId);
    const snapshot = await getDoc(postRef);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      importedAt: data.importedAt?.toDate?.()?.toISOString?.() || data.importedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error("Get context post error:", error);
    throw error;
  }
};

export const deleteContextPost = async (userId: string, postId: string) => {
  try {
    const postRef = doc(db, "users", userId, "contextPosts", postId);
    await deleteDoc(postRef);
  } catch (error) {
    console.error("Delete context post error:", error);
    throw error;
  }
};

export const clearContextPosts = async (userId: string) => {
  try {
    const postsRef = collection(db, "users", userId, "contextPosts");
    const snapshot = await getDocs(postsRef);
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Clear context posts error:", error);
    throw error;
  }
};

// Clear all posts (過去投稿一覧)
export const clearPosts = async (userId: string) => {
  try {
    const postsRef = collection(db, "users", userId, "posts");
    const snapshot = await getDocs(postsRef);
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Clear posts error:", error);
    throw error;
  }
};

// ============================================
// User Style Analysis (ユーザースタイル分析)
// ============================================

export interface UserStyleAnalysis {
  // 基本スタイル
  avgLength: number;
  hasEmoji: boolean;
  emojiFrequency: string; // "none" | "low" | "medium" | "high"
  punctuationStyle: string; // 句読点スタイル
  exclamationFrequency: string; // 「！」の頻度

  // 構造パターン
  preferredStructures: string[]; // よく使う構造パターン
  bulletPointStyle: string; // 箇条書きスタイル
  lineBreakPattern: string; // 改行パターン

  // 口調・トーン
  tone: string; // "casual" | "formal" | "energetic" | "calm"
  personalPronouns: string[]; // よく使う一人称
  endingPatterns: string[]; // 語尾パターン

  // バズ投稿の特徴
  buzzPatterns: string[]; // バズった投稿の共通パターン
  topPerformingStructures: string[]; // 高パフォーマンス投稿の構造

  // 禁止・推奨パターン
  avoidPatterns: string[]; // 避けるべきパターン
  recommendedPatterns: string[]; // 推奨パターン

  // 生のサンプル
  samplePosts: string[]; // 上位投稿のサンプル

  // メタデータ
  analyzedAt: string;
  postsAnalyzed: number;

  // AIプロンプト用の要約
  promptSummary: string;
}

// Save user style analysis
export const saveUserStyleAnalysis = async (userId: string, analysis: UserStyleAnalysis) => {
  try {
    const styleRef = doc(db, "users", userId, "settings", "userStyle");
    await setDoc(styleRef, {
      ...analysis,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Save user style error:", error);
    throw error;
  }
};

// Get user style analysis
export const getUserStyleAnalysis = async (userId: string): Promise<UserStyleAnalysis | null> => {
  try {
    const styleRef = doc(db, "users", userId, "settings", "userStyle");
    const snapshot = await getDoc(styleRef);
    if (snapshot.exists()) {
      return snapshot.data() as UserStyleAnalysis;
    }
    return null;
  } catch (error) {
    console.error("Get user style error:", error);
    return null;
  }
};

// Firestore functions - Drafts
export const saveDraft = async (userId: string, draft: any) => {
  try {
    const draftRef = doc(collection(db, "users", userId, "drafts"));
    await setDoc(draftRef, {
      ...draft,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return draftRef.id;
  } catch (error) {
    console.error("Save draft error:", error);
    throw error;
  }
};

export const getDrafts = async (userId: string) => {
  try {
    const draftsRef = collection(db, "users", userId, "drafts");
    const q = query(draftsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Get drafts error:", error);
    throw error;
  }
};

export const updateDraft = async (userId: string, draftId: string, updates: any) => {
  try {
    const draftRef = doc(db, "users", userId, "drafts", draftId);
    await updateDoc(draftRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Update draft error:", error);
    throw error;
  }
};

export const deleteDraft = async (userId: string, draftId: string) => {
  try {
    const draftRef = doc(db, "users", userId, "drafts", draftId);
    await deleteDoc(draftRef);
  } catch (error) {
    console.error("Delete draft error:", error);
    throw error;
  }
};

// Firestore functions - Article Patterns
export interface ArticlePattern {
  id?: string;
  name: string;
  description: string;
  template: string;
  category: string;
  isDefault: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Default patterns - "記事紹介" category (shared for everyone)
export const DEFAULT_ARTICLE_PATTERNS: Omit<ArticlePattern, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "有益すぎた型",
    description: "詳細な機能紹介 + 効果を数字で示す",
    template: `〇〇が公開した「△△」が有益すぎた。□□で■■を実現。▲▲な人は必読👇🧵`,
    category: "記事紹介",
    isDefault: true,
  },
  {
    name: "無料公開発見型",
    description: "発見の驚き + 推薦",
    template: `〇〇が無料公開した「△△」が公開されていた😳□□を深く学べるし、■■でなくとも▲▲なので強くオススメしたい👇`,
    category: "記事紹介",
    isDefault: true,
  },
  {
    name: "やばい発見型",
    description: "インパクト + 詳細はリプ欄",
    template: `〇〇がやばい。△△を軸に□□と連携。しかも■■。▲▲で●●できる。詳細はリプ欄↓`,
    category: "記事紹介",
    isDefault: true,
  },
  {
    name: "超大作紹介型",
    description: "ボリューム強調 + 箇条書き",
    template: `〇〇が公開した「△△」が有益だった。
□□の超大作で、■■から▲▲まで完全網羅。
「●●」ための具体的手法が学べる：
◆◆な人は必読👇`,
    category: "記事紹介",
    isDefault: true,
  },
  {
    name: "全員見て型",
    description: "対象者限定 + 無料の強調",
    template: `〇〇したい人は全員この記事を見ておいて損しない。
「△△」は、□□も全部公開してて、■■！
▲▲で迷ってる人、まずここだけ見ておけば大丈夫。`,
    category: "記事紹介",
    isDefault: true,
  },
  {
    name: "すごかった型",
    description: "具体例列挙 + 職種横断",
    template: `〇〇が公開した「△△」がすごかった...□□したり、■■したり、▲▲したりと●●が◆◆も掲載されている。◇◇という人こそ読むべき👇`,
    category: "記事紹介",
    isDefault: true,
  },
];

// Get user's article patterns (including default patterns)
export const getArticlePatterns = async (userId: string) => {
  try {
    const patternsRef = collection(db, "users", userId, "articlePatterns");
    const snapshot = await getDocs(patternsRef);
    const userPatterns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ArticlePattern[];

    // If no patterns exist, return defaults
    if (userPatterns.length === 0) {
      return DEFAULT_ARTICLE_PATTERNS.map((p, i) => ({
        ...p,
        id: `default_${i + 1}`,
      }));
    }

    return userPatterns;
  } catch (error) {
    console.error("Get article patterns error:", error);
    // Return defaults on error
    return DEFAULT_ARTICLE_PATTERNS.map((p, i) => ({
      ...p,
      id: `default_${i + 1}`,
    }));
  }
};

// Initialize user's patterns with defaults
export const initializeArticlePatterns = async (userId: string) => {
  try {
    const patternsRef = collection(db, "users", userId, "articlePatterns");
    const snapshot = await getDocs(patternsRef);

    // Only initialize if no patterns exist
    if (snapshot.docs.length === 0) {
      const batch = DEFAULT_ARTICLE_PATTERNS.map(async (pattern) => {
        const patternRef = doc(collection(db, "users", userId, "articlePatterns"));
        await setDoc(patternRef, {
          ...pattern,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        return patternRef.id;
      });
      await Promise.all(batch);
    }
  } catch (error) {
    console.error("Initialize article patterns error:", error);
    throw error;
  }
};

// Save a new article pattern
export const saveArticlePattern = async (userId: string, pattern: Omit<ArticlePattern, "id" | "createdAt" | "updatedAt">) => {
  try {
    const patternRef = doc(collection(db, "users", userId, "articlePatterns"));
    await setDoc(patternRef, {
      ...pattern,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return patternRef.id;
  } catch (error) {
    console.error("Save article pattern error:", error);
    throw error;
  }
};

// Update an article pattern
export const updateArticlePattern = async (userId: string, patternId: string, updates: Partial<ArticlePattern>) => {
  try {
    const patternRef = doc(db, "users", userId, "articlePatterns", patternId);
    await updateDoc(patternRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Update article pattern error:", error);
    throw error;
  }
};

// Delete an article pattern
export const deleteArticlePattern = async (userId: string, patternId: string) => {
  try {
    const patternRef = doc(db, "users", userId, "articlePatterns", patternId);
    await deleteDoc(patternRef);
  } catch (error) {
    console.error("Delete article pattern error:", error);
    throw error;
  }
};

// Reset patterns to defaults
export const resetArticlePatternsToDefault = async (userId: string) => {
  try {
    // Delete all existing patterns
    const patternsRef = collection(db, "users", userId, "articlePatterns");
    const snapshot = await getDocs(patternsRef);
    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Re-initialize with defaults
    await initializeArticlePatterns(userId);
  } catch (error) {
    console.error("Reset article patterns error:", error);
    throw error;
  }
};

// ==========================================
// Firestore functions - Quote Tweets (引用ツイート)
// ==========================================

export interface QuoteTweet {
  id?: string;
  url: string;         // X post URL
  title: string;       // User-defined title for easy identification
  authorName?: string; // Tweet author name
  authorHandle?: string; // @handle
  previewText?: string; // Tweet preview text
  imageUrl?: string;   // OG image or tweet image
  usageCount: number;  // How many times used
  createdAt?: any;
  updatedAt?: any;
}

// Save a new quote tweet
export const saveQuoteTweet = async (userId: string, quoteTweet: Omit<QuoteTweet, "id" | "createdAt" | "updatedAt" | "usageCount">) => {
  try {
    const qtRef = doc(collection(db, "users", userId, "quoteTweets"));
    await setDoc(qtRef, {
      ...quoteTweet,
      usageCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return qtRef.id;
  } catch (error) {
    console.error("Save quote tweet error:", error);
    throw error;
  }
};

// Get all quote tweets
export const getQuoteTweets = async (userId: string) => {
  try {
    const qtRef = collection(db, "users", userId, "quoteTweets");
    const snapshot = await getDocs(qtRef);
    const quoteTweets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as QuoteTweet[];
    // Sort by usage count descending (most used first)
    return quoteTweets.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  } catch (error) {
    console.error("Get quote tweets error:", error);
    throw error;
  }
};

// Increment usage count when quote tweet is used
export const incrementQuoteTweetUsage = async (userId: string, qtId: string) => {
  try {
    const qtRef = doc(db, "users", userId, "quoteTweets", qtId);
    const snapshot = await getDoc(qtRef);
    if (snapshot.exists()) {
      const currentCount = snapshot.data().usageCount || 0;
      await updateDoc(qtRef, {
        usageCount: currentCount + 1,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error("Increment quote tweet usage error:", error);
    throw error;
  }
};

// Update quote tweet
export const updateQuoteTweet = async (userId: string, qtId: string, updates: Partial<QuoteTweet>) => {
  try {
    const qtRef = doc(db, "users", userId, "quoteTweets", qtId);
    await updateDoc(qtRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Update quote tweet error:", error);
    throw error;
  }
};

// Delete quote tweet
export const deleteQuoteTweet = async (userId: string, qtId: string) => {
  try {
    const qtRef = doc(db, "users", userId, "quoteTweets", qtId);
    await deleteDoc(qtRef);
  } catch (error) {
    console.error("Delete quote tweet error:", error);
    throw error;
  }
};

// ==========================================
// Extended Scheduled Post with Quote Tweet
// ==========================================

export interface ScheduledPostExtended {
  id?: string;
  text: string;
  scheduledAt: Date | any;
  status: "scheduled" | "posted" | "failed";
  category?: string;
  imageUrls?: string[];
  quoteTweetUrl?: string;  // Quote tweet URL if any
  quoteTweetId?: string;   // Reference to saved quote tweet
  threadPost?: string;     // Thread/reply post if any
  aiSuggestedTime?: boolean; // Was this time suggested by AI?
  suggestedReason?: string;  // Why AI suggested this time
  createdAt?: any;
  updatedAt?: any;
}

export { auth, db, onAuthStateChanged };
export type { User };
