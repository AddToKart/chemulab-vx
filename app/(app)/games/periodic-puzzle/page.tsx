'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

import { ShareGameScore } from '@/components/game/ShareGameScore';
import { GameTutorial } from '@/components/game/GameTutorial';
import DifficultySelector from '@/components/game/DifficultySelector';
import TimerProgress from '@/components/game/TimerProgress';
import GameRating from '@/components/game/GameRating';
import { gameTutorials } from '@/lib/data/game-tutorials';
import {
  DifficultyLevel,
  periodicPuzzleDifficulty,
  PeriodicPuzzleSettings,
} from '@/lib/types/game-difficulty';

/* ─── Element data with REAL periodic table positions ─── */

interface PuzzleElement {
  symbol: string;
  name: string;
  row: number;   // period
  col: number;   // group (1–18)
  category: string;
}

// Periods 1-4 (30 elements) - for Beginner and Intermediate
const puzzleElementsPeriods1_4: PuzzleElement[] = [
  // Period 1
  { symbol: 'H',  name: 'Hydrogen',   row: 1, col: 1,  category: 'nonmetal' },
  { symbol: 'He', name: 'Helium',     row: 1, col: 18, category: 'noble-gas' },
  // Period 2
  { symbol: 'Li', name: 'Lithium',    row: 2, col: 1,  category: 'alkali-metal' },
  { symbol: 'Be', name: 'Beryllium',  row: 2, col: 2,  category: 'alkaline-earth' },
  { symbol: 'B',  name: 'Boron',      row: 2, col: 13, category: 'metalloid' },
  { symbol: 'C',  name: 'Carbon',     row: 2, col: 14, category: 'nonmetal' },
  { symbol: 'N',  name: 'Nitrogen',   row: 2, col: 15, category: 'nonmetal' },
  { symbol: 'O',  name: 'Oxygen',     row: 2, col: 16, category: 'nonmetal' },
  { symbol: 'F',  name: 'Fluorine',   row: 2, col: 17, category: 'halogen' },
  { symbol: 'Ne', name: 'Neon',       row: 2, col: 18, category: 'noble-gas' },
  // Period 3
  { symbol: 'Na', name: 'Sodium',     row: 3, col: 1,  category: 'alkali-metal' },
  { symbol: 'Mg', name: 'Magnesium',  row: 3, col: 2,  category: 'alkaline-earth' },
  { symbol: 'Al', name: 'Aluminium',  row: 3, col: 13, category: 'post-transition' },
  { symbol: 'Si', name: 'Silicon',    row: 3, col: 14, category: 'metalloid' },
  { symbol: 'P',  name: 'Phosphorus', row: 3, col: 15, category: 'nonmetal' },
  { symbol: 'S',  name: 'Sulfur',     row: 3, col: 16, category: 'nonmetal' },
  { symbol: 'Cl', name: 'Chlorine',   row: 3, col: 17, category: 'halogen' },
  { symbol: 'Ar', name: 'Argon',      row: 3, col: 18, category: 'noble-gas' },
  // Period 4
  { symbol: 'K',  name: 'Potassium',  row: 4, col: 1,  category: 'alkali-metal' },
  { symbol: 'Ca', name: 'Calcium',    row: 4, col: 2,  category: 'alkaline-earth' },
  { symbol: 'Sc', name: 'Scandium',   row: 4, col: 3,  category: 'transition-metal' },
  { symbol: 'Ti', name: 'Titanium',   row: 4, col: 4,  category: 'transition-metal' },
  { symbol: 'V',  name: 'Vanadium',   row: 4, col: 5,  category: 'transition-metal' },
  { symbol: 'Cr', name: 'Chromium',   row: 4, col: 6,  category: 'transition-metal' },
  { symbol: 'Mn', name: 'Manganese',  row: 4, col: 7,  category: 'transition-metal' },
  { symbol: 'Fe', name: 'Iron',       row: 4, col: 8,  category: 'transition-metal' },
  { symbol: 'Co', name: 'Cobalt',     row: 4, col: 9,  category: 'transition-metal' },
  { symbol: 'Ni', name: 'Nickel',     row: 4, col: 10, category: 'transition-metal' },
  { symbol: 'Cu', name: 'Copper',     row: 4, col: 11, category: 'transition-metal' },
  { symbol: 'Zn', name: 'Zinc',       row: 4, col: 12, category: 'transition-metal' },
];

// Periods 5-6 (additional elements for Expert mode)
// Selecting a representative subset of elements from periods 5-6
const puzzleElementsPeriods5_6: PuzzleElement[] = [
  // Period 5
  { symbol: 'Rb', name: 'Rubidium',   row: 5, col: 1,  category: 'alkali-metal' },
  { symbol: 'Sr', name: 'Strontium',  row: 5, col: 2,  category: 'alkaline-earth' },
  { symbol: 'Y',  name: 'Yttrium',    row: 5, col: 3,  category: 'transition-metal' },
  { symbol: 'Zr', name: 'Zirconium',  row: 5, col: 4,  category: 'transition-metal' },
  { symbol: 'Nb', name: 'Niobium',    row: 5, col: 5,  category: 'transition-metal' },
  { symbol: 'Mo', name: 'Molybdenum', row: 5, col: 6,  category: 'transition-metal' },
  { symbol: 'Tc', name: 'Technetium', row: 5, col: 7,  category: 'transition-metal' },
  { symbol: 'Ru', name: 'Ruthenium',  row: 5, col: 8,  category: 'transition-metal' },
  { symbol: 'Rh', name: 'Rhodium',    row: 5, col: 9,  category: 'transition-metal' },
  { symbol: 'Pd', name: 'Palladium',  row: 5, col: 10, category: 'transition-metal' },
  { symbol: 'Ag', name: 'Silver',     row: 5, col: 11, category: 'transition-metal' },
  { symbol: 'Cd', name: 'Cadmium',    row: 5, col: 12, category: 'transition-metal' },
  { symbol: 'In', name: 'Indium',     row: 5, col: 13, category: 'post-transition' },
  { symbol: 'Sn', name: 'Tin',        row: 5, col: 14, category: 'post-transition' },
  { symbol: 'Sb', name: 'Antimony',   row: 5, col: 15, category: 'metalloid' },
  { symbol: 'Te', name: 'Tellurium',  row: 5, col: 16, category: 'metalloid' },
  { symbol: 'I',  name: 'Iodine',     row: 5, col: 17, category: 'halogen' },
  { symbol: 'Xe', name: 'Xenon',      row: 5, col: 18, category: 'noble-gas' },
  // Period 6
  { symbol: 'Cs', name: 'Caesium',    row: 6, col: 1,  category: 'alkali-metal' },
  { symbol: 'Ba', name: 'Barium',     row: 6, col: 2,  category: 'alkaline-earth' },
  { symbol: 'La', name: 'Lanthanum',  row: 6, col: 3,  category: 'lanthanide' },
  { symbol: 'Hf', name: 'Hafnium',    row: 6, col: 4,  category: 'transition-metal' },
  { symbol: 'Ta', name: 'Tantalum',   row: 6, col: 5,  category: 'transition-metal' },
  { symbol: 'W',  name: 'Tungsten',   row: 6, col: 6,  category: 'transition-metal' },
  { symbol: 'Re', name: 'Rhenium',    row: 6, col: 7,  category: 'transition-metal' },
  { symbol: 'Os', name: 'Osmium',     row: 6, col: 8,  category: 'transition-metal' },
  { symbol: 'Ir', name: 'Iridium',    row: 6, col: 9,  category: 'transition-metal' },
  { symbol: 'Pt', name: 'Platinum',   row: 6, col: 10, category: 'transition-metal' },
  { symbol: 'Au', name: 'Gold',       row: 6, col: 11, category: 'transition-metal' },
  { symbol: 'Hg', name: 'Mercury',    row: 6, col: 12, category: 'transition-metal' },
  { symbol: 'Tl', name: 'Thallium',   row: 6, col: 13, category: 'post-transition' },
  { symbol: 'Pb', name: 'Lead',       row: 6, col: 14, category: 'post-transition' },
  { symbol: 'Bi', name: 'Bismuth',    row: 6, col: 15, category: 'post-transition' },
  { symbol: 'Po', name: 'Polonium',   row: 6, col: 16, category: 'metalloid' },
  { symbol: 'At', name: 'Astatine',   row: 6, col: 17, category: 'halogen' },
  { symbol: 'Rn', name: 'Radon',      row: 6, col: 18, category: 'noble-gas' },
];

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  'nonmetal':          '#56bb8a',
  'noble-gas':         '#c78fd1',
  'alkali-metal':      '#e8674a',
  'alkaline-earth':    '#f5a623',
  'metalloid':         '#5bbfcc',
  'halogen':           '#58b4f5',
  'post-transition':   '#7a93c4',
  'transition-metal':  '#e0c240',
  'lanthanide':        '#f97316',
};

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
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [pieces, setPieces] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, 'correct' | 'wrong'> | null>(null);
  const [message, setMessage] = useState<string>('');
  const draggedSymbol = useRef<string | undefined>(undefined);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState(false);

  // Get difficulty settings
  const difficultySettings: PeriodicPuzzleSettings = periodicPuzzleDifficulty[difficulty];

  // Determine puzzle elements based on difficulty
  const puzzleElements: PuzzleElement[] = useMemo(() => 
    difficulty === 'expert' 
      ? [...puzzleElementsPeriods1_4, ...puzzleElementsPeriods5_6]
      : puzzleElementsPeriods1_4,
    [difficulty]
  );

  const ROWS = difficultySettings.periods;
  const COLS = 18;

  // Build a lookup: "row-col" → expected symbol
  const expectedMap: Record<string, string> = {};
  for (const el of puzzleElements) {
    expectedMap[`${el.row}-${el.col}`] = el.symbol;
  }

  const slotKey = (row: number, col: number) => `${row}-${col}`;
  const isValidSlot = (row: number, col: number) =>
    expectedMap[slotKey(row, col)] !== undefined;

  const getElementBySymbol = (symbol: string) =>
    puzzleElements.find((e) => e.symbol === symbol);

  // Timer countdown effect for Advanced/Expert modes
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const settings = periodicPuzzleDifficulty[difficulty];

    if (gameStarted && settings.timeLimit) {
      setTimeLeft(settings.timeLimit);
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Time's up
            setMessage(`Time's up! You didn't complete the puzzle in time.`);
            setGameStarted(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStarted, difficulty]);

  /* ── Drag handlers ── */
  const handleDragStart = useCallback(
    (symbol: string) => (e: React.DragEvent) => {
      draggedSymbol.current = symbol;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', symbol);
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
      setSelectedPiece(selectedPiece === symbol ? null : symbol);
    },
    [selectedPiece],
  );

  const handleSlotClick = useCallback(
    (key: string) => {
      if (selectedPiece) {
        placeSymbol(key, selectedPiece);
        setSelectedPiece(null);
        return;
      }
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
      
    [selectedPiece, placed],
  );

  /* ── Place a symbol into a slot ── */
  const placeSymbol = (key: string, symbol: string) => {
    setPlaced((prev) => {
      const next = { ...prev };
      const existing = next[key];
      next[key] = symbol;
      if (existing) {
        setPieces((p) => [...p.filter((s) => s !== symbol), existing]);
      } else {
        setPieces((p) => p.filter((s) => s !== symbol));
      }
      return next;
    });
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
      setMessage(`🎉 Perfect! You placed all ${total} elements correctly!`);
    } else {
      setMessage(`${correct}/${total} correct — keep trying!`);
    }
  }, [placed, puzzleElements]);

  /* ── Reset ── */
  const handleReset = useCallback(() => {
    setPlaced({});
    setPieces(shuffle(puzzleElements.map((e) => e.symbol)));
    setResults(null);
    setMessage('');
    setSelectedPiece(null);
  }, [puzzleElements]);

  /* ── Start Game (for difficulty selection) ── */
  const startGame = useCallback(() => {
    const settings = periodicPuzzleDifficulty[difficulty];
    setPlaced({});
    setPieces(shuffle(puzzleElements.map((e) => e.symbol)));
    setResults(null);
    setMessage('');
    setSelectedPiece(null);
    setGameStarted(true);
    if (settings.timeLimit) {
      setTimeLeft(settings.timeLimit);
    }
  }, [puzzleElements, difficulty]);

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

  /* ── Group headers (group numbers 1–18) ── */
  const groupHeaders: React.ReactNode[] = [];
  for (let c = 1; c <= COLS; c++) {
    groupHeaders.push(
      <div key={`gh-${c}`} className={styles.groupHeader}>
        {c}
      </div>,
    );
  }

  /* ── Build grid ── */
  const gridSlots: React.ReactNode[] = [];
  for (let r = 1; r <= ROWS; r++) {
    // Period label
    gridSlots.push(
      <div key={`pl-${r}`} className={styles.periodLabel}>
        {r}
      </div>,
    );
    for (let c = 1; c <= COLS; c++) {
      const key = slotKey(r, c);
      const valid = isValidSlot(r, c);
      if (!valid) {
        gridSlots.push(
          <div key={key} className={`${styles.puzzleSlot} ${styles.puzzleSlotHidden}`} />,
        );
      } else {
        const placedSymbol = placed[key];
        const placedEl = placedSymbol ? getElementBySymbol(placedSymbol) : null;
        gridSlots.push(
          <div
            key={key}
            className={slotClassName(key)}
            style={
              placedEl && periodicPuzzleDifficulty[difficulty].showHints
                ? { backgroundColor: CATEGORY_COLORS[placedEl.category] || undefined }
                : undefined
            }
            onDragOver={handleDragOver(key)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(key)}
            onClick={() => handleSlotClick(key)}
            title={`Period ${r}, Group ${c}`}
          >
            {placedSymbol ?? ''}
          </div>,
        );
      }
    }
  }

  /* ── Piece color from category ── */
  const getPieceColor = (symbol: string) => {
    const el = getElementBySymbol(symbol);
    return el ? CATEGORY_COLORS[el.category] || '#2196f3' : '#2196f3';
  };

  /* ── Render ── */
  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        <h1 className={styles.title}>Periodic Puzzle</h1>

        {!gameStarted ? (
          <div className={styles.startScreen}>
            <p className={styles.subtitle}>
              Drag element symbols from the tray into their correct positions on the periodic table.
              {difficulty === 'expert' && ' Includes periods 1-6!'}
            </p>
            <GameTutorial tutorial={gameTutorials.periodicPuzzle} accentColor="#f59e0b" />
            <DifficultySelector
              onSelect={setDifficulty}
              selected={difficulty}
            />
            <button className={styles.startBtn} onClick={startGame}>
              Start Puzzle
            </button>
          </div>
        ) : (
          <>
            {periodicPuzzleDifficulty[difficulty].timeLimit && (
              <TimerProgress
                timeLeft={timeLeft}
                totalTime={periodicPuzzleDifficulty[difficulty].timeLimit || 0}
                isGameActive={gameStarted}
              />
            )}

            <div className={styles.instructions}>
              Drag element symbols from the tray into their correct positions on the periodic table.
              You can also click a piece to select it, then click a slot to place it. Click a placed piece to return it to the tray.
            </div>

            {/* Legend */}
            {periodicPuzzleDifficulty[difficulty].showHints && (
              <div className={styles.legend}>
                {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                  <div key={cat} className={styles.legendItem}>
                    <span className={styles.legendSwatch} style={{ backgroundColor: color }} />
                    <span className={styles.legendLabel}>{cat.replace(/-/g, ' ')}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.puzzleWrapper}>
              {/* Grid with group headers */}
              <div className={styles.tableArea}>
                <div className={styles.groupHeaderRow}>
                  <div className={styles.periodLabel} /> {/* corner spacer */}
                  {groupHeaders}
                </div>
                <div className={styles.puzzleGrid}>
                  {gridSlots}
                </div>
              </div>

              {/* Pieces tray */}
              <div className={styles.piecesTray}>
                <div className={styles.piecesTrayTitle}>
                  Elements ({pieces.length} remaining)
                </div>
                <div className={styles.piecesTrayGrid}>
                  {pieces.map((symbol) => (
                    <button
                      key={symbol}
                      className={`${styles.puzzlePiece}${
                        selectedPiece === symbol ? ` ${styles.puzzlePieceSelected}` : ''
                      }`}
                      style={{ backgroundColor: getPieceColor(symbol) }}
                      draggable
                      onDragStart={handleDragStart(symbol)}
                      onClick={() => handlePieceClick(symbol)}
                      title={getElementBySymbol(symbol)?.name}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
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
              <div className="flex flex-col items-center gap-2">
                <div
                    className={`${styles.resultMessage} ${
                    message.startsWith('🎉') ? styles.resultSuccess : styles.resultPartial
                    }`}
                >
                    {message}
                </div>
                {results && (
                  <>
                    <ShareGameScore 
                        customMessage={`I placed ${Object.values(results).filter(r => r === 'correct').length} elements correctly in Periodic Puzzle! 🧩`}
                        gameName="Periodic Puzzle" 
                    />
                    <div className="w-full">
                      <GameRating gameId="periodic-puzzle" gameName="Periodic Puzzle" />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
