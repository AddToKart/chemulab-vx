import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type DocumentData,
  type FirestoreError,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { ensureUsernameForUser } from './auth';
import type { UserProfile } from '@/store/auth-store';

interface UserIdentity {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

interface FirestoreUserProfileData extends DocumentData {
  username?: unknown;
  isAdmin?: unknown;
  photoURL?: unknown;
  photoSourceURL?: unknown;
  bio?: unknown;
  registrationDate?: Timestamp;
  createdAt?: Timestamp;
}

export interface ProfileUpdateData {
  username?: string;
  photoURL?: string;
  photoSourceURL?: string;
  bio?: string;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toProfileError(err: unknown, fallbackMessage: string): Error {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: unknown }).code);

    if (code === 'permission-denied') {
      return new Error('You do not have permission to access this profile.');
    }
  }

  if (err instanceof Error && err.message) {
    return err;
  }

  return new Error(fallbackMessage);
}

function mapUserProfile(
  identity: UserIdentity,
  data: FirestoreUserProfileData | null,
  username: string,
): UserProfile {
  return {
    uid: identity.uid,
    email: identity.email,
    username,
    isAdmin: Boolean(data?.isAdmin),
    emailVerified: identity.emailVerified,
    photoURL: readString(data?.photoURL),
    photoSourceURL: readString(data?.photoSourceURL),
    bio: readString(data?.bio),
    registrationDate: data?.registrationDate,
    createdAt: data?.createdAt,
  };
}

async function resolveUsername(
  identity: UserIdentity,
  data: FirestoreUserProfileData | null,
): Promise<string> {
  const username = readString(data?.username);

  if (username) {
    return username;
  }

  return (
    (await ensureUsernameForUser(identity.uid, identity.email)) ??
    identity.email ??
    identity.uid
  );
}

export function createFallbackUserProfile(identity: UserIdentity): UserProfile {
  return {
    uid: identity.uid,
    email: identity.email,
    username: identity.email ?? identity.uid,
    isAdmin: false,
    emailVerified: identity.emailVerified,
    photoURL: '',
    photoSourceURL: '',
    bio: '',
  };
}

export async function loadUserProfile(identity: UserIdentity): Promise<UserProfile> {
  try {
    const profileSnap = await getDoc(doc(db, 'users', identity.uid));
    const data = profileSnap.exists()
      ? (profileSnap.data() as FirestoreUserProfileData)
      : null;
    const username = await resolveUsername(identity, data);

    return mapUserProfile(identity, data, username);
  } catch (err) {
    throw toProfileError(err, 'Failed to load profile.');
  }
}

export function subscribeToUserProfile(
  identity: UserIdentity,
  onProfile: (profile: UserProfile) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', identity.uid),
    async (profileSnap) => {
      try {
        const data = profileSnap.exists()
          ? (profileSnap.data() as FirestoreUserProfileData)
          : null;
        const username = await resolveUsername(identity, data);
        onProfile(mapUserProfile(identity, data, username));
      } catch (err) {
        onError(toProfileError(err, 'Failed to sync profile.'));
      }
    },
    (err: FirestoreError) => {
      onError(toProfileError(err, 'Failed to sync profile.'));
    },
  );
}

export async function updateUserProfile(
  uid: string,
  data: ProfileUpdateData,
): Promise<void> {
  try {
    await setDoc(doc(db, 'users', uid), data, { merge: true });
  } catch (err) {
    throw toProfileError(err, 'Failed to update profile.');
  }
}
