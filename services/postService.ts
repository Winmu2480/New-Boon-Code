import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  DocumentSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, storage } from './firebase';
import { Post, Comment, OGMetadata } from '../types';

const POSTS_PER_PAGE = 10;

// ─── Feed ─────────────────────────────────────────────────────────────────────
export const fetchFeedPosts = async (
  followingIds: string[],
  lastDoc?: DocumentSnapshot,
  pageSize = POSTS_PER_PAGE
): Promise<{ posts: Post[]; lastDoc: DocumentSnapshot | null }> => {
  if (followingIds.length === 0) {
    return { posts: [], lastDoc: null };
  }

  let q = query(
    collection(db, 'posts'),
    where('authorId', 'in', followingIds.slice(0, 10)), // Firestore limit
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
  const newLastDoc = snap.docs[snap.docs.length - 1] || null;

  return { posts, lastDoc: newLastDoc };
};

export const fetchDiscoverPosts = async (
  lastDoc?: DocumentSnapshot,
  pageSize = POSTS_PER_PAGE
): Promise<{ posts: Post[]; lastDoc: DocumentSnapshot | null }> => {
  let q = query(
    collection(db, 'posts'),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post));
  const newLastDoc = snap.docs[snap.docs.length - 1] || null;

  return { posts, lastDoc: newLastDoc };
};

// ─── Create Post ─────────────────────────────────────────────────────────────
export const createPost = async (
  authorId: string,
  imageUri: string,
  data: {
    caption: string;
    storeName: string;
    storeUrl: string;
    storeLocation?: Post['storeLocation'];
    tags?: string[];
  },
  onProgress?: (progress: number) => void
): Promise<Post> => {
  // 1. Upload image to Firebase Storage
  const imageUrl = await uploadImage(authorId, imageUri, onProgress);

  // 2. Fetch OG metadata from the store URL
  let ogMetadata: OGMetadata | undefined;
  try {
    ogMetadata = await fetchOGMetadata(data.storeUrl);
  } catch {
    // Non-blocking - continue without OG data
  }

  // 3. Create post document
  const postData = {
    authorId,
    imageUrl,
    caption: data.caption,
    storeName: data.storeName,
    storeUrl: data.storeUrl,
    storeLocation: data.storeLocation || null,
    ogMetadata: ogMetadata || null,
    likesCount: 0,
    commentsCount: 0,
    savesCount: 0,
    likedBy: [],
    savedBy: [],
    tags: data.tags || [],
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'posts'), postData);

  // 4. Increment user's post count
  await updateDoc(doc(db, 'users', authorId), { postsCount: increment(1) });

  return { id: docRef.id, ...postData } as unknown as Post;
};

// ─── Image Upload ─────────────────────────────────────────────────────────────
const uploadImage = (
  userId: string,
  uri: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `posts/${userId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    const task = uploadBytesResumable(storageRef, blob);

    task.on(
      'state_changed',
      (snap) => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        onProgress?.(pct);
      },
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
};

// ─── OG Metadata ─────────────────────────────────────────────────────────────
export const fetchOGMetadata = async (url: string): Promise<OGMetadata> => {
  // Uses a public OG scraper proxy — replace with your own backend endpoint
  const apiUrl = `https://api.boonapp.com/og?url=${encodeURIComponent(url)}`;
  const res = await fetch(apiUrl);
  return res.json();
};

// ─── Likes ────────────────────────────────────────────────────────────────────
export const toggleLike = async (postId: string, userId: string, isLiked: boolean) => {
  const ref = doc(db, 'posts', postId);
  await updateDoc(ref, {
    likesCount: increment(isLiked ? -1 : 1),
    likedBy: isLiked ? arrayRemove(userId) : arrayUnion(userId),
  });
};

// ─── Save / Wishlist ──────────────────────────────────────────────────────────
export const toggleSave = async (postId: string, userId: string, isSaved: boolean) => {
  const postRef = doc(db, 'posts', postId);
  const userRef = doc(db, 'users', userId);
  await Promise.all([
    updateDoc(postRef, {
      savesCount: increment(isSaved ? -1 : 1),
      savedBy: isSaved ? arrayRemove(userId) : arrayUnion(userId),
    }),
    updateDoc(userRef, {
      savedDeals: isSaved ? arrayRemove(postId) : arrayUnion(postId),
    }),
  ]);
};

// ─── Comments ─────────────────────────────────────────────────────────────────
export const fetchComments = async (postId: string): Promise<Comment[]> => {
  const snap = await getDocs(
    query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'asc')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
};

export const addComment = async (
  postId: string,
  authorId: string,
  text: string
): Promise<Comment> => {
  const data = {
    postId,
    authorId,
    text,
    likesCount: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'posts', postId, 'comments'), data);
  await updateDoc(doc(db, 'posts', postId), { commentsCount: increment(1) });
  return { id: ref.id, ...data } as unknown as Comment;
};

// ─── Delete Post ─────────────────────────────────────────────────────────────
export const deletePost = async (postId: string, authorId: string) => {
  await deleteDoc(doc(db, 'posts', postId));
  await updateDoc(doc(db, 'users', authorId), { postsCount: increment(-1) });
};
