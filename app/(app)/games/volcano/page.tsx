'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

// --------------- Types ---------------

interface Ingredient {
  id: string;
  name: string;
  emoji: string;
}

interface GridItem {
  id: string;
  name: string;
  emoji: string;
  collected: boolean;
  collectedBy: string | null;
}

interface SharedInventory {
  soda: number;
  vinegar: number;
  soap: number;
  color: number;
}

interface GameData {
  roomCode: string;
  status: 'waiting' | 'playing' | 'completed';
  player1: { uid: string; name: string };
  player2: { uid: string; name: string } | null;
  grid: GridItem[];
  sharedInventory: SharedInventory;
  currentTurn: 'player1' | 'player2';
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
  playerRole: 'player1' | 'player2';
}

// --------------- Constants ---------------

const SESSION_KEY = 'volcanoGameSession';

const INGREDIENTS: Ingredient[] = [
  { id: 'soda', name: 'Baking Soda', emoji: '🧂' },
  { id: 'vinegar', name: 'Vinegar', emoji: '🫗' },
  { id: 'soap', name: 'Dish Soap', emoji: '🧴' },
  { id: 'color', name: 'Food Color', emoji: '🔴' },
];

// --------------- Utilities ---------------

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createInitialGrid(): GridItem[] {
  const allIngredients: GridItem[] = INGREDIENTS.map((ing) => ({
    ...ing,
    collected: false,
    collectedBy: null,
  }));
  return shuffleArray(allIngredients);
}

async function getUserDisplayName(uid: string): Promise<string> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.username || data.displayName || 'Player';
    }
    return 'Player';
  } catch {
    return 'Player';
  }
}

// --------------- Component ---------------

export default function VolcanoPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  // Screen state
  const [activeScreen, setActiveScreen] = useState<'lobby' | 'waiting' | 'game'>('lobby');

  // Game data from Firestore
  const [currentGame, setCurrentGame] = useState<GameData | null>(null);

  // Host flag
  const [isHost, setIsHost] = useState(false);

  // Room code input
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Animation states
  const [shaking, setShaking] = useState(false);
  const [erupting, setErupting] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showEducation, setShowEducation] = useState(false);

  // UI states
  const [errorMessage, setErrorMessage] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

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

  // Refs
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const currentRoomCodeRef = useRef<string | undefined>(undefined);
  const eruptionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasTriggeredEruption = useRef(false);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastActivityRef = useRef<number>(0);
  const prevTurnRef = useRef<string | null>(null);
  const afkWarningTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkTriggerTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const afkCountdownIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const turnStartTimeRef = useRef<number>(Date.now());

  // --------------- Firestore helpers ---------------

  const subscribeToGame = useCallback(
    (roomCode: string) => {
      // Unsubscribe from previous listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }

      const gameRef = doc(db, 'volcanoGames', roomCode);
      const unsub = onSnapshot(gameRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameData;
          setCurrentGame(data);

          // Transition screens based on status
          if (data.status === 'waiting') {
            setActiveScreen('waiting');
          } else if (data.status === 'playing' || data.status === 'completed') {
            setActiveScreen('game');
          }
        } else {
          // Game was deleted (host left)
          setCurrentGame(null);
          setActiveScreen('lobby');
          setIsHost(false);
          currentRoomCodeRef.current = undefined;
          hasTriggeredEruption.current = false;
        }
      });

      unsubscribeRef.current = unsub;
    },
    []
  );

  const createGame = useCallback(async () => {
    if (!user) return;

    const roomCode = generateRoomCode();
    const playerName = await getUserDisplayName(user.uid);
    const grid = createInitialGrid();

    const gameData: GameData = {
      roomCode,
      status: 'waiting',
      player1: { uid: user.uid, name: playerName },
      player2: null,
      grid,
      sharedInventory: { soda: 0, vinegar: 0, soap: 0, color: 0 },
      currentTurn: 'player1',
      createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
      lastActiveAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
      disconnected: {},
    };

    await setDoc(doc(db, 'volcanoGames', roomCode), gameData);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      roomCode,
      isHost: true,
      playerRole: 'player1',
    } as GameSession));
    currentRoomCodeRef.current = roomCode;
    setIsHost(true);
    hasTriggeredEruption.current = false;
    subscribeToGame(roomCode);
  }, [user, subscribeToGame]);

  const joinGame = useCallback(async () => {
    if (!user) return;

    const code = roomCodeInput.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter a room code');
      return;
    }

    try {
      const gameRef = doc(db, 'volcanoGames', code);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        setErrorMessage('Room not found');
        return;
      }

      const gameData = gameSnap.data() as GameData;

      if (gameData.status !== 'waiting') {
        setErrorMessage('Game already in progress');
        return;
      }

      if (gameData.player1.uid === user.uid) {
        setErrorMessage('You cannot join your own game');
        return;
      }

      const playerName = await getUserDisplayName(user.uid);

      await updateDoc(gameRef, {
        player2: { uid: user.uid, name: playerName },
        status: 'playing',
      });

      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        roomCode: code,
        isHost: false,
        playerRole: 'player2',
      } as GameSession));
      currentRoomCodeRef.current = code;
      setIsHost(false);
      setErrorMessage('');
      hasTriggeredEruption.current = false;
      subscribeToGame(code);
    } catch {
      setErrorMessage('Failed to join game');
    }
  }, [user, roomCodeInput, subscribeToGame]);

  const collectIngredient = useCallback(
    async (index: number) => {
      if (!currentGame || !user || !currentRoomCodeRef.current) return;
      if (currentGame.status !== 'playing') return;

      // Check turn
      const isPlayer1 = currentGame.player1.uid === user.uid;
      const isPlayer2 = currentGame.player2?.uid === user.uid;
      const myRole = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;
      if (!myRole || currentGame.currentTurn !== myRole) return;

      // Prevent moves when opponent is disconnected
      if (opponentDisconnected) return;

      const item = currentGame.grid[index];
      if (!item || item.collected) return;

      // Update grid
      const newGrid = [...currentGame.grid];
      newGrid[index] = {
        ...newGrid[index],
        collected: true,
        collectedBy: myRole,
      };

      // Update shared inventory
      const newInventory = { ...currentGame.sharedInventory };
      const ingredientKey = item.id as keyof SharedInventory;
      newInventory[ingredientKey] = (newInventory[ingredientKey] || 0) + 1;

      // Count total collected
      const total = Object.values(newInventory).reduce((sum, v) => sum + v, 0);

      // Determine next turn
      const nextTurn = myRole === 'player1' ? 'player2' : 'player1';

      // Check if complete
      const newStatus = total >= 4 ? 'completed' : 'playing';

      const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current);
      await updateDoc(gameRef, {
        grid: newGrid,
        sharedInventory: newInventory,
        currentTurn: nextTurn,
        status: newStatus,
      });
    },
    [currentGame, user]
  );

  const performLeaveGame = useCallback(async () => {
    setShowLeaveConfirm(false);

    // Cleanup eruption timeout
    if (eruptionTimeoutRef.current) {
      clearTimeout(eruptionTimeoutRef.current);
      eruptionTimeoutRef.current = undefined;
    }

    // Cleanup heartbeat
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }

    // Cleanup reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearInterval(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Cleanup AFK timers
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

    // Unsubscribe
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = undefined;
    }

    // If game is playing, the other player wins
    // If game is waiting, delete the game
    if (currentRoomCodeRef.current && currentGame) {
      try {
        const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current);

        if (currentGame.status === 'playing') {
          // Determine winner (opposite of current player)
          const isPlayer1 = currentGame.player1.uid === user?.uid;
          const winner = isPlayer1 ? 'player2' : 'player1';

          // Update game to completed with winner
          await updateDoc(gameRef, {
            status: 'completed',
          });
        } else if (currentGame.status === 'waiting') {
          // Delete game if still waiting for opponent
          await deleteDoc(gameRef);
        }
      } catch {
        // Ignore errors
      }
    }

    currentRoomCodeRef.current = undefined;
    setCurrentGame(null);
    setActiveScreen('lobby');
    setIsHost(false);
    setShaking(false);
    setErupting(false);
    setShowGameOver(false);
    setErrorMessage('');
    setShowReconnectScreen(false);
    setOpponentDisconnected(false);
    setShowAfkWarning(false);
    setAfkCountdown(0);
    sessionStorage.removeItem(SESSION_KEY);
    hasTriggeredEruption.current = false;
  }, [currentGame, user]);

  const leaveGame = useCallback(async () => {
    // If in lobby screen, go back to games hub
    if (activeScreen === 'lobby') {
      router.push('/games');
      return;
    }

    // If game is in progress, show confirmation dialog
    if (currentGame?.status === 'playing') {
      setShowLeaveConfirm(true);
      return;
    }

    // For waiting status or no game, proceed with normal leave
    await performLeaveGame();
  }, [activeScreen, currentGame, router, performLeaveGame]);

  const cancelWaiting = useCallback(async () => {
    await leaveGame();
  }, [leaveGame]);

  const copyRoomCode = useCallback(() => {
    if (!currentGame) return;
    navigator.clipboard.writeText(currentGame.roomCode).then(() => {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    });
  }, [currentGame]);

  // --------------- Session restoration + Heartbeat + Disconnection handling ---------------

  useEffect(() => {
    if (!user) return;

    const storedSession = sessionStorage.getItem(SESSION_KEY);
    if (!storedSession) return;

    const session: GameSession = JSON.parse(storedSession);

    const checkAndRestoreSession = async () => {
      try {
        const gameRef = doc(db, 'volcanoGames', session.roomCode);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const gameData = gameSnap.data() as GameData;

        const isPlayer1 = gameData.player1?.uid === user.uid;
        const isPlayer2 = gameData.player2?.uid === user.uid;
        const myRole: 'player1' | 'player2' | null = isPlayer1 ? 'player1' : isPlayer2 ? 'player2' : null;

        if (!myRole) {
          sessionStorage.removeItem(SESSION_KEY);
          return;
        }

        const isDisconnected = gameData.disconnected?.[myRole] as boolean | undefined;

        if (isDisconnected) {
          const disconnectedAt = gameData.disconnectedAt?.[myRole] as Timestamp | undefined;
          if (disconnectedAt && typeof disconnectedAt.toMillis === 'function') {
            const disconnectTime = disconnectedAt.toMillis();
            const elapsed = Date.now() - disconnectTime;
            const TIMEOUT_MS = 2 * 60 * 1000;

            if (elapsed >= TIMEOUT_MS) {
              sessionStorage.removeItem(SESSION_KEY);
              return;
            }

            setShowReconnectScreen(true);
            setReconnectTimeout(Math.ceil((TIMEOUT_MS - elapsed) / 1000));
            currentRoomCodeRef.current = session.roomCode;
            return;
          }
        }

        currentRoomCodeRef.current = session.roomCode;
        setIsHost(session.isHost);
        subscribeToGame(session.roomCode);
      } catch {
        sessionStorage.removeItem(SESSION_KEY);
      }
    };

    checkAndRestoreSession();
  }, [user, subscribeToGame]);

  // --------------- Heartbeat + Disconnection detection ---------------

  useEffect(() => {
    if (!user || !currentRoomCodeRef.current || !currentGame) return;
    if (currentGame.status !== 'playing') return;

    const myRole = currentGame.player1.uid === user.uid ? 'player1' : 
                   currentGame.player2?.uid === user.uid ? 'player2' : null;
    if (!myRole) return;

    const isMarkedDisconnected = currentGame.disconnected?.[myRole];
    if (isMarkedDisconnected) return;

    let heartbeatFailures = 0;

    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current!);
        const gameSnap = await getDoc(gameRef);

        if (!gameSnap.exists()) {
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
          return;
        }

        const gameData = gameSnap.data() as GameData;
        const stillDisconnected = gameData.disconnected?.[myRole];
        if (stillDisconnected) return;

        heartbeatFailures = 0;
        await updateDoc(gameRef, {
          lastActiveAt: serverTimestamp(),
        });
      } catch {
        heartbeatFailures++;
        if (heartbeatFailures >= 3) {
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
          try {
            const gameRef2 = doc(db, 'volcanoGames', currentRoomCodeRef.current!);
            const gameSnap2 = await getDoc(gameRef2);
            if (gameSnap2.exists()) {
              const gameData = gameSnap2.data() as GameData;
              const updateData: Record<string, unknown> = {};
              updateData[`disconnected.${myRole}`] = true;
              updateData[`disconnectedAt.${myRole}`] = serverTimestamp();
              await updateDoc(gameRef2, updateData);
            }
          } catch {
            // Ignore
          }
        }
      }
    }, 10000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [user, currentGame]);

  // --------------- Opponent disconnection detection + timeout ---------------

  useEffect(() => {
    if (!user || !currentGame || currentGame.status !== 'playing') {
      setOpponentDisconnected(false);
      if (reconnectTimeoutRef.current) clearInterval(reconnectTimeoutRef.current);
      return;
    }

    const myRole = currentGame.player1.uid === user.uid ? 'player1' : 
                   currentGame.player2?.uid === user.uid ? 'player2' : null;
    if (!myRole) return;

    const opponentRole = myRole === 'player1' ? 'player2' : 'player1';
    const opponentDisconnected = currentGame.disconnected?.[opponentRole] as boolean | undefined;

    if (opponentDisconnected) {
      const disconnectedAt = currentGame.disconnectedAt?.[opponentRole] as Timestamp | undefined;
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
                handleOpponentTimeout();
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
  }, [user, currentGame]);

  // --------------- AFK Detection (Simplified + Page Visibility) ---------------

  const triggerAfk = useCallback(async () => {
    console.log('[AFK triggerAfk] Called');
    if (!currentRoomCodeRef.current || !user || !currentGame) {
      console.log('[AFK triggerAfk] Early return - missing refs');
      return;
    }

    const myRole = currentGame.player1.uid === user.uid ? 'player1' : 
                   currentGame.player2?.uid === user.uid ? 'player2' : null;
    console.log('[AFK triggerAfk] myRole:', myRole);
    if (!myRole) return;

    const isDisconnected = currentGame.disconnected?.[myRole];
    console.log('[AFK triggerAfk] isDisconnected:', isDisconnected);
    if (isDisconnected) return;

    try {
      const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current);
      const updateData: Record<string, unknown> = {};
      updateData[`disconnected.${myRole}`] = true;
      updateData[`disconnectedAt.${myRole}`] = serverTimestamp();
      console.log('[AFK triggerAfk] Updating Firestore with:', updateData);
      await updateDoc(gameRef, updateData);
      console.log('[AFK triggerAfk] Firestore update complete');
    } catch (e) {
      console.error('[AFK triggerAfk] Error:', e);
    }
  }, [currentGame, user]);

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

  // AFK detection with elapsed time checking (more reliable than setTimeout)
  useEffect(() => {
    console.log('[AFK] Effect running', { 
      hasGame: !!currentGame, 
      status: currentGame?.status, 
      turn: currentGame?.currentTurn,
      hasUser: !!user 
    });
    
    if (!currentGame || currentGame.status !== 'playing' || !user) {
      console.log('[AFK] Skipping - game not playing');
      clearAfkTimers();
      return;
    }

    const myRole = currentGame.player1.uid === user.uid ? 'player1' : 
                   currentGame.player2?.uid === user.uid ? 'player2' : null;
    console.log('[AFK] My role:', myRole);
    if (!myRole) return;

    const isDisconnected = currentGame.disconnected?.[myRole];
    console.log('[AFK] Is disconnected:', isDisconnected);
    if (isDisconnected) {
      clearAfkTimers();
      return;
    }

    const myTurn = currentGame.currentTurn === myRole;
    console.log('[AFK] My turn:', myTurn);
    if (!myTurn) {
      clearAfkTimers();
      return;
    }

    // Detect turn change - when it becomes my turn, reset the timer fresh
    if (prevTurnRef.current !== myRole && currentGame.currentTurn === myRole) {
      lastActivityRef.current = 0;
      prevTurnRef.current = myRole;
    }

    // Only initialize when it's actually my turn (not on game start)
    if (myTurn && lastActivityRef.current === 0) {
      lastActivityRef.current = Date.now();
    }

    const warningShownRef = { current: false };
    const afkTriggeredRef = { current: false };

    const checkAfk = () => {
      if (!currentRoomCodeRef.current || !user || !currentGame) return;
      
      const currentMyRole = currentGame.player1.uid === user.uid ? 'player1' : 
                            currentGame.player2?.uid === user.uid ? 'player2' : null;
      if (!currentMyRole || currentMyRole !== myRole) return;
      if (currentGame.currentTurn !== myRole) return;
      if (currentGame.disconnected?.[myRole]) return;
      if (currentGame.status !== 'playing') return;

      const elapsed = Date.now() - lastActivityRef.current;
      console.log('[AFK Check] Elapsed:', elapsed, 'warning:', warningShownRef.current, 'triggered:', afkTriggeredRef.current);

      // 30 seconds = AFK
      if (elapsed >= 30000 && !afkTriggeredRef.current) {
        console.log('[AFK] TRIGGERING AFK!');
        afkTriggeredRef.current = true;
        triggerAfk();
        return;
      }

      // 20 seconds = show warning
      if (elapsed >= 20000 && !warningShownRef.current) {
        console.log('[AFK] Showing warning');
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

    // Check every second
    const afkIntervalRef = setInterval(checkAfk, 1000);

    const handleActivity = (event: Event) => {
      console.log('[AFK] Activity detected:', event.type);
      const currentMyRole = currentGame?.player1?.uid === user?.uid ? 'player1' : 
                            currentGame?.player2?.uid === user?.uid ? 'player2' : null;
      if (!currentMyRole || currentMyRole !== myRole) return;
      if (currentGame?.currentTurn !== myRole) return;
      if (currentGame?.status !== 'playing') return;

      // Check if player was marked as disconnected (AFK)
      const wasDisconnected = currentGame.disconnected?.[myRole];
      if (wasDisconnected) {
        // Show reconnection screen instead of resuming
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

    // Page visibility handler - check immediately when page becomes visible
    const handleVisibilityChange = () => {
      console.log('[AFK] Visibility changed:', document.visibilityState);
      if (document.visibilityState === 'visible') {
        const currentMyRole = currentGame?.player1?.uid === user?.uid ? 'player1' : 
                              currentGame?.player2?.uid === user?.uid ? 'player2' : null;
        if (!currentMyRole || currentMyRole !== myRole) return;
        if (currentGame?.currentTurn !== myRole) return;
        if (currentGame?.status !== 'playing') return;

        const elapsed = Date.now() - lastActivityRef.current;
        console.log('[AFK] Page visible, elapsed:', elapsed);
        
        // If elapsed > 30 seconds, trigger AFK immediately
        if (elapsed >= 30000) {
          console.log('[AFK] Triggering AFK from visibility change');
          triggerAfk();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('[AFK] Effect cleanup');
      clearInterval(afkIntervalRef);
      if (afkCountdownIntervalRef.current) {
        clearInterval(afkCountdownIntervalRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentGame?.currentTurn, currentGame?.status, user, clearAfkTimers, triggerAfk]);

  // Detect when player becomes disconnected while on page and show reconnection screen
  useEffect(() => {
    if (!currentGame || !user) return;

    const myRole = currentGame.player1.uid === user.uid ? 'player1' : 
                   currentGame.player2?.uid === user.uid ? 'player2' : null;
    if (!myRole) return;

    const isDisconnected = currentGame.disconnected?.[myRole];

    // If player is marked as disconnected and on game screen, show reconnection screen
    if (isDisconnected && activeScreen === 'game') {
      console.log('[Reconnect] Player marked as disconnected, showing reconnection screen');
      setShowReconnectScreen(true);
    }
  }, [currentGame?.disconnected, activeScreen, user]);

  const handleOpponentTimeout = useCallback(async () => {
    if (!currentRoomCodeRef.current || !currentGame || !user) return;

    const myRole = currentGame.player1.uid === user.uid ? 'player1' : 
                   currentGame.player2?.uid === user.uid ? 'player2' : null;
    if (!myRole) return;

    try {
      const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current);
      await updateDoc(gameRef, {
        status: 'completed',
      });
    } catch {
      // Ignore
    }
  }, [currentGame, user]);

  const handleReconnect = useCallback(async () => {
    if (!currentRoomCodeRef.current || !user) return;

    try {
      const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        setReconnectError('Game no longer exists');
        return;
      }

      const gameData = gameSnap.data() as GameData;
      const isPlayer1 = gameData.player1.uid === user.uid;
      const myRole: 'player1' | 'player2' = isPlayer1 ? 'player1' : 'player2';

      const isDisconnected = gameData.disconnected?.[myRole];
      const disconnectedAt = gameData.disconnectedAt?.[myRole];

      if (!isDisconnected || !disconnectedAt) {
        setShowReconnectScreen(false);
        subscribeToGame(currentRoomCodeRef.current);
        return;
      }

      const disconnectedAtTs = disconnectedAt as Timestamp;
      if (typeof disconnectedAtTs.toMillis !== 'function') {
        setShowReconnectScreen(false);
        subscribeToGame(currentRoomCodeRef.current);
        return;
      }

      const elapsed = Date.now() - disconnectedAtTs.toMillis();
      const TIMEOUT_MS = 2 * 60 * 1000;

      if (elapsed >= TIMEOUT_MS) {
        setReconnectError('Reconnection time expired');
        sessionStorage.removeItem(SESSION_KEY);
        setTimeout(() => {
          setShowReconnectScreen(false);
          setActiveScreen('lobby');
        }, 2000);
        return;
      }

      await updateDoc(gameRef, {
        [`disconnected.${myRole}`]: false,
        disconnectedAt: { player1: null, player2: null },
      });

      setShowReconnectScreen(false);
      subscribeToGame(currentRoomCodeRef.current);
    } catch {
      setReconnectError('Failed to reconnect');
    }
  }, [subscribeToGame]);

  const handleDropGame = useCallback(async () => {
    if (!currentRoomCodeRef.current || !user || !currentGame) return;

    const myRole = currentGame.player1.uid === user.uid ? 'player1' : 
                   currentGame.player2?.uid === user.uid ? 'player2' : null;
    if (!myRole) return;

    const opponentRole = myRole === 'player1' ? 'player2' : 'player1';

    try {
      const gameRef = doc(db, 'volcanoGames', currentRoomCodeRef.current);
      await updateDoc(gameRef, {
        status: 'completed',
      });
    } catch {
      // Ignore
    }

    sessionStorage.removeItem(SESSION_KEY);
    setShowReconnectScreen(false);
    setActiveScreen('lobby');
    currentRoomCodeRef.current = undefined;
  }, [currentGame, user]);

  // --------------- Eruption effect with education ---------------

  useEffect(() => {
    if (currentGame?.status === 'completed' && !hasTriggeredEruption.current) {
      hasTriggeredEruption.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShaking(true);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErupting(true);

      eruptionTimeoutRef.current = setTimeout(() => {
        setShaking(false);
        setShowEducation(true);
      }, 4000);

      eruptionTimeoutRef.current = setTimeout(() => {
        setShowEducation(false);
        setShowGameOver(true);
      }, 12000);
    }
  }, [currentGame?.status]);

  // --------------- Cleanup on unmount ---------------

  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (eruptionTimeoutRef.current) {
        clearTimeout(eruptionTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearInterval(reconnectTimeoutRef.current);
      }
      if (afkWarningTimeoutRef.current) {
        clearTimeout(afkWarningTimeoutRef.current);
      }
      if (afkTriggerTimeoutRef.current) {
        clearTimeout(afkTriggerTimeoutRef.current);
      }
      if (afkCountdownIntervalRef.current) {
        clearInterval(afkCountdownIntervalRef.current);
      }
    };
  }, []);

  // --------------- Drag and drop handlers ---------------

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.dataTransfer.setData('text/plain', index.toString());
      setDraggingIndex(index);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDropZoneActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropZoneActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropZoneActive(false);
      setDraggingIndex(null);
      const indexStr = e.dataTransfer.getData('text/plain');
      const index = parseInt(indexStr, 10);
      if (!isNaN(index)) {
        collectIngredient(index);
      }
    },
    [collectIngredient]
  );

  // --------------- Derived state ---------------

  const isMyTurn = (() => {
    if (!currentGame || !user) return false;
    if (currentGame.status !== 'playing') return false;
    const isPlayer1 = currentGame.player1.uid === user.uid;
    const isPlayer2 = currentGame.player2?.uid === user.uid;
    if (isPlayer1 && currentGame.currentTurn === 'player1') return true;
    if (isPlayer2 && currentGame.currentTurn === 'player2') return true;
    return false;
  })();

  const myRole = (() => {
    if (!currentGame || !user) return null;
    if (currentGame.player1.uid === user.uid) return 'player1';
    if (currentGame.player2?.uid === user.uid) return 'player2';
    return null;
  })();

  const totalCollected = currentGame
    ? Object.values(currentGame.sharedInventory).reduce((sum, v) => sum + v, 0)
    : 0;

  const progressPercent = (totalCollected / 4) * 100;

  // --------------- Render helpers ---------------

  // --------------- Render ---------------

  if (!user) {
    return (
      <div className="w-full max-w-full mx-auto p-5 min-h-screen flex flex-col items-center justify-center">
        <Link href="/games" className="self-start mb-4 text-cyan-500 font-medium hover:opacity-80 transition-opacity">
          &larr; Leave Game
        </Link>
        <div className="relative w-full max-w-[1000px] h-[400px] bg-[var(--bg-card)] p-8 rounded-[32px] text-center shadow-2xl flex flex-col items-center justify-center">
          <h1 className="text-4xl font-extrabold mb-4">🌋 Volcano Experiment</h1>
          <p className="text-xl text-[var(--text-light)]">Please sign in to play.</p>
        </div>
      </div>
    );
  }

  return (
    <MultiplayerContainer
      gameTitle="Volcano Experiment"
      onLeave={leaveGame}
      isShaking={shaking}
    >
      {/* ======================== Lobby Screen ======================== */}
      {activeScreen === 'lobby' && (
        <MultiplayerLobby
          title="🌋 Volcano Experiment"
          description="A cooperative multiplayer chemistry game! Collect all ingredients to make the volcano erupt!"
          tutorial={gameTutorials.volcano}
          accentColor="#ef4444"
          onCreateRoom={createGame}
          onJoinRoom={joinGame}
          roomCodeInput={roomCodeInput}
          setRoomCodeInput={setRoomCodeInput}
          errorMessage={errorMessage}
        />
      )}

      {/* ======================== Waiting Screen ======================== */}
      {activeScreen === 'waiting' && currentGame && (
        <MultiplayerWaiting
          title="🌋 Waiting for Player 2"
          subtitle="Play with a friend to trigger the eruption!"
          roomCode={currentGame.roomCode}
          tutorial={gameTutorials.volcano}
          accentColor="#ef4444"
          onCopyCode={copyRoomCode}
          onCancel={cancelWaiting}
          copyFeedback={copyFeedback}
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

      {opponentDisconnected && currentGame?.status === 'playing' && (
        <MultiplayerOverlay
          type="opponent-disconnected"
          timeout={reconnectTimeout}
        />
      )}

      {/* ======================== Game Screen ======================== */}
      {activeScreen === 'game' && currentGame && !showReconnectScreen && (
        <div className="flex flex-col h-full gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold">🌋 Volcano Experiment</h1>

          {/* AFK Warning */}
          {showAfkWarning && (
            <div className="py-2 px-3 bg-amber-500 text-white rounded-xl font-bold text-sm animate-pulse">
              ⚠️ You will be marked AFK in {afkCountdown}s - Move your mouse or press a key!
            </div>
          )}

          {/* Players */}
          <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto w-full">
            {/* Player 1 */}
            <div className={cn(
              "px-3 py-2 rounded-xl border-2 transition-all flex items-center gap-2",
              currentGame.player1.uid === user.uid && "ring-2 ring-[#ff4e50]/40 ring-offset-1",
              currentGame.currentTurn === 'player1' && currentGame.status === 'playing' ? "bg-white dark:bg-slate-800 shadow-md border-[#ff4e50]" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
            )}>
              <span className="text-lg shrink-0">🔴</span>
              <div className="flex flex-col items-start min-w-0">
                <span className="font-bold text-sm truncate w-full leading-tight">{currentGame.player1.name}</span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider leading-tight">Player 1</span>
              </div>
            </div>

            {/* Player 2 */}
            {currentGame.player2 && (
              <div className={cn(
                "px-3 py-2 rounded-xl border-2 transition-all flex items-center gap-2",
                currentGame.player2.uid === user.uid && "ring-2 ring-[#4facfe]/40 ring-offset-1",
                currentGame.currentTurn === 'player2' && currentGame.status === 'playing' ? "bg-white dark:bg-slate-800 shadow-md border-[#4facfe]" : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80"
              )}>
                <span className="text-lg shrink-0">🔵</span>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-bold text-sm truncate w-full leading-tight">{currentGame.player2.name}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider leading-tight">Player 2</span>
                </div>
              </div>
            )}
          </div>

          {/* Turn indicator */}
          {currentGame.status === 'playing' && (
            <div className={cn(
              "mx-auto py-1.5 px-5 rounded-xl font-bold text-xs tracking-wide",
              isMyTurn 
                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" 
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            )}>
              {isMyTurn ? "🎯 Your Turn! Pick an ingredient!" : "⏳ Opponent's Turn..."}
            </div>
          )}

          {/* Progress bar */}
          <div className="w-full max-w-xl mx-auto relative h-6 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 transition-all duration-700 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center font-bold text-[10px]">
              {totalCollected} / 4 Ingredients
            </div>
          </div>

          {/* Game layout: ingredients | volcano — side by side */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1 min-h-0">

            {/* Left: ingredients panel */}
            <div className="sm:w-[240px] shrink-0 flex flex-col gap-3 text-center min-h-[280px] sm:min-h-0">
              <div className="font-bold text-slate-500 uppercase tracking-wider text-xs">
                🧪 Ingredients
              </div>
              <div className="grid grid-cols-2 gap-2 flex-1">
                {currentGame.grid.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={cn(
                      "relative p-3 glass-panel rounded-2xl flex flex-col items-center justify-center transition-all border-2 min-h-[80px]",
                      item.collected 
                        ? "opacity-60 cursor-not-allowed grayscale-[0.5]" 
                        : isMyTurn 
                          ? "cursor-grab active:cursor-grabbing hover:scale-105 hover:border-white/50 bg-white/10" 
                          : "opacity-80 border-transparent",
                      item.collected && item.collectedBy === 'player1' && "border-[#ff4e50] bg-[#ff4e50]/5",
                      item.collected && item.collectedBy === 'player2' && "border-[#4facfe] bg-[#4facfe]/5",
                      draggingIndex === index && "opacity-20"
                    )}
                    draggable={isMyTurn && !item.collected}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={() => {
                      if (isMyTurn && !item.collected) {
                        collectIngredient(index);
                      }
                    }}
                  >
                    <span className="text-2xl sm:text-3xl mb-1">{item.emoji}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tight leading-tight">{item.name}</span>
                  </div>
                ))}
              </div>

              {/* Shared inventory */}
              <div className="font-bold text-slate-500 uppercase tracking-wider text-xs">
                📦 Shared Inventory
              </div>
              <div className="grid grid-cols-4 gap-1 p-3 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-slate-800">
                {INGREDIENTS.map((ing) => (
                  <div key={ing.id} className="flex flex-col items-center">
                    <span className="text-xl">{ing.emoji}</span>
                    <span className="text-[10px] font-bold text-slate-400">{currentGame.sharedInventory[ing.id as keyof SharedInventory] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: volcano — takes remaining space */}
            <div className="flex-1 isolate flex items-center justify-center p-4 bg-slate-100/50 dark:bg-black/20 rounded-3xl border border-slate-200 dark:border-slate-800 relative min-h-[220px]">
              <div
                className={cn(
                  "relative w-full max-w-[420px] aspect-[420/340] flex items-end justify-center overflow-visible transition-all duration-300",
                  dropZoneActive && "scale-105 brightness-110"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                 {dropZoneActive && (
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 font-black text-red-500 text-xl animate-bounce z-40">
                     DROP HERE!
                   </div>
                 )}

                {/* Lava particles - Nested for stable centering */}
                <div className={cn("absolute top-[-100px] left-1/2 -translate-x-1/2 w-[40%] h-[200px] pointer-events-none transition-opacity z-10", erupting ? "opacity-100" : "opacity-0")}>
                  <div className="relative w-full h-full">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn("absolute w-3 h-3 bg-[#ff5722] rounded-full shadow-[0_0_10px_#ffeb3b]", erupting && "animate-[particleAnim_1.5s_ease-out_infinite]")}
                        style={{ 
                          left: `${15 + i * 17.5}%`,
                          animationDelay: `${i * 0.15}s`
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Lava - Nested to isolate animation from positioning */}
                <div className="absolute top-[20px] left-1/2 -translate-x-1/2 w-[40%] h-0 z-0 pointer-events-none">
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 mx-auto w-[35%] h-0 bg-gradient-to-b from-[#ff4500] to-transparent rounded-[40px] opacity-0 transition-all duration-1000 origin-bottom",
                    erupting && "h-[600px] w-full opacity-100 bg-[radial-gradient(circle,#ffeb3b,#ff9800,#f44336)] blur-[5px] shadow-[0_0_50px_#ff5722] animate-[flow_2s_infinite_ease-in-out]"
                  )} />
                </div>

                {/* Volcano Shape - Standardized absolute positioning */}
                <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-b from-[#4b2c20] to-[#2d1b10] [clip-path:polygon(25%_0%,75%_0%,100%_100%,0%_100%)] z-30 shadow-2xl transition-transform duration-300">
                   <div className="absolute top-0 left-0 right-0 h-[20%] bg-[#1a0f0a] [clip-path:polygon(0%_0%,100%_0%,100%_100%,80%_80%,60%_100%,40%_80%,20%_100%,0%_80%)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Educational content panel */}
          {showEducation && (
            <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/70 backdrop-blur-md p-6">
              <div className="glass-panel p-8 rounded-[40px] max-w-lg w-full animate-in zoom-in-95 duration-500">
                <div className="text-5xl mb-4 text-center">🌋</div>
                <h2 className="text-3xl font-black mb-4 tracking-tight uppercase text-center text-[var(--text-main)]">
                  Volcano Experiment
                </h2>
                <div className="text-base text-[var(--text-light)] leading-relaxed space-y-3">
                  <p>
                    The volcano experiment occurs due to an Acid–base reaction between baking soda (sodium bicarbonate) and vinegar (acetic acid).
                  </p>
                  <p>
                    When these substances react, they produce carbon dioxide gas (CO₂), water, and a salt. The rapid formation of CO₂ gas creates pressure, forcing the liquid mixture out of the container, which simulates a volcanic eruption.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Game over panel */}
          {showGameOver && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
              <div className="glass-panel p-10 rounded-[40px] max-w-lg w-full text-center animate-in zoom-in-95 duration-500">
                <div className="text-7xl mb-6">🌋🎉</div>
                <h2 className="text-4xl font-black mb-4 tracking-tight uppercase">Volcano Erupted!</h2>
                <p className="text-lg text-[var(--text-light)] mb-8 leading-relaxed">
                  Amazing teamwork! You and your partner collected all the
                  ingredients and triggered the eruption!
                </p>
                <div className="space-y-4">
                  <ShareGameScore
                    gameName="Volcano Experiment"
                    customMessage="I just successfully triggered the volcano eruption in Volcano Experiment! 🌋"
                  />
                  <button
                    className="w-full py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xl shadow-lg transition-all active:scale-95"
                    onClick={leaveGame}
                  >
                    🏠 Back to Hub
                  </button>
                  <GameRating gameId="volcano" gameName="Volcano Race" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel mx-4 max-w-sm rounded-[32px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="mb-4 text-2xl font-bold text-[var(--text-main)]">
              Leave Game?
            </h3>
            <p className="mb-8 text-slate-500 font-medium leading-relaxed">
              Are you sure you want to leave? The other player will win!
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 transition-colors"
                onClick={() => setShowLeaveConfirm(false)}
              >
                Cancel
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

      <style jsx global>{`
        @keyframes flow {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.1); }
        }
        @keyframes particleAnim {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-150px) scale(0); opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </MultiplayerContainer>
  );
}
