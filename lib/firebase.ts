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
    await setDoc(postRef, {
      ...post,
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

export { auth, db, onAuthStateChanged };
export type { User };
