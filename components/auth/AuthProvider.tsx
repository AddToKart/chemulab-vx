'use client';

import { useEffect } from 'react';
import { onAuthChange, ensureUsernameForUser } from '@/lib/firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/auth-store';

/**
 * Listens to Firebase auth state changes and hydrates the Zustand auth store
 * with the user + Firestore profile.  Renders nothing — purely a side-effect component.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      const { setUser, setProfile, setLoading, registering } = useAuthStore.getState();

      // While register() is running we don't touch the store — it manages its own signOut().
      if (registering) return;

      if (firebaseUser) {
        setUser(firebaseUser);

        // Load profile from Firestore
        try {
          const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          const data = profileSnap.exists() ? profileSnap.data() : null;

          let username = data?.username as string | undefined;

          if (!username) {
            // Ensure a username mapping exists (same logic as original auth.js)
            username =
              (await ensureUsernameForUser(firebaseUser.uid, firebaseUser.email)) ?? firebaseUser.email ?? firebaseUser.uid;
          }

          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: username ?? firebaseUser.email ?? firebaseUser.uid,
            isAdmin: !!data?.isAdmin,
            emailVerified: firebaseUser.emailVerified,
            photoURL: (data?.photoURL as string) || '',
            photoSourceURL: (data?.photoSourceURL as string) || '',
          });
        } catch {
          // Fallback profile
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.email ?? firebaseUser.uid,
            isAdmin: false,
            emailVerified: firebaseUser.emailVerified,
            photoURL: '',
            photoSourceURL: '',
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return <>{children}</>;
}
