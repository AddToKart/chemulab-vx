'use client';

import { useState, useCallback } from 'react';
import {
  elementsData,
  mainGridPositions,
  lanthanideFBlock,
  actinideFBlock,
  type ElementData,
} from '@/lib/data/elements-data';

export default function ElementsPage() {
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);

  const handleElementClick = useCallback((el: ElementData) => setSelectedElement(el), []);
  const closeModal = useCallback(() => setSelectedElement(null), []);

  const mainElements = elementsData.filter((el) => mainGridPositions[el.atomic_number] !== undefined);
  const lanthanides = elementsData.filter((el) => lanthanideFBlock.includes(el.atomic_number));
  const actinides = elementsData.filter((el) => actinideFBlock.includes(el.atomic_number));

  return (
    <>
      <p className="text-[var(--text-light)] mb-4 text-base">
        Click any element here, and I will provide all the information you need to know!
      </p>

      <div className="bg-card border border-border p-5 rounded-2xl text-center overflow-x-auto shadow-sm max-[900px]:p-3">
        {/* Main 18-column grid */}
        <div className="grid grid-cols-[repeat(18,1fr)] gap-1 text-[12px] min-w-[800px] max-[900px]:gap-[2px]">
          {mainElements.map((el) => {
            const pos = mainGridPositions[el.atomic_number];
            return (
              <button
                key={el.atomic_number}
                className={`element-cell cat-${el.category}`}
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
        <div className="mt-4 flex flex-col gap-1 min-w-[800px] max-[900px]:gap-[2px]">
          {[lanthanides, actinides].map((group, gi) => (
            <div
              key={gi}
              className="grid grid-cols-[repeat(14,1fr)] gap-1 max-[900px]:gap-[2px]"
              style={{ marginLeft: 'calc(2 * (100% / 18) + 4px)' }}
            >
              {group.map((el) => (
                <button
                  key={el.atomic_number}
                  className={`element-cell cat-${el.category}`}
                  onClick={() => handleElementClick(el)}
                  aria-label={`${el.name} (${el.symbol})`}
                >
                  <span className="el-num">{el.atomic_number}</span>
                  <span className="el-sym">{el.symbol}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Element Info Modal */}
      {selectedElement && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-background/80 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-[450px] bg-card p-10 border border-border rounded-3xl shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              aria-label="Close modal"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-muted border border-border rounded-full text-muted-foreground text-xl cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive hover:rotate-90 transition-all duration-200"
            >
              ×
            </button>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-[70px] h-[70px] bg-muted flex items-center justify-center text-[2rem] font-extrabold rounded-2xl shadow-sm border border-border text-foreground">
                {selectedElement.symbol}
              </div>
              <h2 className="m-0 text-[2rem] font-extrabold text-foreground tracking-[-0.02em]">
                {selectedElement.name}
              </h2>
            </div>

            <div className="relative">
              <div className="grid gap-5 relative z-[1]">
                {[
                  { label: 'Atomic Number', value: selectedElement.atomic_number },
                  { label: 'Symbol', value: selectedElement.symbol },
                  { label: 'Atomic Mass', value: selectedElement.atomic_mass.toFixed(3) },
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
    </>
  );
}

