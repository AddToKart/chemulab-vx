'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  initialElements,
  attemptCombination,
  type LabElement,
} from '@/lib/data/lab-elements';
import {
  loadDiscoveries,
  saveDiscoveries,
  addDiscovery as addDiscoveryToDb,
  exportDiscoveries,
  importDiscoveriesFromFile,
  mergeDiscoveries,
  createLocalBackup,
  type Discovery,
} from '@/lib/firebase/discoveries';
import styles from './page.module.css';

export default function LabPage() {
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid;

  /* ---------- state ---------- */
  const [searchTerm, setSearchTerm] = useState('');
  const [slot1, setSlot1] = useState<LabElement | null>(null);
  const [slot2, setSlot2] = useState<LabElement | null>(null);
  const [result, setResult] = useState<LabElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabElement | null>(null);
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  const importRef = useRef<HTMLInputElement>(null);
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  /* ---------- filtered elements ---------- */
  const filteredElements = searchTerm
    ? initialElements.filter(
        (el) =>
          el.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          el.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          el.type.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : initialElements;

  /* ---------- toast helper ---------- */
  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* ---------- load discoveries on auth ---------- */
  useEffect(() => {
    if (!uid) {
      setDiscoveries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadDiscoveries(uid).then((data) => {
      if (!cancelled) {
        setDiscoveries(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  /* ---------- periodic backup ---------- */
  useEffect(() => {
    if (!uid) return;
    backupIntervalRef.current = setInterval(() => {
      if (discoveries.length > 0) {
        createLocalBackup(uid, discoveries);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(backupIntervalRef.current);
  }, [uid, discoveries]);

  /* ---------- drag handlers ---------- */
  const handleDragStart = useCallback(
    (e: React.DragEvent, element: LabElement) => {
      e.dataTransfer.setData('application/json', JSON.stringify(element));
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add(styles.dragOver);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove(styles.dragOver);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, slotSetter: (el: LabElement) => void) => {
      e.preventDefault();
      e.currentTarget.classList.remove(styles.dragOver);
      try {
        const data = e.dataTransfer.getData('application/json');
        if (data) {
          const element = JSON.parse(data) as LabElement;
          slotSetter(element);
        }
      } catch {
        // ignore invalid drop
      }
    },
    [],
  );

  /* ---------- click-to-place ---------- */
  const handleElementClick = useCallback(
    (element: LabElement) => {
      if (selectedElement?.symbol === element.symbol) {
        setSelectedElement(null);
        return;
      }
      setSelectedElement(element);
    },
    [selectedElement],
  );

  const handleSlotClick = useCallback(
    (slotSetter: (el: LabElement | null) => void, currentSlot: LabElement | null) => {
      if (selectedElement) {
        slotSetter(selectedElement);
        setSelectedElement(null);
      } else if (currentSlot) {
        slotSetter(null);
      }
    },
    [selectedElement],
  );

  /* ---------- combine ---------- */
  const handleCombine = useCallback(async () => {
    if (!slot1 || !slot2) {
      showToast('Please place elements in both slots', true);
      return;
    }

    const combinedResult = attemptCombination(slot1, slot2);
    setResult(combinedResult);
    setSlot1(null);
    setSlot2(null);

    showToast(`Successfully created ${combinedResult.name}!`);

    // Check if already discovered
    if (discoveries.some((d) => d.symbol === combinedResult.symbol)) {
      return;
    }

    // Add discovery
    if (uid) {
      setSaving(true);
      const updated = await addDiscoveryToDb(uid, discoveries, {
        symbol: combinedResult.symbol,
        name: combinedResult.name,
        color: combinedResult.color,
        type: combinedResult.type,
      });
      setDiscoveries(updated);
      setSaving(false);
    } else {
      // Local-only discovery
      const entry: Discovery = {
        symbol: combinedResult.symbol,
        name: combinedResult.name,
        color: combinedResult.color,
        type: combinedResult.type,
        dateDiscovered: new Date().toISOString(),
      };
      setDiscoveries((prev) => [...prev, entry]);
    }
  }, [slot1, slot2, discoveries, uid, showToast]);

  /* ---------- export ---------- */
  const handleExport = useCallback(() => {
    if (!discoveries.length) {
      showToast('No discoveries to export', true);
      return;
    }
    exportDiscoveries(discoveries, uid);
    showToast('Discoveries exported');
  }, [discoveries, uid, showToast]);

  /* ---------- import ---------- */
  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const imported = await importDiscoveriesFromFile(file);
        if (!imported.length) {
          showToast('No valid discoveries found in file', true);
          return;
        }

        const merged = mergeDiscoveries(discoveries, imported);
        setDiscoveries(merged);

        if (uid) {
          await saveDiscoveries(uid, merged);
        }

        showToast(`Imported ${imported.length} discoveries`);
      } catch {
        showToast('Import failed', true);
      }

      // Reset input
      if (importRef.current) importRef.current.value = '';
    },
    [discoveries, uid, showToast],
  );

  /* ---------- discovery click → slot ---------- */
  const handleDiscoveryClick = useCallback(
    (disc: Discovery) => {
      const el: LabElement = {
        symbol: disc.symbol,
        name: disc.name,
        color: disc.color || '#cccccc',
        type: disc.type || 'compound',
      };
      handleElementClick(el);
    },
    [handleElementClick],
  );

  const handleDiscoveryDragStart = useCallback(
    (e: React.DragEvent, disc: Discovery) => {
      const el: LabElement = {
        symbol: disc.symbol,
        name: disc.name,
        color: disc.color || '#cccccc',
        type: disc.type || 'compound',
      };
      e.dataTransfer.setData('application/json', JSON.stringify(el));
    },
    [],
  );

  /* ---------- render helpers ---------- */
  const renderElementCard = (el: LabElement, isSelected: boolean) => (
    <div
      key={el.symbol}
      className={`${styles.element} ${isSelected ? styles.selected : ''}`}
      style={{ backgroundColor: el.color }}
      draggable
      onDragStart={(e) => handleDragStart(e, el)}
      onClick={() => handleElementClick(el)}
    >
      <span className={styles.elementSymbol}>{el.symbol}</span>
      <span className={styles.elementName}>{el.name}</span>
    </div>
  );

  const renderSlotContent = (slotEl: LabElement | null, label: string) => {
    if (slotEl) {
      return (
        <div className={styles.slotElement} style={{ backgroundColor: slotEl.color }}>
          <span className={styles.slotSymbol}>{slotEl.symbol}</span>
          <span className={styles.slotName}>{slotEl.name}</span>
        </div>
      );
    }
    return <div className={styles.slotLabel}>{label}</div>;
  };

  /* ---------- render ---------- */
  return (
    <div className={styles.labInterface}>
      {/* ---- Elements Panel ---- */}
      <div className={styles.elementsPanel}>
        <h3>Elements</h3>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.elementGrid}>
          {filteredElements.map((el) =>
            renderElementCard(el, selectedElement?.symbol === el.symbol),
          )}
        </div>
      </div>

      {/* ---- Crafting Area ---- */}
      <div className={styles.craftingArea}>
        <div className={styles.craftingSlots}>
          <div
            className={styles.craftingSlot}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, setSlot1)}
            onClick={() => handleSlotClick(setSlot1, slot1)}
          >
            {renderSlotContent(slot1, 'Drop First Element')}
          </div>
          <div className={styles.plusSign}>+</div>
          <div
            className={styles.craftingSlot}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, setSlot2)}
            onClick={() => handleSlotClick(setSlot2, slot2)}
          >
            {renderSlotContent(slot2, 'Drop Second Element')}
          </div>
        </div>

        <button
          className={styles.combineBtn}
          disabled={!slot1 || !slot2}
          onClick={handleCombine}
        >
          Combine Elements
        </button>

        <div className={styles.resultArea}>
          <div className={styles.resultSlot}>
            {result ? (
              <div className={styles.slotElement} style={{ backgroundColor: result.color }}>
                <span className={styles.slotSymbol}>{result.symbol}</span>
                <span className={styles.slotName}>{result.name}</span>
              </div>
            ) : (
              <div className={styles.slotLabel}>Result will appear here</div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Discoveries Panel ---- */}
      <div className={styles.discoveriesPanel}>
        <h3>
          Your Discoveries
          {saving && <span className={styles.savingIndicator}>Saving...</span>}
        </h3>

        {loading ? (
          <div className={styles.loadingText}>Loading discoveries...</div>
        ) : discoveries.length === 0 ? (
          <div className={styles.emptyText}>
            No discoveries yet. Combine elements to create compounds!
          </div>
        ) : (
          <div className={styles.discoveriesList}>
            {discoveries.map((d) => (
              <div
                key={d.symbol}
                className={styles.discoveryItem}
                draggable
                onDragStart={(e) => handleDiscoveryDragStart(e, d)}
                onClick={() => handleDiscoveryClick(d)}
              >
                <span className={styles.discoverySymbol}>{d.symbol}</span>
                <span className={styles.discoveryName}>{d.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Export / Import controls */}
        <div className={styles.discoveriesControls}>
          <button
            className={styles.iconBtn}
            onClick={handleExport}
            title="Export discoveries"
            aria-label="Export discoveries"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 7l4-4 4 4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 21H3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className={styles.importInput}
            onChange={handleImport}
          />
          <label
            className={styles.iconBtn}
            htmlFor=""
            onClick={() => importRef.current?.click()}
            title="Import discoveries"
            aria-label="Import discoveries"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 21V9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M16 13l-4 4-4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 21H3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </label>
        </div>
      </div>

      {/* ---- Toast ---- */}
      {toast && (
        <div className={styles.toastContainer}>
          <div className={`${styles.toast} ${toast.error ? styles.toastError : ''}`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
