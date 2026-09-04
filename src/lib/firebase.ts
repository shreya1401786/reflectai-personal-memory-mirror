import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import firebaseConfigData from "../../firebase-applet-config.json";
import { JournalEntry, JournalMessage, FutureLetter } from "../types";

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize or reuse Firebase App
export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Initialize Firestore (handling custom databaseId if configured)
const dbId = (firebaseConfigData as any).firestoreDatabaseId;
export const db: Firestore =
  dbId && dbId !== "(default)" ? getFirestore(app, dbId) : getFirestore(app);

/**
 * Strict undefined-stripping utility (mandated for zero-crash Firestore hygiene)
 */
export function stripUndefined<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );
}

/**
 * Sign in using Google OAuth Popup
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Google sign in failed:", error);
    // Provide actionable feedback if running inside sandboxed iframe
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") {
      throw new Error("Authentication popup was blocked. Please enable popups or open this app in a full browser tab.");
    }
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Listen to user authentication changes
 */
export function onUserAuthStateChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Persist or update a Journal Entry to user-isolated path:
 * /users/{userId}/entries/{entryId}
 * Also records to /users/{userId}/interactions/{entryId}
 */
export async function saveJournalEntry(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  if (!userId) {
    throw new Error("Cannot save entry: User is not authenticated.");
  }

  // Strip all undefined fields to guarantee zero-crash write
  const sanitizedEntry = stripUndefined(entry);

  const entryRef = doc(db, "users", userId, "entries", entry.id);
  await setDoc(entryRef, sanitizedEntry, { merge: true });

  // Also maintain interaction record for audit and rule compliance
  const interactionRef = doc(db, "users", userId, "interactions", entry.id);
  const interactionPayload = stripUndefined({
    id: entry.id,
    userId,
    title: entry.title,
    summary: entry.summary,
    tags: entry.tags,
    messageCount: entry.messages.length,
    updatedAt: entry.updatedAt,
  });
  await setDoc(interactionRef, interactionPayload, { merge: true });
}

/**
 * Retrieve all journal entries for the current user
 */
export async function getUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) {
    return [];
  }

  try {
    const entriesRef = collection(db, "users", userId, "entries");
    // Sort descending by updatedAt
    const q = query(entriesRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    const results: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as JournalEntry);
    });
    return results;
  } catch (error: any) {
    // If index is pending or building, fallback to fetching and in-memory sort
    console.warn("Firestore indexed query fallback:", error?.message);
    const entriesRef = collection(db, "users", userId, "entries");
    const snapshot = await getDocs(entriesRef);
    const results: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as JournalEntry);
    });
    return results.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  }
}

/**
 * Delete a journal entry for the current user
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  const entryRef = doc(db, "users", userId, "entries", entryId);
  await deleteDoc(entryRef);

  const interactionRef = doc(db, "users", userId, "interactions", entryId);
  await deleteDoc(interactionRef);
}

/**
 * Persist a Future Letter for the user
 * /users/{userId}/future_letters/{letterId}
 */
export async function saveFutureLetter(
  userId: string,
  letter: FutureLetter
): Promise<void> {
  if (!userId) {
    throw new Error("Cannot save letter: User is not authenticated.");
  }
  const sanitized = stripUndefined(letter);
  const letterRef = doc(db, "users", userId, "future_letters", letter.id);
  await setDoc(letterRef, sanitized, { merge: true });
}

/**
 * Retrieve all Future Letters for the user
 */
export async function getUserFutureLetters(userId: string): Promise<FutureLetter[]> {
  if (!userId) return [];
  try {
    const lettersRef = collection(db, "users", userId, "future_letters");
    const snapshot = await getDocs(lettersRef);
    const results: FutureLetter[] = [];
    snapshot.forEach((docSnap) => {
      results.push(docSnap.data() as FutureLetter);
    });
    return results.sort(
      (a, b) => new Date(a.deliverAt).getTime() - new Date(b.deliverAt).getTime()
    );
  } catch (err: any) {
    console.warn("Failed to fetch future letters:", err);
    return [];
  }
}

/**
 * Delete a Future Letter
 */
export async function deleteFutureLetter(userId: string, letterId: string): Promise<void> {
  if (!userId || !letterId) return;
  const letterRef = doc(db, "users", userId, "future_letters", letterId);
  await deleteDoc(letterRef);
}

