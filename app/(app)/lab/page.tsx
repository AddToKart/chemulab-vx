'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import { useIdle } from '@/lib/hooks/use-idle';
import Image from 'next/image';
import { NotebookModal } from '@/components/lab/NotebookModal';


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

  /* ---------- refs ---------- */
  const importRef = useRef<HTMLInputElement>(null);
  const chamberRef = useRef<HTMLDivElement>(null);

  /* ---------- state ---------- */
  const [searchTerm, setSearchTerm] = useState('');
  const [chamberElements, setChamberElements] = useState<LabElement[]>([]);
  const [result, setResult] = useState<LabElement | null>(null);
  const [successReaction, setSuccessReaction] = useState<{
    product: LabElement;
    reactionType: string;
  } | null>(null);
  const [selectedElement, setSelectedElement] = useState<LabElement | null>(null);
  const [mobileSection, setMobileSection] = useState<'lab' | 'inventory'>('lab');
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [notebookModalOpen, setNotebookModalOpen] = useState(false);
  
  // Hint system state
  const isIdle = useIdle(10000); // 10 seconds
  const [hintDismissed, setHintDismissed] = useState(false);
  const [chamberCoords, setChamberCoords] = useState({ top: 0, left: 0, width: 0 });

  /* ---------- derived state ---------- */
  const showHint = !loading && chamberElements.length === 0 && !hintDismissed && isIdle;

  /* ---------- callbacks ---------- */
  const updateCoords = useCallback(() => {
    if (chamberRef.current) {
      const rect = chamberRef.current.getBoundingClientRect();
      setChamberCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  /* ---------- effects ---------- */
  // Update coords for portal positioning
  useEffect(() => {
    if (showHint) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [showHint, updateCoords]);

  /* ---------- helpers ---------- */
  const getElementExtraData = (symbol: string) => {
    return ELEMENT_DETAILS_BY_SYMBOL.get(symbol);
  };

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

  const closeSuccessModal = useCallback(() => {
    setSuccessReaction(null);
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

    const combination = attemptCombination(chamberElements);
    if (combination.kind === 'invalid_missing') {
      showToast(combination.message, true);
      return;
    }
    if (combination.kind === 'invalid_extra') {
      showToast(combination.message, true);
      return;
    }
    if (combination.kind === 'invalid_unknown') {
      showToast(combination.message, true);
      return;
    }

    const combinedResult = combination.product;
    setResult(combinedResult);
    setSuccessReaction({
      product: combinedResult,
      reactionType: combination.reactionType,
    });
    setChamberElements([]);

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

  useEffect(() => {
    if (!successReaction) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSuccessReaction(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [successReaction]);

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
          'group relative flex min-h-[72px] xl:min-h-[104px] cursor-pointer select-none rounded-xl xl:rounded-2xl border px-3 py-2 xl:px-4 xl:py-3 text-left transition-all duration-200',
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
        <div className="absolute inset-0 rounded-xl xl:rounded-2xl bg-gradient-to-br from-white/18 via-transparent to-black/10" />
        <div className="relative flex w-full items-center xl:items-start gap-3 xl:gap-4">
          <div className="flex h-12 w-12 xl:h-16 xl:w-16 shrink-0 flex-col items-center justify-center rounded-lg xl:rounded-xl border border-white/15 bg-black/10 text-white shadow-inner">
            <span className="text-[8px] xl:text-[10px] font-bold leading-none opacity-70">
              {extra?.atomic_number ?? '--'}
            </span>
            <span className="mt-0.5 xl:mt-1 text-xl xl:text-2xl font-black leading-none tracking-tight">
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
              <span className="hidden xl:inline-block rounded-full border border-white/15 bg-black/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75">
                Drag
              </span>
            </div>

            <div className="mt-1 xl:mt-3 flex items-center justify-between gap-3 max-xl:hidden">
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
    <div className="flex flex-col gap-2 pb-2 h-[calc(100dvh-7rem)] xl:gap-5 xl:pb-6 xl:h-[calc(100dvh-10rem)] xl:flex-row max-xl:overflow-hidden">
      <div className="flex-none w-full z-30 block xl:hidden">
        <div className="glass-panel p-2 bg-white/90 dark:bg-[#0a0f1c]/90 backdrop-blur-2xl border-b border-white/5 shadow-md">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'lab', label: 'Lab Workspace' },
              { id: 'inventory', label: 'Inventory' },
            ].map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setMobileSection(section.id as 'lab' | 'inventory')}
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
          'flex w-full flex-col gap-3 glass-panel p-3 shadow-xl animate-in slide-in-from-left-5 duration-500 xl:gap-5 xl:p-5 sm:p-6 xl:w-[min(24rem,26vw)] xl:min-w-[20rem] xl:max-w-[26rem]',
          'max-xl:flex-1 max-xl:min-h-0',
          mobileSection === 'lab' ? 'max-xl:flex order-2' : 'max-xl:hidden',
          'xl:flex xl:order-1',
        )}
      >
        <div className="space-y-1 xl:space-y-1.5">
          <h3 className="font-bold text-[var(--text-main)] text-lg xl:text-xl tracking-tight">Chemical Elements</h3>
          <p className="hidden xl:block text-sm text-[var(--text-light)] font-medium">
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

        <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 xl:min-h-0">
          {filteredElements.map((el) =>
            renderElementCard(el, selectedElement?.symbol === el.symbol),
          )}
        </div>
      </div>

      {/* ---- Crafting Area ---- */}
      <div
        className={cn(
          'group/craft relative flex flex-1 flex-col items-center justify-start overflow-y-auto custom-scrollbar glass-panel p-3 shadow-2xl animate-in zoom-in-95 duration-700 xl:p-10 xl:min-h-0',
          mobileSection === 'lab' ? 'max-xl:flex order-1' : 'max-xl:hidden',
          'xl:flex xl:order-2',
        )}
      >
        <div className="absolute inset-0 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.05] pointer-events-none" />

        <div className="relative z-10 flex w-full flex-col items-center gap-3 xl:gap-8 sm:gap-10 max-xl:h-full max-xl:justify-center">
          <div className="text-center space-y-2 hidden xl:block">
            <h2 className="text-3xl font-black tracking-tighter text-[var(--text-main)] uppercase">The Laboratory</h2>
            <div className="h-1 w-12 bg-emerald-500 mx-auto rounded-full" />
            <p className="mx-auto max-w-xl text-sm text-[var(--text-light)]">
              Drag elements into the reaction chamber. Add the exact quantities needed for the reaction.
            </p>
          </div>

          {/* ─── Single Reaction Chamber (Beaker Style) ─── */}
          <div
            ref={chamberRef}
            className={cn(
              'group relative w-full max-w-[360px] min-h-[140px] xl:min-h-[300px] flex flex-col justify-end border-x-4 border-b-4 border-t-0 rounded-b-[2rem] xl:rounded-b-[3rem] cursor-pointer transition-all duration-300 shadow-2xl backdrop-blur-sm bg-gradient-to-b from-white/5 to-white/15 dark:from-white/5 dark:to-white/[0.05]',
              chamberElements.length > 0
                ? 'border-emerald-500/40'
                : 'border-white/20 hover:border-emerald-500/40',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropToChamber}
            onClick={handleChamberClick}
          >
            {/* Rim/Lip */}
            <div className={cn(
              "absolute -top-1.5 -left-[4px] -right-[4px] h-3 rounded-full border-2",
              chamberElements.length > 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/20 bg-white/5"
            )} />

            {chamberElements.length === 0 ? (
              /* ── Empty state ── */
              <div className="flex-1 w-full flex flex-col items-center justify-center gap-2 xl:gap-3 text-center text-muted-foreground/50 group-hover:text-emerald-500/70 transition-colors duration-200 p-4 xl:p-8">
                <div className="flex h-10 w-10 xl:h-16 xl:w-16 items-center justify-center rounded-full border-2 border-dashed border-current">
                  <span className="text-2xl xl:text-3xl font-light">+</span>
                </div>
                <span className="text-[10px] xl:text-xs font-bold uppercase tracking-[0.18em]">Reaction Chamber</span>
                <span className="hidden xl:block max-w-[16rem] text-[11px] font-medium normal-case tracking-normal opacity-70">
                  Drag elements here or tap a card first, then tap this area. Add as many as you need!
                </span>
                <span className="xl:hidden text-[9px] font-medium normal-case tracking-normal opacity-70">
                  Tap card, then tap here
                </span>
              </div>
            ) : (
              /* ── Filled state — element pills ── */
              <div className="w-full p-3 xl:p-5 flex flex-col gap-2 xl:gap-4 animate-in slide-in-from-bottom-4 duration-500">
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
            className="group relative w-full max-w-[22rem] overflow-hidden rounded-xl xl:rounded-2xl bg-[var(--accent-gradient)] px-4 py-3 xl:px-6 xl:py-4 text-xs xl:text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] active:scale-95 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-30 sm:px-12 cursor-pointer mt-2 xl:mt-0"
            disabled={chamberElements.length === 0}
            onClick={handleCombine}
          >
            <span className="relative z-10">Combine & Discover</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>

        <div className={cn("relative z-10 mt-3 xl:mt-8 flex w-full flex-col items-center gap-2 xl:gap-4", !result && "hidden xl:flex")}>
          <div className="w-px h-6 xl:h-12 bg-gradient-to-b from-emerald-500/50 to-transparent" />
          <div className={`flex h-24 w-24 xl:h-36 xl:w-36 flex-col items-center justify-center rounded-2xl xl:rounded-3xl border-2 border-dashed border-white/10 bg-black/5 text-center transition-all duration-700 dark:bg-white/5 sm:h-48 sm:w-48 ${result ? 'scale-110 border-emerald-500/30 shadow-2xl' : 'opacity-50'}`}>
            {result ? (
              <div className="group relative w-full h-full flex flex-col items-center justify-center rounded-2xl xl:rounded-3xl text-white p-2 xl:p-6 shadow-2xl overflow-hidden animate-in zoom-in-75 duration-500" style={{ backgroundColor: result.color }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent)]" />
                <span className="relative font-black text-4xl xl:text-6xl leading-none tracking-tighter drop-shadow-2xl">{result.symbol}</span>
                <span className="relative text-[9px] xl:text-sm font-black uppercase tracking-[0.2em] mt-2 xl:mt-4 drop-shadow-md truncate w-full px-1">{result.name}</span>
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
          'flex w-full flex-col gap-5 glass-panel p-5 shadow-xl animate-in slide-in-from-right-5 duration-500 sm:p-6 xl:order-3 xl:w-[min(20rem,24vw)] xl:min-w-[18rem]',
          'max-xl:min-h-[24rem]',
          mobileSection === 'inventory' ? 'max-xl:flex' : 'max-xl:hidden',
          'xl:flex',
        )}
      >
        <div className="space-y-1">
          <h3 className="flex flex-wrap items-center justify-between gap-2 text-xl font-bold tracking-tight text-[var(--text-main)]">
            Inventory
            {saving && <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold animate-pulse">Syncing</span>}
            <button
              type="button"
              onClick={() => setNotebookModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-white/10 rounded-full text-[11px] font-bold uppercase tracking-widest text-[var(--text-light)] hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 transition-all cursor-pointer"
              title="Open Lab Notebook"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Notebook
            </button>
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
        <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
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

      {/* ---- Popoy Hint Portal ---- */}
      {showHint && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: Math.max(140, chamberCoords.top - 80), // Keep it below the TopBar (80px) with some margin
            left: chamberCoords.left + chamberCoords.width / 2,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="relative group/hint pointer-events-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
            <div className="flex w-[min(22rem,calc(100vw-2rem))] items-center gap-4 rounded-2xl border-2 border-emerald-500/30 bg-white/95 px-4 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.3),0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-xl sm:w-auto sm:min-w-[340px] sm:px-5 dark:bg-slate-900/95">
              <div className="w-12 h-12 shrink-0 rounded-full overflow-hidden border-2 border-emerald-500/30 bg-emerald-500/10 shadow-lg">
                <Image 
                  src="/img/jepoy.png" 
                  alt="Popoy" 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em] leading-none">Popoy Assistant</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHintDismissed(true);
                    }}
                    className="h-6 w-6 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/10 hover:bg-red-500 hover:text-white transition-all cursor-pointer text-sm font-bold text-[var(--text-light)] shadow-sm"
                    aria-label="Dismiss hint"
                  >
                    &times;
                  </button>
                </div>
                <p className="text-[13px] font-bold text-[var(--text-main)] italic leading-snug">&quot;Try dragging elements into the reaction chamber!&quot;</p>
              </div>
            </div>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-white/95 dark:bg-slate-900/95 border-r-2 border-b-2 border-emerald-500/30 rotate-45" />
          </div>
        </div>,
        document.body
      )}

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

      {/* ---- Successful Reaction Modal ---- */}
      {successReaction && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeSuccessModal}
        >
          <div
            className="w-full max-w-md rounded-[28px] border border-emerald-500/25 bg-[var(--bg-card)] p-8 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-500">
                  Successful Combination
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-main)]">
                  {successReaction.product.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSuccessModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-[var(--text-light)] transition-colors hover:bg-red-500 hover:text-white dark:bg-white/10"
                aria-label="Close successful reaction modal"
              >
                &times;
              </button>
            </div>

            <div
              className="mt-6 rounded-3xl p-6 text-center text-white shadow-xl"
              style={{ backgroundColor: successReaction.product.color }}
            >
              <p className="text-5xl font-black leading-none tracking-tighter">
                {successReaction.product.symbol}
              </p>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.24em] text-white/80">
                New Reaction Result
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/5 p-4 dark:bg-white/5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-light)]">
                  Reaction Type
                </p>
                <p className="mt-2 text-lg font-bold text-[var(--text-main)]">
                  {successReaction.reactionType}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeSuccessModal}
                className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      <NotebookModal isOpen={notebookModalOpen} onClose={() => setNotebookModalOpen(false)} uid={uid} />
    </div>
  );
}
