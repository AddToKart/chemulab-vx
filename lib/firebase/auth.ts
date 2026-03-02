import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';
import { useAuthStore } from '@/store/auth-store';

// Date after which new accounts must verify their email
// Grandfathering date: 2026-02-03 (matches original)
const VERIFICATION_ENFORCEMENT_DATE = new Date('2026-02-03T00:00:00Z');

// ─── Validation helpers ───

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function checkUsernameExists(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', username));
  return snap.exists();
}

// ─── Username utilities ───

/** Derive a safe base username from an email address */
function deriveUsername(email: string): string {
  const base = email.split('@')[0] ?? '';
  return base.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'user';
}

/** Ensure a username -> uid mapping exists. Returns the reserved username. */
export async function ensureUsernameForUser(
  uid: string,
  email: string | null,
  preferredUsername?: string,
): Promise<string | null> {
  // Check if mapping already exists for uid
  const existingQ = query(collection(db, 'usernames'), where('uid', '==', uid), limit(1));
  const existingSnap = await getDocs(existingQ);
  if (!existingSnap.empty) {
    const existingUsername = existingSnap.docs[0].id;
    // Ensure profile also has this username
    const profileSnap = await getDoc(doc(db, 'users', uid));
    if (!profileSnap.exists() || !profileSnap.data()?.username) {
      await setDoc(doc(db, 'users', uid), { username: existingUsername, email }, { merge: true });
    }
    return existingUsername;
  }

  // Check if profile already has a username
  const profileSnap = await getDoc(doc(db, 'users', uid));
  if (profileSnap.exists() && profileSnap.data()?.username) {
    const profileUsername = profileSnap.data()!.username as string;
    const unameSnap = await getDoc(doc(db, 'usernames', profileUsername));
    if (!unameSnap.exists()) {
      await setDoc(doc(db, 'usernames', profileUsername), {
        uid,
        email,
        createdAt: serverTimestamp(),
      });
    }
    return profileUsername;
  }

  // Derive and reserve a new username
  let base = preferredUsername || (email ? deriveUsername(email) : uid.slice(0, 8));
  base = base.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || uid.slice(0, 8);

  let candidate = base;
  let suffix = 0;
  while (suffix < 200) {
    const ref = doc(db, 'usernames', candidate);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { uid, email, createdAt: serverTimestamp() });
      await setDoc(doc(db, 'users', uid), { username: candidate, email }, { merge: true });
      return candidate;
    }
    suffix++;
    candidate = base + suffix;
  }
  return null;
}

// ─── Registration ───

export interface RegisterResult {
  emailSent: boolean;
  message: string;
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<RegisterResult> {
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Check username availability
  if (await checkUsernameExists(username)) {
    throw new Error('This username is already taken. Please choose a different username.');
  }

  // Suppress auth-listener side-effects (redirect, profile fetch) during registration
  const { setRegistering } = useAuthStore.getState();
  setRegistering(true);

  try {
    // Create auth user
    let uid: string;
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      uid = userCred.user.uid;
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('This email address is already registered. Please use a different email or sign in.');
      } else if (err.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        throw new Error('Invalid email address format.');
      }
      throw err;
    }

    // Reserve username via transaction
    const usernameRef = doc(db, 'usernames', username);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(usernameRef);
      if (snap.exists()) throw new Error('Username already taken');
      tx.set(usernameRef, { uid, email, createdAt: serverTimestamp() });
    });

    // Write user profile
    await setDoc(
      doc(db, 'users', uid),
      {
        username,
        email,
        createdAt: serverTimestamp(),
        registrationDate: serverTimestamp(),
      },
      { merge: true },
    );

    // Send verification email
    let emailSent = false;
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        emailSent = true;
      } catch (verifyErr) {
        console.warn('Failed to send verification email:', verifyErr);
      }
    }

    // Force logout so they verify first
    await signOut(auth);

    return {
      emailSent,
      message: emailSent
        ? 'Account created! Please check your email to verify your account before logging in.'
        : 'Account created! However, we could not send a verification email. Please try logging in and requesting a new one.',
    };
  } finally {
    // Always clear the flag so auth listener resumes normal behaviour
    setRegistering(false);
  }
}

// ─── Login ───

export async function login(identifier: string, password: string): Promise<User> {
  let email = identifier;

  // If identifier is a username (no @), resolve to email
  if (!identifier.includes('@')) {
    const snap = await getDoc(doc(db, 'usernames', identifier));
    if (!snap.exists()) throw new Error('Username does not exist');
    const data = snap.data();
    if (!data?.email) throw new Error('No email mapped for username');
    email = data.email as string;
  }

  const userCred = await signInWithEmailAndPassword(auth, email, password);
  const user = userCred.user;

  // Check email verification for accounts created after enforcement date
  if (!user.emailVerified) {
    const creationTime = new Date(user.metadata.creationTime ?? 0);
    if (creationTime > VERIFICATION_ENFORCEMENT_DATE) {
      await signOut(auth);
      throw new Error('Please verify your email address to log in.');
    }
  }

  return user;
}

// ─── Logout ───

export async function logout(): Promise<void> {
  await signOut(auth);
}

// ─── Password reset ───

export async function forgotPassword(email: string): Promise<void> {
  if (!email) throw new Error('Email is required');
  await sendPasswordResetEmail(auth, email);
}

// ─── Auth state listener ───

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
