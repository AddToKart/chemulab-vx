'use client';

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import {
  initialElements,
  attemptCombination,
  type LabElement,
} from '@/lib/data/lab-elements';
import { elementsData } from '@/lib/data/elements-data';
import type { Discovery } from '@/lib/firebase/discoveries';
import { useLabDiscoveries } from '@/lib/hooks/use-lab-discoveries';

const ELEMENT_DETAILS_BY_SYMBOL = new Map(
  elementsData.map((element) => [element.symbol, element]),
);

export default function LabPage() {
  const user = useAuthStore((s) => s.user);
  const uid = user?.uid;
  const {
    discoveries,
    loading,
    saving,
    addDiscovery,
    exportDiscoveries,
    importDiscoveries,
  } = useLabDiscoveries(uid);

  /* ---------- helpers ---------- */
  const getElementExtraData = (symbol: string) => {
    return ELEMENT_DETAILS_BY_SYMBOL.get(symbol);
  };

  /* ---------- state ---------- */
  const [searchTerm, setSearchTerm] = useState('');
  const [chamberElements, setChamberElements] = useState<LabElement[]>([]);
  const [result, setResult] = useState<LabElement | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabElement | null>(null);
  const [mobileSection, setMobileSection] = useState<'lab' | 'elements' | 'inventory'>('lab');
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);

  const importRef = useRef<HTMLInputElement>(null);

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

  /* ---------- chamber helpers ---------- */
  const addToChamber = useCallback((element: LabElement) => {
    setChamberElements((prev) => [...prev, element]);
  }, []);

  const removeFromChamber = useCallback((index: number) => {
    setChamberElements((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearChamber = useCallback(() => {
    setChamberElements([]);
  }, []);

  /* ---------- text-to-speech ---------- */
  const speakElementName = useCallback((name: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(name);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, []);

  /* ---------- grouped chamber elements for display ---------- */
  const chamberGroups = chamberElements.reduce<
    { element: LabElement; count: number; indices: number[] }[]
  >((acc, el, idx) => {
    const existing = acc.find((g) => g.element.symbol === el.symbol);
    if (existing) {
      existing.count += 1;
      existing.indices.push(idx);
    } else {
      acc.push({ element: el, count: 1, indices: [idx] });
    }
    return acc;
  }, []);

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

  const handleDropToChamber = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove('lab-slot-drag-over');
      try {
        const data = e.dataTransfer.getData('application/json');
        if (data) {
          const element = JSON.parse(data) as LabElement;
          addToChamber(element);
        }
      } catch {
        // ignore invalid drop
      }
    },
    [addToChamber],
  );

  /* ---------- click-to-place ---------- */
  const handleElementClick = useCallback(
    (element: LabElement) => {
      if (selectedElement?.symbol === element.symbol) {
        setSelectedElement(null);
        return;
      }
      setSelectedElement(element);
      setMobileSection('lab');
    },
    [selectedElement],
  );

  const handleChamberClick = useCallback(() => {
    if (selectedElement) {
      addToChamber(selectedElement);
      setSelectedElement(null);
    }
  }, [selectedElement, addToChamber]);

  /* ---------- combine ---------- */
  const handleCombine = useCallback(async () => {
    if (chamberElements.length === 0) {
      showToast('Add elements to the reaction chamber first!', true);
      return;
    }

    const result = attemptCombination(chamberElements);
    if (result.kind === 'partial') {
      showToast(result.hint, true);
      return;
    }
    if (result.kind === 'none') {
      showToast('No known reaction for this combination of elements.', true);
      return;
    }
    const combinedResult = result.product;
    setResult(combinedResult);
    setChamberElements([]);

    showToast(`Successfully created ${combinedResult.name}!`);

    // Check if already discovered
    if (discoveries.some((d) => d.symbol === combinedResult.symbol)) {
      return;
    }

    // Add discovery
    await addDiscovery({
      symbol: combinedResult.symbol,
      name: combinedResult.name,
      color: combinedResult.color,
      type: combinedResult.type,
    });
  }, [chamberElements, discoveries, addDiscovery, showToast]);

  /* ---------- export ---------- */
  const handleExport = useCallback(() => {
    if (!discoveries.length) {
      showToast('No discoveries to export', true);
      return;
    }
    exportDiscoveries();
    showToast('Discoveries exported');
  }, [discoveries.length, exportDiscoveries, showToast]);

  /* ---------- import ---------- */
  const handleImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const { imported } = await importDiscoveries(file);
        if (!imported.length) {
          showToast('No valid discoveries found in file', true);
          return;
        }

        showToast(`Imported ${imported.length} discoveries`);
      } catch {
        showToast('Import failed', true);
      }

      // Reset input
      if (importRef.current) importRef.current.value = '';
    },
    [importDiscoveries, showToast],
  );

  /* ---------- discovery click → chamber ---------- */
  const handleDiscoveryClick = useCallback(
    (disc: Discovery) => {
      const el: LabElement = {
        symbol: disc.symbol,
        name: disc.name,
        color: disc.color || '#cccccc',
        type: disc.type || 'compound',
      };
      handleElementClick(el);
      setMobileSection('lab');
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
  const renderElementCard = (el: LabElement, isSelected: boolean) => {
    const extra = getElementExtraData(el.symbol);

    return (
      <div
        key={el.symbol}
        className={cn(
          'group relative flex min-h-[104px] cursor-pointer select-none rounded-2xl border px-4 py-3 text-left transition-all duration-200',
          'shadow-sm hover:-translate-y-0.5 hover:shadow-md',
          isSelected
            ? 'border-emerald-500 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-background'
            : 'border-white/10',
        )}
        style={{ backgroundColor: el.color }}
        draggable
        onDragStart={(e) => handleDragStart(e, el)}
        onClick={() => handleElementClick(el)}
        title={`${el.name} (${el.symbol})`}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/18 via-transparent to-black/10" />
        <div className="relative flex w-full items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border border-white/15 bg-black/10 text-white shadow-inner">
            <span className="text-[10px] font-bold leading-none opacity-70">
              {extra?.atomic_number ?? '--'}
            </span>
            <span className="mt-1 text-2xl font-black leading-none tracking-tight">
              {el.symbol}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-white/95 break-words">
                    {el.name}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakElementName(el.name);
                    }}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-black/20 text-white/60 hover:bg-white/25 hover:text-white transition-all cursor-pointer hover:scale-110 active:scale-90"
                    aria-label={`Pronounce ${el.name}`}
                    title={`Hear pronunciation`}
                    draggable={false}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M11 5L6 9H2v6h4l5 4V5z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65 break-words">
                  {extra?.category?.replace(/-/g, ' ') ?? el.type}
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
                Drag
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] font-medium text-white/70">
                Tap to place
              </span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
                <div className="h-full w-2/3 rounded-full bg-white/60 transition-all duration-200 group-hover:w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ---------- render ---------- */
  return (
    <div className="flex gap-8 h-[calc(100vh-130px)] max-[1180px]:flex-col max-[1180px]:h-auto pb-6">
      <div className="hidden max-[1180px]:sticky max-[1180px]:top-20 max-[1180px]:z-20 max-[1180px]:block">
        <div className="glass-panel p-2">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'elements', label: 'Elements' },
              { id: 'lab', label: 'Lab' },
              { id: 'inventory', label: 'Inventory' },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setMobileSection(section.id as 'lab' | 'elements' | 'inventory')}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-[0.14em] transition-colors',
                  mobileSection === section.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-black/5 text-[var(--text-light)] hover:bg-emerald-500/10 hover:text-emerald-600 dark:bg-white/5 dark:hover:text-emerald-400',
                )}
                aria-pressed={mobileSection === section.id}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Elements Panel ---- */}
      <div
        className={cn(
          'w-[420px] flex flex-col gap-5 glass-panel p-6 shadow-xl flex-shrink-0 animate-in slide-in-from-left-5 duration-500',
          'max-[1180px]:w-full max-[1180px]:order-2 max-[1180px]:max-h-[520px]',
          mobileSection === 'elements' ? 'max-[1180px]:flex' : 'max-[1180px]:hidden',
          'min-[1181px]:flex',
        )}
      >
        <div className="space-y-1.5">
          <h3 className="font-bold text-[var(--text-main)] text-xl tracking-tight">Chemical Elements</h3>
          <p className="text-sm text-[var(--text-light)] font-medium">
            Drag or tap elements to add them to the reaction chamber.
          </p>
        </div>

        <div className="relative group">
          <input
            type="text"
            placeholder="Search by name, symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm text-[var(--text-main)] placeholder:text-[var(--text-light)]/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-inner"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2">
          {filteredElements.map((el) =>
            renderElementCard(el, selectedElement?.symbol === el.symbol),
          )}
        </div>
      </div>

      {/* ---- Crafting Area ---- */}
      <div
        className={cn(
          'flex-1 flex flex-col items-center justify-between glass-panel p-10 max-[640px]:p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-700 group/craft',
          'max-[1180px]:order-1',
          mobileSection === 'lab' ? 'max-[1180px]:flex' : 'max-[1180px]:hidden',
          'min-[1181px]:flex',
        )}
      >
        <div className="absolute inset-0 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.05] pointer-events-none" />

        <div className="relative z-10 w-full flex flex-col items-center gap-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tighter text-[var(--text-main)] uppercase">The Laboratory</h2>
            <div className="h-1 w-12 bg-emerald-500 mx-auto rounded-full" />
            <p className="mx-auto max-w-xl text-sm text-[var(--text-light)]">
              Drag elements into the reaction chamber. Add the exact quantities needed for the reaction.
            </p>
          </div>

          {/* ─── Single Reaction Chamber ─── */}
          <div
            className={cn(
              'group w-full max-w-lg min-h-[200px] flex flex-col border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-200 bg-black/5 dark:bg-white/5 shadow-inner',
              chamberElements.length > 0
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-white/20 hover:border-emerald-500/50 hover:bg-emerald-500/5',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropToChamber}
            onClick={handleChamberClick}
          >
            {chamberElements.length === 0 ? (
              /* ── Empty state ── */
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-muted-foreground/50 group-hover:text-emerald-500/70 transition-colors duration-200 p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-current">
                  <span className="text-3xl font-light">+</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Reaction Chamber</span>
                <span className="max-w-[16rem] text-[11px] font-medium normal-case tracking-normal opacity-70">
                  Drag elements here or tap a card first, then tap this area. Add as many as you need!
                </span>
              </div>
            ) : (
              /* ── Filled state — element pills ── */
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500">
                    Reaction Chamber — {chamberElements.length} element{chamberElements.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearChamber();
                    }}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {chamberGroups.map((group) => (
                    <div
                      key={group.element.symbol}
                      className="group/pill relative flex items-center gap-2 rounded-2xl border border-white/15 px-3.5 py-2.5 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl animate-in zoom-in-75 duration-300"
                      style={{ backgroundColor: group.element.color }}
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-black/10 pointer-events-none" />
                      <span className="relative text-lg font-black text-white drop-shadow-md tracking-tight">
                        {group.element.symbol}
                      </span>
                      {group.count > 1 && (
                        <span className="relative text-xs font-bold text-white/80 bg-black/20 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          ×{group.count}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Remove the last instance of this element
                          const lastIndex = group.indices[group.indices.length - 1];
                          removeFromChamber(lastIndex);
                        }}
                        className="relative flex h-5 w-5 items-center justify-center rounded-full bg-black/25 text-white/70 hover:bg-red-500/80 hover:text-white transition-all opacity-0 group-hover/pill:opacity-100 cursor-pointer"
                        title={`Remove one ${group.element.name}`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className="group relative overflow-hidden bg-[var(--accent-gradient)] text-white font-black uppercase tracking-widest px-12 py-4 rounded-2xl text-sm cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)]"
            disabled={chamberElements.length === 0}
            onClick={handleCombine}
          >
            <span className="relative z-10">Combine & Discover</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>

        <div className="relative z-10 w-full mt-8 flex flex-col items-center gap-4">
          <div className="w-px h-12 bg-gradient-to-b from-emerald-500/50 to-transparent" />
          <div className={`w-48 h-48 max-[600px]:w-36 max-[600px]:h-36 flex flex-col text-center items-center justify-center border-2 border-dashed border-white/10 rounded-3xl transition-all duration-700 bg-black/5 dark:bg-white/5 ${result ? 'scale-110 shadow-2xl border-emerald-500/30' : 'opacity-50'}`}>
            {result ? (
              <div className="group relative w-full h-full flex flex-col items-center justify-center rounded-3xl text-white p-6 shadow-2xl overflow-hidden animate-in zoom-in-75 duration-500" style={{ backgroundColor: result.color }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent)]" />
                <span className="relative font-black text-6xl leading-none tracking-tighter drop-shadow-2xl">{result.symbol}</span>
                <span className="relative text-sm font-black uppercase tracking-[0.2em] mt-4 drop-shadow-md">{result.name}</span>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-white/20 blur-2xl rounded-full animate-pulse" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground/30 px-6">
                <svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86 7.717l.477 2.387c.124.621.547 1.022.547 1.022m3.86-7.717l2.387.477c.621.124 1.022.547 1.022.547l-3.86 7.717z" />
                </svg>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Discovery Awaits</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Discoveries Panel ---- */}
      <div
        className={cn(
          'w-[320px] flex flex-col gap-5 glass-panel p-6 shadow-xl flex-shrink-0 animate-in slide-in-from-right-5 duration-500',
          'max-[1180px]:w-full max-[1180px]:order-3 max-[1180px]:min-h-[400px]',
          mobileSection === 'inventory' ? 'max-[1180px]:flex' : 'max-[1180px]:hidden',
          'min-[1181px]:flex',
        )}
      >
        <div className="space-y-1">
          <h3 className="font-bold text-[var(--text-main)] text-xl tracking-tight flex items-center justify-between">
            Inventory
            {saving && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold animate-pulse">Syncing</span>}
          </h3>
          <p className="text-xs text-[var(--text-light)] font-medium">{discoveries.length} Compounds Found</p>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground/40">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
          </div>
        ) : discoveries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-4 opacity-40">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <span className="text-2xl font-light">?</span>
            </div>
            <p className="text-[11px] font-bold uppercase leading-relaxed tracking-widest">
              Your collection is empty
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-2 custom-scrollbar">
            {discoveries.map((d) => (
              <div
                key={d.symbol}
                className="group relative flex items-center gap-4 p-3 bg-black/5 dark:bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all shadow-sm overflow-hidden"
                draggable
                onDragStart={(e) => handleDiscoveryDragStart(e, d)}
                onClick={() => handleDiscoveryClick(d)}
              >
                <div
                  className="w-10 h-10 flex flex-col items-center justify-center rounded-lg font-black text-white text-[10px] flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: d.color || '#10b981' }}
                >
                  {d.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-main)] text-[13px] font-bold truncate group-hover:text-emerald-500 transition-colors">{d.name}</p>
                  <p className="text-[10px] text-[var(--text-light)] font-medium uppercase tracking-tighter opacity-60">{d.type || 'Compound'}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Export / Import controls */}
        <div className="flex gap-3 mt-auto pt-5 border-t border-white/10">
          <button
            className="flex-1 h-11 flex items-center justify-center gap-2 bg-black/10 dark:bg-white/10 border border-white/10 rounded-xl text-[var(--text-main)] hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 transition-all cursor-pointer shadow-sm group"
            onClick={handleExport}
            title="Export Lab Data"
          >
            <svg className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 9l-4-4-4 4M12 5v13" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Export</span>
          </button>

          <input
            ref={importRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
          <button
            className="flex-1 h-11 flex items-center justify-center gap-2 bg-black/10 dark:bg-white/10 border border-white/10 rounded-xl text-[var(--text-main)] hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 transition-all cursor-pointer shadow-sm group"
            onClick={() => importRef.current?.click()}
            title="Import Lab Data"
          >
            <svg className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 13l-4 4-4-4m4-4H8" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Import</span>
          </button>
        </div>
      </div>

      {/* ---- Toast (portalled to body to escape overflow-x-hidden stacking context) ---- */}
      {toast && createPortal(
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-5 fade-in w-max max-w-[calc(100vw-4rem)]">
          <div className={cn(
            "glass-panel border-emerald-500/30 px-8 py-4 font-bold shadow-2xl text-center text-sm tracking-tight text-[var(--text-main)]",
            toast.error && "border-red-500/30 text-red-500"
          )}>
            <div className="flex items-center gap-3">
              {!toast.error && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
              {toast.message}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
