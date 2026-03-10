'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  computeProgress,
  loadUserProgress,
  type Discovery,
  type ProgressData,
  type UserProgressDoc,
} from '@/lib/firebase/discoveries';

export type ProgressSyncState = 'idle' | 'syncing' | 'synced' | 'error';

interface UseUserProgressResult {
  discoveries: Discovery[];
  progress: ProgressData;
  loading: boolean;
  syncState: ProgressSyncState;
  lastUpdated?: string;
}

export function useUserProgress(uid?: string): UseUserProgressResult {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [progress, setProgress] = useState<ProgressData>(() => computeProgress([]));
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<ProgressSyncState>('syncing');
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!uid) {
      return;
    }

    let cancelled = false;

    loadUserProgress(uid)
      .then((data) => {
        if (cancelled) return;
        setDiscoveries(data.discoveries);
        setProgress(data.progress ?? computeProgress(data.discoveries));
        setLastUpdated(data.lastUpdated);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[progress] Initial load failed:', err);
        if (cancelled) return;
        setLoading(false);
        setSyncState('error');
      });

    const unsubscribe = onSnapshot(
      doc(db, 'progress', uid),
      (snap) => {
        if (cancelled) return;

        if (!snap.exists()) {
          setDiscoveries([]);
          setProgress(computeProgress([]));
          setLastUpdated(undefined);
          setSyncState('synced');
          setLoading(false);
          return;
        }

        const data = snap.data() as UserProgressDoc;
        const nextDiscoveries = Array.isArray(data.discoveries) ? data.discoveries : [];
        setDiscoveries(nextDiscoveries);
        setProgress(data.progress ?? computeProgress(nextDiscoveries));
        setLastUpdated(data.lastUpdated);
        setSyncState('synced');
        setLoading(false);
      },
      (err) => {
        console.error('[progress] Snapshot error:', err);
        if (cancelled) return;
        setSyncState('error');
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  if (!uid) {
    return {
      discoveries: [],
      progress: computeProgress([]),
      loading: false,
      syncState: 'idle',
      lastUpdated: undefined,
    };
  }

  return { discoveries, progress, loading, syncState, lastUpdated };
}
