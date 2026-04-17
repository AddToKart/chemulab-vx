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

// ─── Username utilities ───

/** Derive a safe base username from an email address */
function deriveUsername(email: string): string {
  const base = email.split('@')[0] ?? '';
  return base.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'user';
}

/** Ensure a profile has a username. Returns the username. */
export async function ensureUsernameForUser(
  uid: string,
  email: string | null,
  preferredUsername?: string,
): Promise<string | null> {
  // Check if profile already has a username
  const profileSnap = await getDoc(doc(db, 'users', uid));
  if (profileSnap.exists() && profileSnap.data()?.username) {
    return profileSnap.data()!.username as string;
  }

  // Derive a new username
  const username = preferredUsername || (email ? deriveUsername(email) : uid.slice(0, 8));
  await setDoc(doc(db, 'users', uid), { username, email }, { merge: true });
  return username;
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

  // Suppress auth-listener side-effects (redirect, profile fetch) during registration
  const { setRegistering } = useAuthStore.getState();
  setRegistering(true);

  try {
    // Create auth user
    let createdUser: User;
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      createdUser = userCred.user;
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err) {
        const firebaseErr = err as { code: string };
        if (firebaseErr.code === 'auth/email-already-in-use') {
          throw new Error('This email address is already registered. Please use a different email or sign in.');
        } else if (firebaseErr.code === 'auth/weak-password') {
          throw new Error('Password is too weak. Please use at least 6 characters.');
        } else if (firebaseErr.code === 'auth/invalid-email') {
          throw new Error('Invalid email address format.');
        }
      }
      throw err;
    }

    // Write user profile — if this fails, roll back the auth account to avoid orphaned emails
    try {
      await setDoc(
        doc(db, 'users', createdUser.uid),
        {
          username,
          email,
          createdAt: serverTimestamp(),
          registrationDate: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (profileErr) {
      // Rollback: delete the orphaned auth account so the email isn't permanently claimed
      try {
        await createdUser.delete();
      } catch {
        // Best-effort cleanup — the account may need manual admin removal
        console.error('[auth] Failed to rollback orphaned auth account:', createdUser.uid);
      }
      throw new Error('Registration failed — please try again.');
    }

    // Send verification email (use createdUser directly to avoid auth.currentUser race condition)
    let emailSent = false;
    try {
      await sendEmailVerification(createdUser);
      emailSent = true;
    } catch (verifyErr) {
      console.warn('Failed to send verification email:', verifyErr);
    }

    // Force logout so they verify first
    await signOut(auth);

    return {
      emailSent,
      message: emailSent
        ? 'Account created! Please check your "SPAM EMAIL FOLDER" to verify your account before logging in.'
        : 'Account created! However, we could not send a verification email. Please try logging in and requesting a new one.',
    };
  } finally {
    // Always clear the flag so auth listener resumes normal behaviour
    setRegistering(false);
  }
}

// ─── Login ───

export async function login(identifier: string, password: string): Promise<User> {
  // Login now only supports email (username-to-email resolution removed as usernames are no longer unique)
  const email = identifier;

  let userCred;
  try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        throw new Error('Invalid email or password.');
      }
    }
    throw new Error('Login failed. Please try again.');
  }

  const user = userCred.user;

  // Check email verification for accounts created after enforcement date
  if (!user.emailVerified) {
    // If creationTime is unknown, assume the account is new and enforce verification
    const creationTime = user.metadata.creationTime
      ? new Date(user.metadata.creationTime)
      : new Date();

    if (creationTime > VERIFICATION_ENFORCEMENT_DATE) {
      await signOut(auth);
      throw new Error('Please verify your email address to log in.');
    }
  }

  return user;
}

// ─── Resend verification email ───

export async function resendVerificationEmail(
  email: string,
  password: string,
): Promise<string> {
  let userCred;
  try {
    userCred = await signInWithEmailAndPassword(auth, email, password);
  } catch {
    throw new Error('Could not sign in to resend verification. Please check your credentials.');
  }

  const user = userCred.user;

  if (user.emailVerified) {
    await signOut(auth);
    return 'Your email is already verified. You can sign in now.';
  }

  try {
    await sendEmailVerification(user);
  } catch (err) {
    await signOut(auth);
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please wait a few minutes before trying again.');
      }
    }
    throw new Error('Failed to send verification email. Please try again later.');
  }

  await signOut(auth);
  return 'Verification email sent! Please check your inbox and spam folder.';
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
