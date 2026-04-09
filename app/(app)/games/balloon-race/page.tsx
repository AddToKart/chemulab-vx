'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase/config';
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  gas?: number;
  speed?: number;
  type: 'base' | 'acid' | 'filler';
}

const INGREDIENTS: Ingredient[] = [
  { id: 'soda_high', name: 'High-Grade Soda', emoji: '🧂', gas: 30, type: 'base' },
  { id: 'soda_std', name: 'Standard Soda', emoji: '🍚', gas: 15, type: 'base' },
  { id: 'vinegar_20', name: '20% Vinegar', emoji: '🧴', speed: 3.0, type: 'acid' },
  { id: 'vinegar_5', name: '5% Vinegar', emoji: '🫗', speed: 1.0, type: 'acid' },
  { id: 'lemon', name: 'Lemon Juice', emoji: '🍋', speed: 1.5, type: 'acid' },
  { id: 'water', name: 'Water', emoji: '💧', gas: 0, speed: 0.1, type: 'filler' },
];

interface GridCard {
  ingredientId: string;
  selectedBy: number | null; // 1 or 2
}

interface GameData {
  id: string;
  player1: string;
  player2: string | null;
  p1Name: string;
  p2Name: string;
  p1Inv: Ingredient[];
  p2Inv: Ingredient[];
  grid: GridCard[];
  currentTurn: number;
  status: 'waiting' | 'playing' | 'completed';
  winner: number | null;
  p1Score: number;
  p2Score: number;
  createdAt: ReturnType<typeof serverTimestamp> | null;
  disconnected: {
    player1?: boolean;
    player2?: boolean;
  };
  disconnectedAt?: {
    player1?: ReturnType<typeof serverTimestamp>;
    player2?: ReturnType<typeof serverTimestamp>;
  };
}

interface GameSession {
  roomCode: string;
  isHost: boolean;
  playerRole: 1 | 2;
}

type Screen = 'lobby' | 'waiting' | 'game' | 'victory';

const SESSION_KEY = 'balloonRaceSession';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createInitialGrid(): GridCard[] {
  // 2 soda_high, 2 soda_std, 2 vinegar_20, 2 vinegar_5, 2 lemon, 6 water = 16
  const ids = [
    'soda_high', 'soda_high',
    'soda_std', 'soda_std',
    'vinegar_20', 'vinegar_20',
    'vinegar_5', 'vinegar_5',
    'lemon', 'lemon',
    'water', 'water', 'water', 'water', 'water', 'water',
  ];
  // Shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.map((id) => ({ ingredientId: id, selectedBy: null }));
}

function getIngredient(id: string): Ingredient {
  return INGREDIENTS.find((i) => i.id === id)!;
}

function calculateScore(inv: Ingredient[]): number {
  let gasTotal = 0;
  let speedMult = 1;
  inv.forEach((i) => {
    if (i.gas) gasTotal += i.gas;
    if (i.speed) speedMult *= i.speed;
  });
  return Math.round(gasTotal * speedMult * 100) / 100;
}

async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.username || data.displayName || 'Player';
    }
  } catch {
    // ignore
  }
  return 'Player';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BalloonRacePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [winnerText, setWinnerText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectTimeout, setReconnectTimeout] = useState(0);
  const [showReconnectScreen, setShowReconnectScreen] = useState(false);
  const [reconnectError, setReconnectError] = useState('');

  const [showAfkWarning, setShowAfkWarning] = useState(false);
  const [afkCountdown, setAfkCountdown] = useState(0);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const gameIdRef = useRef<string>(undefined);
  const unsubRef = useRef<(() => void) | undefined>(undefined);
  const lastActivityRef = useRef<number>(0);
  const prevTurnRef = useRef<number | null>(null);
  const afkWarningTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkTriggerTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkCountdownIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /* ---------- derived ---------- */
  const myPlayerNum =
    gameData && user
      ? gameData.player1 === user.uid
        ? 1
        : gameData.player2 === user.uid
          ? 2
          : null
      : null;

  const isMyTurn = gameData?.currentTurn === myPlayerNum;

  const p1Score = gameData ? calculateScore(gameData.p1Inv) : 0;
  const p2Score = gameData ? calculateScore(gameData.p2Inv) : 0;

  const p1BalloonScale = 1 + p1Score / 100;
  const p2BalloonScale = 1 + p2Score / 100;

  /* ---------- cleanup ---------- */
  const cleanup = useCallback(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = undefined;
    }
    gameIdRef.current = undefined;
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  /* ---------- Firestore listener ---------- */
  const listenToGame = useCallback(
    (gameId: string) => {
      cleanup();
      gameIdRef.current = gameId;

      const unsub = onSnapshot(doc(db, 'balloonGames', gameId), (snap) => {
        if (!snap.exists()) {
          // Game was deleted
          setGameData(null);
          setScreen('lobby');
          setError('Game was cancelled.');
          cleanup();
          return;
        }

        const data = snap.data() as Omit<GameData, 'id'>;
        const gd: GameData = { ...data, id: gameId };
        setGameData(gd);

        if (gd.status === 'waiting') {
          setScreen('waiting');
        } else if (gd.status === 'playing') {
          setScreen('game');
        } else if (gd.status === 'completed') {
          // Determine winner text
          if (gd.winner === 0) {
            setWinnerText("It's a Tie!");
          } else if (gd.winner === 1) {
            setWinnerText(`${gd.p1Name} Wins!`);
          } else {
            setWinnerText(`${gd.p2Name} Wins!`);
          }
          setScreen('victory');
        }
      });

      unsubRef.current = unsub;
    },
    [cleanup],
  );

  /* ---------- Session restoration on mount ---------- */
  useEffect(() => {
    if (!user) return;

    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (!storedSession) return;

    const session: GameSession = JSON.parse(storedSession);

    const checkAndRestoreSession = async () => {
      try {
        const gameRef = doc(db, 'balloonGames', session.roomCode);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const gameDataInner = gameSnap.data() as Omit<GameData, 'id'>;

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
            gameIdRef.current = session.roomCode;
            return;
          }
        }

        gameIdRef.current = session.roomCode;
        setIsHost(session.isHost);
        listenToGame(session.roomCode);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    checkAndRestoreSession();
  }, [user, listenToGame]);

  /* ---------- Cleanup on unmount ---------- */
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (reconnectTimeoutRef.current) clearInterval(reconnectTimeoutRef.current);
      if (afkWarningTimeoutRef.current) clearTimeout(afkWarningTimeoutRef.current);
      if (afkTriggerTimeoutRef.current) clearTimeout(afkTriggerTimeoutRef.current);
      if (afkCountdownIntervalRef.current) clearInterval(afkCountdownIntervalRef.current);
    };
  }, []);

  /* ---------- Create Game ---------- */
  const handleCreate = async () => {
    if (!user) {
      setError('You must be logged in to create a game.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const code = generateRoomCode();
      const displayName = await getUserDisplayName(user.uid);
      const grid = createInitialGrid();

      const gameDoc: Omit<GameData, 'id'> = {
        player1: user.uid,
        player2: null,
        p1Name: displayName,
        p2Name: '',
        p1Inv: [],
        p2Inv: [],
        grid,
        currentTurn: 1,
        status: 'waiting',
        winner: null,
        p1Score: 0,
        p2Score: 0,
        createdAt: serverTimestamp(),
        disconnected: {},
      };

      await setDoc(doc(db, 'balloonGames', code), gameDoc);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        roomCode: code,
        isHost: true,
        playerRole: 1,
      } as GameSession));
      setIsHost(true);
      listenToGame(code);
    } catch (err) {
      setError('Failed to create game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Join Game ---------- */
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
      const snap = await getDoc(doc(db, 'balloonGames', code));
      if (!snap.exists()) {
        setError('Game not found. Check the room code.');
        setLoading(false);
        return;
      }

      const data = snap.data() as Omit<GameData, 'id'>;
      if (data.status !== 'waiting') {
        setError('This game has already started or ended.');
        setLoading(false);
        return;
      }

      if (data.player1 === user.uid) {
        setError('You cannot join your own game.');
        setLoading(false);
        return;
      }

      const displayName = await getUserDisplayName(user.uid);

      await updateDoc(doc(db, 'balloonGames', code), {
        player2: user.uid,
        p2Name: displayName,
        status: 'playing',
      });

      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        roomCode: code,
        isHost: false,
        playerRole: 2,
      } as GameSession));
      setIsHost(false);
      listenToGame(code);
    } catch (err) {
      setError('Failed to join game. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Pick Ingredient ---------- */
  const handlePick = async (index: number) => {
    if (!gameData || !user || !myPlayerNum || !isMyTurn) return;

    const card = gameData.grid[index];
    if (card.selectedBy !== null) return;

    const ingredient = getIngredient(card.ingredientId);
    const newGrid = [...gameData.grid];
    newGrid[index] = { ...card, selectedBy: myPlayerNum };

    const newP1Inv = [...gameData.p1Inv];
    const newP2Inv = [...gameData.p2Inv];

    if (myPlayerNum === 1) {
      newP1Inv.push(ingredient);
    } else {
      newP2Inv.push(ingredient);
    }

    const totalPicked = newGrid.filter((c) => c.selectedBy !== null).length;

    const updates: Record<string, unknown> = {
      grid: newGrid,
      p1Inv: newP1Inv,
      p2Inv: newP2Inv,
      currentTurn: myPlayerNum === 1 ? 2 : 1,
    };

    // 6 total picks (3 per player) → game over
    if (totalPicked >= 6) {
      const s1 = calculateScore(newP1Inv);
      const s2 = calculateScore(newP2Inv);
      updates.status = 'completed';
      updates.p1Score = s1;
      updates.p2Score = s2;
      if (s1 > s2) {
        updates.winner = 1;
      } else if (s2 > s1) {
        updates.winner = 2;
      } else {
        updates.winner = 0;
      }
    }

    try {
      await updateDoc(doc(db, 'balloonGames', gameData.id), updates);
    } catch (err) {
      console.error('Failed to pick ingredient:', err);
    }
  };

  /* ---------- Leave / Cancel ---------- */
  const performLeaveGame = useCallback(async () => {
    setShowLeaveConfirm(false);

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = undefined;
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

    if (gameIdRef.current && gameData) {
      try {
        const gameRef = doc(db, 'balloonGames', gameIdRef.current);

        if (gameData.status === 'playing') {
          await updateDoc(gameRef, { status: 'completed' });
        } else if (gameData.status === 'waiting') {
          await deleteDoc(gameRef);
        }
      } catch {
        // ignore
      }
    }

    gameIdRef.current = undefined;
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
  }, [gameData]);

  const handleLeave = useCallback(async () => {
    if (screen === 'lobby') {
      router.push('/games');
      return;
    }

    if (gameData?.status === 'playing') {
      setShowLeaveConfirm(true);
      return;
    }

    await performLeaveGame();
  }, [screen, gameData, router, performLeaveGame]);

  /* ---------- Play Again ---------- */
  const handlePlayAgain = () => {
    performLeaveGame();
  };

  /* ---------- Trigger AFK ---------- */
  const triggerAfk = useCallback(async () => {
    if (!gameIdRef.current || !user || !gameData) return;

    const myPlayerNum = gameData.player1 === user.uid ? 1 : 2;
    const myRoleKey = myPlayerNum === 1 ? 'player1' : 'player2';

    try {
      const gameRef = doc(db, 'balloonGames', gameIdRef.current);
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

  /* ---------- AFK Detection ---------- */
  useEffect(() => {
    if (!gameData || gameData.status !== 'playing' || !user) {
      clearAfkTimers();
      return;
    }

    const myPlayerNum = gameData.player1 === user.uid ? 1 : 
                        gameData.player2 === user.uid ? 2 : null;
    if (!myPlayerNum) return;

    const isDisconnected = gameData.disconnected?.[myPlayerNum === 1 ? 'player1' : 'player2'];
    if (isDisconnected) {
      clearAfkTimers();
      return;
    }

    const myTurn = gameData.currentTurn === myPlayerNum;
    if (!myTurn) {
      clearAfkTimers();
      return;
    }

    // Detect turn change - when it becomes my turn, reset the timer fresh
    if (prevTurnRef.current !== myPlayerNum && gameData.currentTurn === myPlayerNum) {
      lastActivityRef.current = 0;
      prevTurnRef.current = myPlayerNum;
    }

    // Only initialize when it's actually my turn (not on game start)
    if (myTurn && lastActivityRef.current === 0) {
      lastActivityRef.current = Date.now();
    }

    const warningShownRef = { current: false };
    const afkTriggeredRef = { current: false };

    const checkAfk = () => {
      if (!gameIdRef.current || !user || !gameData) return;

      const currentPlayerNum = gameData.player1 === user.uid ? 1 : 
                               gameData.player2 === user.uid ? 2 : null;
      if (!currentPlayerNum || currentPlayerNum !== myPlayerNum) return;
      if (gameData.currentTurn !== myPlayerNum) return;
      if (gameData.disconnected?.[myPlayerNum === 1 ? 'player1' : 'player2']) return;
      if (gameData.status !== 'playing') return;

      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= 30000 && !afkTriggeredRef.current) {
        afkTriggeredRef.current = true;
        triggerAfk();
        return;
      }

      if (elapsed >= 20000 && !warningShownRef.current) {
        warningShownRef.current = true;
        setShowAfkWarning(true);
        setAfkCountdown(10);

        if (afkCountdownIntervalRef.current) {
          clearInterval(afkCountdownIntervalRef.current);
        }

        afkCountdownIntervalRef.current = setInterval(() => {
          setAfkCountdown((prev: number) => {
            if (prev <= 1) {
              if (afkCountdownIntervalRef.current) {
                clearInterval(afkCountdownIntervalRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };

    const afkIntervalRef = setInterval(checkAfk, 1000);

    const handleActivity = () => {
      const currentPlayerNum = gameData?.player1 === user?.uid ? 1 : 
                               gameData?.player2 === user?.uid ? 2 : null;
      if (!currentPlayerNum || currentPlayerNum !== myPlayerNum) return;
      if (gameData?.currentTurn !== myPlayerNum) return;
      if (gameData?.status !== 'playing') return;

      const isDisconnectedNow = gameData.disconnected?.[myPlayerNum === 1 ? 'player1' : 'player2'];
      if (isDisconnectedNow) {
        setShowReconnectScreen(true);
        return;
      }

      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
      afkTriggeredRef.current = false;
      clearAfkTimers();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentPlayerNum = gameData?.player1 === user?.uid ? 1 : 
                                 gameData?.player2 === user?.uid ? 2 : null;
        if (!currentPlayerNum || currentPlayerNum !== myPlayerNum) return;
        if (gameData?.currentTurn !== myPlayerNum) return;
        if (gameData?.status !== 'playing') return;

        const elapsed = Date.now() - lastActivityRef.current;
        if (elapsed >= 30000) {
          triggerAfk();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(afkIntervalRef);
      if (afkCountdownIntervalRef.current) {
        clearInterval(afkCountdownIntervalRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameData?.currentTurn, gameData?.status, user, clearAfkTimers, triggerAfk]);

  /* ---------- Opponent disconnection detection ---------- */
  const handleOpponentTimeoutRef = useRef<(() => void) | undefined>(undefined);

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
    if (!gameIdRef.current || !gameData || !user) return;

    try {
      const gameRef = doc(db, 'balloonGames', gameIdRef.current);
      await updateDoc(gameRef, { status: 'completed' });
    } catch {
      // ignore
    }
  }, [gameData, user]);

  useEffect(() => {
    handleOpponentTimeoutRef.current = handleOpponentTimeout;
  }, [handleOpponentTimeout]);

  /* ---------- Reconnect handling ---------- */
  const handleReconnect = useCallback(async () => {
    if (!gameIdRef.current || !user) return;

    try {
      const gameRef = doc(db, 'balloonGames', gameIdRef.current);
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
        listenToGame(gameIdRef.current);
        return;
      }

      const disconnectedAtTs = disconnectedAt as Timestamp;
      if (typeof disconnectedAtTs.toMillis !== 'function') {
        setShowReconnectScreen(false);
        listenToGame(gameIdRef.current);
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
      listenToGame(gameIdRef.current);
    } catch {
      setReconnectError('Failed to reconnect');
    }
  }, [user, listenToGame]);

  const handleDropGame = useCallback(async () => {
    if (!gameIdRef.current || !user || !gameData) return;

    try {
      const gameRef = doc(db, 'balloonGames', gameIdRef.current);
      await updateDoc(gameRef, { status: 'completed' });
    } catch {
      // ignore
    }

    sessionStorage.removeItem(SESSION_KEY);
    setShowReconnectScreen(false);
    setScreen('lobby');
    gameIdRef.current = undefined;
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

  /* ================================================================== */
  /*  Render                                                             */
  /* ================================================================== */

  if (!user) {
    return (
      <div className="w-full max-w-full mx-auto p-5 min-h-screen flex flex-col items-center justify-center">
        <Link href="/games" className="self-start mb-4 text-cyan-500 font-medium hover:opacity-80 transition-opacity">
          &larr; Leave Game
        </Link>
        <div className="relative w-full max-w-[1000px] h-[400px] bg-[var(--bg-card)] p-8 rounded-[32px] text-center shadow-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <h1 className="text-4xl font-extrabold mb-4">🎈 Balloon Race</h1>
          <p className="text-xl text-[var(--text-light)]">Please sign in to play.</p>
        </div>
      </div>
    );
  }

  return (
    <MultiplayerContainer
      gameTitle="Balloon Race"
      onLeave={handleLeave}
      className={screen === 'game' ? 'h-full' : ''}
    >
      {/* ======================== Lobby Screen ======================== */}
      {screen === 'lobby' && (
        <MultiplayerLobby
          title="🎈 Balloon Race"
          description="Collect chemical gasses to inflate your balloon and win the race!"
          tutorial={gameTutorials.balloonRace}
          accentColor="#3b82f6"
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
          title="🎈 Waiting for Player 2"
          subtitle="Share the code to start the balloon race!"
          roomCode={gameData.id}
          tutorial={gameTutorials.balloonRace}
          accentColor="#3b82f6"
          onCopyCode={() => {
            navigator.clipboard.writeText(gameData.id);
          }}
          onCancel={handleLeave}
        />
      )}

      {/* ======================== Overlays ======================== */}
      {showReconnectScreen && (
        <MultiplayerOverlay
          type="reconnecting"
          timeout={reconnectTimeout}
          onReconnect={handleReconnect}
          onDrop={handleDropGame}
          error={reconnectError}
        />
      )}

      {opponentDisconnected && gameData?.status === 'playing' && (
        <MultiplayerOverlay
          type="opponent-disconnected"
          timeout={reconnectTimeout}
        />
      )}

      {/* ======================== Game Screen ======================== */}
      {screen === 'game' && gameData && !showReconnectScreen && (
        <div className="flex flex-col h-full">
          <h1 className="text-3xl font-extrabold mb-6 text-center">🎈 Balloon Race</h1>

          {/* AFK Warning */}
          {showAfkWarning && (
            <div className="mb-4 p-3 bg-amber-500 text-white rounded-xl font-bold animate-pulse text-center">
              ⚠️ You will be marked AFK in {afkCountdown} seconds - Move your mouse or press a key!
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
            {/* Player 1 */}
            <div className={cn(
              "relative p-4 sm:p-6 rounded-3xl border-2 transition-all flex flex-col items-center",
              myPlayerNum === 1 && "ring-4 ring-red-500/30 ring-offset-2",
              gameData.currentTurn === 1 && gameData.status === 'playing' ? "bg-white dark:bg-slate-800 scale-105 shadow-xl border-red-500" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
            )}>
              <div className="font-bold text-lg sm:text-xl mb-4 truncate w-full text-center">{gameData.p1Name}</div>
              <div className="relative h-40 sm:h-48 flex items-end justify-center w-full">
                <div 
                  className={cn(
                    "absolute bottom-20 w-24 h-28 rounded-full transition-all duration-1000 ease-out shadow-lg",
                    "bg-gradient-to-br from-red-400 to-red-600 shadow-red-500/30"
                  )}
                  style={{ transform: `scale(${p1BalloonScale})`, transformOrigin: 'bottom' }}
                />
                <div className="w-10 sm:w-12 h-16 sm:h-20 bg-slate-200 dark:bg-slate-700 rounded-b-lg border-2 border-slate-300 dark:border-slate-600 relative z-10" />
              </div>
              <div className="mt-4 text-2xl sm:text-3xl font-black text-red-500">{p1Score.toFixed(1)}</div>
            </div>

            {/* Player 2 */}
            <div className={cn(
              "relative p-4 sm:p-6 rounded-3xl border-2 transition-all flex flex-col items-center",
              myPlayerNum === 2 && "ring-4 ring-blue-500/30 ring-offset-2",
              gameData.currentTurn === 2 && gameData.status === 'playing' ? "bg-white dark:bg-slate-800 scale-105 shadow-xl border-blue-500" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
            )}>
              <div className="font-bold text-lg sm:text-xl mb-4 truncate w-full text-center">{gameData.p2Name}</div>
              <div className="relative h-40 sm:h-48 flex items-end justify-center w-full">
                <div 
                  className={cn(
                    "absolute bottom-20 w-24 h-28 rounded-full transition-all duration-1000 ease-out shadow-lg",
                    "bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/30"
                  )}
                  style={{ transform: `scale(${p2BalloonScale})`, transformOrigin: 'bottom' }}
                />
                <div className="w-10 sm:w-12 h-16 sm:h-20 bg-slate-200 dark:bg-slate-700 rounded-b-lg border-2 border-slate-300 dark:border-slate-600 relative z-10" />
              </div>
              <div className="mt-4 text-2xl sm:text-3xl font-black text-blue-500">{p2Score.toFixed(1)}</div>
            </div>
          </div>

          {/* Turn Indicator */}
          <div className={cn(
            "inline-block mx-auto py-3 px-10 rounded-2xl font-bold text-xl mb-8 tracking-wide transition-all duration-500",
            isMyTurn
              ? "bg-blue-600 text-white shadow-lg scale-110"
              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
          )}>
            {isMyTurn 
              ? "🎯 YOUR TURN" 
              : `⏳ WAITING FOR ${gameData.currentTurn === 1 ? gameData.p1Name : gameData.p2Name}...`}
          </div>

          {/* Grid section */}
          <div className="flex flex-col flex-1 max-w-2xl mx-auto w-full">
            <p className="text-center font-bold text-slate-500 mb-4 uppercase tracking-widest text-sm">
              Pick an ingredient ({3 - (myPlayerNum === 1 ? gameData.p1Inv.length : gameData.p2Inv.length)} remaining)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
              {gameData.grid.map((card, idx) => {
                const ing = getIngredient(card.ingredientId);
                const isSelected = card.selectedBy !== null;
                return (
                  <button
                    key={idx}
                    disabled={isSelected || !isMyTurn}
                    onClick={() => handlePick(idx)}
                    className={cn(
                      "aspect-square rounded-2xl p-3 flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden border-2",
                      !isSelected
                        ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer shadow-sm"
                        : "bg-slate-100 dark:bg-slate-900 border-transparent opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="text-2xl sm:text-3xl mb-1 group-hover:scale-110 transition-transform">{ing.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-center leading-tight truncate w-full px-1">{ing.name}</span>
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                        <div className={cn(
                          "w-7 h-7 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-md",
                          card.selectedBy === 1 ? "bg-red-500" : "bg-blue-500"
                        )}>
                           {card.selectedBy}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================== Victory Screen ======================== */}
      {screen === 'victory' && gameData && (
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95">
          <div className="text-8xl mb-6 animate-bounce">
            {gameData.winner === 0 ? '🤝' : '🏆'}
          </div>
          <h2 className="text-5xl font-black mb-4 text-[var(--text-main)] uppercase tracking-tighter text-center">
            {winnerText}
          </h2>
          <p className="text-xl text-slate-500 mb-8 font-medium">
             {gameData.winner === 0
                ? 'Both balloons inflated equally!'
                : 'The bigger balloon wins the race!'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-10 w-full max-w-md">
            <div className="text-center p-4 sm:p-6 glass-panel rounded-3xl border-2 border-red-100 dark:border-red-900/30">
              <div className="text-[10px] sm:text-xs font-bold text-red-500 uppercase mb-2 tracking-widest truncate px-1">{gameData.p1Name}</div>
              <div className="text-3xl sm:text-4xl font-black">{gameData.p1Score.toFixed(1)}</div>
            </div>
            <div className="text-center p-4 sm:p-6 glass-panel rounded-3xl border-2 border-blue-100 dark:border-blue-900/30">
              <div className="text-[10px] sm:text-xs font-bold text-blue-500 uppercase mb-2 tracking-widest truncate px-1">{gameData.p2Name}</div>
              <div className="text-3xl sm:text-4xl font-black">{gameData.p2Score.toFixed(1)}</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <ShareGameScore 
              gameName="Balloon Race" 
              customMessage={`I inflated my balloon to a score of ${myPlayerNum === 1 ? gameData.p1Score : gameData.p2Score} in Balloon Race! 🎈`} 
            />
            <button
               onClick={handlePlayAgain}
               className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
            >
              🔄 Play Again
            </button>
            <GameRating gameId="balloon-race" gameName="Balloon Race" />
          </div>
        </div>
      )}

      {/* ======================== Leave Confirm Modal ======================== */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel mx-4 max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="mb-4 text-2xl font-bold text-[var(--text-main)]">
              Leave Balloon Race?
            </h3>
            <p className="mb-8 text-slate-500 font-medium leading-relaxed">
              Are you sure? Your progress will be lost and the opponent will win.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 transition-colors"
                onClick={() => setShowLeaveConfirm(false)}
              >
                No, Stay
              </button>
              <button
                className="flex-1 py-3 px-6 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95"
                onClick={performLeaveGame}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </MultiplayerContainer>
  );
}
