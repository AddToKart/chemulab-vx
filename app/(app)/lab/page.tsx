'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
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
    e.currentTarget.classList.add('lab-slot-drag-over');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('lab-slot-drag-over');
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, slotSetter: (el: LabElement) => void) => {
      e.preventDefault();
      e.currentTarget.classList.remove('lab-slot-drag-over');
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

    const result = attemptCombination(slot1, slot2);
    if (result.kind === 'invalid') {
      showToast(result.reason, true);
      return;
    }
    if (result.kind === 'none') {
      showToast('No reaction between these elements.', true);
      return;
    }
    const combinedResult = result.product;
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
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg cursor-pointer select-none transition-all duration-200 hover:scale-105 hover:brightness-110 text-white text-center shadow-sm${isSelected ? ' ring-2 ring-primary ring-offset-2 scale-105' : ''}`}
      style={{ backgroundColor: el.color }}
      draggable
      onDragStart={(e) => handleDragStart(e, el)}
      onClick={() => handleElementClick(el)}
    >
      <span className="font-bold text-base leading-none">{el.symbol}</span>
      <span className="text-[0.55rem] leading-none opacity-90 truncate w-full text-center">{el.name}</span>
    </div>
  );

  const renderSlotContent = (slotEl: LabElement | null, label: string) => {
    if (slotEl) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center rounded-lg text-white p-2 shadow-sm" style={{ backgroundColor: slotEl.color }}>
          <span className="font-extrabold text-3xl leading-none tracking-tight">{slotEl.symbol}</span>
          <span className="text-sm font-medium leading-none mt-2 opacity-95">{slotEl.name}</span>
        </div>
      );
    }
    return <div className="text-muted-foreground text-sm font-medium text-center">{label}</div>;
  };

  /* ---------- render ---------- */
  return (
    <div className="flex gap-6 h-[calc(100vh-130px)] max-[900px]:flex-col max-[900px]:h-auto">
      {/* ---- Elements Panel ---- */}
      <div className="w-[280px] max-[900px]:w-full max-[900px]:order-2 max-[900px]:max-h-[350px] flex flex-col gap-4 bg-card border border-border rounded-xl p-5 shadow-sm overflow-hidden flex-shrink-0">
        <h3 className="font-semibold text-foreground text-lg tracking-tight">Elements</h3>
        <input
          type="text"
          placeholder="Search elements..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-background border border-input rounded-md px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors shadow-sm"
        />
        <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-1">
          {filteredElements.map((el) =>
            renderElementCard(el, selectedElement?.symbol === el.symbol),
          )}
        </div>
      </div>

      {/* ---- Crafting Area ---- */}
      <div className="flex-1 max-[900px]:order-1 flex flex-col items-center justify-center gap-10 bg-card border border-border rounded-xl p-8 shadow-sm">
        <div className="flex items-center gap-6 max-[500px]:gap-3 w-full justify-center">
          <div
            className="w-36 h-36 max-[500px]:w-28 max-[500px]:h-28 flex flex-col text-center items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary hover:bg-muted/50 bg-background"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, setSlot1)}
            onClick={() => handleSlotClick(setSlot1, slot1)}
          >
            {renderSlotContent(slot1, 'Drop or tap to place')}
          </div>
          <div className="text-4xl max-[500px]:text-3xl font-light text-muted-foreground">+</div>
          <div
            className="w-36 h-36 max-[500px]:w-28 max-[500px]:h-28 flex flex-col text-center items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary hover:bg-muted/50 bg-background"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, setSlot2)}
            onClick={() => handleSlotClick(setSlot2, slot2)}
          >
            {renderSlotContent(slot2, 'Drop or tap to place')}
          </div>
        </div>

        <button
          className="bg-primary text-primary-foreground font-semibold px-10 py-3.5 max-[500px]:px-6 max-[500px]:py-3 rounded-lg text-base cursor-pointer transition-all duration-200 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
          disabled={!slot1 || !slot2}
          onClick={handleCombine}
        >
          Combine Elements
        </button>

        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-40 h-40 max-[500px]:w-32 max-[500px]:h-32 flex flex-col text-center items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary hover:bg-muted/50 bg-background">
            {result ? (
              <div className="w-full h-full flex flex-col items-center justify-center rounded-lg text-white p-2 shadow-sm" style={{ backgroundColor: result.color }}>
                <span className="font-extrabold text-3xl leading-none tracking-tight">{result.symbol}</span>
                <span className="text-sm font-medium leading-none mt-2 opacity-95">{result.name}</span>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm font-medium text-center">Result will appear here</div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Discoveries Panel ---- */}
      <div className="w-[280px] max-[900px]:w-full max-[900px]:order-3 max-[900px]:min-h-[300px] flex flex-col gap-3 bg-card border border-border rounded-xl p-5 shadow-sm overflow-hidden flex-shrink-0">
        <h3 className="font-semibold text-foreground text-lg tracking-tight flex items-center justify-between">
          Your Discoveries
          {saving && <span className="text-xs text-muted-foreground font-normal animate-pulse">Saving...</span>}
        </h3>

        {loading ? (
          <div className="text-muted-foreground text-sm text-center py-6">Loading discoveries...</div>
        ) : discoveries.length === 0 ? (
          <div className="text-muted-foreground text-sm text-center py-6">
            No discoveries yet. Combine elements to create compounds!
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
            {discoveries.map((d) => (
              <div
                key={d.symbol}
                className="flex items-center gap-3 p-2.5 bg-background border border-border rounded-md cursor-pointer hover:border-primary hover:bg-muted/50 transition-all shadow-sm group"
                draggable
                onDragStart={(e) => handleDiscoveryDragStart(e, d)}
                onClick={() => handleDiscoveryClick(d)}
              >
                <span className="w-8 h-8 flex items-center justify-center bg-muted rounded font-bold text-foreground text-xs flex-shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">{d.symbol}</span>
                <span className="text-foreground text-sm font-medium truncate">{d.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Export / Import controls */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-border">
          <button
            className="w-9 h-9 flex items-center justify-center bg-background border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-primary hover:bg-muted transition-all cursor-pointer shadow-sm"
            onClick={handleExport}
            title="Export discoveries"
            aria-label="Export discoveries"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            className="hidden"
            onChange={handleImport}
          />
          <label
            className="w-9 h-9 flex items-center justify-center bg-background border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-primary hover:bg-muted transition-all cursor-pointer shadow-sm"
            htmlFor=""
            onClick={() => importRef.current?.click()}
            title="Import discoveries"
            aria-label="Import discoveries"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

      {/* ---- Toast (portalled to body to escape overflow-x-hidden stacking context) ---- */}
      {toast && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-5 fade-in w-max max-w-[calc(100vw-2rem)]">
          <div className={cn(
            "bg-foreground text-background rounded-md px-5 py-3 font-medium shadow-lg text-center text-sm leading-snug",
            toast.error && "bg-destructive text-destructive-foreground"
          )}>
            {toast.message}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
