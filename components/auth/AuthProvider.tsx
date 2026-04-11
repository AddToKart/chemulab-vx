'use client';

import { useEffect } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChange } from '@/lib/firebase/auth';
import {
  createFallbackUserProfile,
  subscribeToUserProfile,
} from '@/lib/firebase/profile';
import { useAuthStore } from '@/store/auth-store';

/**
 * Listens to Firebase auth state changes and hydrates the Zustand auth store
 * with the user + Firestore profile. Renders nothing; purely a side-effect component.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let profileSession = 0;

    const handleProfileError = (firebaseUser: User, error: Error, sessionId: number) => {
      const { setProfile, setLoading } = useAuthStore.getState();

      if (sessionId !== profileSession) {
        return;
      }

      console.error('[auth] Profile sync error:', error);
      setProfile(createFallbackUserProfile({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        emailVerified: firebaseUser.emailVerified,
      }));
      setLoading(false);
    };

    const unsubscribeAuth = onAuthChange((firebaseUser) => {
      const { setUser, setProfile, setLoading, registering } = useAuthStore.getState();

      // While register() is running we do not touch the store; it manages its own signOut().
      if (registering) {
        return;
      }

      profileSession += 1;
      const sessionId = profileSession;

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);
      setLoading(true);

      unsubscribeProfile = subscribeToUserProfile(
        {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
        },
        (profile) => {
          if (sessionId !== profileSession) {
            return;
          }

          const { setProfile: setLiveProfile, setLoading: setLiveLoading } = useAuthStore.getState();
          setLiveProfile(profile);
          setLiveLoading(false);
        },
        (error) => {
          handleProfileError(firebaseUser, error, sessionId);
        },
      );
    });

    return () => {
      profileSession += 1;
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribeAuth();
    };
  }, []);

  return <>{children}</>;
}
