'use client';

import Image from 'next/image';
import { useState, useCallback, useRef, useMemo } from 'react';
import {
  elementsData,
  mainGridPositions,
  lanthanideFBlock,
  actinideFBlock,
  type ElementData,
  type ElementCategory,
} from '@/lib/data/elements-data';
import { useBookmarks } from '@/lib/hooks/use-bookmarks';

export default function ElementsPage() {
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ElementCategory | 'all' | 'reactive-nonmetals'>('all');
  const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [bookmarkFilter, setBookmarkFilter] = useState<ElementCategory | 'all' | 'reactive-nonmetals'>('all');
  const [selectedBookmark, setSelectedBookmark] = useState<ElementData | null>(null);
  const [isElementImageVisible, setIsElementImageVisible] = useState(false);
  const [didElementImageFail, setDidElementImageFail] = useState(false);

  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks();

  const handleElementClick = useCallback((el: ElementData) => {
    setIsElementImageVisible(false);
    setDidElementImageFail(false);
    setSelectedElement(el);
  }, []);
  const closeModal = useCallback(() => {
    setIsElementImageVisible(false);
    setDidElementImageFail(false);
    setSelectedElement(null);
  }, []);
  const handleBookmarkClick = useCallback((el: ElementData) => setSelectedBookmark(el), []);
  const speakingRef = useRef(false);

  const speakElementName = useCallback((name: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(name);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.onstart = () => { speakingRef.current = true; };
    utterance.onend = () => { speakingRef.current = false; };
    utterance.onerror = () => { speakingRef.current = false; };
    window.speechSynthesis.speak(utterance);
  }, []);

  // Filter categories for display
  const filterCategories: (ElementCategory | 'all' | 'reactive-nonmetals')[] = [
    'all',
    'alkali',
    'alkaline-earth',
    'transition',
    'post-transition',
    'metalloid',
    'reactive-nonmetals',
    'noble-gas',
    'lanthanide',
    'actinide',
    'unknown',
  ];

  // Get display name for category
  const getCategoryDisplayName = (category: ElementCategory | 'all' | 'reactive-nonmetals'): string => {
    const names: Record<string, string> = {
      'all': 'All',
      'alkali': 'Alkali Metals',
      'alkaline-earth': 'Alkaline Earth',
      'transition': 'Transition Metals',
      'post-transition': 'Post-Transition',
      'metalloid': 'Metalloids',
      'reactive-nonmetals': 'Reactive Nonmetals',
      'noble-gas': 'Noble Gases',
      'lanthanide': 'Lanthanides',
      'actinide': 'Actinides',
      'unknown': 'Unknown',
    };
    return names[category] || category;
  };

  // Check if element matches current filter
  const isElementVisible = useCallback((el: ElementData): boolean => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'reactive-nonmetals') {
      return el.category === 'nonmetal' || el.category === 'halogen';
    }
    return el.category === selectedFilter;
  }, [selectedFilter]);

  // Check if element matches bookmark filter
  const isElementVisibleInBookmarks = useCallback((el: ElementData): boolean => {
    if (bookmarkFilter === 'all') return true;
    if (bookmarkFilter === 'reactive-nonmetals') {
      return el.category === 'nonmetal' || el.category === 'halogen';
    }
    return el.category === bookmarkFilter;
  }, [bookmarkFilter]);

  const mainElements = elementsData.filter((el) => mainGridPositions[el.atomic_number] !== undefined);
  const lanthanides = elementsData.filter((el) => lanthanideFBlock.includes(el.atomic_number));
  const actinides = elementsData.filter((el) => actinideFBlock.includes(el.atomic_number));

  // Get bookmarked elements for the modal
  const bookmarkedElements = useMemo(() => {
    return elementsData.filter((el) => bookmarks.includes(el.atomic_number));
  }, [bookmarks]);

  return (
    <>
      {/* Filter and Bookmarks Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Desktop Filter Tabs */}
        <div className="hidden md:flex flex-wrap gap-2">
          {filterCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedFilter(category)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedFilter === category
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              {getCategoryDisplayName(category)}
            </button>
          ))}
        </div>

        {/* Mobile Filter Button */}
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="md:hidden px-4 py-2 bg-muted text-foreground rounded-full flex items-center gap-2 hover:bg-accent transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter: {getCategoryDisplayName(selectedFilter)}
        </button>

        {/* Bookmarks Button */}
        <button
          onClick={() => setIsBookmarksModalOpen(true)}
          className="sm:ml-auto px-4 py-2 bg-muted text-foreground rounded-full flex items-center gap-2 hover:bg-accent transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          Bookmarks ({bookmarks.length})
        </button>
      </div>

      <p className="text-[var(--text-light)] mb-4 text-base">
        Click any element here, and I will provide all the information you need to know!
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card p-3 text-center shadow-sm sm:p-5">
        {/* Main 18-column grid */}
        <div className="grid min-w-[760px] grid-cols-[repeat(18,1fr)] gap-1 text-[12px] max-[900px]:gap-[2px] sm:min-w-[800px]">
          {mainElements.map((el) => {
            const pos = mainGridPositions[el.atomic_number];
            const visible = isElementVisible(el);
            return (
              <button
                key={el.atomic_number}
                className={`element-cell cat-${el.category} ${!visible ? 'opacity-30 grayscale-[50%]' : ''}`}
                style={{ gridRow: pos.row, gridColumn: pos.col }}
                onClick={() => handleElementClick(el)}
                aria-label={`${el.name} (${el.symbol})`}
              >
                <span className="el-num">{el.atomic_number}</span>
                <span className="el-sym">{el.symbol}</span>
              </button>
            );
          })}
        </div>

        {/* F-block */}
        <div className="mt-4 flex min-w-[760px] flex-col gap-1 max-[900px]:gap-[2px] sm:min-w-[800px]">
          {[lanthanides, actinides].map((group, gi) => (
            <div
              key={gi}
              className="grid grid-cols-[repeat(14,1fr)] gap-1 max-[900px]:gap-[2px]"
              style={{ marginLeft: 'calc(2 * (100% / 18) + 4px)' }}
            >
              {group.map((el) => {
                const visible = isElementVisible(el);
                return (
                  <button
                    key={el.atomic_number}
                    className={`element-cell cat-${el.category} ${!visible ? 'opacity-30 grayscale-[50%]' : ''}`}
                    onClick={() => handleElementClick(el)}
                    aria-label={`${el.name} (${el.symbol})`}
                  >
                    <span className="el-num">{el.atomic_number}</span>
                    <span className="el-sym">{el.symbol}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Element Info Modal */}
      {selectedElement && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm sm:p-5"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-[450px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-border bg-card p-5 shadow-xl animate-in zoom-in-95 duration-200 sm:p-8 md:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              aria-label="Close modal"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-muted border border-border rounded-full text-muted-foreground text-xl cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive hover:rotate-90 transition-all duration-200"
            >
              ×
            </button>

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDidElementImageFail(false);
                  setIsElementImageVisible((current) => !current);
                }}
                aria-label={`${isElementImageVisible ? 'Hide' : 'Show'} image for ${selectedElement.name}`}
                aria-pressed={isElementImageVisible}
                title={`${isElementImageVisible ? 'Hide' : 'Show'} image for ${selectedElement.name}`}
                className="group relative flex h-[82px] w-[82px] shrink-0 flex-col items-center justify-center self-start rounded-2xl border border-border bg-muted text-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="text-[2rem] font-extrabold leading-none">{selectedElement.symbol}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-primary">
                  {isElementImageVisible ? 'Hide' : 'Image'}
                </span>
              </button>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <h2 className="m-0 truncate text-[1.75rem] font-extrabold tracking-[-0.02em] text-foreground sm:text-[2rem]">
                  {selectedElement.name}
                </h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakElementName(selectedElement.name);
                  }}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-muted border border-border text-muted-foreground hover:bg-emerald-500/15 hover:text-emerald-500 hover:border-emerald-500/30 transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95"
                  aria-label={`Pronounce ${selectedElement.name}`}
                  title={`Hear pronunciation of ${selectedElement.name}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M11 5L6 9H2v6h4l5 4V5z" />
                  </svg>
                </button>
                {/* Bookmark Button in Modal */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedElement) {
                      toggleBookmark(selectedElement.atomic_number);
                    }
                  }}
                  className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-border transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${
                    isBookmarked(selectedElement.atomic_number)
                      ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                      : 'bg-muted text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/30'
                  }`}
                  aria-label={isBookmarked(selectedElement.atomic_number) ? 'Remove bookmark' : 'Add bookmark'}
                  title={isBookmarked(selectedElement.atomic_number) ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isBookmarked(selectedElement.atomic_number) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>

            {isElementImageVisible && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-muted/40">
                {selectedElement.imageUrl && !didElementImageFail ? (
                  <div className="relative">
                    <Image
                      key={selectedElement.atomic_number}
                      src={selectedElement.imageUrl}
                      alt={`Sample image of ${selectedElement.name}`}
                      width={960}
                      height={640}
                      unoptimized
                      className="h-64 w-full object-cover"
                      onError={() => setDidElementImageFail(true)}
                    />
                    <div className="border-t border-border bg-card/80 px-4 py-3 text-xs text-muted-foreground">
                      Reference image from images-of-elements.com
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border bg-card text-2xl font-bold text-muted-foreground">
                      {selectedElement.symbol}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">Image unavailable</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        No sample image could be loaded for {selectedElement.name} right now.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="relative">
                  <div className="relative z-[1] grid gap-4 sm:gap-5">
                {[
                  { label: 'Atomic Number', value: selectedElement.atomic_number },
                  { label: 'Symbol', value: selectedElement.symbol },
                  { label: 'Atomic Mass', value: selectedElement.atomic_mass.toFixed(3) },
                  { label: 'Type', value: getCategoryDisplayName(selectedElement.category) },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 pb-3 border-b border-border last:border-0">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</span>
                    <span className="text-xl text-foreground font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-6 right-6 text-[5rem] opacity-5 pointer-events-none">☁</div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Modal (Bottom Sheet) */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-background/50 backdrop-blur-sm" onClick={() => setIsFilterModalOpen(false)}>
          <div
            className="w-full max-w-lg rounded-t-3xl bg-card p-5 animate-in slide-in-from-bottom duration-300 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Filter Elements</h3>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:bg-accent"
              >
                ×
              </button>
            </div>
            <div className="grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {filterCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedFilter(category);
                    setIsFilterModalOpen(false);
                  }}
                  className={`px-4 py-3 rounded-xl text-left transition-all ${
                    selectedFilter === category
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-accent'
                  }`}
                >
                  {getCategoryDisplayName(category)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bookmarks Modal - Larger with split view */}
      {isBookmarksModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm sm:p-5" onClick={() => {
          setIsBookmarksModalOpen(false);
          setSelectedBookmark(null);
        }}>
          <div
            className="relative flex h-[min(80dvh,44rem)] w-full max-w-[700px] flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="text-xl font-bold">Bookmarked Elements</h3>
              <button
                onClick={() => {
                  setIsBookmarksModalOpen(false);
                  setSelectedBookmark(null);
                }}
                className="w-10 h-10 flex items-center justify-center bg-muted rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
              >
                ×
              </button>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
              {/* Left Panel - Bookmarks List */}
              <div className="flex border-b border-border p-4 md:w-1/3 md:flex-col md:border-b-0 md:border-r">
                {/* Bookmark Filter Dropdown */}
                <div className="mb-4">
                  <select
                    value={bookmarkFilter}
                    onChange={(e) => setBookmarkFilter(e.target.value as ElementCategory | 'all' | 'reactive-nonmetals')}
                    className="w-full px-4 py-2 bg-muted text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {filterCategories.map((category) => (
                      <option key={category} value={category}>
                        {getCategoryDisplayName(category)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bookmarked Elements List */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {bookmarkedElements.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No bookmarks yet.</p>
                      <p className="text-sm">Click the star icon on any element to add it.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bookmarkedElements
                        .filter((el) => isElementVisibleInBookmarks(el))
                        .map((el) => (
                          <button
                            key={el.atomic_number}
                            onClick={() => handleBookmarkClick(el)}
                            className={`w-full p-3 rounded-xl transition-all flex items-center gap-3 ${
                              selectedBookmark?.atomic_number === el.atomic_number
                                ? 'bg-primary text-white'
                                : 'bg-muted hover:bg-accent'
                            }`}
                          >
                            <div className="w-10 h-10 bg-background/20 rounded-lg flex items-center justify-center text-lg font-bold">
                              {el.symbol}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium truncate">{el.name}</div>
                              <div className="text-xs opacity-70">#{el.atomic_number}</div>
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Element Details */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 md:w-2/3">
                {selectedBookmark ? (
                  <div className="space-y-6">
                    {/* Element Symbol and Name */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                      <div className="w-20 h-20 bg-muted flex items-center justify-center text-3xl font-extrabold rounded-2xl shadow-sm border border-border text-foreground">
                        {selectedBookmark.symbol}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-1">{selectedBookmark.name}</h2>
                        <p className="text-muted-foreground">Atomic Number #{selectedBookmark.atomic_number}</p>
                      </div>
                      <button
                        onClick={() => {
                          const wasBookmarked = isBookmarked(selectedBookmark.atomic_number);
                          toggleBookmark(selectedBookmark.atomic_number);
                          if (wasBookmarked) {
                            // Find next bookmark to show or clear
                            const remaining = bookmarkedElements.filter(
                              (el) => el.atomic_number !== selectedBookmark.atomic_number
                            );
                            if (remaining.length > 0) {
                              setSelectedBookmark(remaining[0]);
                            } else {
                              setSelectedBookmark(null);
                            }
                          }
                        }}
                        className={`w-12 h-12 flex items-center justify-center rounded-full border border-border transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 ${
                          isBookmarked(selectedBookmark.atomic_number)
                            ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
                            : 'bg-muted text-muted-foreground hover:bg-yellow-500/10 hover:text-yellow-500 hover:border-yellow-500/30'
                        }`}
                        aria-label={isBookmarked(selectedBookmark.atomic_number) ? 'Remove bookmark' : 'Add bookmark'}
                        title={isBookmarked(selectedBookmark.atomic_number) ? 'Remove bookmark' : 'Add bookmark'}
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isBookmarked(selectedBookmark.atomic_number) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                          <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>

                    {/* Element Details Grid */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="bg-muted p-4 rounded-xl">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Atomic Number
                        </div>
                        <div className="text-xl font-bold">{selectedBookmark.atomic_number}</div>
                      </div>
                      <div className="bg-muted p-4 rounded-xl">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Symbol
                        </div>
                        <div className="text-xl font-bold">{selectedBookmark.symbol}</div>
                      </div>
                      <div className="bg-muted p-4 rounded-xl">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Atomic Mass
                        </div>
                        <div className="text-xl font-bold">{selectedBookmark.atomic_mass.toFixed(3)}</div>
                      </div>
                      <div className="bg-muted p-4 rounded-xl">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                          Type
                        </div>
                        <div className="text-xl font-bold">{getCategoryDisplayName(selectedBookmark.category)}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => {
                          speakElementName(selectedBookmark.name);
                        }}
                        className="flex-1 py-3 bg-muted text-foreground rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-500/15 hover:text-emerald-500 hover:border-emerald-500/30 border border-border transition-all cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M11 5L6 9H2v6h4l5 4V5z" />
                        </svg>
                        Pronounce
                      </button>
                      <button
                        onClick={() => {
                          handleElementClick(selectedBookmark);
                          setIsBookmarksModalOpen(false);
                        }}
                        className="flex-1 py-3 bg-primary text-white rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all cursor-pointer"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View in Periodic Table
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <div className="text-5xl mb-4">⭐</div>
                      <p>Select an element from the list to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

