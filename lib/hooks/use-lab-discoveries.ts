'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDiscovery,
  createLocalBackup,
  exportDiscoveries,
  importDiscoveriesFromFile,
  loadDiscoveries,
  mergeDiscoveries,
  saveDiscoveries,
  type Discovery,
} from '@/lib/firebase/discoveries';

interface NewDiscoveryInput {
  symbol: string;
  name: string;
  color?: string;
  type?: string;
}

export function useLabDiscoveries(uid?: string) {
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!uid) {
      setDiscoveries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadDiscoveries(uid)
      .then((data) => {
        if (cancelled) return;
        setDiscoveries(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[lab] Failed to load discoveries:', err);
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    backupIntervalRef.current = setInterval(() => {
      if (discoveries.length > 0) {
        createLocalBackup(uid, discoveries);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(backupIntervalRef.current);
  }, [uid, discoveries]);

  const add = useCallback(
    async (discovery: NewDiscoveryInput) => {
      if (discoveries.some((item) => item.symbol === discovery.symbol)) {
        return discoveries;
      }

      if (!uid) {
        const localEntry: Discovery = {
          ...discovery,
          dateDiscovered: new Date().toISOString(),
        };
        const next = [...discoveries, localEntry];
        setDiscoveries(next);
        return next;
      }

      setSaving(true);
      try {
        const next = await addDiscovery(uid, discoveries, discovery);
        setDiscoveries(next);
        return next;
      } finally {
        setSaving(false);
      }
    },
    [discoveries, uid],
  );

  const importFromFile = useCallback(
    async (file: File) => {
      const imported = await importDiscoveriesFromFile(file);
      const merged = mergeDiscoveries(discoveries, imported);
      setDiscoveries(merged);

      if (uid) {
        setSaving(true);
        try {
          await saveDiscoveries(uid, merged);
        } finally {
          setSaving(false);
        }
      }

      return { imported, merged };
    },
    [discoveries, uid],
  );

  const exportAll = useCallback(() => {
    exportDiscoveries(discoveries, uid);
  }, [discoveries, uid]);

  return {
    discoveries,
    loading,
    saving,
    addDiscovery: add,
    exportDiscoveries: exportAll,
    importDiscoveries: importFromFile,
  };
}
