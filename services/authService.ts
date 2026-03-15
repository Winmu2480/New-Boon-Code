import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types';

// ─── Auth State Listener ──────────────────────────────────────────────────────
export const subscribeToAuth = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ─── Email / Password ─────────────────────────────────────────────────────────
export const signInWithEmail = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  username: string
) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await createUserDocument(result.user, { displayName, username });
  return result.user;
};

// ─── Google Sign-In ───────────────────────────────────────────────────────────
export const signInWithGoogle = async (idToken: string) => {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(auth, credential);
  await ensureUserDocument(result.user);
  return result.user;
};

// ─── Apple Sign-In ────────────────────────────────────────────────────────────
export const signInWithApple = async (identityToken: string, nonce: string) => {
  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({ idToken: identityToken, rawNonce: nonce });
  const result = await signInWithCredential(auth, credential);
  await ensureUserDocument(result.user);
  return result.user;
};

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export const signOutUser = async () => {
  await signOut(auth);
};

// ─── Firestore User Documents ─────────────────────────────────────────────────
const createUserDocument = async (
  firebaseUser: FirebaseUser,
  extra: Partial<User> = {}
) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userData: Partial<User> = {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || extra.displayName || '',
    username: extra.username || generateUsername(firebaseUser.displayName || ''),
    avatar: firebaseUser.photoURL || null,
    bio: '',
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    savedDeals: [],
    createdAt: new Date().toISOString(),
  };
  await setDoc(userRef, { ...userData, createdAt: serverTimestamp() });
  return userData as User;
};

const ensureUserDocument = async (firebaseUser: FirebaseUser) => {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    return createUserDocument(firebaseUser);
  }
  return snap.data() as User;
};

export const getUserDocument = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as User) : null;
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  await updateDoc(doc(db, 'users', uid), data);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateUsername = (displayName: string): string => {
  return displayName.toLowerCase().replace(/\s+/g, '_') + Math.floor(Math.random() * 999);
};
