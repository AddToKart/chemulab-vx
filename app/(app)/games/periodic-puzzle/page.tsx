'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

/* ─── Element data with grid positions (simplified periodic table) ─── */

interface PuzzleElement {
  symbol: string;
  row: number;
  col: number;
}

const puzzleElements: PuzzleElement[] = [
  { symbol: 'H', row: 1, col: 1 },
  { symbol: 'He', row: 1, col: 6 },
  { symbol: 'Li', row: 2, col: 1 },
  { symbol: 'Be', row: 2, col: 2 },
  { symbol: 'B', row: 2, col: 3 },
  { symbol: 'C', row: 2, col: 4 },
  { symbol: 'N', row: 2, col: 5 },
  { symbol: 'O', row: 2, col: 6 },
  { symbol: 'F', row: 3, col: 1 },
  { symbol: 'Ne', row: 3, col: 6 },
  { symbol: 'Na', row: 4, col: 1 },
  { symbol: 'Mg', row: 4, col: 2 },
  { symbol: 'Al', row: 4, col: 3 },
  { symbol: 'Si', row: 4, col: 4 },
  { symbol: 'P', row: 4, col: 5 },
  { symbol: 'S', row: 4, col: 6 },
  { symbol: 'Cl', row: 5, col: 1 },
  { symbol: 'Ar', row: 5, col: 6 },
];

const ROWS = 5;
const COLS = 6;

/** Build a lookup: "row-col" → expected symbol (only for slots that should be visible) */
function buildExpectedMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const el of puzzleElements) {
    map[`${el.row}-${el.col}`] = el.symbol;
  }
  return map;
}

const expectedMap = buildExpectedMap();

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─── Component ─── */

export default function PeriodicPuzzlePage() {
  /* Grid state: placed[key] = symbol placed in that slot */
  const [placed, setPlaced] = useState<Record<string, string>>({});

  /* Pieces remaining in tray */
  const [pieces, setPieces] = useState<string[]>(() =>
    shuffle(puzzleElements.map((e) => e.symbol)),
  );

  /* Check results: null = not checked, map key → 'correct' | 'wrong' */
  const [results, setResults] = useState<Record<string, 'correct' | 'wrong'> | null>(null);

  /* Result message */
  const [message, setMessage] = useState<string>('');

  /* Drag-and-drop: currently dragged symbol */
  const draggedSymbol = useRef<string | undefined>(undefined);

  /* Click-to-place: currently selected piece */
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);

  /* Drop-over highlight */
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  /* ── Helpers ── */

  const slotKey = (row: number, col: number) => `${row}-${col}`;

  const isValidSlot = (row: number, col: number) =>
    expectedMap[slotKey(row, col)] !== undefined;

  /* ── Drag handlers ── */

  const handleDragStart = useCallback(
    (symbol: string) => (e: React.DragEvent) => {
      draggedSymbol.current = symbol;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', symbol);
      // Clear click-to-place selection when dragging
      setSelectedPiece(null);
    },
    [],
  );

  const handleDragOver = useCallback(
    (key: string) => (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(key);
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(
    (key: string) => (e: React.DragEvent) => {
      e.preventDefault();
      setDropTarget(null);

      const symbol = draggedSymbol.current ?? e.dataTransfer.getData('text/plain');
      if (!symbol) return;

      placeSymbol(key, symbol);
      draggedSymbol.current = undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed, pieces],
  );

  /* ── Click-to-place handlers ── */

  const handlePieceClick = useCallback(
    (symbol: string) => {
      if (selectedPiece === symbol) {
        setSelectedPiece(null);
      } else {
        setSelectedPiece(symbol);
      }
    },
    [selectedPiece],
  );

  const handleSlotClick = useCallback(
    (key: string) => {
      // If a piece is selected via click-to-place, place it
      if (selectedPiece) {
        placeSymbol(key, selectedPiece);
        setSelectedPiece(null);
        return;
      }

      // If slot has a placed piece and no piece is selected, remove it back to tray
      if (placed[key]) {
        const sym = placed[key];
        setPlaced((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setPieces((prev) => [...prev, sym]);
        setResults(null);
        setMessage('');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedPiece, placed],
  );

  /* ── Place a symbol into a slot ── */

  const placeSymbol = (key: string, symbol: string) => {
    // If slot already occupied, swap back to tray
    setPlaced((prev) => {
      const next = { ...prev };
      const existing = next[key];
      next[key] = symbol;

      // Return existing to tray if it was there
      if (existing) {
        setPieces((p) => [...p.filter((s) => s !== symbol), existing]);
      } else {
        setPieces((p) => p.filter((s) => s !== symbol));
      }

      return next;
    });

    // Clear previous results when placing
    setResults(null);
    setMessage('');
  };

  /* ── Check answer ── */

  const handleCheck = useCallback(() => {
    const res: Record<string, 'correct' | 'wrong'> = {};
    let correct = 0;

    for (const el of puzzleElements) {
      const key = slotKey(el.row, el.col);
      if (placed[key] === el.symbol) {
        res[key] = 'correct';
        correct++;
      } else {
        res[key] = 'wrong';
      }
    }

    setResults(res);
    const total = puzzleElements.length;

    if (correct === total) {
      setMessage('Perfect! You placed all 18 elements correctly!');
    } else {
      setMessage(`${correct}/${total} correct`);
    }
  }, [placed]);

  /* ── Reset ── */

  const handleReset = useCallback(() => {
    setPlaced({});
    setPieces(shuffle(puzzleElements.map((e) => e.symbol)));
    setResults(null);
    setMessage('');
    setSelectedPiece(null);
  }, []);

  /* ── Slot class helper ── */

  const slotClassName = (key: string) => {
    const classes = [styles.puzzleSlot];

    if (results) {
      if (results[key] === 'correct') classes.push(styles.puzzleSlotCorrect);
      else if (results[key] === 'wrong') classes.push(styles.puzzleSlotWrong);
    } else if (placed[key]) {
      classes.push(styles.puzzleSlotFilled);
    }

    if (dropTarget === key) classes.push(styles.puzzleSlotDroppable);

    return classes.join(' ');
  };

  /* ── Render ── */

  const gridSlots: React.ReactNode[] = [];

  for (let r = 1; r <= ROWS; r++) {
    for (let c = 1; c <= COLS; c++) {
      const key = slotKey(r, c);
      const valid = isValidSlot(r, c);

      if (!valid) {
        gridSlots.push(
          <div key={key} className={`${styles.puzzleSlot} ${styles.puzzleSlotHidden}`} />,
        );
      } else {
        gridSlots.push(
          <div
            key={key}
            className={slotClassName(key)}
            onDragOver={handleDragOver(key)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(key)}
            onClick={() => handleSlotClick(key)}
            title={`Row ${r}, Col ${c}`}
          >
            {placed[key] ?? ''}
          </div>,
        );
      }
    }
  }

  return (
    <>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        <h1 className={styles.title}>Periodic Puzzle</h1>

        <div className={styles.instructions}>
          Drag element symbols from the tray and drop them into the correct
          positions on the simplified periodic table. You can also click a piece
          to select it, then click a slot to place it. Click a placed piece to
          return it to the tray.
        </div>

        <div className={styles.puzzleContainer}>
          {/* Grid */}
          <div className={styles.puzzleGrid}>{gridSlots}</div>

          {/* Pieces tray */}
          <div className={styles.piecesTray}>
            <div className={styles.piecesTrayTitle}>Elements</div>
            {pieces.map((symbol) => (
              <button
                key={symbol}
                className={`${styles.puzzlePiece}${
                  selectedPiece === symbol ? ` ${styles.puzzlePieceSelected}` : ''
                }`}
                draggable
                onDragStart={handleDragStart(symbol)}
                onClick={() => handlePieceClick(symbol)}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <button className={styles.checkBtn} onClick={handleCheck}>
            Check Answer
          </button>
          <button className={styles.resetBtn} onClick={handleReset}>
            Reset
          </button>
        </div>

        {/* Result */}
        {message && (
          <div
            className={`${styles.resultMessage} ${
              message.startsWith('Perfect') ? styles.resultSuccess : styles.resultPartial
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </>
  );
}
