'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/auth-store';

interface UseBookmarksResult {
  bookmarks: number[];
  loading: boolean;
  addBookmark: (atomicNumber: number) => Promise<void>;
  removeBookmark: (atomicNumber: number) => Promise<void>;
  isBookmarked: (atomicNumber: number) => boolean;
  toggleBookmark: (atomicNumber: number) => Promise<void>;
}

export function useBookmarks(): UseBookmarksResult {
  const user = useAuthStore((s) => s.user);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset state when user logs out
    if (!user?.uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookmarks([]);
       
      setLoading(false);
      return;
    }

    let cancelled = false;
    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snap) => {
        if (cancelled) return;

        if (snap.exists()) {
          const data = snap.data();
          const userBookmarks = Array.isArray(data.bookmarks) ? data.bookmarks : [];
          setBookmarks(userBookmarks);
        } else {
          setBookmarks([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[bookmarks] Snapshot error:', err);
        if (cancelled) return;
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user]);

  const addBookmark = useCallback(async (atomicNumber: number) => {
    if (!user?.uid) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        bookmarks: arrayUnion(atomicNumber),
      });
    } catch (error) {
      console.error('[bookmarks] Error adding bookmark:', error);
    }
  }, [user]);

  const removeBookmark = useCallback(async (atomicNumber: number) => {
    if (!user?.uid) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        bookmarks: arrayRemove(atomicNumber),
      });
    } catch (error) {
      console.error('[bookmarks] Error removing bookmark:', error);
    }
  }, [user]);

  const isBookmarked = useCallback((atomicNumber: number) => {
    return bookmarks.includes(atomicNumber);
  }, [bookmarks]);

  const toggleBookmark = useCallback(async (atomicNumber: number) => {
    if (isBookmarked(atomicNumber)) {
      await removeBookmark(atomicNumber);
    } else {
      await addBookmark(atomicNumber);
    }
  }, [isBookmarked, addBookmark, removeBookmark]);

  return {
    bookmarks,
    loading,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
  };
}
