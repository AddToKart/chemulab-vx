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
} from 'firebase/firestore';
import { useAuthStore } from '@/store/auth-store';
import styles from './page.module.css';

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

  const [screen, setScreen] = useState<'lobby' | 'waiting' | 'game' | 'victory'>('lobby');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [winnerText, setWinnerText] = useState('');
  const [error, setError] = useState('');

  const roomCodeRef = useRef<string>(undefined);
  const unsubRef = useRef<(() => void) | undefined>(undefined);

  /* ---- cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      unsubRef.current?.();
    };
  }, []);

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
    };

    await setDoc(doc(db, 'phGames', code), newGame);
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
  const handleLeave = useCallback(async () => {
    unsubRef.current?.();
    unsubRef.current = undefined;
    if (roomCodeRef.current) {
      try {
        await deleteDoc(doc(db, 'phGames', roomCodeRef.current));
      } catch {
        /* ignore */
      }
      roomCodeRef.current = undefined;
    }
    setGameData(null);
    setScreen('lobby');
    setJoinCode('');
    setWinnerText('');
    setError('');
  }, []);

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

  /* ---- derived ---- */
  const playerNumber = gameData ? getPlayerNumber(gameData) : null;
  const isMyTurn = gameData ? gameData.currentTurn === playerNumber : false;

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <div className={styles.container}>
      <Link href="/games" className={styles.backLink}>
        &larr; Back to Games
      </Link>

      <div className={styles.gameArea}>
        {/* ---------- LOBBY ---------- */}
        {screen === 'lobby' && (
          <div className={styles.screen}>
            <h1 className={styles.title}>🧪 pH Color Challenge</h1>
            <p className={styles.subtitle}>
              Pick ingredients to reach the target pH — closest wins!
            </p>

            <div className={styles.lobbyOptions}>
              {/* Create */}
              <div className={styles.lobbyCard}>
                <h2 className={styles.lobbyCardTitle}>Create Room</h2>
                <p className={styles.lobbyCardDesc}>
                  Start a new game and invite a friend.
                </p>
                <button className={styles.btn} onClick={handleCreateGame}>
                  Create Game
                </button>
              </div>

              {/* Join */}
              <div className={styles.lobbyCard}>
                <h2 className={styles.lobbyCardTitle}>Join Room</h2>
                <p className={styles.lobbyCardDesc}>
                  Enter a room code to join an existing game.
                </p>
                <div className={styles.inputGroup}>
                  <input
                    className={styles.codeInput}
                    type="text"
                    maxLength={5}
                    placeholder="CODE"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  />
                  <button className={styles.btn} onClick={handleJoinGame}>
                    Join
                  </button>
                </div>
                {error && <p className={styles.error}>{error}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ---------- WAITING ---------- */}
        {screen === 'waiting' && gameData && (
          <div className={styles.screen}>
            <h2 className={styles.title}>Waiting for opponent…</h2>
            <p className={styles.subtitle}>Share this code with a friend:</p>
            <div className={styles.roomCodeTag}>{gameData.roomCode}</div>
            <div className={styles.waitingDots}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
            </div>
            <button className={styles.btnSecondary} onClick={handleLeave}>
              Cancel
            </button>
          </div>
        )}

        {/* ---------- GAME ---------- */}
        {screen === 'game' && gameData && (
          <div className={styles.screen}>
            <h2 className={styles.turnIndicator}>
              {isMyTurn ? 'Your turn!' : "Opponent's turn…"}
            </h2>

            {/* Target */}
            <div className={styles.targetSection}>
              <p className={styles.targetLabel}>Target pH Color</p>
              <div
                className={styles.targetBox}
                style={{ background: getPHColor(gameData.targetPH) }}
              />
              <p className={styles.targetPHText}>pH {gameData.targetPH}</p>
            </div>

            {/* Beakers */}
            <div className={styles.beakerContainer}>
              {/* Player 1 */}
              <div className={styles.beakerWrapper}>
                <p className={styles.beakerLabel}>
                  {gameData.player1Name}
                  {playerNumber === 1 && ' (You)'}
                </p>
                <div className={styles.beaker}>
                  <div
                    className={styles.liquid}
                    style={{ background: getPHColor(gameData.p1PH) }}
                  />
                </div>
                <p className={styles.phValue}>pH {gameData.p1PH}</p>
              </div>

              {/* Player 2 */}
              <div className={styles.beakerWrapper}>
                <p className={styles.beakerLabel}>
                  {gameData.player2Name}
                  {playerNumber === 2 && ' (You)'}
                </p>
                <div className={styles.beaker}>
                  <div
                    className={styles.liquid}
                    style={{ background: getPHColor(gameData.p2PH) }}
                  />
                </div>
                <p className={styles.phValue}>pH {gameData.p2PH}</p>
              </div>
            </div>

            {/* Ingredient grid */}
            <div className={styles.ingredientGrid}>
              {gameData.grid.map((card, i) => {
                const substance = SUBSTANCES[card.substanceIndex];
                const picked = card.pickedBy !== null;
                const borderClass =
                  card.pickedBy === 1
                    ? styles.pickedP1
                    : card.pickedBy === 2
                      ? styles.pickedP2
                      : '';

                return (
                  <button
                    key={i}
                    className={`${styles.ingCard} ${picked ? styles.ingCardDisabled : ''} ${borderClass}`}
                    disabled={picked || !isMyTurn}
                    onClick={() => handlePick(i)}
                    title={picked ? substance.name : '???'}
                  >
                    <span className={styles.ingEmoji}>{substance.emoji}</span>
                    {picked && (
                      <span className={styles.ingName}>{substance.name}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button className={styles.btnSecondary} onClick={handleLeave}>
              Leave Game
            </button>
          </div>
        )}

        {/* ---------- VICTORY ---------- */}
        {screen === 'victory' && gameData && (
          <div className={styles.screen}>
            <h1 className={styles.victoryTitle}>🏆 Game Over!</h1>
            <p className={styles.winnerText}>{winnerText}</p>

            <div className={styles.resultRow}>
              <div className={styles.resultCard}>
                <p className={styles.resultName}>{gameData.player1Name}</p>
                <div
                  className={styles.resultSwatch}
                  style={{ background: getPHColor(gameData.p1PH) }}
                />
                <p className={styles.resultPH}>pH {gameData.p1PH}</p>
              </div>
              <div className={styles.resultVs}>vs</div>
              <div className={styles.resultCard}>
                <p className={styles.resultName}>{gameData.player2Name}</p>
                <div
                  className={styles.resultSwatch}
                  style={{ background: getPHColor(gameData.p2PH) }}
                />
                <p className={styles.resultPH}>pH {gameData.p2PH}</p>
              </div>
            </div>

            <p className={styles.targetReminder}>
              Target was pH {gameData.targetPH}
            </p>

            <div className={styles.victoryButtons}>
              <button className={styles.btn} onClick={handleReplay}>
                Play Again
              </button>
              <button className={styles.btnSecondary} onClick={handleLeave}>
                Back to Lobby
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
