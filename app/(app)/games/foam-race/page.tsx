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

import { ShareGameScore } from '@/components/game/ShareGameScore';
import { GameTutorial } from '@/components/game/GameTutorial';
import GameRating from '@/components/game/GameRating';
import { gameTutorials } from '@/lib/data/game-tutorials';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { MultiplayerLobby } from '@/components/game/Multiplayer/MultiplayerLobby';
import { MultiplayerWaiting } from '@/components/game/Multiplayer/MultiplayerWaiting';
import { MultiplayerOverlay } from '@/components/game/Multiplayer/MultiplayerOverlay';
import { MultiplayerContainer } from '@/components/game/Multiplayer/MultiplayerContainer';

/* ─── Ingredient data ─── */

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
  type: 'reactant' | 'catalyst' | 'stabilizer' | 'dye' | 'filler';
  power?: number;
  speed?: number;
  volume?: number;
  color?: string;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'h2o2_30', name: '30% H₂O₂', emoji: '🧪', power: 30, type: 'reactant' },
  { id: 'h2o2_20', name: '20% H₂O₂', emoji: '🧪', power: 20, type: 'reactant' },
  { id: 'h2o2_10', name: '10% H₂O₂', emoji: '🧪', power: 10, type: 'reactant' },
  { id: 'yeast', name: 'Yeast', emoji: '🍞', speed: 1.5, type: 'catalyst' },
  { id: 'ki', name: 'Potassium Iodide', emoji: '🧂', speed: 3.0, type: 'catalyst' },
  { id: 'soap', name: 'Dish Soap', emoji: '🧼', volume: 2.0, type: 'stabilizer' },
  { id: 'color_r', name: 'Red Dye', emoji: '🔴', color: '#ff4e50', type: 'dye' },
  { id: 'color_b', name: 'Blue Dye', emoji: '🔵', color: '#4facfe', type: 'dye' },
  { id: 'water', name: 'Water', emoji: '🫗', power: 0, speed: 0.5, type: 'filler' },
];

/* ─── Grid item ─── */

interface GridItem extends Ingredient {
  collectedBy: string | null;
}

/* ─── Firestore game document shape ─── */

const SESSION_KEY = 'foamRaceSession';

interface GameData {
  roomCode: string;
  player1: string;
  player1Name: string;
  player2: string | null;
  player2Name: string | null;
  p1Inventory: Ingredient[];
  p2Inventory: Ingredient[];
  grid: GridItem[];
  currentTurn: 1 | 2;
  status: 'waiting' | 'playing' | 'completed';
  p1FoamHeight: number;
  p2FoamHeight: number;
  createdAt: ReturnType<typeof serverTimestamp>;
  lastActiveAt: ReturnType<typeof serverTimestamp>;
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

interface WinnerInfo {
  text: string;
  p1Score: number;
  p2Score: number;
}

/* ─── Helpers ─── */

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createInitialGrid(): GridItem[] {
  const pool: Ingredient[] = [
    // 3 h2o2 variants
    INGREDIENTS[0], INGREDIENTS[1], INGREDIENTS[2],
    // 2 catalysts
    INGREDIENTS[3], INGREDIENTS[4],
    // 2 soaps
    INGREDIENTS[5], INGREDIENTS[5],
    // 2 dyes
    INGREDIENTS[6], INGREDIENTS[7],
    // 7 water to fill to 16
    INGREDIENTS[8], INGREDIENTS[8], INGREDIENTS[8], INGREDIENTS[8],
    INGREDIENTS[8], INGREDIENTS[8], INGREDIENTS[8],
  ];
  return shuffle(pool).map((item) => ({ ...item, collectedBy: null }));
}

function calculateScore(inv: Ingredient[]): number {
  let power = 0;
  let speed = 1;
  let volume = 1;
  inv.forEach((i) => {
    if (i.power) power += i.power;
    if (i.speed) speed = Math.max(speed, i.speed);
    if (i.volume) volume *= i.volume;
  });
  return power * speed * volume;
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

/* ─── Component ─── */

type Screen = 'lobby' | 'waiting' | 'game' | 'victory';

export default function FoamRacePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [winnerInfo, setWinnerInfo] = useState<WinnerInfo | null>(null);
  const [error, setError] = useState('');

  // Disconnection states
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectTimeout, setReconnectTimeout] = useState(0);
  const [showReconnectScreen, setShowReconnectScreen] = useState(false);
  const [reconnectError, setReconnectError] = useState('');

  // AFK states
  const [showAfkWarning, setShowAfkWarning] = useState(false);
  const [afkCountdown, setAfkCountdown] = useState(0);

  // Leave confirmation
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const gameIdRef = useRef<string>(undefined);
  const unsubRef = useRef<(() => void)>(undefined);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastActivityRef = useRef<number>(0);
  const prevTurnRef = useRef<1 | 2 | null>(null);
  const afkWarningTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkTriggerTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkCountdownIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  /* ─── Subscribe to game doc ─── */

  const subscribeToGame = useCallback((gameId: string) => {
    if (unsubRef.current) unsubRef.current();

    gameIdRef.current = gameId;
    const unsub = onSnapshot(doc(db, 'foamGames', gameId), (snap) => {
      if (snap.exists()) {
        setGameData(snap.data() as GameData);
      } else {
        // Game was deleted
        setGameData(null);
        setScreen('lobby');
        sessionStorage.removeItem(SESSION_KEY);
      }
    });
    unsubRef.current = unsub;
  }, []);

  /* ─── Session restoration on mount ─── */

  useEffect(() => {
    if (!user) return;

    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (!storedSession) return;

    const session: GameSession = JSON.parse(storedSession);

    const checkAndRestoreSession = async () => {
      try {
        const gameRef = doc(db, 'foamGames', session.roomCode);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const gameData = gameSnap.data() as GameData;

        const isPlayer1 = gameData.player1 === user.uid;
        const isPlayer2 = gameData.player2 === user.uid;
        const myRole: 1 | 2 | null = isPlayer1 ? 1 : isPlayer2 ? 2 : null;

        if (!myRole) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const isDisconnected = gameData.disconnected?.[myRole === 1 ? 'player1' : 'player2'];

        if (isDisconnected) {
          const disconnectedAt = gameData.disconnectedAt?.[myRole === 1 ? 'player1' : 'player2'] as Timestamp | undefined;
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
        subscribeToGame(session.roomCode);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    checkAndRestoreSession();
  }, [user, subscribeToGame]);

  /* ─── React to gameData changes ─── */

  useEffect(() => {
    if (!gameData) return;

    if (gameData.status === 'waiting') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen('waiting');
    } else if (gameData.status === 'playing') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen('game');
    } else if (gameData.status === 'completed') {
      const p1Score = calculateScore(gameData.p1Inventory);
      const p2Score = calculateScore(gameData.p2Inventory);

      let text: string;
      if (p1Score > p2Score) {
        text = `${gameData.player1Name} wins!`;
      } else if (p2Score > p1Score) {
        text = `${gameData.player2Name} wins!`;
      } else {
        text = "It's a tie!";
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWinnerInfo({ text, p1Score, p2Score });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setScreen('victory');
    }
  }, [gameData]);

  /* ─── Cleanup on unmount ─── */

  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (reconnectTimeoutRef.current) clearInterval(reconnectTimeoutRef.current);
      if (afkWarningTimeoutRef.current) clearTimeout(afkWarningTimeoutRef.current);
      if (afkTriggerTimeoutRef.current) clearTimeout(afkTriggerTimeoutRef.current);
      if (afkCountdownIntervalRef.current) clearInterval(afkCountdownIntervalRef.current);
    };
  }, []);

  /* ─── Create game ─── */

  const createGame = useCallback(async () => {
    if (!user) return;
    setError('');

    const roomCode = generateRoomCode();
    const displayName = await getUserDisplayName(user.uid);
    const grid = createInitialGrid();

    const newGame: GameData = {
      roomCode,
      player1: user.uid,
      player1Name: displayName,
      player2: null,
      player2Name: null,
      p1Inventory: [],
      p2Inventory: [],
      grid,
      currentTurn: 1,
      status: 'waiting',
      p1FoamHeight: 0,
      p2FoamHeight: 0,
      createdAt: serverTimestamp() as GameData['createdAt'],
      lastActiveAt: serverTimestamp() as GameData['lastActiveAt'],
      disconnected: {},
    };

    await setDoc(doc(db, 'foamGames', roomCode), newGame);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      roomCode,
      isHost: true,
      playerRole: 1,
    } as GameSession));
    setIsHost(true);
    subscribeToGame(roomCode);
  }, [user, subscribeToGame]);

  /* ─── Join game ─── */

  const joinGame = useCallback(async () => {
    if (!user) return;
    setError('');

    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code.');
      return;
    }

    const gameRef = doc(db, 'foamGames', code);
    const snap = await getDoc(gameRef);

    if (!snap.exists()) {
      setError('Game not found.');
      return;
    }

    const data = snap.data() as GameData;

    if (data.status !== 'waiting') {
      setError('Game already started or finished.');
      return;
    }

    if (data.player1 === user.uid) {
      setError('You cannot join your own game.');
      return;
    }

    const displayName = await getUserDisplayName(user.uid);

    await updateDoc(gameRef, {
      player2: user.uid,
      player2Name: displayName,
      status: 'playing',
    });

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      roomCode: code,
      isHost: false,
      playerRole: 2,
    } as GameSession));
    setIsHost(false);
    subscribeToGame(code);
  }, [user, joinCode, subscribeToGame]);

  /* ─── Collect ingredient ─── */

  const collectIngredient = useCallback(
    async (index: number) => {
      if (!user || !gameData || !gameIdRef.current) return;
      if (gameData.status !== 'playing') return;
      if (opponentDisconnected) return;

      const item = gameData.grid[index];
      if (item.collectedBy) return;

      // Check if it's this player's turn
      const isP1 = gameData.player1 === user.uid;
      const isP2 = gameData.player2 === user.uid;
      if (!isP1 && !isP2) return;

      // Check if it's player's turn
      const playerNumber = isP1 ? 1 : 2;
      if (gameData.currentTurn !== playerNumber) return;
      if (gameData.currentTurn !== playerNumber) return;

      // Check if this player already collected 4
      const currentInv = isP1 ? gameData.p1Inventory : gameData.p2Inventory;
      if (currentInv.length >= 4) return;

      // Update grid
      const newGrid = gameData.grid.map((g, i) =>
        i === index ? { ...g, collectedBy: user.uid } : g
      );

      // Update inventory
      const ingredient: Ingredient = {
        id: item.id,
        name: item.name,
        emoji: item.emoji,
        type: item.type,
        ...(item.power !== undefined && { power: item.power }),
        ...(item.speed !== undefined && { speed: item.speed }),
        ...(item.volume !== undefined && { volume: item.volume }),
        ...(item.color !== undefined && { color: item.color }),
      };

      const newInv = [...currentInv, ingredient];

      // Count total collected
      const totalCollected =
        (isP1 ? newInv.length : gameData.p1Inventory.length) +
        (isP2 ? newInv.length : gameData.p2Inventory.length);

      const isCompleted = totalCollected >= 8;
      const nextTurn: 1 | 2 = gameData.currentTurn === 1 ? 2 : 1;

      const updates: Record<string, unknown> = {
        grid: newGrid,
        currentTurn: isCompleted ? gameData.currentTurn : nextTurn,
        ...(isP1 && { p1Inventory: newInv }),
        ...(isP2 && { p2Inventory: newInv }),
      };

      if (isCompleted) {
        const p1Inv = isP1 ? newInv : gameData.p1Inventory;
        const p2Inv = isP2 ? newInv : gameData.p2Inventory;
        const p1Score = calculateScore(p1Inv);
        const p2Score = calculateScore(p2Inv);
        updates.status = 'completed';
        updates.p1FoamHeight = p1Score;
        updates.p2FoamHeight = p2Score;
      }

      await updateDoc(doc(db, 'foamGames', gameIdRef.current), updates);
    },
    [user, gameData]
  );

  /* ─── Leave game ─── */

  const performLeaveGame = useCallback(async () => {
    setShowLeaveConfirm(false);

    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = undefined;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
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
        const gameRef = doc(db, 'foamGames', gameIdRef.current);

        if (gameData.status === 'playing') {
          const myPlayerNum = user?.uid === gameData.player1 ? 1 : 2;
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
    setWinnerInfo(null);
    setError('');
    setScreen('lobby');
    setShowReconnectScreen(false);
    setOpponentDisconnected(false);
    setShowAfkWarning(false);
    setAfkCountdown(0);
    sessionStorage.removeItem(SESSION_KEY);
  }, [gameData, user]);

  const leaveGame = useCallback(async () => {
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

  /* ─── Play again ─── */

  const playAgain = useCallback(() => {
    leaveGame();
  }, [leaveGame]);

  /* ─── Determine whose turn it is ─── */

  const getPlayerNumber = (): 1 | 2 | null => {
    if (!user || !gameData) return null;
    if (gameData.player1 === user.uid) return 1;
    if (gameData.player2 === user.uid) return 2;
    return null;
  };

  const isMyTurn = (): boolean => {
    const pn = getPlayerNumber();
    if (!pn || !gameData) return false;
    return gameData.currentTurn === pn;
  };

  /* ─── Trigger AFK function ─── */

  const triggerAfk = useCallback(async () => {
    if (!gameIdRef.current || !user || !gameData) return;

    const myPlayerNum = gameData.player1 === user.uid ? 1 : 2;
    const myRoleKey = myPlayerNum === 1 ? 'player1' : 'player2';

    try {
      const gameRef = doc(db, 'foamGames', gameIdRef.current);
      const updateData: Record<string, unknown> = {};
      updateData[`disconnected.${myRoleKey}`] = true;
      updateData[`disconnectedAt.${myRoleKey}`] = serverTimestamp();
      await updateDoc(gameRef, updateData);
    } catch {
      // ignore
    }
  }, [gameData, user]);

  /* ─── Clear AFK timers ─── */

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

  /* ─── AFK Detection with elapsed time ─── */

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

  /* ─── Opponent disconnection detection ─── */

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
      const gameRef = doc(db, 'foamGames', gameIdRef.current);
      await updateDoc(gameRef, { status: 'completed' });
    } catch {
      // ignore
    }
  }, [gameData, user]);

  // Set up the ref callback
  useEffect(() => {
    handleOpponentTimeoutRef.current = handleOpponentTimeout;
  }, [handleOpponentTimeout]);

  /* ─── Reconnect handling ─── */

  const handleReconnect = useCallback(async () => {
    if (!gameIdRef.current || !user) return;

    try {
      const gameRef = doc(db, 'foamGames', gameIdRef.current);
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
        subscribeToGame(gameIdRef.current);
        return;
      }

      const disconnectedAtTs = disconnectedAt as Timestamp;
      if (typeof disconnectedAtTs.toMillis !== 'function') {
        setShowReconnectScreen(false);
        subscribeToGame(gameIdRef.current);
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
      subscribeToGame(gameIdRef.current);
    } catch {
      setReconnectError('Failed to reconnect');
    }
  }, [subscribeToGame]);

  const handleDropGame = useCallback(async () => {
    if (!gameIdRef.current || !user || !gameData) return;

    const myPlayerNum = user.uid === gameData.player1 ? 1 : 2;
    const winner = myPlayerNum === 1 ? 2 : 1;

    try {
      const gameRef = doc(db, 'foamGames', gameIdRef.current);
      await updateDoc(gameRef, { status: 'completed' });
    } catch {
      // ignore
    }

    sessionStorage.removeItem(SESSION_KEY);
    setShowReconnectScreen(false);
    setScreen('lobby');
    gameIdRef.current = undefined;
  }, [gameData, user]);

  /* ─── Detect when player becomes disconnected while on page ─── */

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

  /* ─── Render helpers ─── */


  if (!user) {
    return (
      <div className="w-full max-w-full mx-auto p-5 min-h-screen flex flex-col items-center justify-center">
        <Link href="/games" className="self-start mb-4 text-cyan-500 font-medium hover:opacity-80 transition-opacity">
          &larr; Leave Game
        </Link>
        <div className="relative w-full max-w-[1000px] h-[400px] bg-[var(--bg-card)] p-8 rounded-[32px] text-center shadow-2xl flex flex-col items-center justify-center">
          <h1 className="text-4xl font-extrabold mb-4">🧪 Foam Race</h1>
          <p className="text-xl text-[var(--text-light)]">Please sign in to play.</p>
        </div>
      </div>
    );
  }

  return (
    <MultiplayerContainer
      gameTitle="Foam Race"
      onLeave={leaveGame}
      className={screen === 'game' ? 'h-full' : ''}
    >
      {/* ======================== Lobby Screen ======================== */}
      {screen === 'lobby' && (
        <MultiplayerLobby
          title="🧪 Foam Race"
          description="A competitive chemistry race! Collect ingredients to make the highest chemical foam!"
          tutorial={gameTutorials.foamRace}
          accentColor="#10b981"
          onCreateRoom={createGame}
          onJoinRoom={joinGame}
          roomCodeInput={joinCode}
          setRoomCodeInput={setJoinCode}
          errorMessage={error}
        />
      )}

      {/* ======================== Waiting Screen ======================== */}
      {screen === 'waiting' && gameData && (
        <MultiplayerWaiting
          title="🧪 Waiting for Player 2"
          subtitle="Share the code to start the foam race!"
          roomCode={gameData.roomCode}
          tutorial={gameTutorials.foamRace}
          accentColor="#10b981"
          onCopyCode={() => {
            navigator.clipboard.writeText(gameData.roomCode);
          }}
          onCancel={leaveGame}
        />
      )}

      {/* ======================== Overlays ======================== */}
      {showReconnectScreen && (
        <MultiplayerOverlay
          type="reconnecting"
          timeout={reconnectTimeout}
          onReconnect={handleReconnect}
          onDrop={performLeaveGame}
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
          <h1 className="text-3xl font-extrabold mb-6 text-center">🧪 Foam Race</h1>

          {/* AFK Warning */}
          {showAfkWarning && (
            <div className="mb-4 p-3 bg-amber-500 text-white rounded-xl font-bold animate-pulse">
              ⚠️ You will be marked AFK in {afkCountdown} seconds - Move your mouse or press a key!
            </div>
          )}

          {/* Players & Progress */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8">
             {/* Player 1 */}
             <div className={cn(
               "relative p-4 md:p-6 rounded-3xl border-2 transition-all overflow-hidden",
               gameData.player1 === user.uid && "ring-4 ring-emerald-500/30 ring-offset-2",
               gameData.currentTurn === 1 && gameData.status === 'playing' ? "bg-white dark:bg-slate-800 scale-105 shadow-xl border-emerald-500" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
             )}>
                {/* Foam visual */}
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-emerald-400/20 transition-all duration-1000 ease-out"
                  style={{ height: `${Math.min(100, (gameData.p1FoamHeight / 500) * 100)}%` }}
                />
                <div className="relative z-10 flex md:flex-col items-center justify-between md:justify-center gap-4">
                  <div className="flex items-center gap-3 md:flex-col md:text-center">
                    <div className="text-3xl md:text-4xl">🧑‍🔬</div>
                    <div>
                      <div className="font-bold text-lg md:text-xl truncate max-w-[120px] md:max-w-none">{gameData.player1Name}</div>
                      <div className="text-xs text-slate-500">Player 1</div>
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-emerald-600">{Math.round(gameData.p1FoamHeight)}cm</div>
                </div>
             </div>

             {/* Player 2 */}
             <div className={cn(
               "relative p-4 md:p-6 rounded-3xl border-2 transition-all overflow-hidden",
               gameData.player2 === user.uid && "ring-4 ring-cyan-500/30 ring-offset-2",
               gameData.currentTurn === 2 && gameData.status === 'playing' ? "bg-white dark:bg-slate-800 scale-105 shadow-xl border-cyan-500" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
             )}>
                {/* Foam visual */}
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-cyan-400/20 transition-all duration-1000 ease-out"
                  style={{ height: `${Math.min(100, (gameData.p2FoamHeight / 500) * 100)}%` }}
                />
                <div className="relative z-10 flex md:flex-col items-center justify-between md:justify-center gap-4">
                  <div className="flex items-center gap-3 md:flex-col md:text-center">
                    <div className="text-3xl md:text-4xl">🧑‍🔬</div>
                    <div>
                      <div className="font-bold text-lg md:text-xl truncate max-w-[120px] md:max-w-none">{gameData.player2Name}</div>
                      <div className="text-xs text-slate-500">Player 2</div>
                    </div>
                  </div>
                  <div className="text-2xl md:text-3xl font-black text-cyan-600">{Math.round(gameData.p2FoamHeight)}cm</div>
                </div>
             </div>
          </div>

          {/* Turn indicator */}
          <div className={cn(
            "inline-block mx-auto py-3 px-10 rounded-2xl font-bold text-xl mb-8 tracking-wide transition-all duration-500",
            gameData.currentTurn === (gameData.player1 === user.uid ? 1 : 2)
              ? "bg-emerald-500 text-white shadow-lg scale-110"
              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
          )}>
            {gameData.currentTurn === (gameData.player1 === user.uid ? 1 : 2) 
              ? "🎯 YOUR TURN" 
              : `⏳ WAITING FOR ${gameData.currentTurn === 1 ? gameData.player1Name : gameData.player2Name}...`}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-2xl mx-auto w-full flex-1">
            {gameData.grid.map((item, index) => (
              <button
                key={`${item.id}-${index}`}
                disabled={item.collectedBy !== null || gameData.currentTurn !== (gameData.player1 === user.uid ? 1 : 2)}
                onClick={() => collectIngredient(index)}
                className={cn(
                  "aspect-square rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden border-2",
                  item.collectedBy === null
                    ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer"
                    : "bg-slate-100 dark:bg-slate-900 border-transparent opacity-40 cursor-not-allowed"
                )}
              >
                <span className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">{item.emoji}</span>
                <span className="text-[10px] font-bold uppercase tracking-tight text-center leading-tight">{item.name}</span>
                {item.collectedBy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                    <div className="w-8 h-8 rounded-full bg-slate-400 text-white flex items-center justify-center font-bold">
                       {item.collectedBy === gameData.player1 ? "1" : "2"}
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================== Victory Screen ======================== */}
      {screen === 'victory' && winnerInfo && (
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95">
          <div className="text-8xl mb-8 animate-bounce">🏆</div>
          <h2 className="text-5xl font-black mb-4 text-[var(--text-main)] uppercase tracking-tighter text-center">
            {winnerInfo.text}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10 mb-12 w-full max-w-md">
            <div className="text-center p-4 md:p-6 glass-panel rounded-3xl">
              <div className="text-xs md:text-sm font-bold text-slate-500 uppercase mb-2 truncate px-2">{gameData?.player1Name}</div>
              <div className="text-3xl md:text-4xl font-black text-emerald-500">{Math.round(winnerInfo.p1Score)}</div>
            </div>
            <div className="text-center p-4 md:p-6 glass-panel rounded-3xl">
              <div className="text-xs md:text-sm font-bold text-slate-500 uppercase mb-2 truncate px-2">{gameData?.player2Name}</div>
              <div className="text-3xl md:text-4xl font-black text-cyan-500">{Math.round(winnerInfo.p2Score)}</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <ShareGameScore gameName="Foam Race" customMessage={`I just played Foam Race! My score: ${Math.round(gameData?.player1 === user?.uid ? winnerInfo.p1Score : winnerInfo.p2Score)}`} />
            <button
               onClick={playAgain}
               className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xl shadow-lg transition-all active:scale-95"
            >
              🔄 Play Again
            </button>
            <GameRating gameId="foam-race" gameName="Foam Race" />
          </div>
        </div>
      )}

      {/* ======================== Leave Confirm Modal ======================== */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel mx-4 max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="mb-4 text-2xl font-bold text-[var(--text-main)]">
              Leave Foam Race?
            </h3>
            <p className="mb-8 text-slate-500 font-medium leading-relaxed">
              Are you sure? Your progress will be lost and the game will end.
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
