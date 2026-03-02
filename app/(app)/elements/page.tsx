'use client';

import { useState, useCallback } from 'react';
import {
  elementsData,
  mainGridPositions,
  lanthanideFBlock,
  actinideFBlock,
  type ElementData,
} from '@/lib/data/elements-data';
import styles from './page.module.css';

export default function ElementsPage() {
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);

  const handleElementClick = useCallback((el: ElementData) => {
    setSelectedElement(el);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedElement(null);
  }, []);

  // Elements in the main grid (have grid positions)
  const mainElements = elementsData.filter(
    (el) => mainGridPositions[el.atomic_number] !== undefined
  );

  // Lanthanide f-block elements
  const lanthanides = elementsData.filter((el) =>
    lanthanideFBlock.includes(el.atomic_number)
  );

  // Actinide f-block elements
  const actinides = elementsData.filter((el) =>
    actinideFBlock.includes(el.atomic_number)
  );

  return (
    <>
      <p className={styles.subtitle}>
        Click any element here, and I will provide all the information you need to know!
      </p>

      <div className={styles.periodicTable}>
        {/* Main 18-column grid */}
        <div className={styles.mainTable}>
          {mainElements.map((el) => {
            const pos = mainGridPositions[el.atomic_number];
            return (
              <button
                key={el.atomic_number}
                className={`${styles.element} ${styles[el.category]}`}
                style={{ gridRow: pos.row, gridColumn: pos.col }}
                onClick={() => handleElementClick(el)}
                aria-label={`${el.name} (${el.symbol})`}
              >
                <span className={styles.atomicNumber}>{el.atomic_number}</span>
                <span className={styles.symbol}>{el.symbol}</span>
              </button>
            );
          })}
        </div>

        {/* F-block (Lanthanides & Actinides) */}
        <div className={styles.fBlock}>
          <div className={styles.lanthanides}>
            {lanthanides.map((el) => (
              <button
                key={el.atomic_number}
                className={`${styles.element} ${styles[el.category]}`}
                onClick={() => handleElementClick(el)}
                aria-label={`${el.name} (${el.symbol})`}
              >
                <span className={styles.atomicNumber}>{el.atomic_number}</span>
                <span className={styles.symbol}>{el.symbol}</span>
              </button>
            ))}
          </div>
          <div className={styles.actinides}>
            {actinides.map((el) => (
              <button
                key={el.atomic_number}
                className={`${styles.element} ${styles[el.category]}`}
                onClick={() => handleElementClick(el)}
                aria-label={`${el.name} (${el.symbol})`}
              >
                <span className={styles.atomicNumber}>{el.atomic_number}</span>
                <span className={styles.symbol}>{el.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Element Info Modal */}
      {selectedElement && (
        <div className={styles.modal} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={styles.close} onClick={closeModal} aria-label="Close modal">
              &times;
            </button>
            <div className={styles.modalHeader}>
              <div className={styles.modalElementSymbol}>
                {selectedElement.symbol}
              </div>
              <h2>{selectedElement.name}</h2>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Atomic Number</span>
                  <span className={styles.infoValue}>
                    {selectedElement.atomic_number}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Symbol</span>
                  <span className={styles.infoValue}>
                    {selectedElement.symbol}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Atomic Mass</span>
                  <span className={styles.infoValue}>
                    {selectedElement.atomic_mass.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className={styles.modalDecoration}>&#9883;</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
