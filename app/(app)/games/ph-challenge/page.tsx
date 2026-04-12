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

const SUBSTANCES = [
  { id: 'citric', name: 'Citric Acid', emoji: '🍋', phChange: -2 },
  { id: 'vinegar', name: 'Vinegar', emoji: '🧴', phChange: -1 },
  { id: 'soda', name: 'Baking Soda', emoji: '🍚', phChange: 2 },
  { id: 'ammonia', name: 'Ammonia', emoji: '🧪', phChange: 3 },
  { id: 'water', name: 'Distilled Water', emoji: '💧', phChange: 0 },
] as const;

const PH_COLORS: Record<number, string> = {
  2: '#ef4444',
  4: '#f472b6',
  7: '#8b5cf6',
  10: '#10b981',
  12: '#fbbf24',
};

const TARGET_PH_OPTIONS = [2, 4, 10, 12];
const MAX_PICKS = 8; // 4 per player
const SESSION_KEY = 'phChallengeSession';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GridCard {
  substanceIndex: number; // index into SUBSTANCES
  pickedBy: null | 1 | 2;
}

interface GameData {
  roomCode: string;
  player1: string;
  player2: string | null;
  player1Name: string;
  player2Name: string;
  targetPH: number;
  p1PH: number;
  p2PH: number;
  grid: GridCard[];
  currentTurn: 1 | 2;
  status: 'waiting' | 'playing' | 'completed';
  winner: string;
  createdAt: ReturnType<typeof serverTimestamp>;
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getPHColor(ph: number): string {
  if (ph <= 3) return PH_COLORS[2];
  if (ph <= 5) return PH_COLORS[4];
  if (ph <= 8) return PH_COLORS[7];
  if (ph <= 11) return PH_COLORS[10];
  return PH_COLORS[12];
}

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

function createInitialGrid(): GridCard[] {
  // 2 citric (0), 2 vinegar (1), 2 soda (2), 2 ammonia (3), 8 water (4)
  const indices = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4];
  return shuffle(indices).map((idx) => ({
    substanceIndex: idx,
    pickedBy: null,
  }));
}

async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.username || data.displayName || 'Player';
    }
  } catch {
    /* ignore */
  }
  return 'Player';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PHChallengePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [screen, setScreen] = useState<'lobby' | 'waiting' | 'game' | 'victory'>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [winnerText, setWinnerText] = useState('');
  const [error, setError] = useState('');

  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectTimeout, setReconnectTimeout] = useState(0);
  const [showReconnectScreen, setShowReconnectScreen] = useState(false);
  const [reconnectError, setReconnectError] = useState('');

  const [showAfkWarning, setShowAfkWarning] = useState(false);
  const [afkCountdown, setAfkCountdown] = useState(0);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Education screen
  const [showEducation, setShowEducation] = useState(false);

  const roomCodeRef = useRef<string>(undefined);
  const unsubRef = useRef<(() => void) | undefined>(undefined);
  const lastActivityRef = useRef<number>(0);
  const prevTurnRef = useRef<1 | 2 | null>(null);
  const afkWarningTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkTriggerTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkCountdownIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleOpponentTimeoutRef = useRef<(() => void) | undefined>(undefined);

  /* ---- cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

  /* Education screen on victory */
  useEffect(() => {
    if (gameData?.status === 'completed' && screen === 'victory' && !showEducation) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowEducation(true);
      setTimeout(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowEducation(false);
      }, 8000);
    }
  }, [gameData?.status, screen, showEducation]);

  /* ---- determine player number ---- */
  const getPlayerNumber = useCallback(
    (data: GameData): 1 | 2 | null => {
      if (!user) return null;
      if (data.player1 === user.uid) return 1;
      if (data.player2 === user.uid) return 2;
      return null;
    },
    [user],
  );

  /* ---- subscribe to game doc ---- */
  const subscribeToGame = useCallback(
    (code: string) => {
      unsubRef.current?.();
      roomCodeRef.current = code;

      const unsub = onSnapshot(doc(db, 'phGames', code), (snap) => {
        if (!snap.exists()) {
          setScreen('lobby');
          setGameData(null);
          return;
        }

        const data = snap.data() as GameData;
        setGameData(data);

        if (data.status === 'waiting') {
          setScreen('waiting');
        } else if (data.status === 'playing') {
          setScreen('game');
        } else if (data.status === 'completed') {
          /* compute winner text */
          const d1 = Math.abs(data.p1PH - data.targetPH);
          const d2 = Math.abs(data.p2PH - data.targetPH);

          if (d1 < d2) {
            setWinnerText(`${data.player1Name} wins! (pH ${data.p1PH})`);
          } else if (d2 < d1) {
            setWinnerText(`${data.player2Name} wins! (pH ${data.p2PH})`);
          } else {
            setWinnerText("It's a tie!");
          }
          setScreen('victory');
        }
      });

      unsubRef.current = unsub;
    },
    [],
  );

  const SESSION_KEY = 'phChallengeSession';

  /* ---- Create Game ---- */
  const handleCreateGame = useCallback(async () => {
    if (!user) return;
    setError('');

    const code = generateRoomCode();
    const displayName = await getUserDisplayName(user.uid);
    const targetPH = TARGET_PH_OPTIONS[Math.floor(Math.random() * TARGET_PH_OPTIONS.length)];

    const newGame: GameData = {
      roomCode: code,
      player1: user.uid,
      player2: null,
      player1Name: displayName,
      player2Name: '',
      targetPH,
      p1PH: 7,
      p2PH: 7,
      grid: createInitialGrid(),
      currentTurn: 1,
      status: 'waiting',
      winner: '',
      createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
      disconnected: {},
    };

    await setDoc(doc(db, 'phGames', code), newGame);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      roomCode: code,
      isHost: true,
      playerRole: 1,
    } as GameSession));
    setIsHost(true);
    subscribeToGame(code);
  }, [user, subscribeToGame]);

  /* ---- Join Game ---- */
  const handleJoinGame = useCallback(async () => {
    if (!user) return;
    setError('');
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a room code.');
      return;
    }

    const snap = await getDoc(doc(db, 'phGames', code));
    if (!snap.exists()) {
      setError('Room not found.');
      return;
    }

    const data = snap.data() as GameData;
    if (data.status !== 'waiting') {
      setError('Game already in progress.');
      return;
    }
    if (data.player1 === user.uid) {
      setError('You cannot join your own game.');
      return;
    }

    const displayName = await getUserDisplayName(user.uid);

    await updateDoc(doc(db, 'phGames', code), {
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

  /* ---- Pick a card ---- */
  const handlePick = useCallback(
    async (index: number) => {
      if (!user || !gameData || !roomCodeRef.current) return;

      const pNum = getPlayerNumber(gameData);
      if (!pNum) return;
      if (gameData.currentTurn !== pNum) return;

      const card = gameData.grid[index];
      if (card.pickedBy !== null) return;

      const substance = SUBSTANCES[card.substanceIndex];
      const newGrid = gameData.grid.map((c, i) =>
        i === index ? { ...c, pickedBy: pNum } : c,
      );

      const phField = pNum === 1 ? 'p1PH' : 'p2PH';
      const currentPH = pNum === 1 ? gameData.p1PH : gameData.p2PH;
      const newPH = Math.max(0, Math.min(14, currentPH + substance.phChange));

      const totalPicked = newGrid.filter((c) => c.pickedBy !== null).length;
      const isComplete = totalPicked >= MAX_PICKS;

      const updates: Record<string, unknown> = {
        grid: newGrid,
        [phField]: newPH,
        currentTurn: pNum === 1 ? 2 : 1,
      };

      if (isComplete) {
        updates.status = 'completed';
      }

      await updateDoc(doc(db, 'phGames', roomCodeRef.current), updates);
    },
    [user, gameData, getPlayerNumber],
  );

  /* ---- Leave / cleanup ---- */
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

    if (roomCodeRef.current && gameData) {
      try {
        const gameRef = doc(db, 'phGames', roomCodeRef.current);

        if (gameData.status === 'playing') {
          const myPlayerNum = user?.uid === gameData.player1 ? 1 : 2;
          const winnerNum = myPlayerNum === 1 ? 2 : 1;
          const winnerName = winnerNum === 1 ? gameData.player1Name : gameData.player2Name;
          await updateDoc(gameRef, { status: 'completed', winner: winnerName });
        } else if (gameData.status === 'waiting') {
          await deleteDoc(gameRef);
        }
      } catch {
        // ignore
      }
    }

    roomCodeRef.current = undefined;
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

  const handleLeave = useCallback(async () => {
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

  /* ---- Replay ---- */
  const handleReplay = useCallback(async () => {
    if (!user || !roomCodeRef.current || !gameData) return;

    const targetPH = TARGET_PH_OPTIONS[Math.floor(Math.random() * TARGET_PH_OPTIONS.length)];
    const updates: Record<string, unknown> = {
      targetPH,
      p1PH: 7,
      p2PH: 7,
      grid: createInitialGrid(),
      currentTurn: 1,
      status: 'playing',
      winner: '',
    };

    await updateDoc(doc(db, 'phGames', roomCodeRef.current), updates);
  }, [user, gameData]);

  /* ---- Trigger AFK ---- */
  const triggerAfk = useCallback(async () => {
    if (!roomCodeRef.current || !user || !gameData) return;

    const myPlayerNum = gameData.player1 === user.uid ? 1 : 2;
    const myRoleKey = myPlayerNum === 1 ? 'player1' : 'player2';

    try {
      const gameRef = doc(db, 'phGames', roomCodeRef.current);
      const updateData: Record<string, unknown> = {};
      updateData[`disconnected.${myRoleKey}`] = true;
      updateData[`disconnectedAt.${myRoleKey}`] = serverTimestamp();
      await updateDoc(gameRef, updateData);
    } catch {
      // ignore
    }
  }, [gameData, user]);

  /* ---- Clear AFK timers ---- */
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

  /* ---- Session restoration on mount ---- */
  useEffect(() => {
    if (!user) return;

    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (!storedSession) return;

    const session: GameSession = JSON.parse(storedSession);

    const checkAndRestoreSession = async () => {
      try {
        const gameRef = doc(db, 'phGames', session.roomCode);
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
            roomCodeRef.current = session.roomCode;
            return;
          }
        }

        roomCodeRef.current = session.roomCode;
        setIsHost(session.isHost);
        subscribeToGame(session.roomCode);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    checkAndRestoreSession();
  }, [user, subscribeToGame]);

  /* ---- Cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
      if (reconnectTimeoutRef.current) clearInterval(reconnectTimeoutRef.current);
      if (afkWarningTimeoutRef.current) clearTimeout(afkWarningTimeoutRef.current);
      if (afkTriggerTimeoutRef.current) clearTimeout(afkTriggerTimeoutRef.current);
      if (afkCountdownIntervalRef.current) clearInterval(afkCountdownIntervalRef.current);
    };
  }, []);

  /* ---- AFK Detection ---- */
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
      if (!roomCodeRef.current || !user || !gameData) return;

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

  /* ---- Opponent disconnection detection ---- */
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
    if (!roomCodeRef.current || !gameData || !user) return;

    try {
      const gameRef = doc(db, 'phGames', roomCodeRef.current);
      await updateDoc(gameRef, { status: 'completed' });
    } catch {
      // ignore
    }
  }, [gameData, user]);

  useEffect(() => {
    handleOpponentTimeoutRef.current = handleOpponentTimeout;
  }, [handleOpponentTimeout]);

  /* ---- Reconnect handling ---- */
  const handleReconnect = useCallback(async () => {
    if (!roomCodeRef.current || !user) return;

    try {
      const gameRef = doc(db, 'phGames', roomCodeRef.current);
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
        subscribeToGame(roomCodeRef.current);
        return;
      }

      const disconnectedAtTs = disconnectedAt as Timestamp;
      if (typeof disconnectedAtTs.toMillis !== 'function') {
        setShowReconnectScreen(false);
        subscribeToGame(roomCodeRef.current);
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
      subscribeToGame(roomCodeRef.current);
    } catch {
      setReconnectError('Failed to reconnect');
    }
  }, []);

  const handleDropGame = useCallback(async () => {
    if (!roomCodeRef.current || !user || !gameData) return;

    try {
      const gameRef = doc(db, 'phGames', roomCodeRef.current);
      await updateDoc(gameRef, { status: 'completed' });
    } catch {
      // ignore
    }

    sessionStorage.removeItem(SESSION_KEY);
    setShowReconnectScreen(false);
    setScreen('lobby');
    roomCodeRef.current = undefined;
  }, [gameData, user]);

  /* ---- Detect when player becomes disconnected while on page ---- */
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

  /* ---- derived ---- */
  const playerNumber = gameData ? getPlayerNumber(gameData) : null;
  const isMyTurn = gameData ? gameData.currentTurn === playerNumber : false;

  /* ================================================================ */
  /* ---------- Render ---------- */
  if (!user) {
    return (
      <div className="w-full max-w-full mx-auto p-5 min-h-screen flex flex-col items-center justify-center">
        <Link href="/games" className="self-start mb-4 text-cyan-500 font-medium hover:opacity-80 transition-opacity">
          &larr; Leave Game
        </Link>
        <div className="relative w-full max-w-[1000px] h-[400px] bg-[var(--bg-card)] p-8 rounded-[32px] text-center shadow-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <h1 className="text-4xl font-extrabold mb-4">🧪 pH Challenge</h1>
          <p className="text-xl text-[var(--text-light)]">Please sign in to play.</p>
        </div>
      </div>
    );
  }

  return (
    <MultiplayerContainer
      gameTitle="pH Challenge"
      onLeave={handleLeave}
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
          title="🧪 pH Challenge"
          description="Adjust your substance's pH to match the target. Closest to the target wins the match!"
          tutorial={gameTutorials.phChallenge}
          accentColor="#6366f1"
          onCreateRoom={handleCreateGame}
          onJoinRoom={handleJoinGame}
          roomCodeInput={joinCode}
          setRoomCodeInput={setJoinCode}
          errorMessage={error}
        />
      )}

      {/* ======================== Waiting Screen ======================== */}
      {screen === 'waiting' && gameData && (
        <MultiplayerWaiting
          title="🧪 Waiting for Opponent"
          subtitle="Share the code to start the pH challenge!"
          roomCode={gameData.roomCode}
          tutorial={gameTutorials.phChallenge}
          accentColor="#6366f1"
          onCopyCode={() => {
            navigator.clipboard.writeText(gameData.roomCode);
          }}
          onCancel={handleLeave}
        />
      )}

      {/* ======================== Game Screen ======================== */}
      {screen === 'game' && gameData && (
        <div className="flex flex-col h-full">
          <h1 className="text-3xl font-extrabold mb-6 text-center">🧪 pH Color Challenge</h1>

          {/* Target Section */}
          <div className="mb-8 flex flex-col items-center">
             <div className="p-6 glass-panel rounded-3xl flex flex-col items-center border-2 border-indigo-500/20">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Target pH Color</p>
                <div 
                  className="w-24 h-24 rounded-2xl shadow-inner mb-3 transition-colors duration-500"
                  style={{ background: getPHColor(gameData.targetPH) }}
                />
                <p className="text-2xl font-black text-indigo-600">pH {gameData.targetPH}</p>
             </div>
          </div>

          {/* Players & Beakers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
            {/* Player 1 */}
            <div className={cn(
              "relative p-4 sm:p-6 rounded-3xl border-2 transition-all flex flex-col items-center",
              playerNumber === 1 && "ring-4 ring-indigo-500/30 ring-offset-2",
              gameData.currentTurn === 1 && gameData.status === 'playing' ? "bg-white dark:bg-slate-800 scale-105 shadow-xl border-indigo-500" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
            )}>
              <div className="font-bold text-lg mb-4 truncate w-full text-center">
                 {gameData.player1Name} {playerNumber === 1 && '(You)'}
              </div>
              <div className="relative w-20 sm:w-24 h-28 sm:h-32 border-x-2 border-b-2 border-slate-300 dark:border-slate-600 rounded-b-2xl overflow-hidden mb-3">
                <div 
                  className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                  style={{ 
                    height: '70%', 
                    background: getPHColor(gameData.p1PH),
                    opacity: 0.8
                  }}
                />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-200">pH {gameData.p1PH}</div>
            </div>

            {/* Player 2 */}
            <div className={cn(
              "relative p-4 sm:p-6 rounded-3xl border-2 transition-all flex flex-col items-center",
              playerNumber === 2 && "ring-4 ring-indigo-500/30 ring-offset-2",
              gameData.currentTurn === 2 && gameData.status === 'playing' ? "bg-white dark:bg-slate-800 scale-105 shadow-xl border-indigo-500" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
            )}>
              <div className="font-bold text-lg mb-4 truncate w-full text-center">
                 {gameData.player2Name} {playerNumber === 2 && '(You)'}
              </div>
              <div className="relative w-20 sm:w-24 h-28 sm:h-32 border-x-2 border-b-2 border-slate-300 dark:border-slate-600 rounded-b-2xl overflow-hidden mb-3">
                <div 
                  className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                  style={{ 
                    height: '70%', 
                    background: getPHColor(gameData.p2PH),
                    opacity: 0.8
                  }}
                />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-700 dark:text-slate-200">pH {gameData.p2PH}</div>
            </div>
          </div>

          {/* Turn Indicator */}
          <div className={cn(
            "inline-block mx-auto py-3 px-10 rounded-2xl font-bold text-xl mb-8 tracking-wide transition-all duration-500",
            isMyTurn
              ? "bg-indigo-600 text-white shadow-lg scale-110"
              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
          )}>
            {isMyTurn 
              ? "🎯 YOUR TURN" 
              : `⏳ WAITING FOR ${gameData.currentTurn === 1 ? gameData.player1Name : gameData.player2Name}...`}
          </div>

          {/* AFK Warning */}
          {showAfkWarning && (
            <div className={cn(
              "inline-block mx-auto py-3 px-10 rounded-2xl font-bold text-xl mb-8",
              "bg-yellow-500 text-white shadow-lg"
            )}>
              ⚠️ You will be marked AFK in {afkCountdown} seconds - Move your mouse or press a key!
            </div>
          )}

          {/* Opponent Disconnected */}
          {opponentDisconnected && gameData.status === 'playing' && (
            <MultiplayerOverlay
              type="opponent-disconnected"
              timeout={reconnectTimeout}
            />
          )}

          {/* Ingredient Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-2xl mx-auto w-full flex-1">
            {gameData.grid.map((card, i) => {
              const substance = SUBSTANCES[card.substanceIndex];
              const picked = card.pickedBy !== null;
              
              return (
                <button
                  key={i}
                  disabled={picked || !isMyTurn}
                  onClick={() => handlePick(i)}
                  className={cn(
                    "aspect-square rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden border-2",
                    !picked
                      ? "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:scale-105 hover:shadow-xl active:scale-95 cursor-pointer shadow-sm"
                      : "bg-slate-100 dark:bg-slate-900 border-transparent opacity-40 cursor-not-allowed"
                  )}
                >
                  <span className="text-3xl sm:text-4xl mb-2 group-hover:scale-110 transition-transform">{substance.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-tight text-center leading-tight truncate w-full px-1">
                    {substance.name}
                  </span>
                  {picked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[1px]">
                      <div className={cn(
                        "w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-md",
                        card.pickedBy === 1 ? "bg-indigo-500" : "bg-purple-500"
                      )}>
                         {card.pickedBy}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Education Screen */}
      {showEducation && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
          <div className="glass-panel p-8 rounded-[40px] max-w-lg w-full animate-in zoom-in-95 duration-500">
            <div className="text-5xl mb-4 text-center">🌈</div>
            <h2 className="text-3xl font-black mb-4 tracking-tight uppercase text-center text-[var(--text-main)]">
              Color-Changing Reactions (pH)
            </h2>
            <div className="text-base text-[var(--text-light)] leading-relaxed space-y-3">
              <p>
                Color-changing reactions occur due to the presence of a pH indicator, a substance that changes color depending on the acidity or basicity of a solution.
              </p>
              <p>
                When the pH changes, the molecular structure of the indicator changes, resulting in a visible color shift.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {screen === 'victory' && gameData && (
        <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in-95">
          <div className="text-8xl mb-6 animate-bounce">🏆</div>
          <h2 className="text-5xl font-black mb-4 text-[var(--text-main)] uppercase tracking-tighter text-center leading-tight">
            {winnerText}
          </h2>
          <p className="text-xl text-slate-500 mb-8 font-medium">
             Target was pH {gameData.targetPH}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-10 w-full max-w-md">
            <div className="text-center p-4 sm:p-6 glass-panel rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30">
              <div className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest truncate px-2">{gameData.player1Name}</div>
              <div 
                className="w-12 sm:w-16 h-12 sm:h-16 rounded-xl mx-auto mb-3 shadow-md"
                style={{ background: getPHColor(gameData.p1PH) }}
              />
              <div className="text-2xl sm:text-3xl font-black">pH {gameData.p1PH}</div>
            </div>
            <div className="text-center p-4 sm:p-6 glass-panel rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30">
              <div className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest truncate px-2">{gameData.player2Name}</div>
              <div 
                className="w-12 sm:w-16 h-12 sm:h-16 rounded-xl mx-auto mb-3 shadow-md"
                style={{ background: getPHColor(gameData.p2PH) }}
              />
              <div className="text-2xl sm:text-3xl font-black">pH {gameData.p2PH}</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 w-full max-w-sm">
            <ShareGameScore 
              gameName="pH Challenge" 
              customMessage={`I finished with pH ${playerNumber === 1 ? gameData.p1PH : gameData.p2PH} (Target: ${gameData.targetPH}) in pH Challenge! 🧪`} 
            />
            <button
               onClick={handleReplay}
               className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              🔄 Play Again
            </button>
            <GameRating gameId="ph-challenge" gameName="pH Challenge" />
          </div>
        </div>
      )}
    </MultiplayerContainer>
  );
}
