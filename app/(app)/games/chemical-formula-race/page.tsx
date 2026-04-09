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
  updateDoc,
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
import { useRouter } from 'next/navigation';
import { ShareGameScore } from '@/components/game/ShareGameScore';
import { GameTutorial } from '@/components/game/GameTutorial';
import GameRating from '@/components/game/GameRating';
import { gameTutorials } from '@/lib/data/game-tutorials';
import { cn } from '@/lib/utils';
import { MultiplayerLobby } from '@/components/game/Multiplayer/MultiplayerLobby';
import { MultiplayerWaiting } from '@/components/game/Multiplayer/MultiplayerWaiting';
import { MultiplayerOverlay } from '@/components/game/Multiplayer/MultiplayerOverlay';
import { MultiplayerContainer } from '@/components/game/Multiplayer/MultiplayerContainer';

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
  disconnected: {
    player1?: boolean;
    player2?: boolean;
  };
  disconnectedAt?: {
    player1?: Timestamp;
    player2?: Timestamp;
  };
}

interface GameSession {
  roomCode: string;
  isHost: boolean;
  playerRole: 1 | 2;
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
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isHost, setIsHost] = useState(false);
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

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectTimeout, setReconnectTimeout] = useState(0);
  const [showReconnectScreen, setShowReconnectScreen] = useState(false);
  const [reconnectError, setReconnectError] = useState('');

  const [showAfkWarning, setShowAfkWarning] = useState(false);
  const [afkCountdown, setAfkCountdown] = useState(0);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

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
  
  const SESSION_KEY = 'chemFormulaRaceSession';
  const lastActivityRef = useRef<number>(0);
  const prevTurnRef = useRef<number | null>(null);
  const afkWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const afkTriggerTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const afkCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const handleOpponentTimeoutRef = useRef<(() => void) | undefined>(undefined);

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

  /* ---------- Session restoration on mount ---------- */
  useEffect(() => {
    if (!user) return;

    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (!storedSession) return;

    const session: GameSession = JSON.parse(storedSession);

    const checkAndRestoreSession = async () => {
      try {
        const gameRef = doc(db, 'formulaRaceGames', session.roomCode);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const gameDataInner = gameSnap.data() as GameData;

        const isPlayer1 = gameDataInner.player1 === user.uid;
        const isPlayer2 = gameDataInner.player2 === user.uid;
        const myRole: 1 | 2 | null = isPlayer1 ? 1 : isPlayer2 ? 2 : null;

        if (!myRole) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const isDisconnected = gameDataInner.disconnected?.[myRole === 1 ? 'player1' : 'player2'];

        if (isDisconnected) {
          const disconnectedAt = gameDataInner.disconnectedAt?.[myRole === 1 ? 'player1' : 'player2'] as Timestamp | undefined;
          if (disconnectedAt && typeof disconnectedAt.toMillis === 'function') {
            const elapsed = Date.now() - disconnectedAt.toMillis();
            const TIMEOUT_MS = 2 * 60 * 1000;

            if (elapsed >= TIMEOUT_MS) {
              sessionStorage.removeItem(SESSION_KEY);
              return;
            }

            setShowReconnectScreen(true);
            setReconnectTimeout(Math.ceil((TIMEOUT_MS - elapsed) / 1000));
            return;
          }
        }

        setIsHost(session.isHost);
        listenToGame(session.roomCode);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    checkAndRestoreSession();
  }, [user]);

  /* ---------- Cleanup on unmount ---------- */
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (timerRef.current) clearInterval(timerRef.current);
      if (roundResultTimerRef.current) clearInterval(roundResultTimerRef.current);
      if (reconnectTimeoutRef.current) clearInterval(reconnectTimeoutRef.current);
      if (afkWarningTimeoutRef.current) clearTimeout(afkWarningTimeoutRef.current);
      if (afkTriggerTimeoutRef.current) clearTimeout(afkTriggerTimeoutRef.current);
      if (afkCountdownIntervalRef.current) clearInterval(afkCountdownIntervalRef.current);
    };
  }, []);

  /* ---------- Opponent disconnection detection ---------- */
  useEffect(() => {
    if (!user || !gameData || gameData.status !== 'playing') {
      setOpponentDisconnected(false);
      if (reconnectTimeoutRef.current) clearInterval(reconnectTimeoutRef.current);
      return;
    }

    const myPlayerNum = gameData.player1 === user.uid ? 1 : 
                        gameData.player2 === user.uid ? 2 : null;
    if (!myPlayerNum) return;

    const opponentNum = myPlayerNum === 1 ? 2 : 1;
    const opponentDisconnected = gameData.disconnected?.[opponentNum === 1 ? 'player1' : 'player2'];

    if (opponentDisconnected) {
      const disconnectedAt = gameData.disconnectedAt?.[opponentNum === 1 ? 'player1' : 'player2'] as Timestamp | undefined;
      if (disconnectedAt && typeof disconnectedAt.toMillis === 'function') {
        const disconnectTime = disconnectedAt.toMillis();
        const elapsed = Date.now() - disconnectTime;
        const TIMEOUT_MS = 2 * 60 * 1000;
        const remaining = Math.max(0, Math.ceil((TIMEOUT_MS - elapsed) / 1000));

        if (!reconnectTimeoutRef.current) {
          setReconnectTimeout(remaining);
          setOpponentDisconnected(true);

          reconnectTimeoutRef.current = setInterval(async () => {
            setReconnectTimeout((prev: number) => {
              if (prev <= 1) {
                if (reconnectTimeoutRef.current) clearInterval(reconnectTimeoutRef.current);
                handleOpponentTimeoutRef.current?.();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setReconnectTimeout(remaining);
        }
      }
    } else {
      setOpponentDisconnected(false);
      if (reconnectTimeoutRef.current) {
        clearInterval(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    }
  }, [gameData, user]);

  const handleOpponentTimeout = useCallback(async () => {
    if (!gameData || !user) return;

    try {
      const gameRef = doc(db, 'formulaRaceGames', gameData.id);
      const myPlayerNum = user.uid === gameData.player1 ? 1 : 2;
      const winnerNum = myPlayerNum === 1 ? 2 : 1;
      await updateDoc(gameRef, { status: 'completed', winner: winnerNum });
    } catch {
      // ignore
    }
  }, [gameData, user]);

  useEffect(() => {
    handleOpponentTimeoutRef.current = handleOpponentTimeout;
  }, [handleOpponentTimeout]);

  /* ---------- Reconnect handling ---------- */
  const handleReconnect = useCallback(async () => {
    if (!gameData || !user) return;

    try {
      const gameRef = doc(db, 'formulaRaceGames', gameData.id);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        setReconnectError('Game no longer exists');
        return;
      }

      const gameDataInner = gameSnap.data() as GameData;
      const myPlayerNum = gameDataInner.player1 === user.uid ? 1 : 2;
      const myRoleKey = myPlayerNum === 1 ? 'player1' : 'player2';

      const isDisconnected = gameDataInner.disconnected?.[myRoleKey];
      const disconnectedAt = gameDataInner.disconnectedAt?.[myRoleKey];

      if (!isDisconnected || !disconnectedAt) {
        setShowReconnectScreen(false);
        listenToGame(gameData.id);
        return;
      }

      const disconnectedAtTs = disconnectedAt as Timestamp;
      if (typeof disconnectedAtTs.toMillis !== 'function') {
        setShowReconnectScreen(false);
        listenToGame(gameData.id);
        return;
      }

      const elapsed = Date.now() - disconnectedAtTs.toMillis();
      const TIMEOUT_MS = 2 * 60 * 1000;

      if (elapsed >= TIMEOUT_MS) {
        setReconnectError('Reconnection time expired');
        sessionStorage.removeItem(SESSION_KEY);
        setTimeout(() => {
          setShowReconnectScreen(false);
          setScreen('lobby');
        }, 2000);
        return;
      }

      await updateDoc(gameRef, {
        [`disconnected.${myRoleKey}`]: false,
        disconnectedAt: { player1: null, player2: null },
      });

      setShowReconnectScreen(false);
      listenToGame(gameData.id);
    } catch {
      setReconnectError('Failed to reconnect');
    }
  }, [gameData, user]);

  const handleDropGame = useCallback(async () => {
    if (!gameData || !user) return;

    try {
      const gameRef = doc(db, 'formulaRaceGames', gameData.id);
      await updateDoc(gameRef, { status: 'completed' });
    } catch {
      // ignore
    }

    sessionStorage.removeItem(SESSION_KEY);
    setShowReconnectScreen(false);
    setScreen('lobby');
  }, [gameData, user]);

  /* ---------- Detect when player becomes disconnected while on page ---------- */
  useEffect(() => {
    if (!gameData || !user) return;

    const myPlayerNum = gameData.player1 === user.uid ? 1 : 
                        gameData.player2 === user.uid ? 2 : null;
    if (!myPlayerNum) return;

    const isDisconnected = gameData.disconnected?.[myPlayerNum === 1 ? 'player1' : 'player2'];

    if (isDisconnected && screen === 'game') {
      setShowReconnectScreen(true);
    }
  }, [gameData?.disconnected, screen, user]);

  /* ---------- Note: AFK detection disabled for this game due to complex round structure ---------- */
  /* ---------- Opponent disconnection detection is still active ---------- */

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
    if (!gameData || screen !== 'game' || gameData.roundEnded || timeLeft > 0) {
      return;
    }

    if (timeoutRoundKeyRef.current === roundKey) {
      return;
    }

    timeoutRoundKeyRef.current = roundKey;
    void handleRoundTimeout();
  }, [gameData, handleRoundTimeout, roundKey, screen, timeLeft]);

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
          disconnected: {},
        });

        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          roomCode: code,
          isHost: true,
          playerRole: 1,
        } as GameSession));
        setIsHost(true);
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

      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        roomCode: code,
        isHost: false,
        playerRole: 2,
      } as GameSession));
      setIsHost(false);
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

  /* ---------- Trigger AFK ---------- */
  const triggerAfk = useCallback(async () => {
    if (!gameData || !user) return;

    const myPlayerNum = gameData.player1 === user.uid ? 1 : 2;
    const myRoleKey = myPlayerNum === 1 ? 'player1' : 'player2';

    try {
      const gameRef = doc(db, 'formulaRaceGames', gameData.id);
      const updateData: Record<string, unknown> = {};
      updateData[`disconnected.${myRoleKey}`] = true;
      updateData[`disconnectedAt.${myRoleKey}`] = serverTimestamp();
      await updateDoc(gameRef, updateData);
    } catch {
      // ignore
    }
  }, [gameData, user]);

  /* ---------- Clear AFK timers ---------- */
  const clearAfkTimers = useCallback(() => {
    if (afkWarningTimeoutRef.current) {
      clearTimeout(afkWarningTimeoutRef.current);
      afkWarningTimeoutRef.current = undefined;
    }
    if (afkTriggerTimeoutRef.current) {
      clearTimeout(afkTriggerTimeoutRef.current);
      afkTriggerTimeoutRef.current = undefined;
    }
    if (afkCountdownIntervalRef.current) {
      clearInterval(afkCountdownIntervalRef.current);
      afkCountdownIntervalRef.current = undefined;
    }
    setShowAfkWarning(false);
    setAfkCountdown(0);
  }, []);

  /* ---------- Perform Leave Game ---------- */
  const performLeaveGame = useCallback(async () => {
    setShowLeaveConfirm(false);

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

    if (reconnectTimeoutRef.current) {
      clearInterval(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    if (afkWarningTimeoutRef.current) {
      clearTimeout(afkWarningTimeoutRef.current);
      afkWarningTimeoutRef.current = undefined;
    }
    if (afkTriggerTimeoutRef.current) {
      clearTimeout(afkTriggerTimeoutRef.current);
      afkTriggerTimeoutRef.current = undefined;
    }
    if (afkCountdownIntervalRef.current) {
      clearInterval(afkCountdownIntervalRef.current);
      afkCountdownIntervalRef.current = undefined;
    }

    if (gameData && gameData.id && user) {
      try {
        const gameRef = doc(db, 'formulaRaceGames', gameData.id);

        if (gameData.status === 'playing') {
          const myPlayerNum = user.uid === gameData.player1 ? 1 : 2;
          const winnerNum = myPlayerNum === 1 ? 2 : 1;
          await updateDoc(gameRef, {
            status: 'completed',
            winner: winnerNum,
          });
        } else if (gameData.status === 'waiting') {
          if (gameData.player1 === user.uid) {
            await deleteDoc(gameRef);
          }
        }
      } catch {
        // ignore
      }
    }

    setGameData(null);
    setIsHost(false);
    setJoinCode('');
    setWinnerText('');
    setError('');
    setScreen('lobby');
    setShowReconnectScreen(false);
    setOpponentDisconnected(false);
    setShowAfkWarning(false);
    setAfkCountdown(0);
    sessionStorage.removeItem(SESSION_KEY);
  }, [gameData, user]);

  const handleLeaveGame = useCallback(async () => {
    if (gameData?.status === 'playing') {
      setShowLeaveConfirm(true);
      return;
    }

    if (screen === 'lobby') {
      router.push('/games');
      return;
    }

    await performLeaveGame();
  }, [screen, gameData, router, performLeaveGame]);

  const addToChamber = useCallback(
    (element: LabElement) => {
      if (!isRoundActive) {
        return;
      }

      setChamberElements((current) => [...current, element]);
    },
    [isRoundActive],
  );

  const removeFromChamber = useCallback((symbol: string) => {
    if (!isRoundActive) {
      return;
    }

    setChamberElements((current) => {
      const index = current.findLastIndex((el) => el.symbol === symbol);
      if (index === -1) {
        return current;
      }

      const next = [...current];
      next.splice(index, 1);
      return next;
    });
  }, [isRoundActive]);

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
        addToChamber(parsed);
      } catch {
        // ignore
      }
    },
    [addToChamber, isRoundActive],
  );

  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLButtonElement>, element: LabElement) => {
      if (!isRoundActive) {
        return;
      }

      if (dragTimerRef.current) {
        clearTimeout(dragTimerRef.current);
      }

      const touch = event.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;

      setTouchDrag({
        isDragging: false,
        element,
        x: startX,
        y: startY,
        startX,
        startY,
      });

      dragTimerRef.current = setTimeout(() => {
        isDraggingRef.current = true;
        setTouchDrag((current) => ({ ...current, isDragging: true }));
        if (navigator.vibrate) {
          navigator.vibrate(20);
        }
      }, TOUCH_DRAG_HOLD_DELAY);
    },
    [isRoundActive],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!touchDrag.element) {
        return;
      }

      const touch = event.touches[0];
      const x = touch.clientX;
      const y = touch.clientY;

      if (!isDraggingRef.current) {
        const distance = Math.sqrt(
          (x - touchDrag.startX) ** 2 + (y - touchDrag.startY) ** 2,
        );
        if (distance > 10) {
          if (dragTimerRef.current) {
            clearTimeout(dragTimerRef.current);
            dragTimerRef.current = null;
          }
        }
        return;
      }

      event.preventDefault();
      setTouchDrag((current) => ({ ...current, x, y }));

      if (chamberTouchRef.current) {
        const rect = chamberTouchRef.current.getBoundingClientRect();
        const hovered =
          x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        setIsChamberHovered(hovered);
      }
    },
    [touchDrag.element, touchDrag.startX, touchDrag.startY],
  );

  const handleTouchEnd = useCallback(() => {
    if (dragTimerRef.current) {
      clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }

    if (isDraggingRef.current && touchDrag.element && isChamberHovered) {
      addToChamber(touchDrag.element);
    }

    isDraggingRef.current = false;
    setTouchDrag(createEmptyTouchDragState());
    setIsChamberHovered(false);
  }, [addToChamber, isChamberHovered, touchDrag.element]);

  useEffect(() => {
    if (touchDrag.element) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchEnd, handleTouchMove, touchDrag.element]);

  const handleCheck = useCallback(async () => {
    if (!gameData || !isRoundActive || chamberElements.length === 0 || !user || !currentRecipe) {
      return;
    }

    setCheckBusy(true);
    setCheckFeedback(null);

    try {
      const counts = chamberElements.reduce<Record<string, number>>((acc, el) => {
        acc[el.symbol] = (acc[el.symbol] || 0) + 1;
        return acc;
      }, {});

      const result = attemptRecipeCombination(chamberElements, currentRecipe);
      const feedback = getCheckFeedback(result, currentRecipe);
      setCheckFeedback(feedback);

      if (result.kind === 'success') {
        const gameRef = doc(db, 'formulaRaceGames', gameData.id);

        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(gameRef);
          if (!snap.exists()) {
            return;
          }

          const latest = snap.data() as GameData;
          if (latest.status !== 'playing' || latest.roundEnded) {
            return;
          }

          const isPlayer1 = latest.player1 === user.uid;
          transaction.update(gameRef, {
            roundEnded: true,
            roundWinner: isPlayer1 ? 1 : 2,
            roundResolvedAt: serverTimestamp(),
            p1Score: isPlayer1 ? latest.p1Score + 1 : latest.p1Score,
            p2Score: isPlayer1 ? latest.p2Score : latest.p2Score + 1,
          });
        });
      }
    } catch (checkError) {
      console.error('[FormulaRace] Check failed:', checkError);
      setCheckFeedback({ kind: 'error', title: 'System Error', message: 'Failed to validate combination.' });
    } finally {
      setCheckBusy(false);
    }
  }, [gameData, isRoundActive, chamberElements, user, currentRecipe]);

  const handleMatchComplete = useCallback(async () => {
    if (!gameData) {
      return;
    }

    try {
      const gameRef = doc(db, 'formulaRaceGames', gameData.id);
      let winner: RoundWinner = 0;
      if (gameData.p1Score > gameData.p2Score) {
        winner = 1;
      } else if (gameData.p2Score > gameData.p1Score) {
        winner = 2;
      }

      await updateDoc(gameRef, {
        status: 'completed',
        winner,
      });
    } catch {
      // ignore
    }
  }, [gameData]);

  const handleManualAdvance = useCallback(async () => {
    if (!gameData || myPlayerNum !== 1) {
      return;
    }

    try {
      const nextIndex = pickRecipeIndex(gameData.currentRecipeIndex);
      const gameRef = doc(db, 'formulaRaceGames', gameData.id);

      await updateDoc(gameRef, {
        currentRound: gameData.currentRound + 1,
        currentRecipeIndex: nextIndex,
        currentPoolSymbols: buildRoundPoolSymbols(nextIndex),
        roundStartTime: serverTimestamp(),
        roundEnded: false,
        roundWinner: null,
        roundResolvedAt: null,
      });
    } catch {
      // ignore
    }
  }, [gameData, myPlayerNum]);

  useEffect(() => {
    if (
      screen !== 'game' ||
      !gameData ||
      gameData.status !== 'playing' ||
      !gameData.roundEnded ||
      gameData.winner != null
    ) {
      if (roundResultTimerRef.current) {
        clearInterval(roundResultTimerRef.current);
        roundResultTimerRef.current = undefined;
      }
      return;
    }

    if (activeResultKeyRef.current === roundKey) {
      return;
    }

    const resolvedAtMs = getSharedTimerMs(gameData.roundResolvedAt);
    if (!resolvedAtMs) {
      return;
    }

    activeResultKeyRef.current = roundKey;
    const initialElapsedMs = getElapsedFromSharedTimer(
      gameData.roundResolvedAt,
      ROUND_RESULT_DELAY_MS,
    );
    resultElapsedBaseMsRef.current = initialElapsedMs;
    resultTickStartedAtRef.current = performance.now();
    setRoundResultCountdown(getRemainingSeconds(ROUND_RESULT_DELAY_MS, initialElapsedMs));

    const syncResultTimer = () => {
      const elapsedMs =
        resultElapsedBaseMsRef.current +
        (performance.now() - resultTickStartedAtRef.current);
      setRoundResultCountdown(getRemainingSeconds(ROUND_RESULT_DELAY_MS, elapsedMs));
    };

    syncResultTimer();
    roundResultTimerRef.current = setInterval(syncResultTimer, 250);

    return () => {
      if (roundResultTimerRef.current) {
        clearInterval(roundResultTimerRef.current);
        roundResultTimerRef.current = undefined;
      }
    };
  }, [gameData, gameData?.roundEnded, gameData?.status, roundKey, screen]);

  useEffect(() => {
    if (
      myPlayerNum !== 1 ||
      !gameData ||
      !gameData.roundEnded ||
      gameData.winner != null ||
      roundResultCountdown > 0
    ) {
      return;
    }

    if (autoAdvanceRoundKeyRef.current === roundKey) {
      return;
    }

    autoAdvanceRoundKeyRef.current = roundKey;
    if (gameData.currentRound >= 5) {
      void handleMatchComplete();
    } else {
      void handleManualAdvance();
    }
  }, [gameData, handleManualAdvance, handleMatchComplete, myPlayerNum, roundKey, roundResultCountdown]);

  useEffect(() => {
    if (gameData) {
      previousGameStateRef.current = {
        status: gameData.status,
        currentRound: gameData.currentRound,
        roundEnded: gameData.roundEnded,
      };
    }
  }, [gameData]);

  if (!user) {
    return (
      <div className="w-full max-w-full mx-auto p-5 min-h-screen flex flex-col items-center justify-center">
        <Link href="/games" className="self-start mb-4 text-cyan-500 font-medium hover:opacity-80 transition-opacity">
          &larr; Leave Game
        </Link>
        <div className="relative w-full max-w-[1000px] h-[400px] bg-[var(--bg-card)] p-8 rounded-[32px] text-center shadow-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <h1 className="text-4xl font-extrabold mb-4">🧪 Formula Race</h1>
          <p className="text-xl text-[var(--text-light)]">Please sign in to play.</p>
        </div>
      </div>
    );
  }

  return (
    <MultiplayerContainer
      gameTitle="Chemical Formula Race"
      onLeave={handleLeaveGame}
      className={screen === 'game' ? 'h-full' : ''}
    >
      {/* Reconnection Screen */}
      {showReconnectScreen && (
        <MultiplayerOverlay
          type="reconnecting"
          timeout={reconnectTimeout}
          onReconnect={handleReconnect}
          onDrop={handleDropGame}
          error={reconnectError}
        />
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-sm rounded-lg bg-[var(--bg-card)] p-6 text-center shadow-xl">
            <h3 className="mb-4 text-xl font-bold text-[var(--text-main)]">
              Leave Game?
            </h3>
            <p className="mb-6 text-[var(--text-secondary)]">
              Are you sure you want to leave? The other player will win!
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
                onClick={performLeaveGame}
              >
                Leave Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================== Lobby Screen ======================== */}
      {screen === 'lobby' && (
        <MultiplayerLobby
          title="🧪 Formula Race"
          description="Build chemical formulas faster than your opponent to win rounds and the match!"
          tutorial={gameTutorials.chemFormulaRace}
          accentColor="#0ea5e9"
          onCreateRoom={handleCreate}
          onJoinRoom={handleJoin}
          roomCodeInput={joinCode}
          setRoomCodeInput={setJoinCode}
          errorMessage={error}
          isLoading={loading}
        />
      )}

      {/* ======================== Waiting Screen ======================== */}
      {screen === 'waiting' && gameData && (
        <MultiplayerWaiting
          title="🧪 Waiting for Player 2"
          subtitle="Share the code to start the formula race!"
          roomCode={gameData.id}
          tutorial={gameTutorials.chemFormulaRace}
          accentColor="#0ea5e9"
          onCopyCode={() => {
            navigator.clipboard.writeText(gameData.id);
          }}
          onCancel={handleLeaveGame}
        />
      )}

      {/* ======================== Game Screen ======================== */}
      {screen === 'game' && gameData && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Stats */}
          <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Round</span>
              <span className="text-xl sm:text-2xl font-black">{gameData.currentRound} / 5</span>
            </div>
            
            <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide">
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center min-w-[100px] sm:min-w-[120px]",
                myPlayerNum === 1 ? "bg-white dark:bg-slate-800 border-sky-500 shadow-lg scale-105" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
              )}>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase truncate w-full text-center px-1">{gameData.p1Name}</span>
                <span className="text-xl sm:text-2xl font-black text-sky-600">{gameData.p1Score}</span>
              </div>
              <div className={cn(
                "p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col items-center min-w-[100px] sm:min-w-[120px]",
                myPlayerNum === 2 ? "bg-white dark:bg-slate-800 border-sky-500 shadow-lg scale-105" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
              )}>
                <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase truncate w-full text-center px-1">{gameData.p2Name}</span>
                <span className="text-xl sm:text-2xl font-black text-sky-600">{gameData.p2Score}</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Time</span>
              <span className={cn(
                "text-xl sm:text-2xl font-black transition-colors",
                timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-slate-700 dark:text-slate-200"
              )}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* Target Recipe */}
          <div className="mb-8 flex justify-center">
            <div className="glass-panel p-6 rounded-[32px] border-2 border-sky-500/20 max-w-xl w-full flex flex-col items-center relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div 
                    className="h-full bg-sky-500 transition-all duration-300 ease-linear"
                    style={{ width: `${(timeLeft / ROUND_TIME) * 100}%` }}
                  />
               </div>
               <span className="text-[10px] font-bold text-sky-500 uppercase tracking-[0.2em] mb-2 sm:mb-4 px-2 text-center">Build Target</span>
               <h2 className="text-2xl sm:text-4xl font-black mb-1 sm:mb-2 tracking-tighter text-center px-4">
                 {currentRecipe?.product.name}
               </h2>
               <p className="text-lg sm:text-xl font-bold text-slate-400 mb-4 sm:mb-6">{currentRecipe?.product.symbol}</p>
               
               {/* Hint Section */}
               <div className="flex items-center gap-3">
                 {showHint ? (
                   <div className="flex flex-wrap justify-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                     {currentRecipe && Object.entries(currentRecipe.reactants).map(([symbol, count]) => (
                       <div key={symbol} className="bg-sky-100 dark:bg-sky-900/30 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-sm font-bold text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                         {count}x {symbol}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="flex items-center gap-2 text-slate-400 text-sm font-medium italic">
                     <span className="w-5 h-5 flex items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 not-italic text-[10px] font-bold">?</span>
                     Hint in {hintCountdown}s
                   </div>
                 )}
               </div>
            </div>
          </div>

          {/* Chamber & Pool */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 min-h-0">
            {/* Reaction Chamber */}
            <div className="flex flex-col min-h-0">
              <div 
                ref={chamberTouchRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDropToChamber}
                className={cn(
                  "flex-1 relative glass-panel rounded-[40px] border-4 border-dashed transition-all flex flex-wrap content-start justify-center p-8 gap-4 overflow-y-auto",
                  isDragOver ? "border-sky-500 bg-sky-500/5" : "border-slate-200 dark:border-slate-800",
                  "scrollbar-hide"
                )}
              >
                {chamberElements.length === 0 && !isDragOver && (
                   <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-50 select-none pointer-events-none">
                      <div className="w-20 h-20 mb-4 rounded-full border-4 border-dashed border-current flex items-center justify-center">
                         <span className="text-4xl">+</span>
                      </div>
                      <p className="font-bold uppercase tracking-widest text-sm">Drop elements here</p>
                   </div>
                )}

                {chamberGroups.map((group) => (
                   <button
                     key={group.element.symbol}
                     onClick={() => removeFromChamber(group.element.symbol)}
                     className="relative group/atom animate-in zoom-in duration-300"
                   >
                     <div className={cn(
                       "w-16 h-16 rounded-3xl flex items-center justify-center text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95",
                       getElementColorClass(group.element.type)
                     )}>
                       {group.element.symbol}
                     </div>
                     {group.count > 1 && (
                       <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md">
                         {group.count}
                       </div>
                     )}
                     <div className="absolute inset-0 flex items-center justify-center bg-red-500/80 rounded-3xl opacity-0 group-hover/atom:opacity-100 transition-opacity">
                        <span className="text-white text-xs font-black uppercase">Remove</span>
                     </div>
                   </button>
                ))}
              </div>

              {/* Action Bar */}
              <div className="mt-4 flex gap-4">
                 <button 
                   onClick={() => setChamberElements([])}
                   disabled={chamberElements.length === 0 || !isRoundActive}
                   className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                 >
                   Clear All
                 </button>
                 <button 
                   onClick={handleCheck}
                   disabled={chamberElements.length === 0 || !isRoundActive || checkBusy}
                   className="flex-1 py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                 >
                   {checkBusy ? <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : "🚀 COMBINE & CHECK"}
                 </button>
              </div>
            </div>

            {/* Element Pool */}
            <div className="glass-panel p-6 rounded-[40px] border-2 border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 block text-center">Your Lab Essentials</span>
               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 sm:gap-4 overflow-y-auto scrollbar-hide flex-1">
                 {currentPoolElements.map((element) => (
                   <button
                     key={element.symbol}
                     draggable
                     onDragStart={(e) => handleDragStart(e, element)}
                     onTouchStart={(e) => handleTouchStart(e, element)}
                     onClick={() => addToChamber(element)}
                     className="h-28 glass-panel rounded-3xl p-4 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 hover:shadow-xl group"
                   >
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white mb-2 shadow-md group-hover:rotate-12 transition-transform",
                       getElementColorClass(element.type)
                     )}>
                       {element.symbol}
                     </div>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter truncate w-full text-center">{element.name}</span>
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================== Round Over Modal ======================== */}
      {gameData && gameData.roundEnded && !gameData.winner && screen === 'game' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="glass-panel max-w-lg w-full mx-4 rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-500">
              <span className="text-8xl mb-6 block animate-bounce">
                {gameData.roundWinner === 0 ? '🏁' : '✨'}
              </span>
              <h3 className="text-4xl font-black mb-4 tracking-tighter uppercase">
                {roundSummary?.title}
              </h3>
              <p className="text-xl text-slate-500 mb-8 font-medium leading-relaxed">
                {roundSummary?.message}
              </p>
              
              <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl mb-8">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Round Result</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center sm:text-left">
                       <span className="text-[10px] font-bold text-slate-400 uppercase truncate px-2">{gameData.p1Name}</span>
                       <span className={cn("text-2xl sm:text-3xl font-black", gameData.roundWinner === 1 ? "text-sky-500" : "text-slate-700 dark:text-slate-300")}>
                         {gameData.p1Score}
                       </span>
                    </div>
                    <div className="flex flex-col p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-center sm:text-left">
                       <span className="text-[10px] font-bold text-slate-400 uppercase truncate px-2">{gameData.p2Name}</span>
                       <span className={cn("text-2xl sm:text-3xl font-black", gameData.roundWinner === 2 ? "text-sky-500" : "text-slate-700 dark:text-slate-300")}>
                         {gameData.p2Score}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                 <div className="w-16 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full bg-sky-500 transition-all duration-100 ease-linear"
                      style={{ width: `${(roundResultCountdown / ROUND_RESULT_DELAY) * 100}%` }}
                    />
                 </div>
                 <p className="text-slate-400 font-bold text-sm uppercase">Next round in {roundResultCountdown}s...</p>
                 {myPlayerNum === 1 && (
                   <button 
                     onClick={handleManualAdvance}
                     className="mt-6 text-sky-500 font-bold hover:underline"
                   >
                     Skip Waiting &rarr;
                   </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* ======================== Victory Screen ======================== */}
      {screen === 'victory' && gameData && (
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95">
          <div className="text-8xl mb-6 animate-bounce">
             {gameData.winner === 0 ? '🏁' : '🏆'}
          </div>
          <h2 className="text-6xl font-black mb-4 text-[var(--text-main)] uppercase tracking-tighter text-center leading-none">
            {winnerText}
          </h2>
          <p className="text-2xl text-slate-500 mb-10 font-medium">
             The formula race match has concluded.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-12 w-full max-w-xl">
            <div className={cn(
               "text-center p-6 sm:p-8 glass-panel rounded-[32px] sm:rounded-[40px] border-4 transition-all",
               gameData.winner === 1 ? "border-sky-500 shadow-xl scale-105" : "border-slate-100 dark:border-slate-900/40 opacity-80"
            )}>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 sm:mb-4 tracking-[0.2em] truncate px-2">{gameData.p1Name}</div>
              <div className="text-4xl sm:text-6xl font-black">{gameData.p1Score}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2">TOTAL POINTS</div>
            </div>
            <div className={cn(
               "text-center p-6 sm:p-8 glass-panel rounded-[32px] sm:rounded-[40px] border-4 transition-all",
               gameData.winner === 2 ? "border-sky-500 shadow-xl scale-105" : "border-slate-100 dark:border-slate-900/40 opacity-80"
            )}>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-2 sm:mb-4 tracking-[0.2em] truncate px-2">{gameData.p2Name}</div>
              <div className="text-4xl sm:text-6xl font-black">{gameData.p2Score}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2">TOTAL POINTS</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <ShareGameScore 
              gameName="Chemical Formula Race" 
              customMessage={`I scored ${myPlayerNum === 1 ? gameData.p1Score : gameData.p2Score} points in the Chemical Formula Race! 🧪`} 
            />
            <button
               onClick={handleLeaveGame}
               className="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95"
            >
              🔄 Play Again
            </button>
            <GameRating gameId="chemical-formula-race" gameName="Chemical Formula Race" />
          </div>
        </div>
      )}

      {/* ======================== Feedback Toast ======================== */}
      {checkFeedback && (
         <div 
           className={cn(
             "fixed bottom-24 left-1/2 -translate-x-1/2 z-[150] px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-500",
             checkFeedback.kind === 'success' && "bg-emerald-500 text-white",
             checkFeedback.kind === 'warning' && "bg-amber-500 text-white",
             checkFeedback.kind === 'error' && "bg-red-500 text-white",
             checkFeedback.kind === 'info' && "bg-sky-500 text-white"
           )}
         >
            <div className="flex flex-col">
               <span className="font-black text-sm uppercase tracking-widest">{checkFeedback.title}</span>
               <span className="text-sm font-medium opacity-90">{checkFeedback.message}</span>
            </div>
            <button 
              onClick={() => setCheckFeedback(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20"
            >
              ✕
            </button>
         </div>
      )}

      {/* Portals for Touch Drag */}
      {touchDrag.isDragging && touchDrag.element &&
        createPortal(
          <div
            className={cn(
              "fixed pointer-events-none z-[1000] w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-2xl transition-transform",
              getElementColorClass(touchDrag.element.type)
            )}
            style={{
              left: touchDrag.x - 32,
              top: touchDrag.y - 32,
              transform: isChamberHovered ? 'scale(1.2)' : 'scale(1)',
            }}
          >
            {touchDrag.element.symbol}
          </div>,
          document.body,
        )}
    </MultiplayerContainer>
  );
}

function getElementColorClass(category: string): string {
  if (category.includes('noble')) return 'bg-purple-500';
  if (category.includes('alkali')) return 'bg-red-500';
  if (category.includes('alkaline')) return 'bg-orange-500';
  if (category.includes('metalloid')) return 'bg-emerald-500';
  if (category.includes('nonmetal')) return 'bg-sky-500';
  if (category.includes('halogen')) return 'bg-indigo-500';
  if (category.includes('transition')) return 'bg-amber-500';
  return 'bg-slate-500';
}
