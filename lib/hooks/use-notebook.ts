'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadNotebook,
  saveNotebook,
  createLocalBackup,
  type NotebookData,
} from '@/lib/firebase/notebook';

export function useNotebook(uid?: string) {
  const [notebook, setNotebook] = useState<NotebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load notebook on mount
  useEffect(() => {
    if (!uid) {
      setNotebook(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadNotebook(uid)
      .then((data) => {
        if (cancelled) return;
        setNotebook(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[notebook] Failed to load:', err);
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // Periodic backup to localStorage
  useEffect(() => {
    if (!uid) return;

    backupIntervalRef.current = setInterval(() => {
      if (notebook) {
        createLocalBackup(uid, notebook);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(backupIntervalRef.current);
  }, [uid, notebook]);

  // Debounced auto-save
  const debouncedSave = useCallback(
    (content: string) => {
      if (!uid) return;

      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for 1 second debounce
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          const success = await saveNotebook(uid, content);
          if (success) {
            // Update local state with new timestamps
            const now = new Date().toISOString();
            setNotebook((prev) => ({
              content,
              updatedAt: now,
              createdAt: prev?.createdAt || now,
            }));
          }
        } finally {
          setSaving(false);
        }
      }, 1000);
    },
    [uid],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Update content and trigger auto-save
  const updateContent = useCallback(
    (content: string) => {
      setNotebook((prev) => ({
        content,
        updatedAt: prev?.updatedAt || new Date().toISOString(),
        createdAt: prev?.createdAt || new Date().toISOString(),
      }));
      debouncedSave(content);
    },
    [debouncedSave],
  );

  // Manual save (for explicit save button if needed)
  const saveNow = useCallback(async () => {
    if (!uid || !notebook) return;
    setSaving(true);
    try {
      await saveNotebook(uid, notebook.content);
    } finally {
      setSaving(false);
    }
  }, [uid, notebook]);

  return {
    notebook,
    loading,
    saving,
    updateContent,
    saveNow,
  };
}
