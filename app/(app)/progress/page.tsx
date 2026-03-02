'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/auth-store';
import {
  loadDiscoveries,
  type Discovery,
  type ProgressData,
  type UserProgressDoc,
} from '@/lib/firebase/discoveries';
import styles from './page.module.css';

const TOTAL_ELEMENTS = 118;

function computeProgress(discoveries: Discovery[]): ProgressData {
  const count = discoveries.length;
  const pct = (count / TOTAL_ELEMENTS) * 100;
  return {
    completedDiscoveries: count,
    totalDiscoveries: count,
    progressPercentage: pct,
    milestones: {
      beginner: pct >= 10,
      intermediate: pct >= 50,
      advanced: pct >= 75,
      master: pct >= 100,
    },
    lastUpdated: new Date().toISOString(),
  };
}

type SyncState = 'idle' | 'syncing' | 'synced' | 'error';

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuthStore();

  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [progress, setProgress] = useState<ProgressData>(() =>
    computeProgress([]),
  );
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle');

  const unsubRef = useRef<(() => void) | undefined>(undefined);

  const updateProgress = useCallback((discs: Discovery[]) => {
    setDiscoveries(discs);
    setProgress(computeProgress(discs));
  }, []);

  // Real-time Firestore listener + initial fallback load
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Signed out — reset
      updateProgress([]);
      setSyncStatus('idle');
      return;
    }

    const uid = user.uid;
    setSyncStatus('syncing');

    // 1. Set up real-time listener on progress/{uid}
    const unsub = onSnapshot(
      doc(db, 'progress', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProgressDoc;
          if (Array.isArray(data.discoveries)) {
            updateProgress(data.discoveries);
          }
        }
        setSyncStatus('synced');
      },
      (err) => {
        console.error('[progress] Snapshot error:', err);
        setSyncStatus('error');
      },
    );
    unsubRef.current = unsub;

    // 2. Also do a one-time load as fallback (handles discoveries collection + localStorage)
    loadDiscoveries(uid)
      .then((discs) => {
        // Only apply fallback if we haven't received snapshot data yet
        setDiscoveries((prev) => (prev.length === 0 ? discs : prev));
        setProgress((prev) =>
          prev.completedDiscoveries === 0 ? computeProgress(discs) : prev,
        );
      })
      .catch((err) => {
        console.warn('[progress] Fallback load failed:', err);
      });

    return () => {
      unsub();
      unsubRef.current = undefined;
    };
  }, [user, authLoading, updateProgress]);

  // ---------- Render helpers ----------

  const milestoneLabels: { key: keyof ProgressData['milestones']; label: string }[] = [
    { key: 'beginner', label: 'Beginner (10%)' },
    { key: 'intermediate', label: 'Intermediate (50%)' },
    { key: 'advanced', label: 'Advanced (75%)' },
    { key: 'master', label: 'Master (100%)' },
  ];

  const syncLabel: Record<SyncState, string> = {
    idle: '',
    syncing: 'Syncing…',
    synced: 'Synced',
    error: 'Sync error — showing cached data',
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Progress Tracker</h1>
        <p className={styles.emptyState}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Progress Tracker</h1>
        <p className={styles.emptyState}>Sign in to track your progress.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Progress Tracker</h1>

      {syncLabel[syncStatus] && (
        <p className={styles.syncStatus}>{syncLabel[syncStatus]}</p>
      )}

      {/* ---- Progress Section ---- */}
      <section className={styles.progressSection}>
        <h2>Overall Progress</h2>

        {/* Progress bar */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${Math.min(progress.progressPercentage, 100)}%` }}
          />
          <span className={styles.progressText}>
            {Math.round(progress.progressPercentage)}%
          </span>
        </div>

        {/* Stats grid */}
        <div className={styles.progressStats}>
          <div className={styles.statItem}>
            <h3>Discovered</h3>
            <div className={styles.statValue}>
              {progress.completedDiscoveries} / {TOTAL_ELEMENTS}
            </div>
          </div>

          <div className={styles.statItem}>
            <h3>Milestones</h3>
            <div className={styles.milestones}>
              {milestoneLabels.map(({ key, label }) => (
                <div
                  key={key}
                  className={`${styles.milestone}${
                    progress.milestones[key] ? ` ${styles.milestoneAchieved}` : ''
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Discoveries Section ---- */}
      <section className={styles.discoveriesSection}>
        <h2>Discovered Elements</h2>

        {discoveries.length === 0 ? (
          <p className={styles.emptyState}>
            No discoveries yet. Head to the lab and start experimenting!
          </p>
        ) : (
          <div className={styles.discoveriesList}>
            {discoveries.map((d) => (
              <div key={d.symbol} className={styles.discoveryItem}>
                <div className={styles.discoverySymbol}>{d.symbol}</div>
                <div className={styles.discoveryName}>{d.name}</div>
                <div className={styles.discoveryDate}>
                  {new Date(d.dateDiscovered).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
