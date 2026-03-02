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

      <div className="bg-[var(--bg-sidebar)] p-5 rounded-[20px] text-center overflow-x-auto max-[900px]:p-[10px]">
        {/* Main 18-column grid */}
        <div className="grid grid-cols-[repeat(18,1fr)] gap-1 text-[12px] max-[900px]:text-[9px] max-[900px]:gap-[2px] max-[600px]:text-[7px] max-[600px]:gap-px">
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
        <div className="mt-4 flex flex-col gap-1 max-[900px]:gap-[2px]">
          {[lanthanides, actinides].map((group, gi) => (
            <div
              key={gi}
              className="grid grid-cols-[repeat(14,1fr)] gap-1 max-[900px]:gap-[2px] max-[600px]:gap-px"
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
          className="fixed inset-0 z-[2000] flex items-center justify-center p-5 bg-[rgba(2,6,23,0.85)] backdrop-blur-[8px]"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-[450px] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-sidebar)] p-10 border border-[var(--glass-border)] rounded-[32px] shadow-[var(--shadow-lg),var(--glow-accent)] animate-[fadeInScale_0.3s_ease]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              aria-label="Close modal"
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-full text-[var(--text-light)] text-xl cursor-pointer hover:bg-red-500 hover:text-white hover:border-red-500 hover:rotate-90 transition-all duration-200"
            >
              ×
            </button>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-[70px] h-[70px] bg-[var(--bg-item-active)] flex items-center justify-center text-[2rem] font-extrabold rounded-[20px] shadow-[var(--shadow-md),var(--glow-accent)] border border-white/10 text-[var(--text-main)]">
                {selectedElement.symbol}
              </div>
              <h2 className="m-0 text-[2rem] font-extrabold text-[var(--text-main)] tracking-[-0.02em]">
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
                  <div key={item.label} className="flex flex-col gap-1 pb-3 border-b border-[var(--border-color)] last:border-0">
                    <span className="text-[0.75rem] uppercase tracking-[0.05em] text-[var(--text-light)] font-semibold">{item.label}</span>
                    <span className="text-[1.25rem] text-[var(--text-main)] font-bold">{item.value}</span>
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

