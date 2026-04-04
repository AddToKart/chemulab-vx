'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuthStore } from '@/store/auth-store';
import {
  attemptRecipeCombination,
  getRecipeTotalReactants,
  initialElements,
  recipes,
  type LabElement,
  type Recipe,
  type RecipeAttemptResult,
} from '@/lib/data/lab-elements';
import { ShareGameScore } from '@/components/game/ShareGameScore';
import { GameTutorial } from '@/components/game/GameTutorial';
import GameRating from '@/components/game/GameRating';
import { gameTutorials } from '@/lib/data/game-tutorials';
import styles from './page.module.css';

const WINNING_ROUNDS = 3;
const ROUND_TIME = 30;
const HINT_DELAY = 10;
const ROUND_RESULT_DELAY = 15;
const TOUCH_DRAG_HOLD_DELAY = 300;
const DISTRACTOR_COUNT = 3;
const MAX_PLAYABLE_REACTANTS = 5;

type Screen = 'lobby' | 'waiting' | 'game' | 'victory';
type MatchStatus = 'waiting' | 'playing' | 'completed';
type RoundWinner = 0 | 1 | 2 | null;
type SharedTimerValue = number | Timestamp | null;

interface GameData {
  id: string;
  player1: string;
  player2: string | null;
  p1Name: string;
  p2Name: string;
  status: MatchStatus;
  currentRound: number;
  currentRecipeIndex: number;
  currentPoolSymbols: string[];
  p1Score: number;
  p2Score: number;
  roundStartTime: SharedTimerValue;
  roundEnded: boolean;
  roundWinner: RoundWinner;
  roundResolvedAt: SharedTimerValue;
  winner: RoundWinner;
  createdAt: unknown;
}

interface CheckFeedback {
  kind: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface TouchDragState {
  isDragging: boolean;
  element: LabElement | null;
  x: number;
  y: number;
  startX: number;
  startY: number;
}

const ELEMENT_BY_SYMBOL = new Map(
  initialElements.map((element) => [element.symbol, element]),
);

const PLAYABLE_RECIPE_INDICES = recipes.reduce<number[]>((indices, recipe, index) => {
  if (getRecipeTotalReactants(recipe) <= MAX_PLAYABLE_REACTANTS) {
    indices.push(index);
  }
  return indices;
}, []);

const PLAYABLE_SYMBOLS = Array.from(
  new Set(
    PLAYABLE_RECIPE_INDICES.flatMap((index) => Object.keys(recipes[index].reactants)),
  ),
);

const ROUND_TIME_MS = ROUND_TIME * 1000;
const ROUND_RESULT_DELAY_MS = ROUND_RESULT_DELAY * 1000;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffleArray<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickRecipeIndex(previousIndex?: number): number {
  const candidates = PLAYABLE_RECIPE_INDICES.filter((index) => index !== previousIndex);
  const pool = candidates.length > 0 ? candidates : PLAYABLE_RECIPE_INDICES;
  return pool[Math.floor(Math.random() * pool.length)] ?? 0;
}

function buildRoundPoolSymbols(recipeIndex: number): string[] {
  const recipe = recipes[recipeIndex];
  const requiredSymbols = Object.keys(recipe.reactants);
  const distractorCandidates = PLAYABLE_SYMBOLS.filter(
    (symbol) => !requiredSymbols.includes(symbol),
  );
  const distractors = shuffleArray(distractorCandidates).slice(0, DISTRACTOR_COUNT);
  return shuffleArray([...requiredSymbols, ...distractors]);
}

function createRoundState(previousIndex?: number) {
  const currentRecipeIndex = pickRecipeIndex(previousIndex);
  return {
    currentRecipeIndex,
    currentPoolSymbols: buildRoundPoolSymbols(currentRecipeIndex),
    roundStartTime: serverTimestamp(),
    roundEnded: false,
    roundWinner: null as RoundWinner,
    roundResolvedAt: null as SharedTimerValue,
  };
}

function getHintLines(recipe: Recipe): string[] {
  return Object.entries(recipe.reactants).map(
    ([symbol, count]) => `${count}x ${symbol}`,
  );
}

function getMatchWinnerText(gameData: GameData): string {
  if (gameData.winner === 1) {
    return `${gameData.p1Name} wins the match!`;
  }
  if (gameData.winner === 2) {
    return `${gameData.p2Name} wins the match!`;
  }
  if (gameData.winner === 0) {
    return 'The match ends in a tie.';
  }
  return 'Match complete';
}

function getRoundSummary(gameData: GameData, recipe: Recipe): CheckFeedback {
  if (gameData.roundWinner === 1) {
    return {
      kind: 'success',
      title: `${gameData.p1Name} won the round`,
      message: `${recipe.product.name} was built first. The formula is ${recipe.product.symbol}.`,
    };
  }

  if (gameData.roundWinner === 2) {
    return {
      kind: 'success',
      title: `${gameData.p2Name} won the round`,
      message: `${recipe.product.name} was built first. The formula is ${recipe.product.symbol}.`,
    };
  }

  return {
    kind: 'info',
    title: 'Time ran out',
    message: `No one built ${recipe.product.name} before the timer expired.`,
  };
}

function getCheckFeedback(result: RecipeAttemptResult, recipe: Recipe): CheckFeedback {
  if (result.kind === 'success') {
    return {
      kind: 'success',
      title: 'Exact match',
      message: `You built ${recipe.product.name}. Locking in your round win...`,
    };
  }

  if (result.kind === 'invalid_missing') {
    return { kind: 'warning', title: 'Almost there', message: result.message };
  }

  if (result.kind === 'invalid_extra') {
    return { kind: 'warning', title: 'Too many ingredients', message: result.message };
  }

  if (result.kind === 'wrong_product') {
    return { kind: 'error', title: 'Different compound', message: result.message };
  }

  return { kind: 'error', title: 'No match', message: result.message };
}

function createEmptyTouchDragState(): TouchDragState {
  return {
    isDragging: false,
    element: null,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  };
}

function getSharedTimerMs(value: SharedTimerValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis();
  }

  return null;
}

function getElapsedFromSharedTimer(
  value: SharedTimerValue,
  durationMs: number,
): number {
  const startMs = getSharedTimerMs(value);
  if (startMs == null) {
    return 0;
  }

  return Math.min(Math.max(Date.now() - startMs, 0), durationMs);
}

function getRemainingSeconds(durationMs: number, elapsedMs: number): number {
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  return Math.ceil(remainingMs / 1000);
}

async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.username || data.displayName || 'Player';
    }
  } catch {
    // Ignore profile lookup failures and fall back to a generic label.
  }

  return 'Player';
}

export default function ChemicalFormulaRacePage() {
  const { user } = useAuthStore();
  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [winnerText, setWinnerText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [selectedElement, setSelectedElement] = useState<LabElement | null>(null);
  const [chamberElements, setChamberElements] = useState<LabElement[]>([]);
  const [checkFeedback, setCheckFeedback] = useState<CheckFeedback | null>(null);
  const [checkBusy, setCheckBusy] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [roundResultCountdown, setRoundResultCountdown] = useState(ROUND_RESULT_DELAY);
  const [touchDrag, setTouchDrag] = useState<TouchDragState>(createEmptyTouchDragState);
  const [isChamberHovered, setIsChamberHovered] = useState(false);

  const unsubRef = useRef<(() => void) | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const roundResultTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const activeRoundKeyRef = useRef('');
  const timeoutRoundKeyRef = useRef('');
  const autoAdvanceRoundKeyRef = useRef('');
  const activeResultKeyRef = useRef('');
  const chamberTouchRef = useRef<HTMLDivElement | null>(null);
  const dragTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const roundTickStartedAtRef = useRef(0);
  const roundElapsedBaseMsRef = useRef(0);
  const resultTickStartedAtRef = useRef(0);
  const resultElapsedBaseMsRef = useRef(0);
  const previousGameStateRef = useRef<{
    status: MatchStatus;
    currentRound: number;
    roundEnded: boolean;
  } | null>(null);

  const myPlayerNum = gameData && user
    ? gameData.player1 === user.uid
      ? 1
      : gameData.player2 === user.uid
        ? 2
        : null
    : null;

  const currentRecipe = useMemo(() => {
    if (!gameData) {
      return null;
    }
    return recipes[gameData.currentRecipeIndex] ?? null;
  }, [gameData]);

  const currentPoolElements = useMemo(() => {
    if (!gameData) {
      return [];
    }

    return gameData.currentPoolSymbols
      .map((symbol) => ELEMENT_BY_SYMBOL.get(symbol))
      .filter((element): element is LabElement => Boolean(element));
  }, [gameData]);

  const chamberGroups = useMemo(
    () =>
      chamberElements.reduce<{ element: LabElement; count: number; indices: number[] }[]>(
        (groups, element, index) => {
          const existing = groups.find(
            (group) => group.element.symbol === element.symbol,
          );

          if (existing) {
            existing.count += 1;
            existing.indices.push(index);
            return groups;
          }

          groups.push({ element, count: 1, indices: [index] });
          return groups;
        },
        [],
      ),
    [chamberElements],
  );

  const roundKey = gameData
    ? `${gameData.currentRound}`
    : '';

  const elapsedSeconds = Math.max(0, ROUND_TIME - timeLeft);
  const hintCountdown = Math.max(HINT_DELAY - elapsedSeconds, 0);
  const showHint = Boolean(
    gameData &&
    currentRecipe &&
    screen === 'game' &&
    !gameData.roundEnded &&
    hintCountdown === 0,
  );
  const isRoundActive = Boolean(
    gameData &&
    currentRecipe &&
    screen === 'game' &&
    !gameData.roundEnded &&
    timeLeft > 0,
  );
  const roundSummary = gameData && currentRecipe && gameData.roundEnded
    ? getRoundSummary(gameData, currentRecipe)
    : null;

  const cleanup = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = undefined;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }

    if (roundResultTimerRef.current) {
      clearInterval(roundResultTimerRef.current);
      roundResultTimerRef.current = undefined;
    }

    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    activeRoundKeyRef.current = '';
    timeoutRoundKeyRef.current = '';
    autoAdvanceRoundKeyRef.current = '';
    activeResultKeyRef.current = '';
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (!touchDrag.isDragging) {
      return;
    }

    const scrollY = window.scrollY;
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.touchAction = '';
      document.body.style.overscrollBehavior = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [touchDrag.isDragging]);

  const listenToGame = useCallback(
    (gameId: string) => {
      cleanup();

      unsubRef.current = onSnapshot(
        doc(db, 'formulaRaceGames', gameId),
        (snap) => {
          if (!snap.exists()) {
            cleanup();
            setGameData(null);
            setScreen('lobby');
            setError('Game was cancelled.');
            return;
          }

          const raw = snap.data() as Partial<GameData>;
          if (
            typeof raw.currentRecipeIndex !== 'number' ||
            !Array.isArray(raw.currentPoolSymbols)
          ) {
            cleanup();
            setGameData(null);
            setScreen('lobby');
            setError('This room uses an outdated Formula Race version. Create a new room.');
            return;
          }

          const nextGameData = { ...raw, id: gameId } as GameData;
          setGameData(nextGameData);

          if (nextGameData.status === 'waiting') {
            setScreen('waiting');
            return;
          }

          if (nextGameData.status === 'playing') {
            setScreen('game');
            return;
          }

          setWinnerText(getMatchWinnerText(nextGameData));
          setScreen('victory');
        },
        (snapshotError) => {
          console.error('[FormulaRace] Snapshot error:', snapshotError);
          setError('Connection to the room was lost.');
        },
      );
    },
    [cleanup],
  );

  const handleRoundTimeout = useCallback(async () => {
    if (!gameData) {
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const gameRef = doc(db, 'formulaRaceGames', gameData.id);
        const snap = await transaction.get(gameRef);

        if (!snap.exists()) {
          return;
        }

        const latest = snap.data() as GameData;
        if (latest.status !== 'playing' || latest.roundEnded) {
          return;
        }

        const roundStartedAtMs = getSharedTimerMs(latest.roundStartTime);
        if (
          roundStartedAtMs != null
          && Date.now() < roundStartedAtMs + ROUND_TIME_MS
        ) {
          return;
        }

        transaction.update(gameRef, {
          roundEnded: true,
          roundWinner: 0,
          roundResolvedAt: serverTimestamp(),
        });
      });
    } catch (transactionError) {
      console.error('[FormulaRace] Timeout transaction failed:', transactionError);
    }
  }, [gameData]);

  useEffect(() => {
    if (!gameData || screen !== 'game') {
      return;
    }

    if (activeRoundKeyRef.current === roundKey) {
      return;
    }

    activeRoundKeyRef.current = roundKey;
    timeoutRoundKeyRef.current = '';
    autoAdvanceRoundKeyRef.current = '';
    activeResultKeyRef.current = '';
    const previousGameState = previousGameStateRef.current;
    const isLiveRoundTransition = previousGameState != null && (
      previousGameState.status !== gameData.status
      || previousGameState.currentRound !== gameData.currentRound
      || previousGameState.roundEnded
    );
    const initialElapsedMs =
      gameData.status === 'playing' && !gameData.roundEnded && !isLiveRoundTransition
        ? getElapsedFromSharedTimer(gameData.roundStartTime, ROUND_TIME_MS)
        : 0;
    roundElapsedBaseMsRef.current = initialElapsedMs;
    roundTickStartedAtRef.current = performance.now();
    setTimeLeft(getRemainingSeconds(ROUND_TIME_MS, initialElapsedMs));
    setRoundResultCountdown(ROUND_RESULT_DELAY);
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    isDraggingRef.current = false;
    setTouchDrag(createEmptyTouchDragState());
    setIsChamberHovered(false);
    setSelectedElement(null);
    setChamberElements([]);
    setCheckFeedback(null);
    setCheckBusy(false);
    setIsDragOver(false);
  }, [gameData, roundKey, screen]);

  useEffect(() => {
    if (
      screen !== 'game' ||
      !gameData ||
      gameData.status !== 'playing' ||
      gameData.roundEnded
    ) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
      return;
    }

    const syncTimer = () => {
      const elapsedMs =
        roundElapsedBaseMsRef.current + (performance.now() - roundTickStartedAtRef.current);
      setTimeLeft(getRemainingSeconds(ROUND_TIME_MS, elapsedMs));
    };

    syncTimer();
    timerRef.current = setInterval(syncTimer, 250);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [gameData, gameData?.roundEnded, gameData?.status, roundKey, screen]);

  useEffect(() => {
    if (isRoundActive) {
      return;
    }

    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    isDraggingRef.current = false;
    setTouchDrag((current) =>
      current.element || current.isDragging ? createEmptyTouchDragState() : current,
    );
    setIsChamberHovered(false);
  }, [isRoundActive]);

  useEffect(() => {
    if (!gameData || screen !== 'game' || gameData.roundEnded || timeLeft > 0) {
      return;
    }

    if (timeoutRoundKeyRef.current === roundKey) {
      return;
    }

    timeoutRoundKeyRef.current = roundKey;
    void handleRoundTimeout();
  }, [gameData, handleRoundTimeout, roundKey, screen, timeLeft]);

  const handleCreate = async () => {
    if (!user) {
      setError('You must be logged in to create a game.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const displayName = await getUserDisplayName(user.uid);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateRoomCode();
        const gameRef = doc(db, 'formulaRaceGames', code);
        const existing = await getDoc(gameRef);
        if (existing.exists()) {
          continue;
        }

        const roundState = createRoundState();
        await setDoc(gameRef, {
          player1: user.uid,
          player2: null,
          p1Name: displayName,
          p2Name: '',
          status: 'waiting',
          currentRound: 1,
          p1Score: 0,
          p2Score: 0,
          ...roundState,
          winner: null,
          createdAt: serverTimestamp(),
        });

        listenToGame(code);
        setLoading(false);
        return;
      }

      setError('Could not reserve a room code. Please try again.');
    } catch (createError) {
      console.error('[FormulaRace] Create failed:', createError);
      setError('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user) {
      setError('You must be logged in to join a game.');
      return;
    }

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const displayName = await getUserDisplayName(user.uid);
      await runTransaction(db, async (transaction) => {
        const gameRef = doc(db, 'formulaRaceGames', code);
        const snap = await transaction.get(gameRef);

        if (!snap.exists()) {
          throw new Error('Game not found. Check the room code.');
        }

        const data = snap.data() as Partial<GameData>;
        if (
          typeof data.currentRecipeIndex !== 'number' ||
          !Array.isArray(data.currentPoolSymbols)
        ) {
          throw new Error('This room uses an outdated Formula Race version. Create a new room.');
        }

        if (data.status !== 'waiting') {
          throw new Error('This game has already started or ended.');
        }

        if (data.player1 === user.uid) {
          throw new Error('You cannot join your own game.');
        }

        if (data.player2) {
          throw new Error('This room is already full.');
        }

        transaction.update(gameRef, {
          player2: user.uid,
          p2Name: displayName,
          status: 'playing',
          roundStartTime: serverTimestamp(),
          roundEnded: false,
          roundWinner: null,
          roundResolvedAt: null,
        });
      });

      listenToGame(code);
    } catch (joinError) {
      console.error('[FormulaRace] Join failed:', joinError);
      setError(
        joinError instanceof Error
          ? joinError.message
          : 'Failed to join game. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const addToChamber = useCallback(
    (element: LabElement) => {
      if (!isRoundActive) {
        return;
      }

      setChamberElements((current) => [...current, element]);
    },
    [isRoundActive],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, element: LabElement) => {
      if (!isRoundActive) {
        return;
      }

      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('application/json', JSON.stringify(element));
    },
    [isRoundActive],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isRoundActive) {
        return;
      }

      event.preventDefault();
      setIsDragOver(true);
    },
    [isRoundActive],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDropToChamber = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!isRoundActive) {
        return;
      }

      event.preventDefault();
      setIsDragOver(false);

      try {
        const payload = event.dataTransfer.getData('application/json');
        if (!payload) {
          return;
        }

        const parsed = JSON.parse(payload) as LabElement;
        const element = ELEMENT_BY_SYMBOL.get(parsed.symbol);
        if (element) {
          addToChamber(element);
        }
      } catch {
        // Ignore invalid drop payloads.
      }
    },
    [addToChamber, isRoundActive],
  );

  const handleTouchStart = useCallback(
    (element: LabElement) => (event: React.TouchEvent<HTMLElement>) => {
      if (!isRoundActive) {
        return;
      }

      const touch = event.touches[0];
      setTouchDrag({
        isDragging: false,
        element,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
      });

      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
      }

      dragTimerRef.current = setTimeout(() => {
        setTouchDrag((current) => {
          const dx = current.x - current.startX;
          const dy = current.y - current.startY;

          if (Math.sqrt(dx * dx + dy * dy) > 15) {
            isDraggingRef.current = false;
            return createEmptyTouchDragState();
          }

          isDraggingRef.current = true;
          return { ...current, isDragging: true };
        });
      }, TOUCH_DRAG_HOLD_DELAY);
    },
    [isRoundActive],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!touchDrag.element) {
        return;
      }

      const touch = event.touches[0];
      setTouchDrag((current) => ({
        ...current,
        x: touch.clientX,
        y: touch.clientY,
      }));

      if (isDraggingRef.current) {
        event.preventDefault();
      }

      if (chamberTouchRef.current) {
        const rect = chamberTouchRef.current.getBoundingClientRect();
        const isOver =
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom;
        setIsChamberHovered(isOver);
      }
    },
    [touchDrag.element],
  );

  const handleTouchEnd = useCallback(() => {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    if (isDraggingRef.current && touchDrag.element && isChamberHovered && isRoundActive) {
      addToChamber(touchDrag.element);
    }

    isDraggingRef.current = false;
    setTouchDrag(createEmptyTouchDragState());
    setIsChamberHovered(false);
  }, [addToChamber, isChamberHovered, isRoundActive, touchDrag.element]);

  const handleElementClick = useCallback(
    (element: LabElement) => {
      if (!isRoundActive) {
        return;
      }

      setSelectedElement((current) =>
        current?.symbol === element.symbol ? null : element,
      );
    },
    [isRoundActive],
  );

  const handleChamberClick = useCallback(() => {
    if (!selectedElement || !isRoundActive) {
      return;
    }

    addToChamber(selectedElement);
    setSelectedElement(null);
  }, [addToChamber, isRoundActive, selectedElement]);

  const removeFromChamber = useCallback(
    (index: number) => {
      if (!isRoundActive) {
        return;
      }

      setChamberElements((current) =>
        current.filter((_, currentIndex) => currentIndex !== index),
      );
    },
    [isRoundActive],
  );

  const clearChamber = useCallback(() => {
    if (!isRoundActive) {
      return;
    }

    setChamberElements([]);
    setSelectedElement(null);
  }, [isRoundActive]);

  const handleCheckChamber = useCallback(async () => {
    if (!gameData || !currentRecipe || !myPlayerNum || checkBusy || !isRoundActive) {
      return;
    }

    const attempt = attemptRecipeCombination(chamberElements, currentRecipe);
    setCheckFeedback(getCheckFeedback(attempt, currentRecipe));

    if (attempt.kind !== 'success') {
      return;
    }

    setCheckBusy(true);

    try {
      const outcome = await runTransaction(db, async (transaction) => {
        const gameRef = doc(db, 'formulaRaceGames', gameData.id);
        const snap = await transaction.get(gameRef);

        if (!snap.exists()) {
          return 'missing';
        }

        const latest = snap.data() as GameData;
        if (latest.status !== 'playing' || latest.roundEnded) {
          return 'closed';
        }

        const nextP1Score = latest.p1Score + (myPlayerNum === 1 ? 1 : 0);
        const nextP2Score = latest.p2Score + (myPlayerNum === 2 ? 1 : 0);
        const didWinMatch =
          nextP1Score >= WINNING_ROUNDS || nextP2Score >= WINNING_ROUNDS;

        transaction.update(gameRef, {
          roundEnded: true,
          roundWinner: myPlayerNum,
          roundResolvedAt: serverTimestamp(),
          p1Score: nextP1Score,
          p2Score: nextP2Score,
          ...(didWinMatch
            ? {
              status: 'completed' as MatchStatus,
              winner: myPlayerNum,
            }
            : {}),
        });

        return 'won';
      });

      if (outcome !== 'won') {
        setCheckFeedback({
          kind: 'info',
          title: 'Round already finished',
          message: 'Your opponent locked in the result before this check completed.',
        });
      }
    } catch (transactionError) {
      console.error('[FormulaRace] Check transaction failed:', transactionError);
      setCheckFeedback({
        kind: 'error',
        title: 'Check failed',
        message: 'Could not submit your chamber. Try again.',
      });
    } finally {
      setCheckBusy(false);
    }
  }, [
    chamberElements,
    checkBusy,
    currentRecipe,
    gameData,
    isRoundActive,
    myPlayerNum,
  ]);

  const handleNextRound = useCallback(async () => {
    if (!gameData || gameData.status !== 'playing') {
      return;
    }

    setCheckBusy(true);

    try {
      await runTransaction(db, async (transaction) => {
        const gameRef = doc(db, 'formulaRaceGames', gameData.id);
        const snap = await transaction.get(gameRef);

        if (!snap.exists()) {
          return;
        }

        const latest = snap.data() as GameData;
        if (latest.status !== 'playing' || !latest.roundEnded) {
          return;
        }

        const nextRoundState = createRoundState(latest.currentRecipeIndex);
        transaction.update(gameRef, {
          currentRound: latest.currentRound + 1,
          ...nextRoundState,
        });
      });
    } catch (transactionError) {
      console.error('[FormulaRace] Next round transaction failed:', transactionError);
      setError('Could not start the next round. Please try again.');
    } finally {
      setCheckBusy(false);
    }
  }, [gameData]);

  useEffect(() => {
    if (
      !gameData ||
      screen !== 'game' ||
      gameData.status !== 'playing' ||
      !gameData.roundEnded
    ) {
      if (roundResultTimerRef.current) {
        clearInterval(roundResultTimerRef.current);
        roundResultTimerRef.current = undefined;
      }
      setRoundResultCountdown(ROUND_RESULT_DELAY);
      return;
    }

    const resultKey = `${gameData.currentRound}:ended`;
    if (activeResultKeyRef.current !== resultKey) {
      const previousGameState = previousGameStateRef.current;
      const isLiveRoundEnd = previousGameState != null
        && previousGameState.currentRound === gameData.currentRound
        && !previousGameState.roundEnded;
      const initialElapsedMs = isLiveRoundEnd
        ? 0
        : getElapsedFromSharedTimer(gameData.roundResolvedAt, ROUND_RESULT_DELAY_MS);
      activeResultKeyRef.current = resultKey;
      resultElapsedBaseMsRef.current = initialElapsedMs;
      resultTickStartedAtRef.current = performance.now();
      setRoundResultCountdown(getRemainingSeconds(ROUND_RESULT_DELAY_MS, initialElapsedMs));
    }

    const syncCountdown = () => {
      const elapsedMs =
        resultElapsedBaseMsRef.current + (performance.now() - resultTickStartedAtRef.current);
      const remaining = getRemainingSeconds(ROUND_RESULT_DELAY_MS, elapsedMs);
      setRoundResultCountdown(remaining);

      if (remaining === 0 && autoAdvanceRoundKeyRef.current !== roundKey) {
        autoAdvanceRoundKeyRef.current = roundKey;
        void handleNextRound();
      }
    };

    syncCountdown();
    roundResultTimerRef.current = setInterval(syncCountdown, 250);

    return () => {
      if (roundResultTimerRef.current) {
        clearInterval(roundResultTimerRef.current);
        roundResultTimerRef.current = undefined;
      }
    };
  }, [gameData, handleNextRound, roundKey, screen]);

  useEffect(() => {
    previousGameStateRef.current = gameData
      ? {
          status: gameData.status,
          currentRound: gameData.currentRound,
          roundEnded: gameData.roundEnded,
        }
      : null;
  }, [gameData]);

  const handleLeave = async () => {
    if (!gameData || !user) {
      return;
    }

    if (gameData.player1 !== user.uid) {
      setError('Only the host can cancel this room.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'formulaRaceGames', gameData.id));
    } catch {
      // Ignore delete errors during cleanup.
    }

    cleanup();
    setGameData(null);
    setScreen('lobby');
  };

  const handlePlayAgain = () => {
    cleanup();
    setGameData(null);
    setJoinCode('');
    setWinnerText('');
    setError('');
    setTimeLeft(ROUND_TIME);
    setSelectedElement(null);
    setChamberElements([]);
    setCheckFeedback(null);
    setCheckBusy(false);
    setIsDragOver(false);
    setScreen('lobby');
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.gameArea}>
          <p className={styles.errorMsg}>You must be logged in to play.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        <h1 className={styles.title}>Chemical Formula Race</h1>
        <p className={styles.subtitle}>
          Build first. Win the round.
        </p>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {screen === 'lobby' && (
          <div className={styles.lobbyContainer}>
            <GameTutorial
              tutorial={gameTutorials.chemFormulaRace}
              accentColor="#06b6d4"
              className="mb-6"
            />

            <div className={styles.lobbyButtons}>
              <button
                className={styles.createBtn}
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>

              <div className={styles.divider}>or</div>

              <div className={styles.joinSection}>
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  className={styles.joinInput}
                  maxLength={5}
                />
                <button
                  className={styles.joinBtn}
                  onClick={handleJoin}
                  disabled={loading}
                >
                  {loading ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === 'waiting' && gameData && (
          <div className={styles.waitingContainer}>
            <div className={styles.roomCode}>
              <p>Room Code</p>
              <h2>{gameData.id}</h2>
              <p className={styles.shareText}>Share this code with your friend.</p>
            </div>

            <div className={styles.playerWaiting}>
              <p>Waiting for an opponent to join...</p>
              <div className={styles.spinner} />
            </div>

            <button className={styles.cancelBtn} onClick={handleLeave}>
              Cancel Room
            </button>
          </div>
        )}

        {screen === 'game' && gameData && currentRecipe && (
          <div className={styles.gameContainer}>
            <div className={styles.scoreboard}>
              <div
                className={`${styles.playerCard} ${myPlayerNum === 1 ? styles.playerCardActive : ''
                  }`}
              >
                <span className={styles.playerLabel}>
                  {gameData.p1Name}
                  {myPlayerNum === 1 ? ' (You)' : ''}
                </span>
                <span className={styles.playerScore}>{gameData.p1Score}</span>
              </div>

              <div className={styles.scoreDivider}>Race to {WINNING_ROUNDS}</div>

              <div
                className={`${styles.playerCard} ${myPlayerNum === 2 ? styles.playerCardActive : ''
                  }`}
              >
                <span className={styles.playerLabel}>
                  {gameData.p2Name || 'Opponent'}
                  {myPlayerNum === 2 ? ' (You)' : ''}
                </span>
                <span className={styles.playerScore}>{gameData.p2Score}</span>
              </div>
            </div>

            <div className={styles.roundBar}>
              <div className={styles.roundHeading}>
                <span className={styles.roundEyebrow}>Round {gameData.currentRound}</span>
                <strong className={styles.roundTarget}>{currentRecipe.product.name}</strong>
              </div>

              <div className={styles.roundMeta}>
                <span className={styles.hintBadge}>
                  {gameData.roundEnded
                    ? 'Locked'
                    : showHint
                      ? 'Hint'
                      : `Hint ${hintCountdown}s`}
                </span>
                <span className={styles.timer}>{timeLeft}s</span>
              </div>
            </div>

            {showHint && (
              <div className={styles.hintPanel}>
                <p className={styles.hintTitle}>Hint</p>
                <div className={styles.hintChips}>
                  {getHintLines(currentRecipe).map((hintLine) => (
                    <span key={hintLine} className={styles.hintChip}>
                      {hintLine}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.boardGrid}>
              <section className={styles.poolPanel}>
                <div className={styles.panelHeaderCompact}>
                  <h3>Elements</h3>
                  <span className={styles.panelMeta}>Tap / drag</span>
                </div>

                <div className={styles.cardGrid}>
                  {currentPoolElements.map((element) => (
                    <button
                      key={element.symbol}
                      type="button"
                      className={`${styles.ingredientCard} ${selectedElement?.symbol === element.symbol
                        ? styles.ingredientCardSelected
                        : ''
                        }`}
                      style={{ backgroundColor: element.color }}
                      draggable={isRoundActive}
                      onDragStart={(event) => handleDragStart(event, element)}
                      onTouchStart={handleTouchStart(element)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onTouchCancel={handleTouchEnd}
                      onClick={() => handleElementClick(element)}
                    >
                      <span className={styles.cardSymbol}>{element.symbol}</span>
                      <span className={styles.cardName}>{element.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className={styles.chamberPanel}>
                <div className={styles.panelHeaderCompact}>
                  <h3>Chamber</h3>
                  <span
                    className={`${styles.panelMeta} ${
                      selectedElement ? styles.panelMetaActive : ''
                    }`}
                  >
                    {selectedElement
                      ? `Selected ${selectedElement.symbol}`
                      : 'Exact match'}
                  </span>
                </div>

                <div
                  className={`${styles.chamber} ${isDragOver ? styles.chamberActive : ''
                    } ${selectedElement ? styles.chamberSelected : ''
                    } ${isChamberHovered ? styles.chamberActive : ''}`}
                  ref={chamberTouchRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropToChamber}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onClick={handleChamberClick}
                >
                  {chamberGroups.length === 0 ? (
                    <div className={styles.chamberEmpty}>
                      <strong>Drop here</strong>
                      <span>Tap or hold-drag</span>
                    </div>
                  ) : (
                    <div className={styles.chamberGroups}>
                      {chamberGroups.map((group) => (
                        <div
                          key={group.element.symbol}
                          className={styles.chamberPill}
                          style={{ backgroundColor: group.element.color }}
                        >
                          <span className={styles.chamberPillSymbol}>
                            {group.element.symbol}
                          </span>
                          {group.count > 1 && (
                            <span className={styles.chamberPillCount}>
                              x{group.count}
                            </span>
                          )}
                          <button
                            type="button"
                            className={styles.removePillBtn}
                            onClick={(event) => {
                              event.stopPropagation();
                              const index =
                                group.indices[group.indices.length - 1];
                              removeFromChamber(index);
                            }}
                            disabled={!isRoundActive}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.actionRow}>
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={clearChamber}
                    disabled={!isRoundActive || chamberElements.length === 0}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className={styles.checkBtn}
                    onClick={handleCheckChamber}
                    disabled={!isRoundActive || chamberElements.length === 0 || checkBusy}
                  >
                    {checkBusy ? 'Checking...' : 'Check'}
                  </button>
                </div>
              </section>
            </div>

            {checkFeedback && (
              <div
                className={`${styles.feedbackPanel} ${styles[`feedback${checkFeedback.kind[0].toUpperCase()}${checkFeedback.kind.slice(1)}`]
                  }`}
              >
                <strong>{checkFeedback.title}</strong>
                <span>{checkFeedback.message}</span>
              </div>
            )}

            {gameData.roundEnded && gameData.status === 'playing' && roundSummary && (
              <div className={styles.roundModalOverlay}>
                <div
                  className={`${styles.roundModal} ${gameData.roundWinner === 0
                    ? styles.roundModalTimeout
                    : styles.roundModalSolved
                    }`}
                >
                  <p className={styles.roundModalEyebrow}>
                    Round {gameData.currentRound} complete
                  </p>
                  <h3>{roundSummary.title}</h3>
                  <p className={styles.roundModalText}>{roundSummary.message}</p>
                  <div className={styles.answerLine}>
                    <span>Formula:</span>
                    <strong>{currentRecipe.product.symbol}</strong>
                  </div>
                  <div className={styles.roundModalFooter}>
                    <span className={styles.roundModalTimer}>
                      {roundResultCountdown > 0
                        ? `Next round in ${roundResultCountdown}s`
                        : 'Starting next round...'}
                    </span>
                    <button
                      type="button"
                      className={styles.roundModalSkipBtn}
                      onClick={() => void handleNextRound()}
                      disabled={checkBusy}
                    >
                      {checkBusy ? 'Starting...' : 'Skip Timer'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {screen === 'victory' && gameData && (
          <div className={styles.victoryContainer}>
            <h2 className={styles.victoryText}>{winnerText}</h2>

            <div className={styles.finalScore}>
              <div>
                <p>{gameData.p1Name}</p>
                <p className={styles.finalScoreValue}>{gameData.p1Score}</p>
              </div>

              <span className={styles.finalVs}>-</span>

              <div>
                <p>{gameData.p2Name}</p>
                <p className={styles.finalScoreValue}>{gameData.p2Score}</p>
              </div>
            </div>

            <ShareGameScore
              customMessage={`I won ${myPlayerNum === 1 ? gameData.p1Score : gameData.p2Score} rounds in Chemical Formula Race.`}
              gameName="Chemical Formula Race"
            />

            <GameRating
              gameId="chemical-formula-race"
              gameName="Chemical Formula Race"
            />

            <div className={styles.victoryButtons}>
              <button className={styles.playAgainBtn} onClick={handlePlayAgain}>
                Play Again
              </button>
              <Link href="/games" className={styles.backToGamesBtn}>
                Back to Games
              </Link>
            </div>
          </div>
        )}
      </div>

      {touchDrag.isDragging &&
        touchDrag.element &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={styles.touchGhost}
            style={{
              left: touchDrag.x - 56,
              top: touchDrag.y - 56,
              backgroundColor: touchDrag.element.color,
            }}
          >
            <span className={styles.cardSymbol}>{touchDrag.element.symbol}</span>
            <span className={styles.cardName}>{touchDrag.element.name}</span>
          </div>,
          document.body,
        )}
    </div>
  );
}
