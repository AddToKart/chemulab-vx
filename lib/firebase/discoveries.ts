/**
 * Discovery / progress persistence service.
 * Mirrors the original DiscoveryService + ChemistryCraft save/load logic.
 * Uses Firestore modular SDK v10 and localStorage for offline fallback.
 */

import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';

/* ---------- types ---------- */

export interface Discovery {
  symbol: string;
  name: string;
  color?: string;
  type?: string;
  dateDiscovered: string;
  lastUpdated?: string;
  combination?: string[];
}

export interface ProgressData {
  completedDiscoveries: number;
  totalDiscoveries: number;
  progressPercentage: number;
  milestones: {
    beginner: boolean;   // >= 10 %
    intermediate: boolean; // >= 50 %
    advanced: boolean;   // >= 75 %
    master: boolean;     // >= 100 %
  };
  lastUpdated?: string;
}

export interface UserProgressDoc {
  discoveries: Discovery[];
  progress?: ProgressData;
  lastUpdated: string;
  created?: string;
}

const TOTAL_ELEMENTS = 118;
const BACKUP_KEY = (uid: string) => `chemulab_discoveries_backup_${uid}`;

/* ---------- helpers ---------- */

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

function dedupeDiscoveries(list: Discovery[]): Discovery[] {
  const seen = new Set<string>();
  return list.filter((d) => {
    if (!d?.symbol || seen.has(d.symbol)) return false;
    seen.add(d.symbol);
    return true;
  });
}

/* ---------- Firestore reads ---------- */

export async function loadDiscoveries(uid: string): Promise<Discovery[]> {
  let discoveries: Discovery[] = [];

  // 1. Try progress collection
  try {
    const snap = await getDoc(doc(db, 'progress', uid));
    if (snap.exists()) {
      const data = snap.data() as UserProgressDoc;
      if (Array.isArray(data.discoveries) && data.discoveries.length > 0) {
        discoveries = data.discoveries;
      }
    }
  } catch (err) {
    console.warn('[discoveries] Error reading progress doc:', err);
  }

  // 2. Fallback to discoveries collection
  if (discoveries.length === 0) {
    try {
      const snap = await getDoc(doc(db, 'discoveries', uid));
      if (snap.exists()) {
        const data = snap.data() as UserProgressDoc;
        if (Array.isArray(data.discoveries) && data.discoveries.length > 0) {
          discoveries = data.discoveries;
        }
      }
    } catch (err) {
      console.warn('[discoveries] Error reading discoveries doc:', err);
    }
  }

  // 3. Fallback to localStorage backup
  if (discoveries.length === 0 && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(BACKUP_KEY(uid));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          discoveries = parsed;
          // Restore backup to Firestore (non-blocking)
          saveDiscoveries(uid, discoveries).catch(() => {});
        }
      }
    } catch {
      // ignore
    }
  }

  return dedupeDiscoveries(discoveries);
}

/* ---------- Firestore writes ---------- */

export async function saveDiscoveries(
  uid: string,
  discoveries: Discovery[],
): Promise<boolean> {
  const deduped = dedupeDiscoveries(discoveries);
  const progress = computeProgress(deduped);
  const now = new Date().toISOString();

  const saveData: UserProgressDoc = {
    discoveries: deduped,
    progress,
    lastUpdated: now,
  };

  try {
    const batch = writeBatch(db);

    // Save to both collections (same structure as original)
    batch.set(doc(db, 'progress', uid), saveData, { merge: true });
    batch.set(doc(db, 'discoveries', uid), saveData, { merge: true });

    await batch.commit();

    // Also keep a localStorage backup
    if (typeof window !== 'undefined') {
      localStorage.setItem(BACKUP_KEY(uid), JSON.stringify(deduped));
    }

    return true;
  } catch (err) {
    console.error('[discoveries] Save failed:', err);
    // At least save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(BACKUP_KEY(uid), JSON.stringify(deduped));
    }
    return false;
  }
}

/* ---------- Add single discovery ---------- */

export async function addDiscovery(
  uid: string,
  currentDiscoveries: Discovery[],
  newDiscovery: Omit<Discovery, 'dateDiscovered'>,
): Promise<Discovery[]> {
  const now = new Date().toISOString();
  const entry: Discovery = {
    ...newDiscovery,
    dateDiscovered: now,
    lastUpdated: now,
  };

  // Check for duplicates
  if (currentDiscoveries.some((d) => d.symbol === entry.symbol)) {
    return currentDiscoveries;
  }

  const updated = [...currentDiscoveries, entry];
  await saveDiscoveries(uid, updated);
  return updated;
}

/* ---------- Export / Import ---------- */

export function exportDiscoveries(discoveries: Discovery[], uid?: string): void {
  if (!discoveries.length) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    uid: uid ?? null,
    discoveries,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.download = `chemulab_discoveries_${uid || 'anon'}_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importDiscoveriesFromFile(
  file: File,
): Promise<Discovery[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const arr: Discovery[] = Array.isArray(parsed.discoveries)
          ? parsed.discoveries
          : Array.isArray(parsed)
            ? parsed
            : [];
        const valid = arr.filter((d) => d?.symbol && d?.name);
        resolve(valid);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
}

/* ---------- Merge logic ---------- */

export function mergeDiscoveries(
  existing: Discovery[],
  incoming: Discovery[],
): Discovery[] {
  const map = new Map<string, Discovery>();

  for (const d of existing) {
    if (d?.symbol) map.set(d.symbol, d);
  }

  for (const d of incoming) {
    if (!d?.symbol) continue;
    const ex = map.get(d.symbol);
    if (!ex) {
      map.set(d.symbol, d);
    } else {
      // Newer lastUpdated wins
      const exTime = new Date(ex.lastUpdated || ex.dateDiscovered || 0).getTime();
      const newTime = new Date(d.lastUpdated || d.dateDiscovered || 0).getTime();
      if (isNaN(exTime) || newTime >= exTime) {
        map.set(d.symbol, d);
      }
    }
  }

  return Array.from(map.values());
}

/* ---------- Backup helpers ---------- */

export function createLocalBackup(uid: string, discoveries: Discovery[]): void {
  if (typeof window === 'undefined' || !discoveries.length) return;
  localStorage.setItem(BACKUP_KEY(uid), JSON.stringify(discoveries));

  const now = new Date();
  const dailyKey = `${BACKUP_KEY(uid)}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
  if (!localStorage.getItem(dailyKey)) {
    localStorage.setItem(dailyKey, JSON.stringify(discoveries));
  }

  const weeklyKey = `${BACKUP_KEY(uid)}_${now.getFullYear()}_${now.getMonth()}_${Math.floor(now.getDate() / 7)}`;
  if (!localStorage.getItem(weeklyKey)) {
    localStorage.setItem(weeklyKey, JSON.stringify(discoveries));
  }
}
