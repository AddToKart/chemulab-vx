/**
 * Notebook persistence service for lab notes.
 * Stores a single plain text notebook per user in Firestore with localStorage backup.
 */

import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

/* ---------- types ---------- */

export interface NotebookData {
  content: string;
  updatedAt: string; // ISO string
  createdAt: string; // ISO string
}

const BACKUP_KEY = (uid: string) => `chemulab_notebook_backup_${uid}`;
const COLLECTION = 'notebooks';

/* ---------- helpers ---------- */

function convertTimestampToString(ts: Timestamp | string | undefined): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  // Firestore Timestamp
  return ts.toDate().toISOString();
}

/* ---------- Firestore reads ---------- */

export async function loadNotebook(uid: string): Promise<NotebookData | null> {
  // 1. Try Firestore
  try {
    const snap = await getDoc(doc(db, COLLECTION, uid));
    if (snap.exists()) {
      const data = snap.data() as NotebookData;
      return {
        content: data.content || '',
        updatedAt: convertTimestampToString(data.updatedAt),
        createdAt: convertTimestampToString(data.createdAt),
      };
    }
  } catch (err) {
    console.warn('[notebook] Error reading Firestore:', err);
  }

  // 2. Fallback to localStorage backup
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(BACKUP_KEY(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as NotebookData;
        if (parsed && typeof parsed.content === 'string') {
          // Restore backup to Firestore (non-blocking)
          saveNotebook(uid, parsed.content).catch(() => {});
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. No notebook yet
  return null;
}

/* ---------- Firestore writes ---------- */

export async function saveNotebook(
  uid: string,
  content: string,
): Promise<boolean> {
  const now = new Date().toISOString();
  const data: NotebookData = {
    content,
    updatedAt: now,
    createdAt: now, // Will be overwritten if document already exists
  };

  try {
    // Get existing document to preserve createdAt
    const existing = await loadNotebook(uid);
    if (existing) {
      data.createdAt = existing.createdAt;
    }

    await setDoc(doc(db, COLLECTION, uid), {
      content: data.content,
      updatedAt: data.updatedAt,
      createdAt: data.createdAt,
    }, { merge: true });

    // Also keep a localStorage backup
    if (typeof window !== 'undefined') {
      localStorage.setItem(BACKUP_KEY(uid), JSON.stringify(data));
    }

    return true;
  } catch (err) {
    console.error('[notebook] Save failed:', err);
    // At least save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(BACKUP_KEY(uid), JSON.stringify(data));
    }
    return false;
  }
}

/* ---------- Backup helpers ---------- */

export function createLocalBackup(uid: string, data: NotebookData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKUP_KEY(uid), JSON.stringify(data));
}
