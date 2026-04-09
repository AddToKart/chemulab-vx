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
import { ResumeModal } from '@/components/game/ResumeModal';

/* ─── Element data with REAL periodic table positions ─── */

interface PuzzleElement {
  symbol: string;
  name: string;
  row: number;   // period
  col: number;   // group (1–18)
  category: string;
}

// Periods 1-4 (36 elements) - for Beginner and Intermediate
const puzzleElementsPeriods1_4: PuzzleElement[] = [
  { symbol: 'H', name: 'Hydrogen', row: 1, col: 1, category: 'nonmetal' },
  { symbol: 'He', name: 'Helium', row: 1, col: 18, category: 'noble-gas' },
  { symbol: 'Li', name: 'Lithium', row: 2, col: 1, category: 'alkali-metal' },
  { symbol: 'Be', name: 'Beryllium', row: 2, col: 2, category: 'alkaline-earth' },
  { symbol: 'B', name: 'Boron', row: 2, col: 13, category: 'metalloid' },
  { symbol: 'C', name: 'Carbon', row: 2, col: 14, category: 'nonmetal' },
  { symbol: 'N', name: 'Nitrogen', row: 2, col: 15, category: 'nonmetal' },
  { symbol: 'O', name: 'Oxygen', row: 2, col: 16, category: 'nonmetal' },
  { symbol: 'F', name: 'Fluorine', row: 2, col: 17, category: 'halogen' },
  { symbol: 'Ne', name: 'Neon', row: 2, col: 18, category: 'noble-gas' },
  { symbol: 'Na', name: 'Sodium', row: 3, col: 1, category: 'alkali-metal' },
  { symbol: 'Mg', name: 'Magnesium', row: 3, col: 2, category: 'alkaline-earth' },
  { symbol: 'Al', name: 'Aluminium', row: 3, col: 13, category: 'post-transition' },
  { symbol: 'Si', name: 'Silicon', row: 3, col: 14, category: 'metalloid' },
  { symbol: 'P', name: 'Phosphorus', row: 3, col: 15, category: 'nonmetal' },
  { symbol: 'S', name: 'Sulfur', row: 3, col: 16, category: 'nonmetal' },
  { symbol: 'Cl', name: 'Chlorine', row: 3, col: 17, category: 'halogen' },
  { symbol: 'Ar', name: 'Argon', row: 3, col: 18, category: 'noble-gas' },
  { symbol: 'K', name: 'Potassium', row: 4, col: 1, category: 'alkali-metal' },
  { symbol: 'Ca', name: 'Calcium', row: 4, col: 2, category: 'alkaline-earth' },
  { symbol: 'Sc', name: 'Scandium', row: 4, col: 3, category: 'transition-metal' },
  { symbol: 'Ti', name: 'Titanium', row: 4, col: 4, category: 'transition-metal' },
  { symbol: 'V', name: 'Vanadium', row: 4, col: 5, category: 'transition-metal' },
  { symbol: 'Cr', name: 'Chromium', row: 4, col: 6, category: 'transition-metal' },
  { symbol: 'Mn', name: 'Manganese', row: 4, col: 7, category: 'transition-metal' },
  { symbol: 'Fe', name: 'Iron', row: 4, col: 8, category: 'transition-metal' },
  { symbol: 'Co', name: 'Cobalt', row: 4, col: 9, category: 'transition-metal' },
  { symbol: 'Ni', name: 'Nickel', row: 4, col: 10, category: 'transition-metal' },
  { symbol: 'Cu', name: 'Copper', row: 4, col: 11, category: 'transition-metal' },
  { symbol: 'Zn', name: 'Zinc', row: 4, col: 12, category: 'transition-metal' },
  { symbol: 'Ga', name: 'Gallium', row: 4, col: 13, category: 'post-transition' },
  { symbol: 'Ge', name: 'Germanium', row: 4, col: 14, category: 'metalloid' },
  { symbol: 'As', name: 'Arsenic', row: 4, col: 15, category: 'metalloid' },
  { symbol: 'Se', name: 'Selenium', row: 4, col: 16, category: 'nonmetal' },
  { symbol: 'Br', name: 'Bromine', row: 4, col: 17, category: 'halogen' },
  { symbol: 'Kr', name: 'Krypton', row: 4, col: 18, category: 'noble-gas' },
];

const puzzleElementsPeriods5_7: PuzzleElement[] = [
  { symbol: 'Rb', name: 'Rubidium', row: 5, col: 1, category: 'alkali-metal' },
  { symbol: 'Sr', name: 'Strontium', row: 5, col: 2, category: 'alkaline-earth' },
  { symbol: 'Y', name: 'Yttrium', row: 5, col: 3, category: 'transition-metal' },
  { symbol: 'Zr', name: 'Zirconium', row: 5, col: 4, category: 'transition-metal' },
  { symbol: 'Nb', name: 'Niobium', row: 5, col: 5, category: 'transition-metal' },
  { symbol: 'Mo', name: 'Molybdenum', row: 5, col: 6, category: 'transition-metal' },
  { symbol: 'Tc', name: 'Technetium', row: 5, col: 7, category: 'transition-metal' },
  { symbol: 'Ru', name: 'Ruthenium', row: 5, col: 8, category: 'transition-metal' },
  { symbol: 'Rh', name: 'Rhodium', row: 5, col: 9, category: 'transition-metal' },
  { symbol: 'Pd', name: 'Palladium', row: 5, col: 10, category: 'transition-metal' },
  { symbol: 'Ag', name: 'Silver', row: 5, col: 11, category: 'transition-metal' },
  { symbol: 'Cd', name: 'Cadmium', row: 5, col: 12, category: 'transition-metal' },
  { symbol: 'In', name: 'Indium', row: 5, col: 13, category: 'post-transition' },
  { symbol: 'Sn', name: 'Tin', row: 5, col: 14, category: 'post-transition' },
  { symbol: 'Sb', name: 'Antimony', row: 5, col: 15, category: 'metalloid' },
  { symbol: 'Te', name: 'Tellurium', row: 5, col: 16, category: 'metalloid' },
  { symbol: 'I', name: 'Iodine', row: 5, col: 17, category: 'halogen' },
  { symbol: 'Xe', name: 'Xenon', row: 5, col: 18, category: 'noble-gas' },
  { symbol: 'Cs', name: 'Cesium', row: 6, col: 1, category: 'alkali-metal' },
  { symbol: 'Ba', name: 'Barium', row: 6, col: 2, category: 'alkaline-earth' },
  { symbol: 'Pt', name: 'Platinum', row: 6, col: 10, category: 'transition-metal' },
  { symbol: 'Au', name: 'Gold', row: 6, col: 11, category: 'transition-metal' },
  { symbol: 'Hg', name: 'Mercury', row: 6, col: 12, category: 'transition-metal' },
  { symbol: 'Tl', name: 'Thallium', row: 6, col: 13, category: 'post-transition' },
  { symbol: 'Pb', name: 'Lead', row: 6, col: 14, category: 'post-transition' },
  { symbol: 'Bi', name: 'Bismuth', row: 6, col: 15, category: 'post-transition' },
  { symbol: 'Po', name: 'Polonium', row: 6, col: 16, category: 'metalloid' },
  { symbol: 'At', name: 'Astatine', row: 6, col: 17, category: 'halogen' },
  { symbol: 'Rn', name: 'Radon', row: 6, col: 18, category: 'noble-gas' },
];

const CATEGORY_COLORS: Record<string, string> = {
  'alkali-metal': '#ff6b6b',
  'alkaline-earth': '#ffa94d',
  'transition-metal': '#ffd43b',
  'post-transition': '#69db7c',
  'metalloid': '#38d9a9',
  'nonmetal': '#4dabf7',
  'halogen': '#748ffc',
  'noble-gas': '#da77f2',
  lanthanide: '#f783ac',
  actinide: '#e599f7',
};

const shuffle = <T,>(array: T[]): T[] => {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface SavedSession {
  placed: Record<string, string>;
  pieces: string[];
  difficulty: DifficultyLevel;
  gameStarted: boolean;
  timeLeft: number;
}

const SESSION_KEY = 'periodicPuzzleSession';

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
  
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);

  /* ---------- Session restoration on mount ---------- */
  useEffect(() => {
    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SavedSession;
        if (parsed.gameStarted && parsed.pieces.length > 0) {
          setSavedSession(parsed);
          setShowResumeModal(true);
        }
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  /* ---------- Save session on state change ---------- */
  useEffect(() => {
    if (gameStarted && pieces.length > 0 && !results) {
      const session: SavedSession = {
        placed,
        pieces,
        difficulty,
        gameStarted,
        timeLeft,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }, [placed, pieces, difficulty, gameStarted, timeLeft, results]);

  /* ---------- Clear session on check (results) ---------- */
  useEffect(() => {
    if (results) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [results]);

  /* ---------- Handle resume ---------- */
  const handleResume = useCallback(() => {
    if (savedSession) {
      setPlaced(savedSession.placed);
      setPieces(savedSession.pieces);
      setDifficulty(savedSession.difficulty);
      setTimeLeft(savedSession.timeLeft);
      setGameStarted(true);
      setShowResumeModal(false);
    }
  }, [savedSession]);

  /* ---------- Handle start new ---------- */
  const handleStartNew = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setShowResumeModal(false);
    setSavedSession(null);
    startGame();
  }, []);

  /* ---------- Clear session on back navigation ---------- */
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gameStarted && pieces.length > 0 && !results) {
        const session: SavedSession = {
          placed,
          pieces,
          difficulty,
          gameStarted,
          timeLeft,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [placed, pieces, difficulty, gameStarted, timeLeft, results]);

  // Get difficulty settings
  const difficultySettings: PeriodicPuzzleSettings = periodicPuzzleDifficulty[difficulty];

  // Determine puzzle elements based on difficulty
  const puzzleElements: PuzzleElement[] = useMemo(() => {
    if (difficulty === 'beginner') {
      return puzzleElementsPeriods1_4.filter(el => el.row <= 2);
    }
    if (difficulty === 'intermediate') {
      return puzzleElementsPeriods1_4;
    }
    if (difficulty === 'advanced') {
      return [...puzzleElementsPeriods1_4, ...puzzleElementsPeriods5_7.filter(el => el.row <= 6 && el.row >= 5)];
    }
    // Expert: all 118 elements including period 7 and f-block
    return [...puzzleElementsPeriods1_4, ...puzzleElementsPeriods5_7];
  }, [difficulty]);

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
      setMessage(`Perfect! You placed all ${total} elements correctly!`);
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
  const isExpert = difficulty === 'expert';
  const maxMainRow = isExpert ? 7 : ROWS;

  for (let r = 1; r <= maxMainRow; r++) {
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

  // F-block rows for expert mode
  if (isExpert) {
    // Spacer row
    gridSlots.push(
      <div key="fblock-spacer" className={styles.periodLabel} />,
    );
    for (let c = 1; c <= COLS; c++) {
      gridSlots.push(
        <div key={`fblock-spacer-${c}`} className={`${styles.puzzleSlot} ${styles.puzzleSlotHidden}`} />,
      );
    }

    // Lanthanides row (row 9)
    gridSlots.push(
      <div key={`pl-lan`} className={styles.periodLabel}>
        Ln
      </div>,
    );
    for (let c = 1; c <= COLS; c++) {
      const key = slotKey(9, c);
      const valid = isValidSlot(9, c);
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
            title={`Lanthanide, position ${c}`}
          >
            {placedSymbol ?? ''}
          </div>,
        );
      }
    }

    // Actinides row (row 10)
    gridSlots.push(
      <div key={`pl-act`} className={styles.periodLabel}>
        An
      </div>,
    );
    for (let c = 1; c <= COLS; c++) {
      const key = slotKey(10, c);
      const valid = isValidSlot(10, c);
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
            title={`Actinide, position ${c}`}
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
      {showResumeModal && (
        <ResumeModal
          gameName="Periodic Puzzle"
          onResume={handleResume}
          onStartNew={handleStartNew}
          previousProgress={`Pieces placed: ${savedSession?.pieces.length ? 36 - savedSession.pieces.length : 0}`}
        />
      )}

      <Link href="/games" className={styles.backLink}>
        &larr; Leave Game
      </Link>

      <div className={styles.gameArea}>
        <h1 className={styles.title}>Periodic Puzzle</h1>

        {!gameStarted ? (
          <div className={styles.startScreen}>
            <p className={styles.subtitle}>
              Drag element symbols from the tray into their correct positions on the periodic table.
              {difficulty === 'expert' && ' Includes all 118 elements!'}
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
                      className={`${styles.puzzlePiece}${selectedPiece === symbol ? ` ${styles.puzzlePieceSelected}` : ''
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
                  className={`${styles.resultMessage} ${message.startsWith('Perfect') ? styles.resultSuccess : styles.resultPartial
                    }`}
                >
                  {message}
                </div>
                {results && (
                  <>
                    <ShareGameScore
                      customMessage={`I placed ${Object.values(results).filter(r => r === 'correct').length} elements correctly in Periodic Puzzle!`}
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
